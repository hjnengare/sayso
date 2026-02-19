"use client";

import { Skeleton } from "../../../components/atoms/Skeleton";

export default function InterestGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:gap-6 mb-4 overflow-visible">
      {Array.from({ length: 8 }).map((_, idx) => (
        <div
          key={idx}
          className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[12px] overflow-hidden backdrop-blur-md border-none shadow-premiumElevated"
        >
          <div className="p-6 md:p-8 flex flex-col items-center justify-center min-h-[120px] md:min-h-[140px]">
            <Skeleton
              variant="rectangular"
              width="80%"
              height={24}
              className="mb-3 bg-charcoal/10"
            />
            <Skeleton
              variant="rectangular"
              width="60%"
              height={16}
              className="bg-charcoal/5"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

