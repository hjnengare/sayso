"use client";

import { Skeleton } from "@/app/components/atoms/Skeleton";

export default function SubcategoryGridSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, groupIdx) => (
        <div key={groupIdx} className="space-y-4">
          {/* Group title skeleton */}
          <Skeleton
            variant="rectangular"
            width="40%"
            height={28}
            className="bg-charcoal/10 mb-4"
          />
          
          {/* Subcategory grid skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, itemIdx) => (
              <div
                key={itemIdx}
                className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[16px] overflow-hidden backdrop-blur-md border-none shadow-premiumElevated p-4 min-h-[80px] flex items-center justify-center"
              >
                <Skeleton
                  variant="rectangular"
                  width="70%"
                  height={20}
                  className="bg-charcoal/10"
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

