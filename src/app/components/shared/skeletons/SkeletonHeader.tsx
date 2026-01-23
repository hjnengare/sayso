import React from 'react';
import Skeleton from './Skeleton';

interface SkeletonHeaderProps {
  className?: string;
  height?: string;
  width?: string;
}

const SkeletonHeader: React.FC<SkeletonHeaderProps> = ({ className = '', height = 'h-8', width = 'w-2/3' }) => (
  <Skeleton className={`block ${height} ${width} mb-2 ${className}`} radius="rounded-lg" />
);

export default SkeletonHeader;
