// src/components/Hero/HeroCarousel.tsx
"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SearchInput from "../SearchInput/SearchInput";
import FilterModal, { FilterState } from "../FilterModal/FilterModal";
import ActiveFilterBadges from "../FilterActiveBadges/ActiveFilterBadges";
import WavyTypedTitle from "../../../components/Animations/WavyTypedTitle";
import HeroSkeleton from "./HeroSkeleton";
import { useAuth } from '../../contexts/AuthContext';
import { getBrowserSupabase } from '../../lib/supabase/client';
import { STORAGE_BUCKETS } from '../../lib/utils/storageBucketConfig';

interface HeroSlide {
  id: string;
  image: string;
  title: string;
  description: string;
}

const HERO_IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif"]);

const HERO_COPY = [
  {
    title: "Discover Local Gems",
    description: "Explore amazing local businesses, restaurants, and experiences in your city",
  },
  {
    title: "What's Trending Now",
    description: "See what everyone is talking about right now",
  },
  {
    title: "Personalized For You",
    description: "Get recommendations tailored to your interests",
  },
  {
    title: "Connect with Locals",
    description: "Support local businesses and discover hidden treasures",
  },
];

const shuffleImages = (images: string[]): string[] => {
  const result = [...images];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const FONT_STACK = "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

const buildSlides = (images: string[]): HeroSlide[] => {
  const randomized = shuffleImages(images);
  return randomized.map((image, index) => {
    const copy = HERO_COPY[index % HERO_COPY.length];
    return {
      id: `${index + 1}`,
      image,
      title: copy.title,
      description: copy.description,
    };
  });
};

const getFileExtension = (name: string): string =>
  name.split(".").pop()?.toLowerCase() ?? "";

export default function HeroCarousel() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [isHeroReady, setIsHeroReady] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [heroImages, setHeroImages] = useState<string[]>([]);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLElement>(null);
  const currentIndexRef = useRef(currentIndex);
  const slides = useMemo(() => buildSlides(heroImages), [heroImages]);
  const slidesRef = useRef<HeroSlide[]>(slides);

  useEffect(() => {
    slidesRef.current = slides;
  }, [slides]);

  useEffect(() => {
    if (currentIndex >= slides.length) {
      setCurrentIndex(0);
      currentIndexRef.current = 0;
      setProgress(0);
    }
  }, [currentIndex, slides.length]);

  useEffect(() => {
    let isMounted = true;

    const loadHeroImages = async () => {
      try {
        const supabase = getBrowserSupabase();
        const { data, error } = await supabase.storage
          .from(STORAGE_BUCKETS.HERO_IMAGES)
          .list("", { limit: 200, sortBy: { column: "name", order: "asc" } });

        if (error || !data) {
          return;
        }

        const imagePaths = data
          .map((item) => item.name)
          .filter((name) => HERO_IMAGE_EXTENSIONS.has(getFileExtension(name)));

        if (imagePaths.length === 0) {
          return;
        }

        const imageUrls = imagePaths.map((path) =>
          supabase.storage.from(STORAGE_BUCKETS.HERO_IMAGES).getPublicUrl(path).data.publicUrl
        );

        if (isMounted && imageUrls.length > 0) {
          setHeroImages(imageUrls);
        }
      } catch (loadError) {
        console.warn("HeroCarousel: failed to load hero images from storage.", loadError);
      }
    };

    loadHeroImages();

    return () => {
      isMounted = false;
    };
  }, []);

  // Mark hero as ready once auth state is known
  useEffect(() => {
    if (!authLoading) {
      setIsHeroReady(true);
    }
  }, [authLoading]);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filters, setFilters] = useState<FilterState>({ minRating: null, distance: null });
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // respect reduced motion
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Prefetch a few hero images once auth state is known to warm the cache.
  useEffect(() => {
    if (!isHeroReady || typeof window === "undefined" || slides.length === 0) return;

    const prefetchCount = 4;
    const imagesToPrefetch = slides.slice(0, prefetchCount).map((slide) => slide.image);

    const prefetch = () => {
      imagesToPrefetch.forEach((src) => {
        const img = new window.Image();
        img.src = src;
      });
    };

    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(prefetch);
    } else {
      setTimeout(prefetch, 0);
    }
  }, [isHeroReady, slides]);

  const next = useCallback(() => {
    if (slides.length === 0) return;
    setProgress(0); // Reset progress when advancing
    setCurrentIndex((prev) => {
      const newIndex = (prev + 1) % slides.length;
      currentIndexRef.current = newIndex;
      return newIndex;
    });
  }, [slides.length]);
  const prev = useCallback(() => {
    if (slides.length === 0) return;
    setProgress(0); // Reset progress when going back
    setCurrentIndex((prev) => {
      const newIndex = (prev - 1 + slides.length) % slides.length;
      currentIndexRef.current = newIndex;
      return newIndex;
    });
  }, [slides.length]);

  // Update ref when currentIndex changes
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  // Progress animation for each slide
  useEffect(() => {
    if (prefersReduced || paused || slides.length === 0) {
      // Clear progress timer when paused
      if (progressRef.current) {
        clearInterval(progressRef.current);
        progressRef.current = null;
      }
      return;
    }

    // Reset progress when slide changes
    setProgress(0);

    // Animate progress from 0 to 100 over 8 seconds (more natural speed)
    const interval = 50; // Update every 50ms for smooth animation
    const totalDuration = 8000; // 8 seconds per slide for a more natural pace
    const steps = totalDuration / interval;
    let currentStep = 0;

    progressRef.current = setInterval(() => {
      currentStep++;
      const newProgress = Math.min((currentStep / steps) * 100, 100);
      setProgress(newProgress);

      // When progress reaches 100%, advance to next slide
      if (newProgress >= 100) {
        if (progressRef.current) {
          clearInterval(progressRef.current);
          progressRef.current = null;
        }
        // Use the ref version of next to avoid dependency issues
        setCurrentIndex((prev) => {
          const newIndex = (prev + 1) % slides.length;
          currentIndexRef.current = newIndex;
          return newIndex;
        });
        setProgress(0);
      }
    }, interval);

    return () => {
      if (progressRef.current) {
        clearInterval(progressRef.current);
        progressRef.current = null;
      }
    };
  }, [prefersReduced, paused, currentIndex, slides.length]);

  // pause when tab is hidden
  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // keyboard navigation
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        setPaused(true);
        next();
      } else if (e.key === "ArrowLeft") {
        setPaused(true);
        prev();
      }
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [next, prev]);

  // swipe gestures (mobile)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let startX = 0;
    let deltaX = 0;
    const threshold = 40;

    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      deltaX = 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      deltaX = e.touches[0].clientX - startX;
    };
    const onTouchEnd = () => {
      if (Math.abs(deltaX) > threshold) {
        setPaused(true);
        if (deltaX < 0) next();
        else prev();
      }
      startX = 0;
      deltaX = 0;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [next, prev]);

  const handleUpdateFilter = (filterType: 'minRating' | 'distance', value: number | string | null) => {
    const newFilters = { ...filters, [filterType]: value };
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({ minRating: null, distance: null });
  };

  const goToSlide = (index: number) => {
    if (slides.length === 0) return;
    setCurrentIndex(index);
    setProgress(0); // Reset progress when manually navigating
    setPaused(true);
  };

  // Filter handlers
  const openFilters = () => {
    if (isFilterVisible) return;
    setIsFilterVisible(true);
    setTimeout(() => setIsFilterOpen(true), 10);
  };

  const closeFilters = () => {
    setIsFilterOpen(false);
    setTimeout(() => setIsFilterVisible(false), 150);
  };

  const handleFiltersChange = (f: FilterState) => {
    // Navigate to explore page with filters applied via URL params
    const params = new URLSearchParams();
    if (f.categories && f.categories.length > 0) {
      params.set('categories', f.categories.join(','));
    }
    if (f.minRating !== null) {
      params.set('min_rating', f.minRating.toString());
    }
    if (f.distance) {
      params.set('distance', f.distance);
    }

    const queryString = params.toString();
    const exploreUrl = queryString ? `/explore?${queryString}` : '/explore';
    router.push(exploreUrl);
    closeFilters();
  };

  const handleSubmitQuery = (query: string) => {
    // Navigate to explore page with search query
    const params = new URLSearchParams();
    if (query.trim()) {
      params.set('search', query.trim());
    }
    const queryString = params.toString();
    const exploreUrl = queryString ? `/explore?${queryString}` : '/explore';
    router.push(exploreUrl);
  };

  // Show skeleton while auth is loading
  if (!isHeroReady) {
    return <HeroSkeleton />;
  }

  if (slides.length === 0) {
    return <HeroSkeleton />;
  }

  return (
    <>
      {/* Hero Container with padding */}
      <div className="relative w-full px-0 lg:px-0 py-2 pt-0">
        {/* Hero Section with rounded corners - 75vh responsive height */}
        <section
          ref={containerRef as React.RefObject<HTMLElement>}
          className="relative h-[80svh] h-[80dvh] md:h-[80vh] lg:h-[80vh] w-full overflow-hidden outline-none rounded-none md:rounded-none lg:rounded-none min-h-[400px] shadow-md"
          aria-label="Hero carousel"
          tabIndex={0}
          style={{ fontFamily: FONT_STACK }}
        >
          {/* Liquid Glass Ambient Lighting */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-sage/10 pointer-events-none rounded-none md:rounded-none lg:rounded-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.15)_0%,_transparent_70%)] pointer-events-none rounded-none md:rounded-none lg:rounded-none" />
      <div className="absolute inset-0 backdrop-blur-[1px] bg-off-white/5 mix-blend-overlay pointer-events-none rounded-none md:rounded-none lg:rounded-none" />
      {/* Slides */}
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          aria-hidden={index !== currentIndex}
          className={`absolute inset-0 w-auto h-auto overflow-hidden transition-opacity duration-1000 ease-in-out will-change-transform rounded-none md:rounded-none lg:rounded-none ${
            index === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
        >
           {/* Full Background Image - All Screen Sizes */}
           <div className="absolute inset-0 rounded-none md:rounded-none lg:rounded-none overflow-hidden px-0 mx-0">
             <Image
               src={slide.image}
               alt={slide.title}
               fill
               priority={index === 0}
               loading={index === 0 ? "eager" : "lazy"}
               fetchPriority={index === 0 ? "high" : "auto"}
               quality={95}
               className="object-cover scale-[1.02]"
               style={{ filter: "brightness(0.95) contrast(1.05) saturate(1.1)" }}
               sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 80vw"
             />
             {/* Multi-layered overlay for optimal text readability */}
             <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />
             <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40" />
             <div className="absolute inset-0 bg-black/20" />
           </div>

           {/* Left-aligned Text - Aligned with navbar left edge */}
           <div className="absolute inset-0 z-20 flex items-center justify-center w-full pt-[var(--header-height)] -translate-y-4">
             <div className="w-full flex flex-col items-center justify-center text-center pb-20">
               <h2 
                 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-off-white drop-shadow-lg mb-4"
                 style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
               >
                 Discover local gems
               </h2>
               <p 
                 className="text-base sm:text-lg lg:text-xl text-off-white/90 drop-shadow-md max-w-xl mb-6"
                 style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 500 }}
               >
                 {slide.description}
               </p>
               
               {/* Conditional CTA Button: Sign In for unauthenticated, Discover for authenticated */}
               {!user ? (
                 <Link
                   href="/login"
                   className="group relative inline-block rounded-full py-3 px-12 text-base font-semibold text-white text-center bg-gradient-to-r from-coral to-coral/80 hover:from-sage hover:to-sage transition-all duration-300 shadow-lg hover:shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-sage/30 focus-visible:ring-offset-2 min-w-[180px]"
                   style={{
                     fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                     fontWeight: 600,
                   }}
                 >
                   <span className="relative z-10">Sign In</span>
                 </Link>
               ) : (
                 <Link
                   href="/trending"
                   className="group relative inline-block rounded-full py-3 px-12 text-base font-semibold text-white text-center bg-gradient-to-r from-coral to-coral/80 hover:from-sage hover:to-sage transition-all duration-300 shadow-lg hover:shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-sage/30 focus-visible:ring-offset-2 min-w-[180px]"
                   style={{
                     fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                     fontWeight: 600,
                   }}
                 >
                   <span className="relative z-10">Discover</span>
                 </Link>
               )}
             </div>
           </div>
        </div>
      ))}

      {/* Accessible live region (announces slide title) */}
      <div className="sr-only" aria-live="polite">
        {slides[currentIndex]?.title}
      </div>

      {/* Minimal Progress Indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-3">
        {/* Dot Indicators */}
        <div className="flex items-center gap-2.5">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`transition-all duration-500 ease-in-out rounded-full focus:outline-none focus:ring-2 focus:ring-white/50 hover:scale-110 ${
                index === currentIndex
                  ? "w-8 h-2 bg-white shadow-lg"
                  : "w-2 h-2 bg-white/40 hover:bg-white/70"
              }`}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === currentIndex ? "true" : "false"}
            />
          ))}
        </div>
      </div>
        </section>
      </div>

      {/* Filter Modal Portal */}
      {isFilterVisible && (
        <div className="fixed inset-0 z-50">
          <FilterModal
            isOpen={isFilterOpen}
            isVisible={isFilterVisible}
            onClose={closeFilters}
            onFiltersChange={handleFiltersChange}
            initialFilters={filters}
          />
        </div>
      )}
    </>
  );
}
