/**
 * Hook to fetch businesses from the API.
 * Uses SWR for caching and deduplication.
 */

import { useEffect, useMemo, useCallback } from 'react';
import useSWR from 'swr';
import { Business } from '../components/BusinessCard/BusinessCard';
import { type UserPreferences } from './useUserPreferences';
import { businessUpdateEvents } from '../lib/utils/businessUpdateEvents';
import { swrConfig } from '../lib/swrConfig';

const isDev = process.env.NODE_ENV === 'development';
const devLog = (...args: unknown[]) => {
  if (isDev) console.log(...args);
};
const devWarn = (...args: unknown[]) => {
  if (isDev) console.warn(...args);
};

function buildBusinessesParams(options: UseBusinessesOptions): URLSearchParams {
  const params = new URLSearchParams();
  if (options.limit) params.set('limit', options.limit.toString());
  if (options.category) params.set('category', options.category);
  if (options.sortBy) params.set('sort_by', options.sortBy);
  if (options.sortOrder) params.set('sort_order', options.sortOrder);
  if (options.verified !== undefined) params.set('verified', options.verified.toString());
  if (options.badge) params.set('badge', options.badge);
  if (options.location) params.set('location', options.location);
  if (options.priceRange) params.set('price_range', options.priceRange);
  if (options.interestIds && options.interestIds.length > 0) {
    params.set('interest_ids', options.interestIds.join(','));
  }
  if (options.subInterestIds && options.subInterestIds.length > 0) {
    params.set('sub_interest_ids', options.subInterestIds.join(','));
  }
  if (options.priceRanges && options.priceRanges.length > 0) {
    params.set('preferred_price_ranges', options.priceRanges.join(','));
  }
  if (options.dealbreakerIds && options.dealbreakerIds.length > 0) {
    params.set('dealbreakers', options.dealbreakerIds.join(','));
  }
  if (options.feedStrategy) params.set('feed_strategy', options.feedStrategy);
  if (options.minRating !== null && options.minRating !== undefined) {
    params.set('min_rating', options.minRating.toString());
  }
  if (options.searchQuery && options.searchQuery.trim().length > 0) {
    params.set('q', options.searchQuery.trim());
  }
  if (options.sort) params.set('sort', options.sort);
  const radius = options.radiusKm ?? options.radius;
  if (radius !== null && radius !== undefined && options.latitude && options.longitude) {
    params.set('radius_km', radius.toString());
    params.set('lat', options.latitude.toString());
    params.set('lng', options.longitude.toString());
  } else if (options.radius != null && options.latitude && options.longitude) {
    params.set('radius', options.radius!.toString());
    params.set('lat', options.latitude.toString());
    params.set('lng', options.longitude.toString());
  }
  return params;
}

async function fetchBusinessesData(url: string, cache?: RequestCache): Promise<Business[]> {
  const fetchOptions: RequestInit = {};
  if (cache) fetchOptions.cache = cache;
  const response = await fetch(url, fetchOptions);
  if (!response.ok) {
    const contentType = response.headers.get('content-type') || '';
    const rawText = await response.text();
    let errorData: Record<string, unknown> | null = null;
    if (contentType.includes('application/json')) {
      try {
        errorData = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : null;
      } catch {
        errorData = { rawText };
      }
    } else {
      errorData = { rawText };
    }
    if (isDev) {
      console.error('[useBusinesses] API error response:', {
        status: response.status,
        statusText: response.statusText,
        errorData,
        url,
      });
    }
    const message =
      errorData?.error || errorData?.details || errorData?.message ||
      `Failed to fetch businesses: ${response.statusText} (${response.status})`;
    throw new Error(typeof message === 'string' ? message : String(message));
  }
  const data = await response.json();
  const list = data.businesses || data.data || [];
  if (isDev && list.length === 0) {
    devWarn('[useBusinesses] WARNING: Received 0 businesses from API!');
  }
  return list;
}

