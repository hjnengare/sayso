"use client";

import type { CSSProperties, ChangeEvent, FormEvent, KeyboardEvent, RefObject } from "react";
import { Search, X } from "@/app/lib/icons";
import { AnimatePresence, m } from "framer-motion";

import type { LiveSearchResult } from "../../hooks/useLiveSearch";

type SuggestionsDropdownProps = {
  mode: "desktop" | "mobile";
  desktopWidth?: number;
  isOpen: boolean;
  loading: boolean;
  suggestions: LiveSearchResult[];
  activeSuggestionIndex: number;
  sf: CSSProperties;
  onSetActiveSuggestionIndex: (index: number) => void;
  onNavigateToSuggestion: (item: LiveSearchResult) => void;
  onViewAll: () => void;
};

type DesktopHeaderSearchProps = {
  wrapperRef: RefObject<HTMLDivElement | null>;
  inputRef: RefObject<HTMLInputElement | null>;
  expandedWidth: number;
  isExpanded: boolean;
  headerSearchQuery: string;
  headerPlaceholder: string;
  isSearchActive: boolean;
  isSuggestionsOpen: boolean;
  suggestionsLoading: boolean;
  cappedSuggestions: LiveSearchResult[];
  activeSuggestionIndex: number;
  sf: CSSProperties;
  onSubmit: (event: FormEvent) => void;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onExpand: () => void;
  onCollapse: () => void;
  onClearSearch: () => void;
  onSetActiveSuggestionIndex: (index: number) => void;
  onNavigateToSuggestion: (item: LiveSearchResult) => void;
  onViewAll: () => void;
};

type MobileHeaderSearchProps = {
  wrapperRef: RefObject<HTMLDivElement | null>;
  inputRef: RefObject<HTMLInputElement | null>;
  headerSearchQuery: string;
  isSearchActive: boolean;
  isSuggestionsOpen: boolean;
  suggestionsLoading: boolean;
  cappedSuggestions: LiveSearchResult[];
  activeSuggestionIndex: number;
  sf: CSSProperties;
  onSubmit: (event: FormEvent) => void;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onClose: () => void;
  onClearSearch: () => void;
  onSetActiveSuggestionIndex: (index: number) => void;
  onNavigateToSuggestion: (item: LiveSearchResult) => void;
  onViewAll: () => void;
};

