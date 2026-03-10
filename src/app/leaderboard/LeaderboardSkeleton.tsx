"use client";

/**
 * Skeleton for LeaderboardPage — structure mirrors the real page exactly:
 * background gradients → breadcrumb → hero title/description → tabs → leaderboard card.
 */
export default function LeaderboardSkeleton() {
  return (
    <div className="min-h-dvh bg-off-white relative overflow-hidden">
      {/* Background Gradient — matches LeaderboardClient */}
      <div className="absolute inset-0 bg-gradient-to-br from-sage/10 via-off-white to-coral/5" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(157,171,155,0.15)_0%,_transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(114,47,55,0.08)_0%,_transparent_50%)]" />

      <div className="min-h-[100dvh] bg-gradient-to-b from-off-white/0 via-off-white/50 to-off-white relative z-10">

        {/* Hero Section */}
        <section className="relative z-10 pb-6 sm:pb-8 md:pb-12">
          <div className="mx-auto w-full max-w-[2000px] px-2">

            {/* Breadcrumb skeleton */}
            <nav className="pb-1" aria-label="Loading">
              <div className="flex items-center gap-2">
                <div className="h-4 w-12 bg-charcoal/10 rounded animate-pulse" />
                <div className="h-4 w-4 bg-charcoal/10 rounded animate-pulse" />
                <div className="h-4 w-24 bg-charcoal/10 rounded animate-pulse" />
              </div>
            </nav>

            {/* Title + description block */}
            <div className="mb-10 sm:mb-12 px-4 sm:px-6 text-center pt-4 flex flex-col items-center gap-4">
              {/* Title */}
              <div className="h-8 sm:h-10 md:h-12 w-64 sm:w-80 bg-charcoal/10 rounded-lg animate-pulse" />
              {/* Subtitle line 1 */}
              <div className="h-4 w-full max-w-md bg-charcoal/8 rounded animate-pulse" />
              {/* Subtitle line 2 */}
              <div className="h-4 w-2/3 max-w-sm bg-charcoal/6 rounded animate-pulse" />
            </div>
          </div>
        </section>

        {/* Main Content Section */}
        <section className="relative pb-12 sm:pb-16 md:pb-20">
          <div className="mx-auto w-full max-w-[2000px] px-2 relative z-10">
            <div className="max-w-[800px] mx-auto pt-4 sm:pt-6 md:pt-8">

              {/* Tabs skeleton */}
              <div className="flex justify-center pt-2 mb-8 px-2">
                <div className="flex gap-2 p-1 rounded-full bg-charcoal/5">
                  <div className="h-9 w-36 bg-charcoal/12 rounded-full animate-pulse" />
                  <div className="h-9 w-36 bg-charcoal/6 rounded-full animate-pulse" />
                </div>
              </div>

              {/* Leaderboard card skeleton */}
              <div className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[12px] ring-1 ring-white/20 shadow-md p-3 sm:p-4 md:p-6 lg:p-8 mb-6 sm:mb-8 md:mb-12 relative overflow-hidden">

                {/* Podium skeleton — 3 columns at varying heights */}
                <div className="flex items-end justify-center gap-3 sm:gap-6 mb-8 px-4">
                  {/* 2nd place */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-charcoal/10 animate-pulse" />
                    <div className="h-3 w-16 bg-charcoal/8 rounded animate-pulse" />
                    <div className="h-16 sm:h-20 w-20 sm:w-24 bg-charcoal/8 rounded-t-lg animate-pulse" />
                  </div>
                  {/* 1st place — tallest */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-charcoal/12 animate-pulse" />
                    <div className="h-3 w-20 bg-charcoal/8 rounded animate-pulse" />
                    <div className="h-24 sm:h-28 w-20 sm:w-24 bg-charcoal/10 rounded-t-lg animate-pulse" />
                  </div>
                  {/* 3rd place */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-charcoal/10 animate-pulse" />
                    <div className="h-3 w-16 bg-charcoal/8 rounded animate-pulse" />
                    <div className="h-12 sm:h-16 w-20 sm:w-24 bg-charcoal/6 rounded-t-lg animate-pulse" />
                  </div>
                </div>

                {/* Leaderboard list rows */}
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-off-white/40"
                      style={{ opacity: 1 - i * 0.08 }}
                    >
                      {/* Rank */}
                      <div className="w-6 h-4 bg-charcoal/10 rounded animate-pulse flex-shrink-0" />
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-charcoal/10 animate-pulse flex-shrink-0" />
                      {/* Name + badge */}
                      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                        <div className="h-3.5 w-28 bg-charcoal/10 rounded animate-pulse" />
                        <div className="h-3 w-14 bg-charcoal/6 rounded animate-pulse" />
                      </div>
                      {/* Review count */}
                      <div className="h-4 w-12 bg-charcoal/8 rounded animate-pulse flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Badge definitions bar skeleton */}
      <section className="relative py-4 sm:py-8 bg-navbar-bg">
        <div className="mx-auto w-full max-w-[2000px] px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
            <div className="flex flex-col items-center sm:items-start gap-1.5">
              <div className="h-5 w-48 bg-white/20 rounded animate-pulse" />
              <div className="h-3.5 w-36 bg-white/12 rounded animate-pulse" />
            </div>
            <div className="h-10 w-36 bg-white/20 rounded-full animate-pulse" />
          </div>
        </div>
      </section>
    </div>
  );
}
