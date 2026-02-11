"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { usePathname } from "next/navigation";

interface PageTransitionContextType {
  isTransitioning: boolean;
  setTransitioning: (value: boolean) => void;
}

const PageTransitionContext = createContext<PageTransitionContextType | undefined>(undefined);

export function usePageTransition() {
  const context = useContext(PageTransitionContext);
  if (!context) {
    throw new Error("usePageTransition must be used within a PageTransitionProvider");
  }
  return context;
}

interface PageTransitionProviderProps {
  children: ReactNode;
}

export default function PageTransitionProvider({ children }: PageTransitionProviderProps) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [enterClassName, setEnterClassName] = useState("page-enter");
  const pathname = usePathname();
  const isFirstRender = useRef(true);
  const previousPathname = useRef(pathname);
  const preserveScrollOnNextRouteRef = useRef(false);
  const animationRafRef = useRef<number | null>(null);

  const retriggerEnterAnimation = useCallback(() => {
    setEnterClassName("");
    if (animationRafRef.current != null) {
      window.cancelAnimationFrame(animationRafRef.current);
    }
    animationRafRef.current = window.requestAnimationFrame(() => {
      setEnterClassName("page-enter");
      animationRafRef.current = null;
    });
  }, []);

  const scrollToTop = useCallback(() => {
    // Use 'instant' to override CSS scroll-smooth on <html> and avoid
    // animation races with page content rendering.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  // Preserve native restoration for browser back/forward navigation.
  useEffect(() => {
    const onPopState = () => {
      preserveScrollOnNextRouteRef.current = true;
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  // Lightweight page-enter transitions keyed by pathname.
  // Avoid fixed-duration loaders; rely on route-level `loading.tsx` for slow segments.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      previousPathname.current = pathname;
      return;
    }

    if (pathname !== previousPathname.current) {
      const shouldPreserveScroll = preserveScrollOnNextRouteRef.current;
      preserveScrollOnNextRouteRef.current = false;
      previousPathname.current = pathname;
      setIsTransitioning(true);
      retriggerEnterAnimation();

      if (!shouldPreserveScroll) {
        // Scroll immediately so the new page always starts at the top.
        scrollToTop();
      }
    }
  }, [pathname, retriggerEnterAnimation, scrollToTop]);

  // Clear transitioning flag on next paint(s) after route commit.
  useEffect(() => {
    if (!isTransitioning) return;

    let raf1 = 0;
    let raf2 = 0;

    raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        setIsTransitioning(false);
      });
    });

    return () => {
      if (raf1) window.cancelAnimationFrame(raf1);
      if (raf2) window.cancelAnimationFrame(raf2);
    };
  }, [isTransitioning, pathname]);

  useEffect(() => {
    return () => {
      if (animationRafRef.current != null) {
        window.cancelAnimationFrame(animationRafRef.current);
      }
    };
  }, []);

  const value = {
    isTransitioning,
    setTransitioning: setIsTransitioning,
  };

  return (
    <PageTransitionContext.Provider value={value}>
      <div
        className="min-h-screen w-full"
        data-page-transition={isTransitioning ? "1" : "0"}
      >
        <div className={`${enterClassName} min-h-screen w-full`}>
          {children}
        </div>
      </div>
    </PageTransitionContext.Provider>
  );
}
