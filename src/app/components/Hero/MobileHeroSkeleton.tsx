// src/components/Hero/MobileHeroSkeleton.tsx
"use client";

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div className={`relative overflow-hidden bg-white/30 ${className}`}>
      <span aria-hidden className="absolute inset-0 animate-shimmer opacity-80" />
    </div>
  );
}

export default function MobileHeroSkeleton() {
  return (
    <div className="relative w-full px-0 py-0" aria-hidden="true">
      {/* Keep dimensions aligned with mobile HeroCarousel */}
      <section className="relative h-[100svh] w-full overflow-hidden outline-none rounded-none min-h-[100svh]">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-300 via-slate-200 to-slate-300 animate-pulse" />
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-sage/10 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.15)_0%,_transparent_70%)] pointer-events-none" />
        <div className="absolute inset-0 backdrop-blur-[1px] bg-off-white/5 mix-blend-overlay pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40" />
        <div className="absolute inset-0 bg-black/20" />

        <div className="absolute inset-0 z-20 flex items-center justify-center w-full pt-[var(--safe-area-top)] translate-y-0 px-6 pointer-events-none">
          <div className="w-full max-w-3xl flex flex-col items-center justify-center text-center pb-12">
            <div className="space-y-3 mb-5 w-full flex flex-col items-center">
              <SkeletonBlock className="h-8 rounded-xl w-60" />
              <SkeletonBlock className="h-8 rounded-xl w-44" />
            </div>

            <div className="space-y-2 mb-6 w-full flex flex-col items-center max-w-xl">
              <SkeletonBlock className="h-5 rounded-lg w-72" />
              <SkeletonBlock className="h-5 rounded-lg w-56" />
            </div>

            <SkeletonBlock className="h-12 rounded-full w-full max-w-[320px]" />
          </div>
        </div>

        <span aria-hidden className="absolute inset-0 animate-shimmer opacity-60 mix-blend-screen" />
      </section>
    </div>
  );
}
