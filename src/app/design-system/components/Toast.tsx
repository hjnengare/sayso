/**
 * TOAST COMPONENT - BLABBR DESIGN SYSTEM
 *
 * Standardized toast notification component with accessibility support
 * Handles success, error, warning, and info messages
 */

import React, { forwardRef, ReactNode, useEffect } from 'react';
import { motion, AnimatePresence, MotionProps } from 'framer-motion';
import { cn } from '../utils/cn';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface ToastProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Toast content */
  children: ReactNode;

  /** Toast variant */
  variant?: 'success' | 'error' | 'warning' | 'info' | 'sage' | 'coral';

  /** Toast title */
  title?: string;

  /** Show/hide toast */
  open?: boolean;

  /** Auto-dismiss duration in milliseconds */
  duration?: number;

  /** Callback when toast is dismissed */
  onDismiss?: () => void;

  /** Show close button */
  closable?: boolean;

  /** Position on screen */
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

  /** Additional CSS classes */
  className?: string;

  /** Motion properties */
  motionProps?: MotionProps;

  /** Custom icon */
  icon?: ReactNode;

  /** Action button */
  action?: {
    label: string;
    onClick: () => void;
  };
}

// =============================================================================
// STYLE VARIANTS
// =============================================================================

const toastVariants = {
  base: [
    // Base styles
    'relative flex items-start gap-3 p-4 rounded-lg shadow-lg backdrop-blur-sm',
    'font-primary text-body-md border',
    'max-w-md w-full pointer-events-auto',
    'transition-all duration-normal',

    // Light mode only - brand controls color
  ],

  variants: {
    success: [
      'bg-success-50 border-success-200 text-success-800',
    ],
    error: [
      'bg-error-50 border-error-200 text-error-800',
    ],
    warning: [
      'bg-warning-50 border-warning-200 text-warning-800',
    ],
    info: [
      'bg-info-50 border-info-200 text-info-800',
    ],
    sage: [
      'bg-card-bg-50 border-sage-200 text-sage-800',
    ],
    coral: [
      'bg-coral-50 border-coral-200 text-coral-800',
    ],
  },

  positions: {
    'top-left': 'top-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4',
  },
} as const;

// =============================================================================
// ICONS
// =============================================================================

const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ExclamationCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ExclamationTriangleIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-1.732-.833-2.5 0L4.314 18.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

const InformationCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const StarIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);

const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// =============================================================================
// VARIANT ICONS
// =============================================================================

const variantIcons = {
  success: CheckCircleIcon,
  error: ExclamationCircleIcon,
  warning: ExclamationTriangleIcon,
  info: InformationCircleIcon,
  sage: StarIcon,
  coral: StarIcon,
} as const;

// =============================================================================
// TOAST COMPONENT
// =============================================================================

export const Toast = forwardRef<HTMLDivElement, ToastProps>(
  (
    {
      children,
      variant = 'info',
      title,
      open = true,
      duration = 5000,
      onDismiss,
      closable = true,
      position = 'top-right',
      className,
      motionProps,
      icon: customIcon,
      action,
      ...props
    },
    ref
  ) => {
    // Auto-dismiss logic
    useEffect(() => {
      if (!open || !duration || duration <= 0) return;

      const timer = setTimeout(() => {
        onDismiss?.();
      }, duration);

      return () => clearTimeout(timer);
    }, [open, duration, onDismiss]);

    // Get variant icon
    const IconComponent = variantIcons[variant];
    const icon = customIcon || <IconComponent className="w-5 h-5 flex-shrink-0 mt-0.5" />;

    // Build toast classes
    const toastClasses = cn(
      toastVariants.base,
      toastVariants.variants[variant],
      className
    );

    // Animation variants
    const slideVariants = {
      initial: { opacity: 0, y: -50, scale: 0.95 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0, y: -20, scale: 0.95 },
    };

    return (
      <AnimatePresence>
        {open && (
          <motion.div
            ref={ref}
            className={toastClasses}
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            variants={slideVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeOut' }}
            {...motionProps}
            {...(() => {
              const { onDrag, onDragStart, onDragEnd, ...restProps } = props as any;
              return restProps;
            })()}
          >
            {/* Icon */}
            <div className="flex-shrink-0">
              {icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {title && (
                <div className="font-semibold mb-1 text-current">
                  {title}
                </div>
              )}
              <div className="text-current opacity-90">
                {children}
              </div>

              {/* Action Button */}
              {action && (
                <button
                  onClick={action.onClick}
                  className="mt-2 text-sm font-semibold underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-current focus:ring-offset-2 rounded-sm"
                >
                  {action.label}
                </button>
              )}
            </div>

            {/* Close Button */}
            {closable && (
              <button
                onClick={onDismiss}
                className="flex-shrink-0 p-1 rounded-md hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-current focus:ring-offset-2 transition-colors duration-200"
                aria-label="Dismiss notification"
              >
                <XIcon className="w-4 h-4" />
              </button>
            )}

            {/* Progress Bar (if duration is set) */}
            {duration && duration > 0 && (
              <motion.div
                className="absolute bottom-0 left-0 h-1 bg-current opacity-30 rounded-full"
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: duration / 1000, ease: 'linear' }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
);

Toast.displayName = 'Toast';

// =============================================================================
// TOAST CONTAINER
// =============================================================================

export interface ToastContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Container position */
  position?: ToastProps['position'];
  /** Additional CSS classes */
  className?: string;
}

export const ToastContainer = forwardRef<HTMLDivElement, ToastContainerProps>(
  ({ position = 'top-right', className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'fixed z-50 pointer-events-none',
        toastVariants.positions[position],
        className
      )}
      {...props}
    >
      <div className="space-y-2">
        {children}
      </div>
    </div>
  )
);

ToastContainer.displayName = 'ToastContainer';

// =============================================================================
// EXPORTS
// =============================================================================

export default Toast;
