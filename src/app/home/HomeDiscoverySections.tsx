"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { m } from "framer-motion";

import { getChoreoItemMotion } from "../lib/motion/choreography";
import BusinessRowSkeleton from "../components/BusinessRow/BusinessRowSkeleton";
import CommunityHighlightsSkeleton from "../components/CommunityHighlights/CommunityHighlightsSkeleton";
import type { Business } from "../components/BusinessCard/BusinessCard";
import type { FeaturedBusiness } from "../hooks/useFeaturedBusinesses";

type BusinessRowComponentProps = {
  title: string;
  businesses: Business[];
  cta: string;
  href: string;
  disableAnimations?: boolean;
};

type HomeDiscoverySectionsProps = {
  choreoEnabled: boolean;
  isFiltered: boolean;
  hasUser: boolean;
  forYouLoading: boolean;
  forYouError: string | null;
  forYouBusinesses: Business[];
  allBusinessesLoading: boolean;
  allBusinesses: Business[];
  trendingLoading: boolean;
  trendingError: string | null;
  trendingStatus: number | null;
  hasTrendingBusinesses: boolean;
  trendingBusinesses: Business[];
  featuredError: string | null;
  featuredLoading: boolean;
  featuredStatus: number | null;
  featuredByCategory: FeaturedBusiness[];
  onRetryForYou?: () => void;
  onRetryTrending?: () => void;
  onRetryFeatured?: () => void;
  renderBusinessRow: (props: BusinessRowComponentProps) => ReactNode;
  renderEventsSpecials: () => ReactNode;
  renderCommunityHighlights: (featuredByCategory: FeaturedBusiness[]) => ReactNode;
};