export interface UseBusinessesOptions {
  limit?: number;
  category?: string;
  sortBy?: 'total_rating' | 'total_reviews' | 'reviews' | 'created_at' | 'name' | 'relevance' | 'distance' | 'rating' | 'price' | 'combo';
  sortOrder?: 'asc' | 'desc';
  verified?: boolean;
  badge?: string;
  location?: string;
  priceRange?: string;
  interestIds?: string[]; // IDs of interests/subcategories to filter by
  subInterestIds?: string[]; // IDs of subcategories to filter by (sub_interest_id column)
  priceRanges?: string[];
  dealbreakerIds?: string[];
  feedStrategy?: 'mixed' | 'standard';
  skip?: boolean; // Skip fetching if true
  minRating?: number | null; // Minimum rating filter (1-5)
  radius?: number | null; // Distance radius in km
  latitude?: number | null; // User latitude for distance filtering
  longitude?: number | null; // User longitude for distance filtering
  searchQuery?: string | null; // Search query (q parameter)
  radiusKm?: number | null; // Distance radius in km (new parameter name)
  sort?: 'relevance' | 'distance' | 'rating_desc' | 'price_asc' | 'combo'; // New sort parameter
  cache?: RequestCache; // e.g. 'no-store' to bypass browser/cache (useful for debugging)
}

export interface UseForYouOptions extends Partial<UseBusinessesOptions> {
  initialBusinesses?: Business[];
  skipInitialFetch?: boolean;
  initialPreferences?: UserPreferences;
  skipPreferencesFetch?: boolean;
  preferences?: UserPreferences;
  preferencesLoading?: boolean;
}

