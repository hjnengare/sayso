"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../../contexts/AuthContext";

interface HeroFallbackProps {
  onReady?: () => void;
}

const FALLBACK_COPY = {
  title: "Cape Town, in your pocket",
  description: "Trusted local gems, rated by real people.",
} as const;

export default function HeroFallback({ onReady }: HeroFallbackProps) {
  const { user } = useAuth();

  useEffect(() => {
    onReady?.();
  }, [onReady]);

  return (
    <div className="relative w-full px-0 py-0 md:pt-2 md:px-2">
      <section
        className="relative h-[100dvh] sm:h-[90dvh] md:h-[80dvh] w-full overflow-hidden outline-none rounded-none min-h-[420px] sm:min-h-[520px] sm:max-h-[820px]"
        aria-label="Hero fallback"
        style={{
          fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
          touchAction: "pan-y",
        }}
      >
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-charcoal/80 via-charcoal/70 to-sage/60" />
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent pointer-events-none" />
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/30 via-transparent to-black/40 pointer-events-none" />
        <div className="absolute inset-0 z-0 bg-black/20 pointer-events-none" />

        <div className="absolute inset-0 z-30 flex items-center justify-center w-full pt-[var(--safe-area-top)] sm:pt-[var(--header-height)] translate-y-0 sm:-translate-y-4 px-6 sm:px-10 pointer-events-none">
          <div className="w-full max-w-3xl flex flex-col items-center justify-center text-center pb-12 sm:pb-20">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-off-white drop-shadow-lg mb-3 sm:mb-4 leading-tight tracking-tight">
              {FALLBACK_COPY.title}
            </h2>
            <p
              className="text-base sm:text-lg lg:text-xl text-off-white/90 drop-shadow-md max-w-xl mb-5 sm:mb-6 leading-relaxed"
              style={{ fontWeight: 500 }}
            >
              {FALLBACK_COPY.description}
            </p>

            <div className="w-full flex justify-center pointer-events-auto">
              {!user ? (
                <Link
                  href="/onboarding"
                  className="mi-tap group relative inline-flex items-center justify-center rounded-full min-h-[48px] py-3 px-10 sm:px-12 text-base font-semibold text-white text-center bg-gradient-to-r from-coral to-coral/80 hover:from-sage hover:to-sage transition-all duration-300 shadow-lg hover:shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-sage/30 focus-visible:ring-offset-2 w-full max-w-[320px] sm:w-auto sm:min-w-[180px]"
                  style={{ fontWeight: 600 }}
                >
                  <span className="relative z-10">Sign In</span>
                </Link>
              ) : (
                <Link
                  href="/trending"
                  className="mi-tap group relative inline-flex items-center justify-center rounded-full min-h-[48px] py-3 px-10 sm:px-12 text-base font-semibold text-white text-center bg-gradient-to-r from-coral to-coral/80 hover:from-sage hover:to-sage transition-all duration-300 shadow-lg hover:shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-sage/30 focus-visible:ring-offset-2 w-full max-w-[320px] sm:w-auto sm:min-w-[180px]"
                  style={{ fontWeight: 600 }}
                >
                  <span className="relative z-10">Discover</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
