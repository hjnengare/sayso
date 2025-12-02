'use client';

import { useMemo } from 'react';
import { Variants } from 'framer-motion';

export type AnimationDirection = 'top' | 'bottom' | 'left' | 'right' | 'scale';

export interface StaggeredAnimationConfig {
  delay?: number;
  duration?: number;
  direction?: AnimationDirection;
  distance?: number;
}

/**
 * Hook for creating staggered entrance animations with bubbly dance effect
 * 
 * @param index - The index of the element in the staggered sequence
 * @param config - Animation configuration
 * @returns Framer Motion variants for the element
 */
export function useStaggeredAnimation(
  index: number = 0,
  config: StaggeredAnimationConfig = {}
): Variants {
  const {
    delay = 0.02, // Ultra-tight delay for subtle, premium stagger
    duration = 0.4, // Refined duration for elegant, smooth motion
    direction = 'bottom',
    distance = 12, // Minimal distance for subtle, premium movement
  } = config;

  return useMemo(() => {
    const baseDelay = index * delay;
    // Premium spring config: ultra-smooth, refined motion
    const springConfig = {
      type: 'spring' as const,
      stiffness: 200,
      damping: 30,
      mass: 0.8,
    };

    // Determine initial position based on direction - ultra-subtle distances
    const getInitialPosition = () => {
      const subtleDistance = distance * 0.4; // Ultra-minimal distance for premium subtlety
      switch (direction) {
        case 'top':
          return { y: -subtleDistance, x: 0, scale: 0.98 };
        case 'bottom':
          return { y: subtleDistance, x: 0, scale: 0.98 };
        case 'left':
          return { x: -subtleDistance, y: 0, scale: 0.98 };
        case 'right':
          return { x: subtleDistance, y: 0, scale: 0.98 };
        case 'scale':
          return { scale: 0.96, y: subtleDistance * 0.3 };
        default:
          return { y: subtleDistance, x: 0, scale: 0.98 };
      }
    };

    const initial = getInitialPosition();

    return {
      hidden: {
        opacity: 0,
        ...initial,
      },
      visible: {
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        transition: {
          ...springConfig,
          delay: baseDelay,
          duration: duration * 0.9, // Refined duration for elegant motion
          ease: [0.16, 1, 0.3, 1], // Premium cubic bezier easing for smooth, refined feel
        },
      },
      settled: {
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        transition: {
          type: 'spring',
          stiffness: 200,
          damping: 30,
          mass: 0.8,
          delay: baseDelay + duration + 0.1,
        },
      },
      bubbly: {
        opacity: 1,
        x: 0,
        y: 0,
        scale: [1, 1.02, 0.99, 1.01, 1], // Much more subtle scale variation
        transition: {
          type: 'keyframes',
          times: [0, 0.25, 0.5, 0.75, 1],
          duration: 0.8,
          ease: [0.16, 1, 0.3, 1], // Premium easing
        },
      },
    };
  }, [index, delay, duration, direction, distance]);
}

/**
 * Hook for creating page-level animation variants with subtle premium effect
 */
export function usePageAnimation(): Variants {
  return useMemo(() => ({
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.02, // Ultra-tight stagger for premium, cohesive feel
        delayChildren: 0.02, // Minimal delay for immediate, smooth appearance
        ease: [0.16, 1, 0.3, 1], // Premium cubic bezier for smooth, refined motion
      },
    },
  }), []);
}

/**
 * Get a random direction for variety in animations
 */
export function getRandomDirection(): AnimationDirection {
  const directions: AnimationDirection[] = ['top', 'bottom', 'left', 'right', 'scale'];
  return directions[Math.floor(Math.random() * directions.length)];
}

/**
 * Get direction based on index for predictable patterns
 */
export function getDirectionByIndex(index: number): AnimationDirection {
  const directions: AnimationDirection[] = ['top', 'right', 'bottom', 'left', 'scale'];
  return directions[index % directions.length];
}

