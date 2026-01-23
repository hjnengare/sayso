import React from 'react';
import Skeleton from './Skeleton';

interface SkeletonCardProps {
  className?: string;
  height?: string;
  width?: string;
}

const SkeletonCard: React.FC<SkeletonCardProps> = ({ className = '', height = 'h-32', width = 'w-full' }) => (
  <Skeleton className={`block ${height} ${width} mb-4 ${className}`} radius="rounded-2xl" />
);

export default SkeletonCard;
