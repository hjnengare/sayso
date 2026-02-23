"use client";

import React, { useId } from "react";

type GoldStarProps = {
  size?: number;
  className?: string;
  strokeWidth?: number;
};

const STAR_PATH =
  "M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z";

export function GoldStar({ size = 16, className, strokeWidth = 2.5 }: GoldStarProps) {
  const gradientId = `goldStarGradient-${useId().replace(/:/g, "")}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F5D547" />
          <stop offset="100%" stopColor="#E6A547" />
        </linearGradient>
      </defs>
      <path
        d={STAR_PATH}
        fill={`url(#${gradientId})`}
        stroke={`url(#${gradientId})`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default GoldStar;
