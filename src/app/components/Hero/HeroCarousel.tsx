// src/components/Hero/HeroCarousel.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import Header from "../Header/Header";

interface HeroSlide {
  id: string;
  image: string;
  title: string;
  description: string;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: "1",
    image: "/hero/restaurant_cpt.jpg",
    title: "Savor Cape Town's Flavors",
    description: "Reserve tables at trusted eateries and uncover locals' favorite dining rooms, bakeries, and coffee bars.",
  },
  {
    id: "2",
    image: "/hero/lifestyle-culture.jpg",
    title: "Neighborhood Food Finds",
    description: "Bookmark everyday spots delivering memorable meals, latte art, and late-night bites worth sharing.",
  },
  {
    id: "3",
    image: "/hero/practice-gallery-23.jpg",
    title: "Expert Care On Call",
    description: "Book trusted clinicians, therapists, and specialists who put people first and paperwork second.",
  },
  {
    id: "4",
    image: "/hero/wheelchair+and+nurse.webp",
    title: "Support For Every Journey",
    description: "Find compassionate caregivers, wellness pros, and mobility services tailored to your family's needs.",
  },
  {
    id: "5",
    image: "/hero/garden-services-9.jpg",
    title: "Services You Can Trust",
    description: "Hire vetted crews for home upgrades, garden makeovers, and fix-it projects without the guesswork.",
  },
  {
    id: "6",
    image: "/hero/outdoors-adventure.jpeg",
    title: "Escape Into Nature",
    description: "Scout sunrise hikes, coastal strolls, and adventure outfitters ready for your next breath of fresh air.",
  },
  {
    id: "7",
    image: "/hero/cpt_table_mountain.jpg",
    title: "Iconic City Moments",
    description: "Capture skyline panoramas, harbor sunsets, and mountain meetups curated by explorers who know the view.",
  },
];

const FONT_STACK = "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

export default function HeroCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLElement>(null);
  const currentIndexRef = useRef(currentIndex);
  const slides = HERO_SLIDES;

  // respect reduced motion
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const next = useCallback(() => {
    setProgress(0); // Reset progress when advancing
    setCurrentIndex((prev) => {
      const newIndex = (prev + 1) % slides.length;
      currentIndexRef.current = newIndex;
      return newIndex;
    });
  }, [slides.length]);
  const prev = useCallback(() => {
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
    if (prefersReduced || paused) {
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

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setProgress(0); // Reset progress when manually navigating
    setPaused(true);
  };

  return (
    <>
      <div className="relative w-full px-0 top-0">
        {/* Header */}
        <Header 
          showSearch={true} 
          variant="white"
          backgroundClassName="bg-navbar-bg"
          topPosition="top-0"
          reducedPadding={true}
          whiteText={true}
        />
        
        {/* Hero Section */}
        <section
          ref={containerRef as React.RefObject<HTMLElement>}
          className="relative h-[100vh] w-full overflow-hidden outline-none rounded-none"
          aria-label="Hero carousel"
          tabIndex={0}
          style={{ fontFamily: FONT_STACK }}
        >
      {/* Liquid Glass Ambient Lighting */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-sage/10 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.15)_0%,_transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 backdrop-blur-[1px] bg-off-white/5 mix-blend-overlay pointer-events-none" />
      {/* Slides */}
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          aria-hidden={index !== currentIndex}
          className={`absolute inset-0 w-auto h-auto overflow-hidden transition-opacity duration-700 will-change-transform ${
            index === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
        >
           {/* Full Background Image - All Screen Sizes */}
           <div className="absolute inset-0">
             <Image
               src={slide.image}
               alt={slide.title}
               fill
               priority={index === 0}
               quality={100}
               className="object-cover scale-[1.02]"
               style={{ filter: "brightness(1.05) contrast(1.08) saturate(1.12)" }}
               sizes="100vw"
             />
             {/* Overlay for text readability */}
             <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
           </div>

           {/* Content - Text Left Aligned */}
           <div className="absolute inset-0 z-20 flex items-center pt-16 pb-12">
            <div className="mx-auto w-full max-w-[2200px] px-4 sm:px-8 xl:px-12 2xl:px-16">
               <div className="max-w-lg sm:max-w-lg lg:max-w-2xl xl:max-w-3xl">
                 {/* Text Content */}
                 <div className="relative">
                  <h1
                     className="text-off-white leading-[1.1] mb-6 sm:mb-6 font-extrabold tracking-tight whitespace-normal lg:whitespace-nowrap"
                     style={{
                       fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                       fontSize: "clamp(36px, 6vw, 48px)",
                     }}
                   >
                     {slide.title}
                   </h1>
           <p
             className="text-off-white/90 leading-relaxed mb-8 whitespace-normal lg:whitespace-nowrap lg:max-w-none"
             style={{
              fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
              fontWeight: 600,
              fontSize: "clamp(18px, 2vw, 20px)",
               maxWidth: "70ch",
               textWrap: "pretty" as CSSProperties["textWrap"],
               hyphens: "none" as CSSProperties["hyphens"],
               wordBreak: "normal" as CSSProperties["wordBreak"],
             }}
           >
                     {slide.description}
                   </p>
                 </div>
               </div>
             </div>
           </div>
        </div>
      ))}

      {/* Accessible live region (announces slide title) */}
      <div className="sr-only" aria-live="polite">
        {slides[currentIndex]?.title}
      </div>

      {/* Minimal Progress Indicators */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-3">
        {/* Dot Indicators */}
        <div className="flex items-center gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`transition-all duration-300 rounded-full focus:outline-none focus:ring-2 focus:ring-white/50 ${
                index === currentIndex
                  ? "w-2 h-2 bg-white"
                  : "w-1.5 h-1.5 bg-white/40 hover:bg-white/60"
              }`}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === currentIndex ? "true" : "false"}
            />
          ))}
        </div>
      </div>
        </section>
      </div>
    </>
  );
}