function HeaderSuggestionsDropdown({
  mode,
  desktopWidth = 280,
  isOpen,
  loading,
  suggestions,
  activeSuggestionIndex,
  sf,
  onSetActiveSuggestionIndex,
  onNavigateToSuggestion,
  onViewAll,
}: SuggestionsDropdownProps) {
  const show = isOpen && (loading || suggestions.length > 0);
  const widthClass = mode === "desktop" ? "" : "w-full";
  const topClass = mode === "desktop" ? "top-[44px] right-0" : "top-[56px] left-0 right-0";

  return (
    <AnimatePresence>
      {show && (
        <m.div
          initial={{ opacity: 0, y: 8, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.99 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className={`absolute ${topClass} ${widthClass} z-[100] rounded-[14px] bg-off-white/95 backdrop-blur-xl shadow-[0_18px_50px_rgba(0,0,0,0.18),0_8px_20px_rgba(0,0,0,0.10)] overflow-hidden`}
          style={mode === "desktop" ? { width: desktopWidth } : undefined}
          role="listbox"
          aria-label="Search suggestions"
          onMouseDown={(event) => event.preventDefault()}
        >
          <div className="px-4 py-3 border-b border-charcoal/10 flex items-center justify-between">
            <div className="text-xs font-semibold text-charcoal/70" style={sf}>
              Suggestions
            </div>
            <button
              type="button"
              className="text-xs font-semibold text-coral hover:underline"
              style={sf}
              onClick={onViewAll}
            >
              View all
            </button>
          </div>

          <div className="py-2">
            {loading && suggestions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-charcoal/60" style={sf}>
                Searching...
              </div>
            ) : (
              suggestions.map((item, index) => {
                const isActive = index === activeSuggestionIndex;
                const label = (item as LiveSearchResult & { category_label?: string }).category_label ?? item.category ?? "";

                return (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onMouseEnter={() => onSetActiveSuggestionIndex(index)}
                    onClick={() => onNavigateToSuggestion(item)}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors duration-150 ${
                      isActive ? "bg-gradient-to-r from-sage/10 to-coral/5" : "hover:bg-charcoal/5"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-charcoal truncate" style={sf}>
                        {item.name}
                      </div>
                      <div className="text-xs text-charcoal/60 truncate" style={sf}>
                        {label ? `${label} - ` : ""}
                        {item.location}
                      </div>
                    </div>
                    <div className="text-xs text-charcoal/40" style={sf}>
                      Enter
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}

export function DesktopHeaderSearch({
  wrapperRef,
  inputRef,
  expandedWidth,
  isExpanded,
  headerSearchQuery,
  headerPlaceholder,
  isSearchActive,
  isSuggestionsOpen,
  suggestionsLoading,
  cappedSuggestions,
  activeSuggestionIndex,
  sf,
  onSubmit,
  onChange,
  onKeyDown,
  onExpand,
  onCollapse,
  onClearSearch,
  onSetActiveSuggestionIndex,
  onNavigateToSuggestion,
  onViewAll,
}: DesktopHeaderSearchProps) {
  return (
    <div ref={wrapperRef} className="relative h-10 flex justify-end shrink-0" style={{ width: expandedWidth }}>
      <m.form
        onSubmit={onSubmit}
        initial={false}
        animate={{ width: isExpanded ? expandedWidth : 44 }}
        transition={{ type: "spring", stiffness: 520, damping: 44, mass: 0.85 }}
        className="absolute right-0 top-0 h-10"
        style={{ transformOrigin: "right center" }}
      >
        <div className="relative h-10">
          {!isExpanded && (
            <button
              type="button"
              onClick={onExpand}
              className="mi-tap w-11 h-10 flex items-center justify-center rounded-full bg-off-white/95 border border-charcoal/10 transition-[color,transform] duration-200 ease-in-out lg:hover:scale-105 lg:focus-visible:scale-105"
              aria-label="Open search"
            >
              <Search className="w-4 h-4 text-charcoal/60" strokeWidth={2} />
            </button>
          )}

          <AnimatePresence initial={false}>
            {isExpanded && (
              <m.div
                key="desktop-search-expanded"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="relative"
              >
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none z-10">
                  <Search className="w-4 h-4 text-charcoal/50" strokeWidth={2} />
                </div>

                <div className="absolute inset-y-0 right-2 flex items-center z-10">
                  <button
                    type="button"
                    onClick={() => {
                      if (headerSearchQuery) {
                        onClearSearch();
                      }
                      onCollapse();
                    }}
                    className="mi-tap flex items-center justify-center w-7 h-7 rounded-full text-charcoal/60 hover:text-charcoal transition-[color,transform] duration-150 ease-in-out lg:hover:scale-105 lg:focus-visible:scale-105"
                    aria-label={headerSearchQuery ? "Clear search" : "Close search"}
                  >
                    <X className="w-4 h-4" strokeWidth={2} />
                  </button>
                </div>

                <input
                  ref={inputRef}
                  type="text"
                  value={headerSearchQuery}
                  onChange={onChange}
                  onKeyDown={onKeyDown}
                  onFocus={onExpand}
                  onBlur={() => {
                    window.setTimeout(() => {
                      const activeElement = document.activeElement as HTMLElement | null;
                      if (activeElement && wrapperRef.current?.contains(activeElement)) return;
                      onCollapse();
                    }, 90);
                  }}
                  placeholder={headerPlaceholder}
                  className={`h-10 rounded-full bg-off-white text-charcoal placeholder:text-charcoal/50
                    border text-sm
                    focus:outline-none focus:bg-white focus:border-sage focus:ring-1 focus:ring-sage/30
                    hover:bg-white/90 transition-all duration-200
                    pl-9 pr-10
                    ${isSearchActive ? "border-sage bg-white" : "border-charcoal/10"}
                  `}
                  style={{
                    width: expandedWidth,
                    fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                  }}
                  aria-label="Search businesses"
                  autoComplete="off"
                />

                <HeaderSuggestionsDropdown
                  mode="desktop"
                  desktopWidth={expandedWidth}
                  isOpen={isSuggestionsOpen}
                  loading={suggestionsLoading}
                  suggestions={cappedSuggestions}
                  activeSuggestionIndex={activeSuggestionIndex}
                  sf={sf}
                  onSetActiveSuggestionIndex={onSetActiveSuggestionIndex}
                  onNavigateToSuggestion={onNavigateToSuggestion}
                  onViewAll={onViewAll}
                />
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </m.form>
    </div>
  );
}

export function MobileHeaderSearch({
  wrapperRef,
  inputRef,
  headerSearchQuery,
  isSearchActive,
  isSuggestionsOpen,
  suggestionsLoading,
  cappedSuggestions,
  activeSuggestionIndex,
  sf,
  onSubmit,
  onChange,
  onKeyDown,
  onClose,
  onClearSearch,
  onSetActiveSuggestionIndex,
  onNavigateToSuggestion,
  onViewAll,
}: MobileHeaderSearchProps) {
  return (
    <m.div
      key="mobile-search-overlay"
      className="absolute inset-x-0 top-0 bottom-0 flex items-center justify-center px-4 z-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <m.form
        initial={{ width: "36px", opacity: 0, borderRadius: "50%" }}
        animate={{ width: "92%", opacity: 1, borderRadius: "9999px" }}
        exit={{ width: "36px", opacity: 0, borderRadius: "50%" }}
        transition={{
          width: { type: "spring", stiffness: 520, damping: 44, mass: 0.85 },
          opacity: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
          borderRadius: { type: "spring", stiffness: 560, damping: 50, mass: 0.9 },
        }}
        onSubmit={onSubmit}
        className="relative origin-right"
        style={{ transformOrigin: "right center" }}
      >
        <m.div
          ref={wrapperRef}
          className="relative"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 0.18, duration: 0.2, ease: "easeOut" }}
        >
          <m.div
            className="absolute inset-y-0 left-4 flex items-center pointer-events-none z-10"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ delay: 0.22, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <Search className="w-5 h-5 text-charcoal/50" strokeWidth={2} />
          </m.div>

          <m.div
            className="absolute inset-y-0 right-2 flex items-center z-10"
            initial={{ opacity: 0, rotate: -90, scale: 0 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0 }}
            transition={{ delay: 0.28, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <button
              type="button"
              onClick={() => {
                if (headerSearchQuery) {
                  onClearSearch();
                  return;
                }
                onClose();
              }}
              className="flex items-center justify-center w-8 h-8 rounded-full text-charcoal/60 hover:text-charcoal transition-colors duration-150"
              aria-label={headerSearchQuery ? "Clear search" : "Close search"}
            >
              <X className="w-5 h-5" strokeWidth={2} />
            </button>
          </m.div>

          <input
            ref={inputRef}
            type="text"
            value={headerSearchQuery}
            onChange={onChange}
            onKeyDown={onKeyDown}
            placeholder="Search businesses..."
            className={`w-full rounded-full bg-off-white text-charcoal placeholder:text-charcoal/50
              border-2 text-base
              focus:outline-none focus:bg-white focus:border-sage focus:ring-2 focus:ring-sage/20
              transition-all duration-200
              pl-12 pr-12 py-3
              ${isSearchActive ? "border-sage bg-white" : "border-charcoal/10"}
            `}
            style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
            aria-label="Search businesses"
            autoComplete="off"
          />

          <HeaderSuggestionsDropdown
            mode="mobile"
            isOpen={isSuggestionsOpen}
            loading={suggestionsLoading}
            suggestions={cappedSuggestions}
            activeSuggestionIndex={activeSuggestionIndex}
            sf={sf}
            onSetActiveSuggestionIndex={onSetActiveSuggestionIndex}
            onNavigateToSuggestion={onNavigateToSuggestion}
            onViewAll={onViewAll}
          />
        </m.div>
      </m.form>
    </m.div>
  );
}
