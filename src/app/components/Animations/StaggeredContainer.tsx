'use client';

import { motion, HTMLMotionProps } from 'framer-motion';
import { usePageAnimation } from '../../hooks/useStaggeredAnimation';

interface StaggeredContainerProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
}

/**
 * Container component that enables subtle, premium staggered animations for children
 * Features ultra-tight stagger timing and refined motion for a cohesive, elegant appearance
 */
export default function StaggeredContainer({
  children,
  className = '',
  ...props
}: StaggeredContainerProps) {
  const variants = usePageAnimation();

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={variants}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

