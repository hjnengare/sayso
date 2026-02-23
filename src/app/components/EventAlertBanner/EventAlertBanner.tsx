"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { m, AnimatePresence } from "framer-motion";
import useSWR from "swr";
import { swrConfig } from "../../lib/swrConfig";
import type { Event } from "../../lib/types/Event";

// ─── constants ────────────────────────────────────────────────────────────────

const BANNER_HEIGHT = 44;
const CYCLE_MS = 4400; // enter(450ms) + stay(~3.5s) + exit(400ms)
const CONFIDENCE = 3;  // consecutive scroll frames before state change
const SCROLL_THRESHOLD = 8; // px delta to count as intentional scroll
const TOP_ZONE = 80;   // px from top → always show

const SF: React.CSSProperties = {
  fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
};

const EASE_IN: [number, number, number, number] = [0.16, 1, 0.3, 1];
const EASE_OUT: [number, number, number, number] = [0.6, 0, 0.8, 0.2];

// ─── fetcher ──────────────────────────────────────────────────────────────────

const fetcher = (url: string): Promise<{ items: Event[] }> =>
  fetch(url).then((r) => (r.ok ? r.json() : { items: [] }));

// ─── component ────────────────────────────────────────────────────────────────

export default function EventAlertBanner() {
  const [isVisible, setIsVisible] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  // scroll detection refs (no re-render on every frame)
  const lastScrollY = useRef(0);
  const downCount = useRef(0);
  const upCount = useRef(0);
  const ticking = useRef(false);
  const prefersReduced = useRef(false);

  // Mark as mounted + capture initial scroll + reduced-motion preference
  useEffect(() => {
    setIsMounted(true);
    lastScrollY.current = window.scrollY;
    prefersReduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // ── data ────────────────────────────────────────────────────────────────────

  const { data } = useSWR<{ items: Event[] }>(
    "/api/events/spotlight",
    fetcher,
    {
      ...swrConfig,
      dedupingInterval: 300_000,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  const events = data?.items ?? [];

  // ── text cycling ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (events.length <= 1) return;
    const id = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % events.length);
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, [events.length]);

  // ── scroll detection: RAF + passive + confidence buffer ─────────────────────

  useEffect(() => {
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;

      requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - lastScrollY.current;
        lastScrollY.current = y;
        ticking.current = false;

        // Always show when near the top
        if (y < TOP_ZONE) {
          downCount.current = 0;
          upCount.current = 0;
          setIsVisible(true);
          return;
        }

        // Ignore micro-movements (trackpad jitter)
        if (Math.abs(delta) < SCROLL_THRESHOLD) return;

        if (delta > 0) {
          // Scrolling down
          upCount.current = 0;
          downCount.current += 1;
          if (downCount.current >= CONFIDENCE) setIsVisible(false);
        } else {
          // Scrolling up
          downCount.current = 0;
          upCount.current += 1;
          if (upCount.current >= CONFIDENCE) setIsVisible(true);
        }
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── render guards ────────────────────────────────────────────────────────────

  // SSR: reserve height without flashing content (avoids hydration mismatch)
  if (!isMounted) {
    return (
      <div
        style={{ height: BANNER_HEIGHT }}
        className="bg-navbar-bg w-full"
        aria-hidden="true"
      />
    );
  }

  // Data loaded but no events — collapse silently
  if (data && events.length === 0) return null;

  const event = events[currentIndex] ?? events[0];
  const href = event?.href ?? (event?.type === "special" ? `/special/${event?.id}` : `/event/${event?.id}`);
  const isReduced = prefersReduced.current;

  // Transition config shared by the scroll-hide animation
  const scrollTransition = isReduced
    ? { duration: 0 }
    : { duration: 0.38, ease: EASE_IN };

  return (
    // Outer container: FIXED height — never causes layout shift on scroll
    <div
      style={{
        height: BANNER_HEIGHT,
        overflow: "hidden",
        position: "relative",
        zIndex: 40,
      }}
      role="banner"
      aria-label="Upcoming event spotlight"
    >
      {/* Inner panel: slides up/down via transform — no reflow */}
      <m.div
        animate={{
          y: isVisible ? 0 : -BANNER_HEIGHT,
          opacity: isVisible ? 1 : 0,
        }}
        transition={scrollTransition}
        style={{
          height: BANNER_HEIGHT,
          willChange: "transform, opacity",
        }}
        className="bg-navbar-bg w-full"
      >
        <Link
          href={href ?? "/events-specials"}
          className="flex items-center gap-2 sm:gap-3 w-full h-full px-4 sm:px-6 lg:px-10 group cursor-pointer"
          aria-label={event ? `View event: ${event.title}` : "View upcoming events"}
        >
          {/* Pulsing live indicator */}
          <span className="relative flex-shrink-0 flex items-center justify-center w-5 h-5" aria-hidden="true">
            <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-coral/60 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-coral" />
          </span>

          {/* Animated event text */}
          <div
            className="flex-1 min-w-0 overflow-hidden relative"
            style={{ height: BANNER_HEIGHT }}
            aria-live="polite"
            aria-atomic="true"
          >
            <AnimatePresence mode="wait">
              {event && (
                <m.span
                  key={currentIndex}
                  initial={isReduced ? false : { y: 13, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={isReduced ? undefined : { y: -11, opacity: 0 }}
                  transition={{ duration: 0.42, ease: isReduced ? "linear" : EASE_IN }}
                  className="absolute inset-0 flex items-center gap-2 min-w-0"
                >
                  {/* Type label */}
                  <span
                    className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-widest text-white/50"
                    style={SF}
                  >
                    {event.type === "special" ? "Special" : "Event"}
                  </span>

                  <span className="flex-shrink-0 text-white/25 text-xs" aria-hidden="true">·</span>

                  {/* Title */}
                  <span
                    className="text-white/95 text-sm font-semibold truncate"
                    style={SF}
                  >
                    {event.title}
                  </span>

                  {/* Location — desktop only, first segment before bullet */}
                  {event.location && event.location !== "Location TBD" && (
                    <>
                      <span className="hidden sm:block flex-shrink-0 text-white/25 text-xs" aria-hidden="true">·</span>
                      <span
                        className="hidden sm:block text-white/55 text-xs truncate"
                        style={{ ...SF, maxWidth: 180 }}
                      >
                        {event.location.split(" \u2022 ")[0]}
                      </span>
                    </>
                  )}
                </m.span>
              )}

              {/* Skeleton shimmer while loading */}
              {!event && (
                <m.span
                  key="skeleton"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 flex items-center gap-3"
                >
                  <span className="h-2.5 w-12 rounded-full bg-white/10 animate-pulse" />
                  <span className="h-2.5 w-40 rounded-full bg-white/10 animate-pulse" />
                </m.span>
              )}
            </AnimatePresence>
          </div>

          {/* CTA */}
          <span
            className="flex-shrink-0 flex items-center gap-1 text-white/70 group-hover:text-white text-xs font-semibold transition-colors duration-200"
            style={SF}
            aria-hidden="true"
          >
            View
            <m.span
              animate={{ x: isVisible ? 0 : 0 }}
              className="inline-block group-hover:translate-x-0.5 transition-transform duration-200"
            >
              →
            </m.span>
          </span>
        </Link>
      </m.div>
    </div>
  );
}
