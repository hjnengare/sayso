"use client";

import React from "react";

/**
 * Skeleton for enhanced ReviewerCard (variant="reviewer") — structure and dimensions
 * match the enhanced design exactly so loading → content has no layout shift.
 * Matches the new premium styling with correct height, padding, and layout.
 */
export default function ReviewerCardSkeleton() {
  return (
    <div
      className="snap-start snap-always w-full sm:w-[240px] flex-shrink-0"
      aria-hidden
    >
      <div
        className="relative bg-card-bg rounded-lg overflow-hidden h-[260px] border border-sage/20 shadow-md animate-pulse"
        style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
      >
        <div className="relative p-4 h-full flex flex-col">
          {/* Header — avatar 40px + name + badges */}
          <div className="flex items-start gap-3 mb-3">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 bg-charcoal/10 rounded-full ring-2 ring-sage/30 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="h-4 w-24 bg-charcoal/10 rounded animate-pulse mb-1" />
              {/* Badges skeleton */}
              <div className="flex items-center gap-1 mt-1 flex-wrap">
                <div className="w-16 h-5 bg-charcoal/10 rounded-full animate-pulse" />
                <div className="w-14 h-5 bg-charcoal/10 rounded-full animate-pulse" />
                <div className="w-12 h-5 bg-charcoal/10 rounded-full animate-pulse" />
              </div>
            </div>
          </div>

          {/* Stats section */}
          <div className="mb-3">
            <div className="flex items-center justify-center">
              <div className="bg-off-white rounded-lg px-4 py-2 border border-sage/20">
                <div className="text-center">
                  <div className="h-8 w-8 bg-charcoal/10 rounded animate-pulse mx-auto mb-1" />
                  <div className="h-3 w-12 bg-charcoal/5 rounded animate-pulse mx-auto" />
                </div>
              </div>
            </div>
          </div>

          {/* Latest Review block */}
          <div className="flex-1 min-h-0">
            <div className="bg-off-white rounded-lg px-3 py-2.5 border border-sage/20">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="flex items-center gap-0.5">
                  <div className="w-3 h-3 bg-coral/30 rounded-sm animate-pulse" />
                  <div className="w-3 h-3 bg-coral/30 rounded-sm animate-pulse" />
                  <div className="w-3 h-3 bg-coral/30 rounded-sm animate-pulse" />
                  <div className="w-3 h-3 bg-coral/30 rounded-sm animate-pulse" />
                  <div className="w-3 h-3 bg-coral/30 rounded-sm animate-pulse" />
                </div>
                <div className="h-2.5 w-10 bg-charcoal/5 rounded animate-pulse" />
              </div>
              <div className="space-y-1.5">
                <div className="h-3 w-full bg-charcoal/5 rounded animate-pulse" />
                <div className="h-3 w-5/6 bg-charcoal/5 rounded animate-pulse" />
              </div>
            </div>
          </div>


        </div>
      </div>
    </div>
  );
}
