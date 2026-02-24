// src/components/Hero/HeroSkeleton.tsx
"use client";

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div className={`relative overflow-hidden bg-white/30 ${className}`}>
      <span aria-hidden className="absolute inset-0 animate-shimmer opacity-80" />
    </div>
  );
}

export default function HeroSkeleton() {
  return (
    <div className="relative w-full px-0 py-0" aria-hidden="true">
      {/* Keep dimensions aligned with HeroCarousel to prevent layout shift */}
      <section className="relative h-[100svh] sm:h-[90dvh] md:h-[80dvh] lg:h-[72dvh] w-full overflow-hidden outline-none rounded-none min-h-[100svh] sm:max-h-[820px]">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-300 via-slate-200 to-slate-300 animate-pulse" />
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-sage/10 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.15)_0%,_transparent_70%)] pointer-events-none" />
        <div className="absolute inset-0 backdrop-blur-[1px] bg-off-white/5 mix-blend-overlay pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40" />
        <div className="absolute inset-0 bg-black/20" />

        <div className="absolute inset-0 z-20 flex items-center justify-center w-full pt-[var(--safe-area-top)] sm:pt-[var(--header-height)] translate-y-0 sm:-translate-y-4 px-6 sm:px-10 pointer-events-none">
          <div className="w-full max-w-3xl flex flex-col items-center justify-center text-center pb-12 sm:pb-20">
            <div className="space-y-3 sm:space-y-4 mb-5 sm:mb-6 w-full flex flex-col items-center">
              <SkeletonBlock className="h-8 sm:h-10 lg:h-12 rounded-xl w-60 sm:w-80 lg:w-96" />
              <SkeletonBlock className="h-8 sm:h-10 lg:h-12 rounded-xl w-40 sm:w-56 lg:w-64" />
            </div>

            <div className="space-y-2 sm:space-y-3 mb-6 sm:mb-7 w-full flex flex-col items-center max-w-xl">
              <SkeletonBlock className="h-5 sm:h-6 lg:h-7 rounded-lg w-72 sm:w-96 lg:w-[30rem]" />
              <SkeletonBlock className="h-5 sm:h-6 lg:h-7 rounded-lg w-56 sm:w-80 lg:w-[24rem]" />
            </div>

            <SkeletonBlock className="h-12 rounded-full w-full max-w-[320px] sm:w-[180px]" />
          </div>
        </div>

        <span aria-hidden className="absolute inset-0 animate-shimmer opacity-60 mix-blend-screen" />
      </section>
    </div>
  );
}

