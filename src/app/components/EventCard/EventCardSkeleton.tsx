"use client";

import React from "react";

export default function EventCardSkeleton() {
  return (
    <li
      className="flex w-full"
      style={{
        fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      }}
    >
      <article
        className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[20px] overflow-visible h-[600px] sm:h-auto flex flex-col border border-white/60 backdrop-blur-xl ring-1 ring-white/30 shadow-md animate-pulse"
        style={
          {
            width: "100%",
            maxWidth: "540px",
          } as React.CSSProperties
        }
      >
        {/* MEDIA - Full bleed with skeleton - matches EventCard exactly */}
        <div className="relative px-1 pt-1 pb-0 overflow-hidden flex-1 sm:flex-initial h-[300px] sm:h-[320px] lg:h-[240px] xl:h-[220px] z-10">
          <div className="relative w-full h-full">
            <div className="relative w-full h-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-off-white/95 to-off-white/85 rounded-[20px] shadow-sm">
              {/* Centered icon placeholder */}
              <div className="w-32 h-32 sm:w-36 sm:h-36 md:w-32 md:h-32 bg-charcoal/10 rounded-lg" />
            </div>
          </div>

          {/* Event Badge skeleton - rotated ribbon style */}
          <div className="absolute -left-[2px] top-6 z-20">
            <div className="h-6 w-24 bg-navbar-bg/30 rounded-r-lg transform -rotate-0" />
          </div>
        </div>

        {/* CONTENT - Skeleton content - matches EventCard exactly */}
        <div className="px-4 pt-4 pb-6 flex flex-col justify-between bg-gradient-to-br from-sage/12 via-sage/8 to-sage/10 gap-4 rounded-b-[20px]">
          <div className="flex flex-col items-center text-center gap-3">
            {/* Title skeleton */}
            <div className="h-7 sm:h-8 w-3/4 bg-charcoal/10 rounded-lg" />

            {/* Description skeleton - 2 lines */}
            <div className="w-full flex flex-col items-center gap-1.5">
              <div className="h-4 w-full bg-charcoal/5 rounded" />
              <div className="h-4 w-2/3 bg-charcoal/5 rounded" />
            </div>
          </div>

          {/* Button skeleton - matches Learn More button */}
          <div className="w-full min-h-[44px] py-3 px-4 bg-charcoal/10 rounded-full" />
        </div>
      </article>
    </li>
  );
}
