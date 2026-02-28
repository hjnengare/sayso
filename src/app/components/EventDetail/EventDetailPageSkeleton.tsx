import React from "react";

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
    <div
      className={`bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl border-none rounded-[12px] shadow-md p-4 sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

export default function EventDetailPageSkeleton() {
  return (
    <div
      className="min-h-dvh bg-off-white font-urbanist"
      style={{ fontFamily: "Urbanist, system-ui, sans-serif" }}
    >
      <div className="min-h-[100dvh] bg-gradient-to-b from-off-white/0 via-off-white/50 to-off-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sage/10 via-off-white to-coral/5" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(157,171,155,0.15)_0%,_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(114,47,55,0.08)_0%,_transparent_50%)]" />

        <section className="relative">
          <div className="mx-auto w-full max-w-[2000px] px-2 relative z-10">
            <nav className="pb-1" aria-label="Breadcrumb">
              <div className="flex items-center gap-2 pt-1">
                <SkeletonBlock className="h-4 w-32" />
                <SkeletonBlock className="h-4 w-4 rounded-md" rounded="rounded-md" />
                <SkeletonBlock className="h-4 w-40" />
              </div>
            </nav>

            <div className="pt-2">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6 lg:gap-8">
                <div className="lg:col-span-2 space-y-4 sm:space-y-6 lg:space-y-8">
                  <SkeletonCard className="p-1 overflow-hidden">
                    <div className="aspect-[16/10] w-full rounded-[12px] bg-off-white/80 animate-pulse" />
                  </SkeletonCard>

                  <SkeletonCard className="space-y-5">
                    <div className="space-y-3">
                      <SkeletonBlock className="h-9 w-full max-w-[26rem] rounded-2xl" rounded="rounded-2xl" />
                      <SkeletonBlock className="h-6 w-3/4 max-w-[18rem] rounded-xl" rounded="rounded-xl" />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <SkeletonBlock className="h-8 w-28 rounded-full" />
                      <SkeletonBlock className="h-8 w-24 rounded-full" />
                      <SkeletonBlock className="h-8 w-32 rounded-full" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <SkeletonBlock className="h-16 w-full rounded-2xl bg-charcoal/8" rounded="rounded-2xl" />
                      <SkeletonBlock className="h-16 w-full rounded-2xl bg-charcoal/8" rounded="rounded-2xl" />
                    </div>
                  </SkeletonCard>

                  <SkeletonCard className="space-y-3">
                    <SkeletonBlock className="h-6 w-40 rounded-xl" rounded="rounded-xl" />
                    <SkeletonBlock className="h-4 w-full" />
                    <SkeletonBlock className="h-4 w-full" />
                    <SkeletonBlock className="h-4 w-5/6" />
                    <SkeletonBlock className="h-4 w-2/3" />
                  </SkeletonCard>

                  <SkeletonCard className="space-y-4">
                    <SkeletonBlock className="h-6 w-36 rounded-xl" rounded="rounded-xl" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <SkeletonBlock className="h-24 w-full rounded-2xl bg-charcoal/8" rounded="rounded-2xl" />
                      <SkeletonBlock className="h-24 w-full rounded-2xl bg-charcoal/8" rounded="rounded-2xl" />
                      <SkeletonBlock className="h-24 w-full rounded-2xl bg-charcoal/8" rounded="rounded-2xl" />
                      <SkeletonBlock className="h-24 w-full rounded-2xl bg-charcoal/8" rounded="rounded-2xl" />
                    </div>
                  </SkeletonCard>

                  <SkeletonCard className="space-y-4">
                    <SkeletonBlock className="h-6 w-52 rounded-xl" rounded="rounded-xl" />
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <SkeletonBlock className="h-12 w-12 rounded-lg bg-charcoal/12" rounded="rounded-lg" />
                          <div className="min-w-0 flex-1 space-y-2">
                            <SkeletonBlock className="h-4 w-3/4" />
                            <SkeletonBlock className="h-3 w-1/2 bg-charcoal/8" />
                          </div>
                          <SkeletonBlock className="h-6 w-16 rounded-full bg-charcoal/8" />
                        </div>
                      ))}
                    </div>
                  </SkeletonCard>
                </div>

                <div className="space-y-4 sm:space-y-6">
                  <SkeletonCard className="space-y-4">
                    <SkeletonBlock className="h-6 w-36 rounded-xl" rounded="rounded-xl" />
                    <SkeletonBlock className="h-4 w-full" />
                    <SkeletonBlock className="h-4 w-4/5" />
                    <div className="pt-2 space-y-3">
                      <SkeletonBlock className="h-12 w-full rounded-full bg-coral/20" />
                      <SkeletonBlock className="h-12 w-full rounded-full bg-charcoal/8" />
                    </div>
                  </SkeletonCard>

                  <SkeletonCard className="space-y-4">
                    <SkeletonBlock className="h-6 w-48 rounded-xl" rounded="rounded-xl" />
                    <SkeletonBlock className="h-28 w-full rounded-2xl bg-charcoal/8" rounded="rounded-2xl" />
                    <div className="grid grid-cols-2 gap-3">
                      <SkeletonBlock className="h-16 w-full rounded-2xl bg-charcoal/8" rounded="rounded-2xl" />
                      <SkeletonBlock className="h-16 w-full rounded-2xl bg-charcoal/8" rounded="rounded-2xl" />
                    </div>
                  </SkeletonCard>

                  <SkeletonCard className="space-y-4">
                    <SkeletonBlock className="h-6 w-32 rounded-xl" rounded="rounded-xl" />
                    <SkeletonBlock className="h-4 w-full" />
                    <SkeletonBlock className="h-4 w-5/6" />
                    <SkeletonBlock className="h-24 w-full rounded-2xl bg-charcoal/8" rounded="rounded-2xl" />
                  </SkeletonCard>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[2000px] px-2 relative z-10 mt-8 pb-8">
          <div className="text-center mb-6">
            <SkeletonBlock className="h-8 w-48 mx-auto rounded-2xl" rounded="rounded-2xl" />
          </div>

          <SkeletonCard className="p-6 sm:p-8">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <SkeletonBlock className="h-12 w-12 rounded-full bg-charcoal/12" />
                <div className="flex-1 space-y-3">
                  <SkeletonBlock className="h-4 w-32" />
                  <SkeletonBlock className="h-4 w-full" />
                  <SkeletonBlock className="h-4 w-11/12" />
                  <SkeletonBlock className="h-4 w-2/3" />
                </div>
              </div>

              <div className="flex items-start gap-4">
                <SkeletonBlock className="h-12 w-12 rounded-full bg-charcoal/10" />
                <div className="flex-1 space-y-3">
                  <SkeletonBlock className="h-4 w-28" />
                  <SkeletonBlock className="h-4 w-full" />
                  <SkeletonBlock className="h-4 w-5/6" />
                </div>
              </div>

              <div className="pt-2">
                <SkeletonBlock className="h-12 w-52 rounded-full bg-coral/20" />
              </div>
            </div>
          </SkeletonCard>
        </section>
      </div>
    </div>
  );
}
