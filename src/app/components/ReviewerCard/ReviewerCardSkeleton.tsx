"use client";

import React from "react";

/**
 * Skeleton for ReviewerCard (variant="reviewer") — structure and dimensions
 * match the Top Contributors card exactly so loading → content has no layout shift.
 */
export default function ReviewerCardSkeleton() {
  return (
    <div className="snap-start snap-always w-full sm:w-[240px] flex-shrink-0">
      <div
        className="bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 backdrop-blur-xl rounded-[12px] overflow-visible group h-[240px] relative border border-white/60 ring-1 ring-white/30 shadow-md animate-pulse"
        aria-hidden
      >
        <div className="relative z-10 p-2 h-full flex flex-col">
          {/* Header — same as ReviewerCard: avatar + name + location */}
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <div className="w-8 h-8 flex-shrink-0 rounded-full bg-charcoal/10 border-2 border-white ring-2 ring-white/50" />
              <div className="flex-1 min-w-0">
                <div className="h-4 w-20 bg-charcoal/10 rounded mb-1" />
                <div className="h-3 w-16 bg-charcoal/5 rounded" />
              </div>
            </div>
          </div>

          {/* Stats — centered "X Reviews" */}
          <div className="mb-1">
            <div className="flex items-center justify-center">
              <div className="h-4 w-12 bg-charcoal/10 rounded" />
            </div>
          </div>

          {/* Latest Review block — same as ReviewerCard: border-t, inner box */}
          <div className="mb-1.5 mt-1 border-t border-white/20 pt-1.5">
            <div className="bg-gradient-to-br from-off-white/95 to-off-white/85 backdrop-blur-sm rounded-md px-2 py-1 border border-white/30">
              <div className="flex items-center gap-1 mb-0.5">
                <div className="h-3 w-16 bg-charcoal/10 rounded" />
              </div>
              <div className="space-y-1">
                <div className="h-3 w-full bg-charcoal/5 rounded" />
                <div className="h-3 w-4/5 bg-charcoal/5 rounded" />
              </div>
            </div>
          </div>

          {/* Footer — badges + action buttons */}
          <div className="mt-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
              <div className="w-6 h-5 bg-charcoal/10 rounded-full" />
              <div className="w-6 h-5 bg-charcoal/10 rounded-full" />
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <div className="w-8 h-8 sm:w-8 sm:h-8 bg-charcoal/10 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