const fontStyle = { fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" };

function RetryButton({ onRetry }: { onRetry: () => void }) {
  return (
    <button
      onClick={onRetry}
      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-charcoal text-white text-sm font-semibold shadow-sm hover:bg-charcoal/90 transition-colors duration-200"
      style={fontStyle}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
      </svg>
      Reload
    </button>
  );
}

export function HomeDiscoverySections({
  choreoEnabled,
  isFiltered,
  hasUser,
  forYouLoading,
  forYouError,
  forYouBusinesses,
  allBusinessesLoading,
  allBusinesses,
  trendingLoading,
  trendingError,
  trendingStatus,
  hasTrendingBusinesses,
  trendingBusinesses,
  featuredError,
  featuredLoading,
  featuredStatus,
  featuredByCategory,
  onRetryForYou,
  onRetryTrending,
  onRetryFeatured,
  renderBusinessRow,
  renderEventsSpecials,
  renderCommunityHighlights,
}: HomeDiscoverySectionsProps) {
  return (
    <div className="flex flex-col gap-8 sm:gap-10 md:gap-12 pt-0">
      {!isFiltered && (
        <m.div
          className="relative z-10 snap-start"
          {...getChoreoItemMotion({ order: 0, intent: "section", enabled: choreoEnabled })}
        >
          {!hasUser ? (
            <div className="mx-auto w-full max-w-[2000px] px-2 pt-4 sm:pt-8 md:pt-10">
              <div className="relative border border-charcoal/10 bg-off-white rounded-[14px] p-6 sm:p-8 md:p-10 text-center space-y-4 shadow-[0_1px_0_rgba(0,0,0,0.02)]">
                <h3
                  className="text-lg sm:text-xl font-extrabold text-charcoal"
                  style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
                >
                  For You
                </h3>
                <p
                  className="text-body sm:text-base text-charcoal/60 max-w-[60ch] mx-auto"
                  style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
                >
                  Create an account to unlock personalised recommendations.
                </p>

                <div className="pt-2 w-full flex flex-col sm:flex-row items-stretch justify-center gap-3">
                  <Link
                    href="/register"
                    className="mi-tap inline-flex items-center justify-center rounded-full min-h-[48px] px-6 py-3 text-body font-semibold text-white bg-gradient-to-r from-coral to-coral/85 hover:opacity-95 shadow-md w-full sm:w-auto sm:min-w-[180px]"
                    style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
                  >
                    Create Account
                  </Link>
                  <Link
                    href="/onboarding"
                    className="mi-tap inline-flex items-center justify-center rounded-full min-h-[48px] px-6 py-3 text-body font-semibold text-charcoal border border-charcoal/15 bg-white hover:bg-off-white shadow-sm w-full sm:w-auto sm:min-w-[180px]"
                    style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
                  >
                    Sign In
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <>
              {forYouLoading ? (
                <BusinessRowSkeleton title="For You Now" />
              ) : forYouError ? (
                <div className="mx-auto w-full max-w-[2000px] px-2 py-4 flex items-center justify-between gap-4">
                  <p className="text-sm text-coral" style={fontStyle}>Couldn&apos;t load personalised picks right now.</p>
                  {onRetryForYou && <RetryButton onRetry={onRetryForYou} />}
                </div>
              ) : forYouBusinesses.length > 0 ? (
                renderBusinessRow({
                  title: "For You",
                  businesses: forYouBusinesses,
                  cta: "See More",
                  href: "/for-you",
                  disableAnimations: true,
                })
              ) : (
                <div className="mx-auto w-full max-w-[2000px] px-2 py-4">
                  <div className="bg-card-bg/10 border border-sage/30 rounded-lg p-6 text-center">
                    <p className="text-body text-charcoal/70 mb-2">Curated from your interests</p>
                    <p className="text-body-sm text-charcoal/70">
                      Based on what you selected, no matches in this section yet. See more on For You or explore Trending.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </m.div>
      )}

      {isFiltered && (
        <m.div
          className="relative z-10 snap-start"
          {...getChoreoItemMotion({ order: 0, intent: "section", enabled: choreoEnabled })}
        >
          {allBusinessesLoading ? (
            <BusinessRowSkeleton title="Filtered Results" />
          ) : allBusinesses.length > 0 ? (
            renderBusinessRow({
              title: "Filtered Results",
              businesses: allBusinesses.slice(0, 10),
              cta: "See All",
              href: "/for-you",
              disableAnimations: true,
            })
          ) : (
            <div className="mx-auto w-full max-w-[2000px] px-2 py-4 text-sm text-charcoal/70">
              No businesses match your filters. Try adjusting your selections.
            </div>
          )}
        </m.div>
      )}

      {!isFiltered && (
        <m.div
          className="relative z-10 snap-start"
          {...getChoreoItemMotion({ order: 1, intent: "section", enabled: choreoEnabled })}
        >
          {trendingLoading && <BusinessRowSkeleton title="Trending Now" />}
          {!trendingLoading && hasTrendingBusinesses && (
            renderBusinessRow({
              title: "Trending Now",
              businesses: trendingBusinesses,
              cta: "See More",
              href: "/trending",
              disableAnimations: true,
            })
          )}
          {!trendingLoading && !hasTrendingBusinesses && !trendingError && (
            renderBusinessRow({
              title: "Trending Now",
              businesses: [],
              cta: "See More",
              href: "/trending",
              disableAnimations: true,
            })
          )}
          {trendingError && !trendingLoading && (
            <div className="mx-auto w-full max-w-[2000px] px-2 py-4 flex items-center justify-between gap-4">
              <p className="text-sm text-coral" style={fontStyle}>Couldn&apos;t load Trending right now.</p>
              {onRetryTrending && <RetryButton onRetry={onRetryTrending} />}
            </div>
          )}
        </m.div>
      )}

      <m.div
        className="relative z-10 snap-start"
        {...getChoreoItemMotion({ order: 2, intent: "section", enabled: choreoEnabled })}
      >
        {renderEventsSpecials()}
      </m.div>

      <m.div
        className="relative z-10 snap-start"
        {...getChoreoItemMotion({ order: 3, intent: "section", enabled: choreoEnabled })}
      >
        {featuredError && !featuredLoading ? (
          <div className="mx-auto w-full max-w-[2000px] px-2 py-4 flex items-center justify-between gap-4">
            <p className="text-sm text-coral" style={fontStyle}>Couldn&apos;t load Community Highlights right now.</p>
            {onRetryFeatured && <RetryButton onRetry={onRetryFeatured} />}
          </div>
        ) : featuredLoading ? (
          <CommunityHighlightsSkeleton reviewerCount={12} businessCount={4} />
        ) : (
          renderCommunityHighlights(featuredByCategory)
        )}
      </m.div>
    </div>
  );
}
