/**
 * Hook to fetch recent reviews from the API.
 * Uses SWR for caching and deduplication.
 */

'use client';

import useSWR, { mutate as globalMutate } from 'swr';
import { swrConfig } from '../lib/swrConfig';
import type { Review } from '../types/community';

async function fetchRecentReviews([, limit]: [string, number]): Promise<Review[]> {
  const response = await fetch(`/api/reviews/recent?limit=${limit}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch recent reviews: ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data?.reviews) ? data.reviews : [];
}

export function useRecentReviews(limit = 10) {
  const swrKey = ['/api/reviews/recent', limit] as [string, number];

  const { data, error, isLoading } = useSWR(swrKey, fetchRecentReviews, {
    ...swrConfig,
    dedupingInterval: 30_000,
  });

  return {
    reviews: data ?? [],
    loading: isLoading,
    error: error ? (error as Error).message : null,
  };
}

export function invalidateRecentReviews() {
  // Invalidate common limits
  globalMutate(['/api/reviews/recent', 10]);
  globalMutate(['/api/reviews/recent', 12]);
}