export interface UseBusinessesResult {
  businesses: Business[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to fetch businesses from the API
 */
export function useBusinesses(options: UseBusinessesOptions = {}): UseBusinessesResult {
  const params = useMemo(() => buildBusinessesParams(options), [
    options.limit,
    options.category,
    options.sortBy,
    options.sortOrder,
    options.verified,
    options.badge,
    options.location,
    options.priceRange,
    options.interestIds?.join(','),
    options.subInterestIds?.join(','),
    options.priceRanges?.join(','),
    options.dealbreakerIds?.join(','),
    options.feedStrategy,
    options.minRating,
    options.radius,
    options.radiusKm,
    options.latitude,
    options.longitude,
    options.searchQuery,
    options.sort,
  ]);

  const url = useMemo(() => `/api/businesses?${params.toString()}`, [params]);
  const swrKey = options.skip ? null : [url, options.cache];

  const fetcher = useCallback(
    ([u, cache]: [string, RequestCache | undefined]) => fetchBusinessesData(u, cache),
    []
  );

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    fetcher,
    { ...swrConfig, keepPreviousData: true }
  );

  useEffect(() => {
    if (options.skip) return;
    devLog('[useBusinesses] Fetching from:', url);
  }, [options.skip, url]);

  useEffect(() => {
    if (options.skip) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        mutate();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [options.skip, mutate]);

  useEffect(() => {
    if (options.skip) return;
    const unsubscribeUpdate = businessUpdateEvents.onUpdate(() => mutate());
    const unsubscribeDelete = businessUpdateEvents.onDelete((deletedBusinessId: string) => {
      mutate(
        (prev) => (prev ? prev.filter((b) => b.id !== deletedBusinessId) : prev),
        { revalidate: false }
      );
    });
    return () => {
      unsubscribeUpdate();
      unsubscribeDelete();
    };
  }, [options.skip, mutate]);

  return {
    businesses: data ?? [],
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refetch: () => mutate(),
  };
}

// Trending is now a first-class global feed (not personalized mixed feed).
// Re-export from the standalone hook for backward compatibility.
export { useTrendingBusinesses } from './useTrendingBusinesses';

async function fetchForYouData([, requestKey]: [string, string]): Promise<Business[]> {
  const parsed = JSON.parse(requestKey) as {
    limit: number;
    interestIds: string[];
    subInterestIds: string[];
    dealbreakerIds: string[];
    preferredPriceRanges: string[];
    latitude: number | null;
    longitude: number | null;
  };
  const params = new URLSearchParams();
  params.set('limit', parsed.limit.toString());
  params.set('feed_strategy', 'mixed');
  if (parsed.interestIds.length > 0) params.set('interest_ids', parsed.interestIds.join(','));
  if (parsed.subInterestIds.length > 0) params.set('sub_interest_ids', parsed.subInterestIds.join(','));
  if (parsed.dealbreakerIds.length > 0) params.set('dealbreakers', parsed.dealbreakerIds.join(','));
  if (parsed.preferredPriceRanges.length > 0) params.set('preferred_price_ranges', parsed.preferredPriceRanges.join(','));
  if (parsed.latitude && parsed.longitude) {
    params.set('lat', parsed.latitude.toString());
    params.set('lng', parsed.longitude.toString());
  }
  devLog('[useForYouBusinesses] Fetching with V2 recommender:', {
    interestIds: parsed.interestIds.length,
    subInterestIds: parsed.subInterestIds.length,
    dealbreakerIds: parsed.dealbreakerIds.length,
    preferredPriceRanges: parsed.preferredPriceRanges.length,
  });
  const response = await fetch(`/api/businesses?${params.toString()}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error ?? (response.status === 404 ? 'For You feed unavailable' : response.statusText);
    const err = new Error(`${message} (${response.status})`);
    throw err;
  }
  const list = data.businesses || data.data || [];
  devLog(`[useForYouBusinesses] Received ${list.length} businesses`);
  if (list.length === 0) {
    devWarn('[useForYouBusinesses] Empty For You response diagnostics:', {
      status: response.status,
      feedPath: response.headers.get('X-Feed-Path'),
      meta: data?.meta ?? null,
    });
  }
  return list;
}

/**
 * Hook to fetch businesses for "For You" section personalized based on user interests
 *
 * Backend uses Netflix-style two-stage recommender (V2):
 * - Stage A: Candidate generation (personalized, top-rated, fresh, explore)
 * - Stage B: Ranking with decay curves and diversity enforcement
 *
 * The backend handles fallback logic, but we keep client-side fallback for resilience.
 */
export function useForYouBusinesses(
  limit: number = 20,
  overrideInterestIds?: string[] | undefined,
  extraOptions: UseForYouOptions = {}
): UseBusinessesResult {
  const preferenceSource = extraOptions.preferences ?? extraOptions.initialPreferences;
  const preferenceInterests = preferenceSource?.interests ?? [];
  const preferenceSubcategories = preferenceSource?.subcategories ?? [];
  const preferenceDealbreakers = preferenceSource?.dealbreakers ?? [];
  const preferencesLoading = extraOptions.preferencesLoading ?? false;
  const shouldWaitForPreferences =
    preferencesLoading && overrideInterestIds === undefined && !extraOptions.skip;

  const interestIds = useMemo(() => {
    if (overrideInterestIds !== undefined) {
      return overrideInterestIds.length > 0 ? overrideInterestIds : undefined;
    }
    const userInterestIds = preferenceInterests.map((i) => i.id);
    return userInterestIds.length > 0 ? userInterestIds : undefined;
  }, [overrideInterestIds, preferenceInterests]);

  const subInterestIds = useMemo(() => {
    if (overrideInterestIds !== undefined) return undefined;
    const userSubInterestIds = preferenceSubcategories.map((s) => s.id);
    return userSubInterestIds.length > 0 ? userSubInterestIds : undefined;
  }, [overrideInterestIds, preferenceSubcategories]);

  const dealbreakerIds = useMemo(
    () => preferenceDealbreakers.map((d) => d.id),
    [preferenceDealbreakers]
  );

  const preferredPriceRanges = useMemo(() => {
    if (dealbreakerIds.includes('value-for-money')) return ['$', '$$'];
    return undefined;
  }, [dealbreakerIds]);

  const requestKey = useMemo(
    () =>
      JSON.stringify({
        limit,
        interestIds: interestIds ?? [],
        subInterestIds: subInterestIds ?? [],
        dealbreakerIds,
        preferredPriceRanges: preferredPriceRanges ?? [],
        latitude: extraOptions.latitude ?? null,
        longitude: extraOptions.longitude ?? null,
      }),
    [limit, interestIds, subInterestIds, dealbreakerIds, preferredPriceRanges, extraOptions.latitude, extraOptions.longitude]
  );

  const swrKey = (extraOptions.skip || shouldWaitForPreferences)
    ? null
    : (['for-you', requestKey] as [string, string]);

  const { data, error, isLoading, mutate } = useSWR(swrKey, fetchForYouData, { ...swrConfig, keepPreviousData: true });

  useEffect(() => {
    if (extraOptions.skip || shouldWaitForPreferences) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') mutate();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [extraOptions.skip, shouldWaitForPreferences, mutate]);

  return {
    businesses: data ?? [],
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refetch: () => mutate(),
  };
}
