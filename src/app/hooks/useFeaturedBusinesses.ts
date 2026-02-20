/**
 * Hook to fetch featured businesses from the API.
 * Uses SWR for caching and deduplication.
 */

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { swrConfig } from '../lib/swrConfig';

export interface FeaturedBusiness {
  id: string;
  name: string;
  image: string;
  alt: string;
  category: string;
  category_label?: string;
  description: string;
  location: string;
  rating: number;
  reviewCount: number;
  totalRating: number;
  reviews: number;
  badge: "featured";
  rank: number;
  href: string;
  monthAchievement: string;
  verified: boolean;
  ui_hints?: {
    badge?: "featured";
    rank?: number;
    period?: string;
    reason?: {
      label: string;
      metric?: string;
      value?: number;
    };
  };
  featured_score?: number;
  recent_reviews_30d?: number;
  recent_reviews_7d?: number;
  bayesian_rating?: number | null;
  lat?: number | null;
  lng?: number | null;
  top_review_preview?: {
    content: string;
    rating?: number | null;
    createdAt?: string | null;
  } | null;
}

export interface UseFeaturedBusinessesOptions {
  limit?: number;
  region?: string | null;
  skip?: boolean;
  /** Delay first fetch by ms (e.g. 150) to prioritize above-fold content. Uses requestIdleCallback when available. */
  deferMs?: number;
}

export interface UseFeaturedBusinessesResult {
  featuredBusinesses: FeaturedBusiness[];
  loading: boolean;
  error: string | null;
  /** HTTP status when error is set. Helps UI show status so count 0 doesn't hide the problem. */
  statusCode: number | null;
  refetch: () => void;
  meta?: FeaturedBusinessesMeta | null;
}

export interface FeaturedBusinessesMeta {
  period?: string;
  generated_at?: string;
  seed?: string;
  source?: 'cold_start' | 'rpc' | 'fallback';
  count?: number;
}

const mapLegacyBusinessToFeatured = (
  business: any,
  index: number,
): FeaturedBusiness => {
  const totalRating = Number(business?.totalRating ?? business?.rating ?? 0);
  const reviewCount = Number(business?.reviewCount ?? business?.reviews ?? 0);

  return {
    id: String(business?.id ?? ''),
    name: String(business?.name ?? 'Business'),
    image: business?.image || business?.image_url || '',
    alt: String(business?.alt ?? business?.name ?? 'Business'),
    category: String(business?.category ?? business?.sub_interest_id ?? 'miscellaneous'),
    category_label:
      typeof business?.category_label === 'string' && business.category_label.trim()
        ? business.category_label.trim()
        : undefined,
    description:
      typeof business?.description === 'string' && business.description.trim()
        ? business.description.trim()
        : 'Featured in the community',
    location: String(business?.location ?? 'Cape Town'),
    rating: totalRating,
    reviewCount,
    totalRating,
    reviews: reviewCount,
    badge: 'featured',
    rank: index + 1,
    href: String(business?.href ?? `/business/${business?.slug || business?.id || ''}`),
    monthAchievement: 'Featured in the community',
    verified: Boolean(business?.verified),
    lat: typeof business?.lat === 'number' ? business.lat : null,
    lng: typeof business?.lng === 'number' ? business.lng : null,
    ui_hints: {
      badge: 'featured',
      rank: index + 1,
    },
  };
};

async function fetchFeaturedData(
  _key: string,
  limit: number | undefined,
  region: string | null | undefined
): Promise<{ list: FeaturedBusiness[]; meta: FeaturedBusinessesMeta | null }> {
  const params = new URLSearchParams();
  if (limit) params.set('limit', limit.toString());
  if (region) params.set('region', region);

  let response = await fetch(`/api/featured?${params.toString()}`);
  let usedLegacyFallback = false;

  if (response.status === 404) {
    usedLegacyFallback = true;
    if (process.env.NODE_ENV === 'development') {
      console.warn('[useFeaturedBusinesses] /api/featured returned 404, falling back to /api/businesses');
    }
    const fallbackParams = new URLSearchParams();
    if (limit) fallbackParams.set('limit', limit.toString());
    if (region) fallbackParams.set('location', region);
    fallbackParams.set('feed_strategy', 'standard');
    fallbackParams.set('sort_by', 'total_rating');
    fallbackParams.set('sort_order', 'desc');
    response = await fetch(`/api/businesses?${fallbackParams.toString()}`);
  }

  if (!response.ok) {
    let message = `Failed to fetch featured businesses: ${response.status}`;
    try {
      const body = await response.json();
      message = body?.error || message;
    } catch {
      // keep message
    }
    if (usedLegacyFallback && response.status === 404) {
      return { list: [], meta: null };
    }
    const err = new Error(`${response.status}: ${message}`) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }

  const data = await response.json();

  if (usedLegacyFallback) {
    const fallbackList = Array.isArray(data?.businesses)
      ? data.businesses
      : Array.isArray(data?.data)
        ? data.data
        : [];
    const normalized = fallbackList
      .filter((item: { id?: unknown }) => item && item.id)
      .map((item: unknown, index: number) => mapLegacyBusinessToFeatured(item as Record<string, unknown>, index));
    return {
      list: normalized,
      meta: {
        source: 'fallback',
        count: normalized.length,
        generated_at: new Date().toISOString(),
      },
    };
  }

  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
      ? data.data
      : [];
  return {
    list,
    meta: data && !Array.isArray(data) ? data?.meta ?? null : null,
  };
}

export function useFeaturedBusinesses(options: UseFeaturedBusinessesOptions = {}): UseFeaturedBusinessesResult {
  const { limit, region, skip = false, deferMs = 0 } = options;
  const [deferReady, setDeferReady] = useState(deferMs <= 0);

  useEffect(() => {
    if (deferMs <= 0 || skip) {
      setDeferReady(true);
      return;
    }
    const w = typeof window !== 'undefined' ? (window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }) : null;
    if (w?.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setDeferReady(true), { timeout: deferMs });
      return () => w.cancelIdleCallback?.(id);
    }
    const id = setTimeout(() => setDeferReady(true), deferMs);
    return () => clearTimeout(id);
  }, [deferMs, skip]);

  const swrKey = skip || !deferReady ? null : ['featured', limit ?? 12, region ?? null];

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    ([, l, r]: [string, number, string | null]) => fetchFeaturedData('featured', l, r ?? undefined),
    {
      ...swrConfig,
      dedupingInterval: 60000, // Longer for Featured - same data for everyone
    }
  );

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
    featuredBusinesses: data?.list ?? [],
    loading: !deferReady || isLoading,
    error: err ? err.message : null,
    statusCode: err?.status ?? null,
    refetch: () => mutate(),
    meta: data?.meta ?? null,
  };
}
