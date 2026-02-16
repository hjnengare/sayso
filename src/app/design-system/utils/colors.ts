/**
 * sayso DESIGN SYSTEM - COLOR UTILITIES
 *
 * Utility functions for consistent color usage across the sayso app
 * Provides easy access to design system colors with proper TypeScript support
 */

import { colors } from '../tokens';

// =============================================================================
// BRAND COLOR UTILITIES
// =============================================================================

/**
 * Get brand color with specific shade
 */
export const getBrandColor = (variant: 'sage' | 'coral' | 'charcoal', shade: number = 500) => {
  const colorMap = {
    sage: colors.primary.sage,
    coral: colors.primary.coral,
    charcoal: colors.neutral.charcoal,
  };
  
  return colorMap[variant][shade as keyof typeof colorMap[typeof variant]];
};

/**
 * Get semantic color with specific shade
 */
export const getSemanticColor = (type: 'success' | 'error' | 'warning' | 'info', shade: number = 500) => {
  return colors.semantic[type][shade as keyof typeof colors.semantic[typeof type]];
};

/**
 * Get neutral color with specific shade
 */
export const getNeutralColor = (variant: 'charcoal' | 'off-white', shade: number = 500) => {
  const colorMap = {
    charcoal: colors.neutral.charcoal,
    'off-white': colors.neutral['off-white'],
  };
  
  return colorMap[variant][shade as keyof typeof colorMap[typeof variant]];
};

// =============================================================================
// COMMON COLOR COMBINATIONS
// =============================================================================

/**
 * Get primary brand color combination
 */
export const getPrimaryColors = () => ({
  sage: colors.primary.sage[500],
  coral: colors.primary.coral[500],
  charcoal: colors.neutral.charcoal[500],
  offWhite: colors.neutral['off-white'][100],
});

/**
 * Get color palette for specific use cases
 */
export const getColorPalette = {
  // Main brand colors
  brand: {
    primary: colors.primary.sage[500],
    secondary: colors.primary.coral[500],
    neutral: colors.neutral.charcoal[500],
    background: colors.neutral['off-white'][100],
  },
  
  // Text colors
  text: {
    primary: colors.neutral.charcoal[500],
    secondary: colors.neutral.charcoal[400],
    muted: colors.neutral.charcoal[300],
    inverse: colors.neutral['off-white'][50],
  },
  
  // Interactive states
  interactive: {
    hover: colors.primary.sage[600],
    active: colors.primary.sage[700],
    focus: colors.primary.sage[500],
    disabled: colors.neutral.charcoal[200],
  },
  
  // Status colors
  status: {
    success: colors.semantic.success[500],
    error: colors.semantic.error[500],
    warning: colors.semantic.warning[500],
    info: colors.semantic.info[500],
  },
};

// =============================================================================
// CSS VARIABLE UTILITIES
// =============================================================================

/**
 * Generate CSS custom properties for colors
 */
export const generateColorCSSVars = () => {
  const cssVars: Record<string, string> = {};
  
  // Primary colors
  Object.entries(colors.primary.sage).forEach(([shade, value]) => {
    cssVars[`--color-sage-${shade}`] = value;
  });
  
  Object.entries(colors.primary.coral).forEach(([shade, value]) => {
    cssVars[`--color-coral-${shade}`] = value;
  });
  
  // Neutral colors
  Object.entries(colors.neutral.charcoal).forEach(([shade, value]) => {
    cssVars[`--color-charcoal-${shade}`] = value;
  });
  
  Object.entries(colors.neutral['off-white']).forEach(([shade, value]) => {
    cssVars[`--color-off-white-${shade}`] = value;
  });
  
  // Semantic colors
  Object.entries(colors.semantic).forEach(([type, shades]) => {
    Object.entries(shades).forEach(([shade, value]) => {
      cssVars[`--color-${type}-${shade}`] = value;
    });
  });
  
  return cssVars;
};

// =============================================================================
// TAILWIND COLOR UTILITIES
// =============================================================================

/**
 * Get Tailwind color classes for common use cases
 */
export const getTailwindColors = {
  // Background colors
  bg: {
    primary: 'bg-card-bg-500',
    secondary: 'bg-coral-500',
    neutral: 'bg-charcoal-500',
    surface: 'bg-off-white-100',
    muted: 'bg-charcoal-50',
  },
  
  // Text colors
  text: {
    primary: 'text-charcoal-500',
    secondary: 'text-charcoal-400',
    muted: 'text-charcoal-300',
    inverse: 'text-off-white-50',
    brand: 'text-sage-500',
    accent: 'text-coral-500',
  },
  
  // Border colors
  border: {
    primary: 'border-sage-500',
    secondary: 'border-coral-500',
    neutral: 'border-charcoal-200',
    muted: 'border-charcoal-100',
  },
  
  // Interactive states
  hover: {
    primary: 'hover:bg-card-bg-600',
    secondary: 'hover:bg-coral-600',
    neutral: 'hover:bg-charcoal-600',
  },
  
  // Status colors
  status: {
    success: 'text-success-500',
    error: 'text-error-500',
    warning: 'text-warning-500',
    info: 'text-info-500',
  },
};

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type BrandColorVariant = 'sage' | 'coral' | 'charcoal';
export type SemanticColorType = 'success' | 'error' | 'warning' | 'info';
export type NeutralColorVariant = 'charcoal' | 'off-white';
export type ColorShade = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
