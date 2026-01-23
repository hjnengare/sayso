import React from 'react';
import Skeleton from './Skeleton';

interface SkeletonButtonProps {
  className?: string;
  height?: string;
  width?: string;
}

const SkeletonButton: React.FC<SkeletonButtonProps> = ({ className = '', height = 'h-10', width = 'w-32' }) => (
  <Skeleton className={`inline-block ${height} ${width} ${className}`} radius="rounded-full" />
);

export default SkeletonButton;
