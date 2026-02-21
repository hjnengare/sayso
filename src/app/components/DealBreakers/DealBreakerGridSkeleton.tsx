"use client";

import { Skeleton } from "@/app/components/atoms/Skeleton";

export default function DealBreakerGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 mb-6">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div
          key={idx}
          className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[12px] overflow-hidden backdrop-blur-md border-none shadow-premiumElevated p-6 min-h-[160px]"
        >
          <div className="flex flex-col space-y-4">
            {/* Icon skeleton */}
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-charcoal/10 mb-2">
              <Skeleton
                variant="circular"
                width={32}
                height={32}
                className="bg-charcoal/20"
              />
            </div>
            
            {/* Title skeleton */}
            <Skeleton
              variant="rectangular"
              width="70%"
              height={24}
              className="bg-charcoal/10"
            />
            
            {/* Description skeleton */}
            <div className="space-y-2">
              <Skeleton
                variant="rectangular"
                width="100%"
                height={16}
                className="bg-charcoal/5"
              />
              <Skeleton
                variant="rectangular"
                width="80%"
                height={16}
                className="bg-charcoal/5"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

