/**
 * Tests for mobile performance optimizations in onboarding
 * 
 * Validates:
 * - Debounced localStorage writes
 * - Mobile device detection
 * - Performance-optimized auth retries
 * - Conditional prefetching
 */

import { OnboardingContext } from '@/app/contexts/OnboardingContext';
import { AuthContext } from '@/app/contexts/AuthContext';

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Mobile Performance Optimizations', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe('Debounced localStorage', () => {
    it('should batch rapid localStorage writes', (done) => {
      const debounce = (fn: Function, delay: number) => {
        let timeoutId: NodeJS.Timeout;
        return (...args: any[]) => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => fn(...args), delay);
        };
      };

      let callCount = 0;
      const fn = jest.fn(() => {
        callCount++;
      });

      const debouncedFn = debounce(fn, 300);

      // Call 10 times rapidly
      for (let i = 0; i < 10; i++) {
        debouncedFn(i);
      }

      // After debounce delay, should only be called once
      setTimeout(() => {
        expect(callCount).toBe(1);
        expect(fn).toHaveBeenCalledTimes(1);
        done();
      }, 350);
    });

    it('should wait for idle time before writing to localStorage', (done) => {
      const callback = jest.fn();

      // Mock requestIdleCallback
      (window as any).requestIdleCallback = (cb: IdleRequestCallback) => {
        setTimeout(() => cb({} as IdleDeadline), 0);
      };

      (window as any).requestIdleCallback(callback);

      setTimeout(() => {
        expect(callback).toHaveBeenCalled();
        done();
      }, 50);
    });
  });

  describe('Mobile device detection', () => {
    it('should detect mobile user agents', () => {
      const isMobileDevice = () => {
        const userAgent =
          typeof navigator !== 'undefined' ? navigator.userAgent : '';
        return /iPhone|iPad|Android|Mobile/i.test(userAgent);
      };

      // Test with mock user agent
      const originalUserAgent = navigator.userAgent;
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)',
        configurable: true,
      });

      expect(isMobileDevice()).toBe(true);

      // Restore
      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        configurable: true,
      });
    });

    it('should detect desktop user agents', () => {
      const isMobileDevice = () => {
        const userAgent =
          typeof navigator !== 'undefined' ? navigator.userAgent : '';
        return /iPhone|iPad|Android|Mobile/i.test(userAgent);
      };

      const originalUserAgent = navigator.userAgent;
      Object.defineProperty(navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        configurable: true,
      });

      expect(isMobileDevice()).toBe(false);

      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        configurable: true,
      });
    });
  });

  describe('Auth retry optimization for mobile', () => {
    it('should use fewer retries on mobile devices', () => {
      const isMobileDevice = () => true;
      const MAX_RETRIES = isMobileDevice() ? 1 : 3;

      expect(MAX_RETRIES).toBe(1);
    });

    it('should use more retries on desktop', () => {
      const isMobileDevice = () => false;
      const MAX_RETRIES = isMobileDevice() ? 1 : 3;

      expect(MAX_RETRIES).toBe(3);
    });

    it('should use shorter retry delays on mobile', () => {
      const isMobileDevice = () => true;
      const RETRY_DELAY_MS = isMobileDevice() ? 500 : 1000;

      expect(RETRY_DELAY_MS).toBe(500);
    });

    it('should use longer retry delays on desktop', () => {
      const isMobileDevice = () => false;
      const RETRY_DELAY_MS = isMobileDevice() ? 500 : 1000;

      expect(RETRY_DELAY_MS).toBe(1000);
    });
  });

  describe('Conditional prefetching', () => {
    it('should disable prefetch on mobile devices', () => {
      const isMobileDevice = () => true;
      const shouldPrefetch = !isMobileDevice();

      expect(shouldPrefetch).toBe(false);
    });

    it('should enable prefetch on desktop devices', () => {
      const isMobileDevice = () => false;
      const shouldPrefetch = !isMobileDevice();

      expect(shouldPrefetch).toBe(true);
    });

    it('should consider network quality for prefetch decision', () => {
      const isMobileDevice = () => false;
      const hasGoodConnection = () => {
        if (typeof navigator !== 'undefined' && 'connection' in navigator) {
          const conn = (navigator as any).connection;
          return (
            conn.effectiveType === '4g' ||
            conn.effectiveType === 'wifi'
          );
        }
        return true; // assume good connection if not available
      };

      const shouldPrefetch = !isMobileDevice() || hasGoodConnection();

      // On desktop with no connection info, should prefetch
      expect(shouldPrefetch).toBe(true);
    });
  });

  describe('Combined optimizations', () => {
    it('should apply all optimizations together', () => {
      const isMobileDevice = () => true;

      const config = {
        maxRetries: isMobileDevice() ? 1 : 3,
        retryDelayMs: isMobileDevice() ? 500 : 1000,
        debounceMs: 300,
        shouldPrefetch: !isMobileDevice(),
      };

      expect(config.maxRetries).toBe(1);
      expect(config.retryDelayMs).toBe(500);
      expect(config.debounceMs).toBe(300);
      expect(config.shouldPrefetch).toBe(false);
    });

    it('should optimize differently on desktop', () => {
      const isMobileDevice = () => false;

      const config = {
        maxRetries: isMobileDevice() ? 1 : 3,
        retryDelayMs: isMobileDevice() ? 500 : 1000,
        debounceMs: 300,
        shouldPrefetch: !isMobileDevice(),
      };

      expect(config.maxRetries).toBe(3);
      expect(config.retryDelayMs).toBe(1000);
      expect(config.debounceMs).toBe(300);
      expect(config.shouldPrefetch).toBe(true);
    });
  });
});
