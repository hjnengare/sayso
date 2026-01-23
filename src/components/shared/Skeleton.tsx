import React from 'react';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
  radius?: string;
  shimmer?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', style = {}, radius = 'rounded-xl', shimmer = true }) => (
  <div
    className={`bg-gradient-to-r from-card-bg/60 via-card-bg/40 to-card-bg/60 ${radius} ${className} relative overflow-hidden animate-pulse`}
    style={style}
  >
    {shimmer && (
      <span className="absolute inset-0 block bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
    )}
  </div>
);

export default Skeleton;
