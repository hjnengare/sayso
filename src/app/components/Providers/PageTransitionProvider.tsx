"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader } from "../Loader/Loader";

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
  const [showLoader, setShowLoader] = useState(false);
  const [displayChildren, setDisplayChildren] = useState(children);
  const pathname = usePathname();
  const isFirstRender = useRef(true);
  const previousPathname = useRef(pathname);

  // Handle route changes with loading spinner and premium transitions
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      previousPathname.current = pathname;
      setDisplayChildren(children);
      return;
    }

    // Only show loader if pathname actually changed
    if (pathname !== previousPathname.current) {
      previousPathname.current = pathname;
      
      // Step 1: Show loading spinner immediately
      setShowLoader(true);
      setIsTransitioning(true);
      
      // Step 2: Update children in the background (but keep them hidden until data loads)
      setDisplayChildren(children);
      
      // Step 3: Wait for page to actually load/render before hiding spinner and showing transition
      // Use a fixed duration to ensure content is loaded
      const loaderTimeout = window.setTimeout(() => {
        // Hide spinner and let transition animation play
        setShowLoader(false);
        
        // Complete transition after animation
        const transitionTimeout = window.setTimeout(() => {
          requestAnimationFrame(() => setIsTransitioning(false));
        }, 100);

        return () => {
          window.clearTimeout(transitionTimeout);
        };
      }, 1200); // Show loader for 1.2 seconds

      return () => {
        window.clearTimeout(loaderTimeout);
      };
    }
  }, [children, pathname]);

  const value = {
    isTransitioning,
    setTransitioning: setIsTransitioning,
  };

  // Skip animation on initial render for faster load
  if (isFirstRender.current) {
    return (
      <PageTransitionContext.Provider value={value}>
        <div className="min-h-screen">
          {children}
        </div>
      </PageTransitionContext.Provider>
    );
  }

  return (
    <PageTransitionContext.Provider value={value}>
      {/* Loading Spinner Overlay - Full Page */}
      <AnimatePresence>
        {showLoader && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] bg-off-white min-h-screen w-full"
          >
            <div className="min-h-screen w-full flex items-center justify-center">
              <Loader 
                size="lg" 
                variant="wavy" 
                color="sage"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Transition Animation - Only shown when spinner is hidden */}
      {!showLoader && (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={pathname}
            initial={{ 
              opacity: 0, 
              y: 20,
              scale: 0.98,
              filter: "blur(8px)"
            }}
            animate={{ 
              opacity: 1, 
              y: 0,
              scale: 1,
              filter: "blur(0px)"
            }}
            exit={{ 
              opacity: 0, 
              y: -20,
              scale: 0.98,
              filter: "blur(8px)"
            }}
            transition={{ 
              duration: 0.5,
              ease: [0.16, 1, 0.3, 1], // Premium smooth easing curve
              opacity: { duration: 0.4 },
              filter: { duration: 0.45 }
            }}
            className="min-h-screen w-full"
          >
            {displayChildren}
          </motion.div>
        </AnimatePresence>
      )}
      
      {/* Hidden content during loading - allows React to render in background */}
      {showLoader && (
        <div className="invisible fixed inset-0 pointer-events-none">
          {displayChildren}
        </div>
      )}
    </PageTransitionContext.Provider>
  );
}
