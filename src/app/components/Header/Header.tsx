// src/components/Header/Header.tsx
"use client";

import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { m, AnimatePresence } from "framer-motion";
import MobileMenu from "./MobileMenu";
import HeaderSkeleton from "./HeaderSkeleton";
import { DesktopHeaderSearch, MobileHeaderSearch } from "./HeaderSearch";
import { useHeaderState } from "./useHeaderState";
import { getLogoHref } from "./headerActionsConfig";
import { useLiveSearch, type LiveSearchResult } from "../../hooks/useLiveSearch";
import { usePrefetchRoutes } from "../../hooks/usePrefetchRoutes";
import { AdminHeaderRole } from "./roles/AdminHeaderRole";
import { PersonalHeaderRole } from "./roles/PersonalHeaderRole";
import { BusinessHeaderRole } from "./roles/BusinessHeaderRole";

export default function Header({
  showSearch = true,
  variant = "white",
  backgroundClassName,
  searchLayout = "floating",
  forceSearchOpen = false,
  forcePersonalMode = false,
  topPosition = "top-6",
  reducedPadding = false,
  whiteText = true,
  heroMode = false,
  heroSearchButton = false,
}: {
  showSearch?: boolean;
  variant?: "white" | "frosty";
  backgroundClassName?: string;
  searchLayout?: "floating" | "stacked";
  forceSearchOpen?: boolean;
  forcePersonalMode?: boolean;
  topPosition?: string;
  reducedPadding?: boolean;
  whiteText?: boolean;
  heroMode?: boolean;
  heroSearchButton?: boolean;
}) {
  const {
    authLoading,
    isGuest,
    isAdminUser,
    isBusinessAccountUser,
    isCheckingBusinessOwner,
    hasOwnedBusinesses,
    logout,
    unreadCount,
    messageUnreadCount,
    savedCount,
    pathname,
    navLinks,
    isStackedLayout,
    isNavReady,
    isDiscoverActive,
    isNotificationsActive,
    isMessagesActive,
    isProfileActive,
    isSettingsActive,
    isClaimBusinessActive,
    isMobileMenuOpen,
    isDiscoverDropdownOpen,
    isDiscoverDropdownClosing,
    discoverMenuPos,
    headerRef,
    discoverDropdownRef,
    discoverMenuPortalRef,
    discoverBtnRef,
    handleNavClick,
    openDiscoverDropdown,
    closeDiscoverDropdown,
    scheduleDiscoverDropdownClose,
    clearDiscoverHoverTimeout,
    setShowSearchBar,
    setIsMobileMenuOpen,
    fontStyle: sf,
  } = useHeaderState({ searchLayout, forceSearchOpen, forcePersonalMode });

  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  
  // Prefetch critical routes for instant navigation
  usePrefetchRoutes();
  const desktopSearchWrapRef = useRef<HTMLDivElement>(null);
  const mobileSearchWrapRef = useRef<HTMLDivElement>(null);
  const homeDesktopRowRef = useRef<HTMLDivElement>(null);
  const homeDesktopNavRef = useRef<HTMLDivElement>(null);
  const homeDesktopIconsRef = useRef<HTMLDivElement>(null);
  
  // Get search query from URL params
  const urlSearchQuery = searchParams.get('search') || '';
  
  const [headerSearchQuery, setHeaderSearchQuery] = useState(urlSearchQuery);
  const [headerPlaceholder, setHeaderPlaceholder] = useState(
    "Search..."
  );
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isDesktopSearchExpanded, setIsDesktopSearchExpanded] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number>(-1);
  const [desktopSearchExpandedWidth, setDesktopSearchExpandedWidth] = useState(280);

  const {
    query: suggestionQuery,
    setQuery: setSuggestionQuery,
    loading: suggestionsLoading,
    results: suggestionResults,
  } = useLiveSearch({ initialQuery: urlSearchQuery, debounceMs: 120 });
  const effectiveIsGuest = isGuest;
  const effectiveIsAdminUser = isAdminUser;
  const effectiveIsBusinessAccountUser = isBusinessAccountUser;
  const effectiveNavLinks = navLinks;

  // Sync local state with URL params
  useEffect(() => {
    setHeaderSearchQuery(urlSearchQuery);
    // Open mobile search if there's a search query
    if (urlSearchQuery) {
      setIsMobileSearchOpen(true);
    }
  }, [urlSearchQuery]);

  const isSearchActive = headerSearchQuery.trim().length > 0;

  useEffect(() => {
    setSuggestionQuery(headerSearchQuery);
  }, [headerSearchQuery, setSuggestionQuery]);

  const isSuggestionsOpen =
    headerSearchQuery.trim().length > 0 &&
    (isDesktopSearchExpanded || isMobileSearchOpen);

  const cappedSuggestions = useMemo(() => {
    const list = Array.isArray(suggestionResults) ? suggestionResults : [];
    return list.slice(0, 6);
  }, [suggestionResults]);

  const isHomePage = pathname === "/" || pathname === "/home";
  const isHomepageHeroOverlay = isHomePage && urlSearchQuery.trim().length === 0;
  const [isHomepageAtTop, setIsHomepageAtTop] = useState(() =>
    typeof window === "undefined" ? true : window.scrollY <= 0.5
  );

  useEffect(() => {
    if (!isHomepageHeroOverlay) {
      setIsHomepageAtTop(true);
      return;
    }

    let rafId = 0;
    const updateScrollState = () => {
      const nextAtTop = window.scrollY <= 0.5;
      setIsHomepageAtTop((prev) => (prev === nextAtTop ? prev : nextAtTop));
    };

    const onScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        updateScrollState();
      });
    };

    updateScrollState();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
    };
  }, [isHomepageHeroOverlay]);

  const headerClassName = `${
    isHomepageHeroOverlay ? "fixed" : "sticky"
  } top-0 left-0 right-0 w-full z-50 pt-[var(--safe-area-top)] transition-colors duration-300 ease-out`;
  const headerSurfaceClass =
    isHomepageHeroOverlay && isHomepageAtTop
      ? "bg-transparent shadow-none"
      : "bg-navbar-bg shadow-md";

  const isPersonalLayout =
    !effectiveIsBusinessAccountUser && !effectiveIsAdminUser;

  // Role-aware logo href:
  // - Business accounts Ã¢â€ â€™ /my-businesses
  // - Personal accounts Ã¢â€ â€™ /home
  // - Guests Ã¢â€ â€™ /home?guest=true
  const logoHref = effectiveIsGuest
    ? "/home?guest=true" 
    : getLogoHref(effectiveIsBusinessAccountUser);
  const messagesHref = effectiveIsGuest
    ? "/onboarding"
    : effectiveIsBusinessAccountUser
      ? "/my-businesses/messages"
      : "/dm";



  useEffect(() => {
    const setByViewport = () => {
      setHeaderPlaceholder(
        window.innerWidth >= 1024
          ? "Search businesses..."
          : "Search..."
      );
    };
    setByViewport();
    window.addEventListener("resize", setByViewport);
    return () => window.removeEventListener("resize", setByViewport);
  }, []);


  // Keep home desktop nav links perfectly centered by capping search expansion
  // to the right-side space that remains after center nav + icons.
  useEffect(() => {
    if (!isHomePage || !isPersonalLayout) {
      setDesktopSearchExpandedWidth(280);
      return;
    }

    // Keep enough room for the input to actually show when expanded.
    // Using a larger min width prevents the search from collapsing to the same
    // size as the trigger button on tighter desktop widths.
    const minWidth = 180;
    const preferredWidth = 280;
    const interItemGap = 12; // gap-3 between search and icons
    const centerClearance = 16;

    const recalc = () => {
      if (window.innerWidth < 1024) {
        setDesktopSearchExpandedWidth(preferredWidth);
        return;
      }

      const rowWidth = homeDesktopRowRef.current?.clientWidth ?? 0;
      const navWidth = homeDesktopNavRef.current?.offsetWidth ?? 0;
      const iconsWidth = homeDesktopIconsRef.current?.offsetWidth ?? 0;

      if (!rowWidth || !navWidth) {
        setDesktopSearchExpandedWidth(preferredWidth);
        return;
      }

      const sideSpace = (rowWidth - navWidth) / 2;
      const availableForSearch = Math.max(
        0,
        Math.floor(sideSpace - iconsWidth - interItemGap - centerClearance)
      );

      // If there isn't enough free space to keep the nav perfectly centred,
      // still give the search a readable width and allow the grid to reflow slightly.
      const targetWidth =
        availableForSearch < minWidth
          ? Math.min(preferredWidth, Math.max(minWidth, Math.floor(sideSpace - centerClearance)))
          : Math.min(preferredWidth, availableForSearch);

      setDesktopSearchExpandedWidth(Number.isFinite(targetWidth) ? targetWidth : preferredWidth);
    };

    recalc();

    const observer = new ResizeObserver(recalc);
    if (homeDesktopRowRef.current) observer.observe(homeDesktopRowRef.current);
    if (homeDesktopNavRef.current) observer.observe(homeDesktopNavRef.current);
    if (homeDesktopIconsRef.current) observer.observe(homeDesktopIconsRef.current);
    window.addEventListener("resize", recalc);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", recalc);
    };
  }, [isHomePage, isPersonalLayout]);

  // Update URL with search query (debounced for live search)
  const updateSearchUrl = useCallback((query: string) => {
    if (!isHomePage) return;
    
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    if (query.trim()) {
      params.set("search", query.trim());
    } else {
      params.delete("search");
    }
    const searchString = params.toString();
    const basePath = pathname === "/home" ? "/home" : "/";
    router.replace(`${basePath}${searchString ? `?${searchString}` : ""}`, { scroll: false });
  }, [isHomePage, pathname, router]);

  // Handle live search input change with debounce
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setHeaderSearchQuery(value);
    
    // Debounce URL update for live search (300ms)
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      updateSearchUrl(value);
    }, 300);
  };

  // Handle search form submit (immediate, no debounce)
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Clear any pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    if (isHomePage) {
      // Immediate URL update
      updateSearchUrl(headerSearchQuery);
    } else {
      // Navigate to home with search param for non-home pages
      const params = new URLSearchParams();
      if (headerSearchQuery.trim()) {
        params.set("search", headerSearchQuery.trim());
      }
      router.push(`/?${params.toString()}`);
    }
  };

  // Handle clear search
  const handleClearSearch = () => {
    // Clear any pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    setHeaderSearchQuery("");
    if (isHomePage) {
      updateSearchUrl("");
    }
    inputRef.current?.focus();
    mobileInputRef.current?.focus();
  };

  const collapseDesktopSearch = useCallback(() => {
    setIsDesktopSearchExpanded(false);
    setActiveSuggestionIndex(-1);
  }, []);

  const expandDesktopSearch = useCallback(() => {
    setIsDesktopSearchExpanded(true);
    setActiveSuggestionIndex(-1);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  // Close suggestions when clicking outside (desktop + mobile overlay)
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      const inDesktop = desktopSearchWrapRef.current?.contains(target);
      const inMobile = mobileSearchWrapRef.current?.contains(target);
      if (!inDesktop && !inMobile) {
        collapseDesktopSearch();
        setActiveSuggestionIndex(-1);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [collapseDesktopSearch]);

  // Body scroll lock when mobile suggestions are visible
  useEffect(() => {
    if (isSuggestionsOpen && isMobileSearchOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [isSuggestionsOpen, isMobileSearchOpen]);

  // Close search on route change
  useEffect(() => {
    setIsMobileSearchOpen(false);
    collapseDesktopSearch();
  }, [pathname, collapseDesktopSearch]);

  const navigateToSuggestion = useCallback(
    (item: LiveSearchResult) => {
      if (!item?.id) return;
      collapseDesktopSearch();
      setIsMobileSearchOpen(false);
      setActiveSuggestionIndex(-1);
      router.push(`/business/${item.id}`);
    },
    [collapseDesktopSearch, router]
  );

  // Handle "View all" button click - preserve search state during navigation
  const handleViewAll = useCallback(() => {
    const q = headerSearchQuery.trim();
    if (!q) return;
    
    // Capture current state before any changes
    const capturedQuery = q;
    
    // Only close the modal UI - do NOT clear search query or results
    // This ensures smooth transition without flashing empty state
    collapseDesktopSearch();
    setIsMobileSearchOpen(false);
    setActiveSuggestionIndex(-1);

    // Navigate immediately with captured query params
    const params = new URLSearchParams();
    params.set("search", capturedQuery);
    router.push(`/home?${params.toString()}`);
  }, [collapseDesktopSearch, headerSearchQuery, router]);

  // Handle general search navigation (form submit, enter key)
  const navigateToSearchResults = useCallback(() => {
    const q = headerSearchQuery.trim();
    if (!q) return;
    
    // For general navigation, we can still close modal and navigate normally
    collapseDesktopSearch();
    setIsMobileSearchOpen(false);
    setActiveSuggestionIndex(-1);

    const params = new URLSearchParams();
    params.set("search", q);
    router.push(`/home?${params.toString()}`);
  }, [collapseDesktopSearch, headerSearchQuery, router]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isSuggestionsOpen) return;
    const max = cappedSuggestions.length;
    if (e.key === "Escape") {
      e.preventDefault();
      collapseDesktopSearch();
      setIsMobileSearchOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (max === 0) return;
      setActiveSuggestionIndex((prev) => (prev + 1) % max);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (max === 0) return;
      setActiveSuggestionIndex((prev) => (prev - 1 + max) % max);
      return;
    }
    if (e.key === "Enter" && activeSuggestionIndex >= 0) {
      e.preventDefault();
      const chosen = cappedSuggestions[activeSuggestionIndex];
      if (chosen) navigateToSuggestion(chosen);
    }
  };

    const handleMobileSearchToggle = () => {
    setIsMobileSearchOpen(!isMobileSearchOpen);
    if (!isMobileSearchOpen) {
      window.setTimeout(() => {
        mobileInputRef.current?.focus();
      }, 100);
    }
  };
useEffect(() => {
    if (effectiveIsAdminUser) {
      void router.prefetch('/onboarding');
    }
  }, [effectiveIsAdminUser, router]);

  const handleAdminSignOut = useCallback(() => {
    void logout();
  }, [logout]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

    const renderDesktopSearchInput = (expandedWidth: number = 280) => (
    <DesktopHeaderSearch
      wrapperRef={desktopSearchWrapRef}
      inputRef={inputRef}
      expandedWidth={expandedWidth}
      isExpanded={isDesktopSearchExpanded}
      headerSearchQuery={headerSearchQuery}
      headerPlaceholder={headerPlaceholder}
      isSearchActive={isSearchActive}
      isSuggestionsOpen={isSuggestionsOpen}
      suggestionsLoading={suggestionsLoading}
      cappedSuggestions={cappedSuggestions}
      activeSuggestionIndex={activeSuggestionIndex}
      sf={sf}
      onSubmit={handleSearchSubmit}
      onChange={handleSearchInputChange}
      onKeyDown={handleSearchKeyDown}
      onExpand={expandDesktopSearch}
      onCollapse={collapseDesktopSearch}
      onClearSearch={handleClearSearch}
      onSetActiveSuggestionIndex={setActiveSuggestionIndex}
      onNavigateToSuggestion={navigateToSuggestion}
      onViewAll={handleViewAll}
    />
  );

  const renderMobileSearchInput = () => (
    <MobileHeaderSearch
      wrapperRef={mobileSearchWrapRef}
      inputRef={mobileInputRef}
      headerSearchQuery={headerSearchQuery}
      isSearchActive={isSearchActive}
      isSuggestionsOpen={isSuggestionsOpen}
      suggestionsLoading={suggestionsLoading}
      cappedSuggestions={cappedSuggestions}
      activeSuggestionIndex={activeSuggestionIndex}
      sf={sf}
      onSubmit={handleSearchSubmit}
      onChange={handleSearchInputChange}
      onKeyDown={handleSearchKeyDown}
      onClose={() => setIsMobileSearchOpen(false)}
      onClearSearch={handleClearSearch}
      onSetActiveSuggestionIndex={setActiveSuggestionIndex}
      onNavigateToSuggestion={navigateToSuggestion}
      onViewAll={handleViewAll}
    />
  );
const currentPaddingClass = heroMode ? "py-0" : reducedPadding ? "py-1" : "py-4";
  const horizontalPaddingClass = heroMode
    ? "px-2"
    : `px-2 ${currentPaddingClass}`;

  const desktopNavProps = {
    whiteText,
    isGuest: effectiveIsGuest,
    isBusinessAccountUser: effectiveIsBusinessAccountUser,
    isClaimBusinessActive,
    isDiscoverActive,
    primaryLinks: effectiveNavLinks.primaryLinks,
    discoverLinks: effectiveNavLinks.discoverLinks,
    businessLinks: effectiveNavLinks.businessLinks,
    isNotificationsActive,
    isMessagesActive,
    isProfileActive,
    isSettingsActive,
    savedCount,
    unreadCount,
    messageUnreadCount,
    handleNavClick,
    discoverDropdownRef,
    discoverMenuPortalRef,
    discoverBtnRef,
    discoverMenuPos,
    isDiscoverDropdownOpen,
    isDiscoverDropdownClosing,
    clearDiscoverHoverTimeout,
    openDiscoverDropdown,
    closeDiscoverDropdown,
    scheduleDiscoverDropdownClose,
    sf,
  };

  // Show skeleton while auth is resolving to prevent layout shift
  if (authLoading) {
    return <HeaderSkeleton showSearch={showSearch} />;
  }

  const wrapperSizeClass = "pt-4 min-h-[72px] lg:min-h-[80px]";
  const logoScaleClass = "";

  return (
    <>
      <header ref={headerRef} className={`${headerClassName} ${headerSurfaceClass}`} style={sf}>
        <div
          className={`relative z-[1] w-full ${horizontalPaddingClass} flex items-center h-full ${wrapperSizeClass}`}
        >
          {effectiveIsAdminUser ? (
            <AdminHeaderRole
              pathname={pathname}
              logoScaleClass={logoScaleClass}
              sf={sf}
              onSignOut={handleAdminSignOut}
            />
          ) : isPersonalLayout ? (
            <PersonalHeaderRole
              isHomePage={isHomePage}
              logoHref={logoHref}
              logoScaleClass={logoScaleClass}
              showSearch={showSearch}
              desktopSearchExpandedWidth={desktopSearchExpandedWidth}
              renderDesktopSearchInput={renderDesktopSearchInput}
              isMobileSearchOpen={isMobileSearchOpen}
              renderMobileSearchInput={renderMobileSearchInput}
              handleMobileSearchToggle={handleMobileSearchToggle}
              whiteText={whiteText}
              isGuest={effectiveIsGuest}
              isNotificationsActive={isNotificationsActive}
              unreadCount={unreadCount}
              messagesHref={messagesHref}
              isMessagesActive={isMessagesActive}
              messageUnreadCount={messageUnreadCount}
              isMobileMenuOpen={isMobileMenuOpen}
              setIsMobileMenuOpen={setIsMobileMenuOpen}
              homeDesktopRowRef={homeDesktopRowRef}
              homeDesktopNavRef={homeDesktopNavRef}
              homeDesktopIconsRef={homeDesktopIconsRef}
              desktopNavProps={desktopNavProps}
            />
          ) : (
            <BusinessHeaderRole
              logoHref={logoHref}
              logoScaleClass={logoScaleClass}
              desktopNavProps={desktopNavProps}
              isMobileSearchOpen={isMobileSearchOpen}
              messagesHref={messagesHref}
              isMessagesActive={isMessagesActive}
              whiteText={whiteText}
              isGuest={effectiveIsGuest}
              messageUnreadCount={messageUnreadCount}
              isBusinessAccountUser={effectiveIsBusinessAccountUser}
              isSettingsActive={isSettingsActive}
              isMobileMenuOpen={isMobileMenuOpen}
              setIsMobileMenuOpen={setIsMobileMenuOpen}
            />
          )}
        </div>
      </header>

      {/* Mobile suggestions backdrop (not for admin) */}
      {!effectiveIsAdminUser && (
        <AnimatePresence>
          {isMobileSearchOpen && isSuggestionsOpen && (
            <m.div
              key="search-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-charcoal/20 backdrop-blur-[2px] lg:hidden"
              onClick={() => {
                setIsMobileSearchOpen(false);
                setActiveSuggestionIndex(-1);
              }}
              aria-hidden
            />
          )}
        </AnimatePresence>
      )}

      {!effectiveIsAdminUser && (
        <MobileMenu
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          isBusinessAccountUser={effectiveIsBusinessAccountUser}
          isGuest={effectiveIsGuest}
          primaryLinks={effectiveNavLinks.primaryLinks}
          discoverLinks={effectiveNavLinks.discoverLinks}
          businessLinks={effectiveNavLinks.businessLinks}
          handleNavClick={handleNavClick}
          sf={sf}
        />
      )}
    </>
  );
}
