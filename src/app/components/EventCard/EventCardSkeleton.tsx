"use client";

import React from "react";

/**
 * Skeleton for EventCard — structure and dimensions match EventCard exactly
 * so loading → content transition has no layout shift.
 */
export default function EventCardSkeleton() {
  return (
    <li
      className="flex w-full"
      style={{
        fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      }}
    >
      <article
        className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[12px] overflow-hidden w-full flex flex-col border border-white/60 backdrop-blur-xl shadow-md md:w-[340px] md:h-[416px] animate-pulse"
        style={{ maxWidth: "540px" } as React.CSSProperties}
      >
        {/* MEDIA — same as EventCard: h-[260px], p-1, rounded-[12px] */}
        <div className="relative w-full h-[260px] lg:h-[260px] overflow-hidden rounded-[12px] z-10 flex-shrink-0 p-1">
          <div className="relative w-full h-full overflow-hidden rounded-[12px]">
            <div className="relative w-full h-full overflow-hidden rounded-[12px] flex items-center justify-center bg-gradient-to-br from-off-white/95 to-off-white/85">
              <div className="w-32 h-32 sm:w-36 sm:h-36 md:w-32 md:h-32 bg-charcoal/10 rounded-lg" />
            </div>
          </div>

          {/* Badge skeleton — same position/rotation as EventBadge (rotate(-50deg), left-0 top-0) */}
          <div className="absolute left-0 top-0 z-20 overflow-hidden" style={{ width: "150px", height: "120px" }}>
            <div
              className="absolute bg-navbar-bg/30 rounded-sm"
              style={{
                transform: "rotate(-50deg)",
                transformOrigin: "center",
                left: "-40px",
                top: "20px",
                width: "250px",
                height: "28px",
              }}
            />
          </div>
        </div>

        {/* CONTENT — same as EventCard: px-4 py-4, gap-2, left-aligned */}
        <div className="px-4 py-4 bg-gradient-to-b from-card-bg/95 to-card-bg flex flex-col gap-2 rounded-b-[12px]">
          <div className="flex flex-col gap-2">
            {/* Title — text-base/sm:text-lg equivalent height, left-aligned */}
            <div className="h-5 sm:h-6 w-3/4 bg-charcoal/10 rounded-lg" />

            {/* Description — 2 lines, text-sm, left-aligned */}
            <div className="w-full flex flex-col gap-1.5">
              <div className="h-4 w-full bg-charcoal/5 rounded" />
              <div className="h-4 w-4/5 bg-charcoal/5 rounded" />
            </div>
          </div>

          {/* Button — mt-3, py-2.5, rounded-full, same as EventCard */}
          <div className="mt-3 w-full h-10 px-4 py-2.5 bg-charcoal/10 rounded-full" />
        </div>
      </article>
    </li>
  );
}
