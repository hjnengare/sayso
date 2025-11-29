"use client";

import { useRef, useState, useEffect } from "react";

interface ScrollableSectionProps {
  children: React.ReactNode;
  className?: string;
  showArrows?: boolean;
  arrowColor?: string;
}

export default function ScrollableSection({
  children,
  className = "",
  showArrows = true,
  arrowColor = "text-charcoal/60"
}: ScrollableSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const checkScrollPosition = () => {
    if (!scrollRef.current) return;

    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    const maxScrollLeft = scrollWidth - clientWidth;

    setCanScrollRight(maxScrollLeft > 5);
    setCanScrollLeft(scrollLeft > 5);
    setShowRightArrow(scrollLeft < maxScrollLeft - 10);
    setShowLeftArrow(scrollLeft > 10);
    
    // Calculate scroll progress (0 to 100)
    if (maxScrollLeft > 0) {
      const progress = (scrollLeft / maxScrollLeft) * 100;
      setScrollProgress(Math.min(100, Math.max(0, progress)));
    } else {
      setScrollProgress(0);
    }
  };

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    checkScrollPosition();

    const handleScroll = () => checkScrollPosition();
    const handleResize = () => checkScrollPosition();

    scrollElement.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    const observer = new ResizeObserver(() => checkScrollPosition());
    observer.observe(scrollElement);

    return () => {
      scrollElement.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, []);

  const scrollRight = () => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    // On mobile: scroll by 1 full card (100vw minus padding), on larger screens: scroll by 1 card (25% width)
    const isMobile = window.innerWidth < 640; // sm breakpoint
    const cardWidth = isMobile ? container.clientWidth : container.clientWidth * 0.25;
    const gap = isMobile ? 8 : 12; // gap-2 on mobile, gap-3 on larger screens
    const scrollAmount = cardWidth + gap;
    container.scrollLeft += scrollAmount;
  };

  const scrollLeft = () => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    // On mobile: scroll by 1 full card (100vw minus padding), on larger screens: scroll by 1 card (25% width)
    const isMobile = window.innerWidth < 640; // sm breakpoint
    const cardWidth = isMobile ? container.clientWidth : container.clientWidth * 0.25;
    const gap = isMobile ? 8 : 12; // gap-2 on mobile, gap-3 on larger screens
    const scrollAmount = cardWidth + gap;
    container.scrollLeft -= scrollAmount;
  };

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className={`horizontal-scroll flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory sm:snap-mandatory ${className}`}
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorX: 'contain',
          overscrollBehaviorY: 'auto',
          touchAction: 'pan-x pan-y',
          scrollSnapType: 'x mandatory',
        } as React.CSSProperties}
      >
        {children}
      </div>

      {showArrows && (
        <>
          {canScrollLeft && showLeftArrow && (
            <button
              onClick={scrollLeft}
              className={`
                scroll-arrow scroll-arrow-left
                absolute left-2 top-1/2 -translate-y-1/2 z-10
                w-10 h-10 sm:w-12 sm:h-12
                bg-card-bg/90 backdrop-blur-sm
                rounded-full shadow-lg 
                flex items-center justify-center
                transition-all duration-300 ease-out
                hover:bg-navbar-bg hover:shadow-xl
                active:scale-95
                text-charcoal hover:text-white
              `}
              aria-label="Scroll left"
            >
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5 rotate-180 arrow-bounce"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}
          {canScrollRight && showRightArrow && (
            <button
              onClick={scrollRight}
              className={`
                scroll-arrow scroll-arrow-right
                absolute right-2 top-1/2 -translate-y-1/2 z-10
                w-10 h-10 sm:w-12 sm:h-12
                bg-card-bg/90 backdrop-blur-sm
                rounded-full shadow-lg 
                flex items-center justify-center
                transition-all duration-300 ease-out
                hover:bg-navbar-bg hover:shadow-xl
                active:scale-95
                text-charcoal hover:text-white
              `}
              aria-label="Scroll right"
            >
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5 arrow-bounce"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}
        </>
      )}
    </div>
  );
}
