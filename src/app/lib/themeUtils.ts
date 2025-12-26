/**
 * Theme utilities - LOCKED TO LIGHT MODE ONLY
 * Sayso is a light-first, brand-controlled experience.
 * Accessibility is handled via contrast & typography — not OS theming.
 * 
 * All dark mode detection and switching has been neutralized.
 */

export type ThemeMode = 'light'; // Only light mode supported

export const THEME_COLORS = {
  light: {
    background: '#E5E0E5',  // off-white (Sayso brand color)
    surface: '#FFFFFF',
    text: '#2D2D2D',        // charcoal for text
    accent: '#7D9B76',      // sage
    secondary: '#722F37',   // coral/burgundy
  },
} as const;

/**
 * Updates the theme-color meta tag (always light)
 */
export const updateThemeColor = (): void => {
  if (typeof document === 'undefined') return;

  const themeColor = THEME_COLORS.light.background;

  // Update existing theme-color meta tags
  const metaTags = document.querySelectorAll('meta[name="theme-color"]');
  metaTags.forEach((tag) => {
    const metaTag = tag as HTMLMetaElement;
    if (metaTag.media) {
      // Keep media-specific tags but set to light color
      metaTag.content = themeColor;
      return;
    }
    metaTag.content = themeColor;
  });

  // Add a fallback theme-color meta tag if none exists
  if (metaTags.length === 0) {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = themeColor;
    document.head.appendChild(meta);
  }

  // Update CSS custom properties (always light)
  document.documentElement.style.setProperty('--theme-bg', themeColor);
  document.documentElement.style.setProperty('--theme-surface', THEME_COLORS.light.surface);
  document.documentElement.style.setProperty('--theme-text', THEME_COLORS.light.text);
};

/**
 * Neutralized: Always returns false (light mode only)
 */
export const getSystemPrefersDark = (): boolean => {
  return false; // Always light mode
};

/**
 * Neutralized: Returns no-op cleanup function
 */
export const onSystemThemeChange = (_callback: (isDark: boolean) => void): (() => void) => {
  // No-op: we don't listen to system theme changes
  return () => {};
};

/**
 * Neutralized: Always returns 'light'
 */
export const getEffectiveTheme = (_userPreference?: ThemeMode): 'light' => {
  return 'light'; // Always light mode
};

/**
 * Neutralized: Always applies light theme, never adds dark class
 */
export const applyTheme = (_mode?: ThemeMode): void => {
  if (typeof document === 'undefined') return;

  // Ensure dark class is never added
  document.documentElement.classList.remove('dark');
  document.documentElement.classList.add('light');

  // Update theme color (always light)
  updateThemeColor();
};

/**
 * Initializes theme on app load (always light)
 */
export const initializeTheme = (): void => {
  applyTheme('light');
  // No system theme listener - we're locked to light mode
};

/**
 * Hook for React components - always returns light mode
 */
export const createThemeManager = () => {
  const currentMode: ThemeMode = 'light';
  const listeners: Array<(mode: ThemeMode) => void> = [];

  const setMode = (_mode: ThemeMode) => {
    // No-op: always light mode
    applyTheme('light');
    listeners.forEach(listener => listener('light'));
  };

  const subscribe = (listener: (mode: ThemeMode) => void) => {
    listeners.push(listener);
    return () => {
      // Cleanup
    };
  };

  const getMode = () => 'light' as ThemeMode;
  const getEffectiveMode = () => 'light' as const;

  return {
    setMode,
    getMode,
    getEffectiveMode,
    subscribe,
    initialize: () => initializeTheme(),
  };
};
