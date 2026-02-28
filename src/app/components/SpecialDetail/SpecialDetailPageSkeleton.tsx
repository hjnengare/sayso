function SkeletonBlock({
  className,
  rounded = "rounded-full",
}: {
  className: string;
  rounded?: string;
}) {
  return <div aria-hidden="true" className={`animate-pulse bg-charcoal/10 ${rounded} ${className}`} />;
}

function SkeletonCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-none rounded-[12px] shadow-md p-4 sm:p-6 ${className}`}>
      {children}
    </div>
  );
}

export default function SpecialDetailPageSkeleton() {
  return (
    <div
      className="min-h-[100dvh] bg-off-white font-urbanist"
      style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
    >
      <div className="min-h-[100dvh] bg-gradient-to-b from-off-white/0 via-off-white/50 to-off-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sage/10 via-off-white to-coral/5" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(157,171,155,0.15)_0%,_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(114,47,55,0.08)_0%,_transparent_50%)]" />

        <section className="relative min-h-[100dvh]">
          <div className="mx-auto w-full max-w-[2000px] px-2 relative z-10 pt-20 sm:pt-24 py-4 sm:py-6 md:py-8 pb-12 sm:pb-16">
            <nav className="pb-1" aria-label="Breadcrumb">
              <div className="flex items-center gap-2">
                <SkeletonBlock className="h-4 w-32" />
                <SkeletonBlock className="h-4 w-4 rounded-md" rounded="rounded-md" />
                <SkeletonBlock className="h-4 w-28" />
              </div>
            </nav>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              <div className="lg:col-span-2 space-y-4 sm:space-y-6 lg:space-y-8">
                <div className="relative w-full aspect-[4/3] sm:aspect-[16/9] lg:aspect-[21/9] rounded-none overflow-hidden border-none bg-off-white/80 animate-pulse">
                  <div className="absolute top-6 left-6">
                    <SkeletonBlock className="h-9 w-28 rounded-full bg-white/40" />
                  </div>
                  <div className="absolute top-6 right-6">
                    <SkeletonBlock className="h-12 w-12 rounded-full bg-white/30" />
                  </div>
                </div>

                <div className="space-y-4">
                  <SkeletonBlock className="h-10 w-full max-w-[28rem] rounded-2xl" rounded="rounded-2xl" />
                  <div className="flex items-center gap-4">
                    <SkeletonBlock className="h-4 w-16" />
                    <SkeletonBlock className="h-4 w-32" />
                  </div>
                </div>

                <SkeletonCard className="space-y-4">
                  <SkeletonBlock className="h-6 w-36 rounded-xl" rounded="rounded-xl" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <SkeletonBlock className="h-16 w-full rounded-2xl bg-charcoal/8" rounded="rounded-2xl" />
                    <SkeletonBlock className="h-16 w-full rounded-2xl bg-charcoal/8" rounded="rounded-2xl" />
                    <SkeletonBlock className="h-16 w-full rounded-2xl bg-charcoal/8" rounded="rounded-2xl" />
                    <SkeletonBlock className="h-16 w-full rounded-2xl bg-charcoal/8" rounded="rounded-2xl" />
                    <SkeletonBlock className="h-16 w-full rounded-2xl bg-charcoal/8 sm:col-span-2" rounded="rounded-2xl" />
                  </div>
                </SkeletonCard>

                <SkeletonCard className="space-y-3">
                  <SkeletonBlock className="h-6 w-40 rounded-xl" rounded="rounded-xl" />
                  <SkeletonBlock className="h-4 w-full" />
                  <SkeletonBlock className="h-4 w-full" />
                  <SkeletonBlock className="h-4 w-11/12" />
                  <SkeletonBlock className="h-4 w-4/5" />
                  <SkeletonBlock className="h-4 w-2/3" />
                </SkeletonCard>
              </div>

              <div className="space-y-6">
                <SkeletonCard className="space-y-4">
                  <SkeletonBlock className="h-6 w-40 rounded-xl" rounded="rounded-xl" />
                  <div className="space-y-3">
                    <SkeletonBlock className="h-12 w-full rounded-full bg-coral/20" />
                    <SkeletonBlock className="h-12 w-full rounded-full bg-charcoal/8" />
                  </div>
                </SkeletonCard>

                <SkeletonCard className="space-y-3">
                  <SkeletonBlock className="h-6 w-24 rounded-xl" rounded="rounded-xl" />
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="flex items-center justify-between gap-3">
                      <SkeletonBlock className="h-4 w-24" />
                      <SkeletonBlock className="h-4 w-10 bg-charcoal/8" />
                    </div>
                  ))}
                </SkeletonCard>

                <SkeletonCard className="space-y-4">
                  <SkeletonBlock className="h-6 w-36 rounded-xl" rounded="rounded-xl" />
                  <div className="space-y-3">
                    <SkeletonBlock className="h-4 w-40" />
                    <SkeletonBlock className="h-4 w-48" />
                    <SkeletonBlock className="h-4 w-full" />
                    <SkeletonBlock className="h-4 w-36" />
                  </div>
                  <div className="space-y-3 pt-2">
                    <SkeletonBlock className="h-10 w-full rounded-xl bg-coral/18" rounded="rounded-xl" />
                    <SkeletonBlock className="h-4 w-32 bg-charcoal/8" />
                  </div>
                </SkeletonCard>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
