/**
 * Hook to fetch featured businesses from the API
 */

import { useState, useEffect, useCallback } from 'react';

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

/**
 * Hook to fetch featured businesses from the API
 */
export function useFeaturedBusinesses(options: UseFeaturedBusinessesOptions = {}): UseFeaturedBusinessesResult {
  const [featuredBusinesses, setFeaturedBusinesses] = useState<FeaturedBusiness[]>([]);
  const [loading, setLoading] = useState(!options.skip);
  const [error, setError] = useState<string | null>(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [meta, setMeta] = useState<FeaturedBusinessesMeta | null>(null);

  const fetchFeaturedBusinesses = useCallback(async () => {
    if (options.skip) return;

    setLoading(true);
    setError(null);
    setStatusCode(null);

    try {
      const params = new URLSearchParams();
      if (options.limit) params.set('limit', options.limit.toString());
      if (options.region) params.set('region', options.region);

      let response = await fetch(`/api/featured?${params.toString()}`);
      let usedLegacyFallback = false;

      if (response.status === 404) {
        usedLegacyFallback = true;
        console.warn('[useFeaturedBusinesses] /api/featured returned 404, falling back to /api/businesses');

        const fallbackParams = new URLSearchParams();
        if (options.limit) fallbackParams.set('limit', options.limit.toString());
        if (options.region) fallbackParams.set('location', options.region);
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

        // Some environments do not expose these API routes (frontend-only deploys).
        // In that case, degrade to empty state instead of showing raw 404 banners.
        if (usedLegacyFallback && response.status === 404) {
          setStatusCode(null);
          setError(null);
          setFeaturedBusinesses([]);
          setMeta(null);
          return;
        }

        setStatusCode(response.status);
        setError(`${response.status}: ${message}`);
        setFeaturedBusinesses([]);
        setMeta(null);
        return;
      }

      const data = await response.json();

      if (usedLegacyFallback) {
        const fallbackList = Array.isArray(data?.businesses)
          ? data.businesses
          : Array.isArray(data?.data)
            ? data.data
            : [];
        const normalized = fallbackList
          .filter((item: any) => item && item.id)
          .map((item: any, index: number) => mapLegacyBusinessToFeatured(item, index));

        setFeaturedBusinesses(normalized);
        setMeta({
          source: 'fallback',
          count: normalized.length,
          generated_at: new Date().toISOString(),
        });
      } else {
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data
            : [];
        setFeaturedBusinesses(list);
        setMeta(data && !Array.isArray(data) ? data?.meta ?? null : null);
      }
    } catch (err) {
      console.error('Error fetching featured businesses:', err);
      setStatusCode(null);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setFeaturedBusinesses([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [options.limit, options.region, options.skip]);

  useEffect(() => {
    fetchFeaturedBusinesses();
  }, [fetchFeaturedBusinesses]);

  // Refetch when the page becomes visible again (e.g. user navigated away and came back)
  // This ensures fresh review counts, ratings, etc. after submitting a review
  useEffect(() => {
    if (options.skip) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchFeaturedBusinesses();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [options.skip, fetchFeaturedBusinesses]);

  const refetch = useCallback(() => {
    fetchFeaturedBusinesses();
  }, [fetchFeaturedBusinesses]);

  return {
    featuredBusinesses,
    loading,
    error,
    statusCode,
    refetch,
    meta,
  };
}
