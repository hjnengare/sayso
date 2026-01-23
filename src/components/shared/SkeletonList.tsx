import React from 'react';
import SkeletonCard from './SkeletonCard';

interface SkeletonListProps {
  count?: number;
  className?: string;
}

const SkeletonList: React.FC<SkeletonListProps> = ({ count = 4, className = '' }) => (
  <div className={`space-y-4 ${className}`}>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

export default SkeletonList;
