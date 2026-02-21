/**
 * Hook to fetch globally-trending businesses from the dedicated trending API.
 *
 * This is intentionally separate from useBusinesses / useForYouBusinesses:
 *   - Trending = global discovery (same results for everyone)
 *   - For You  = personalized (mixed feed with preferences & dealbreakers)
 *
 * Backed by the `mv_trending_businesses` materialized view which refreshes
 * every 15 minutes via pg_cron.
 *
 * Uses SWR for caching and deduplication.
 */

import { useEffect } from 'react';
import useSWR from 'swr';
import { Business } from '../components/BusinessCard/BusinessCard';
import { swrConfig } from '../lib/swrConfig';

export interface UseTrendingOptions {
  limit?: number;
  category?: string;
  skip?: boolean;
  /** When true, appends `debug=1` so the API emits verbose logs (server console). */
  debug?: boolean;
  /** SSR-seeded data to avoid loading flash on first render. */
  fallbackData?: Business[];
}

export interface UseTrendingResult {
  businesses: Business[];
  loading: boolean;
  error: string | null;
  /** HTTP status when error is set (e.g. 500). Helps UI show status so count 0 doesn't hide the problem. */
  statusCode: number | null;
  count: number;
  refetch: () => void;
  refreshedAt: string | null;
}

async function fetchTrendingData(
  _key: string,
  limit: number,
  category: string | undefined,
  debug: boolean
): Promise<{ businesses: Business[]; count: number; refreshedAt: string | null }> {
  const params = new URLSearchParams();
  params.set('limit', limit.toString());
  if (category) params.set('category', category);
  if (debug) params.set('debug', '1');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 18_000);

  let response = await fetch(`/api/trending?${params.toString()}`, {
    signal: controller.signal,
  });
  let usedLegacyFallback = false;

  if (response.status === 404) {
    usedLegacyFallback = true;
    if (process.env.NODE_ENV === 'development') {
      console.warn('[useTrendingBusinesses] /api/trending returned 404, falling back to /api/businesses');
    }
    const fallbackParams = new URLSearchParams();
    fallbackParams.set('limit', limit.toString());
    if (category) fallbackParams.set('category', category);
    fallbackParams.set('feed_strategy', 'standard');
    fallbackParams.set('sort_by', 'total_reviews');
    fallbackParams.set('sort_order', 'desc');
    response = await fetch(`/api/businesses?${fallbackParams.toString()}`, {
      signal: controller.signal,
    });
  }

  clearTimeout(timeoutId);

  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = await response.json();
      message = body?.error || body?.details || message;
    } catch {
      // keep message as statusText
    }
    if (usedLegacyFallback && response.status === 404) {
      return { businesses: [], count: 0, refreshedAt: null };
    }
    const err = new Error(`${response.status}: ${message}`) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }

  const data = await response.json();
  const list = Array.isArray(data?.businesses)
    ? data.businesses
    : Array.isArray(data?.data)
      ? data.data
      : [];
  return {
    businesses: list,
    count: data.meta?.count ?? list.length,
    refreshedAt: data.meta?.refreshedAt || null,
  };
}

export function useTrendingBusinesses(
  options: UseTrendingOptions = {},
): UseTrendingResult {
  const { limit = 20, category, skip = false, debug = false, fallbackData } = options;

  const swrKey = skip ? null : ['trending', limit, category ?? '', debug];

  const fallbackSWRData = fallbackData
    ? { businesses: fallbackData, count: fallbackData.length, refreshedAt: null }
    : undefined;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    ([, l, c, d]: [string, number, string, boolean]) => fetchTrendingData('trending', l, c || undefined, d),
    {
      ...swrConfig,
      dedupingInterval: 60000, // Longer for Trending - same data for everyone
      keepPreviousData: true,
      fallbackData: fallbackSWRData,
    }
  );

  // Refetch when the page becomes visible again
  useEffect(() => {
    if (skip) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        mutate();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [skip, mutate]);

  const err = error as Error & { status?: number } | undefined;
  return {
    businesses: data?.businesses ?? [],
    loading: isLoading,
    error: err ? err.message : null,
    statusCode: err?.status ?? null,
    count: data?.count ?? 0,
    refetch: () => mutate(),
    refreshedAt: data?.refreshedAt ?? null,
  };
}
