/**
 * Hook to fetch reviews for a specific event by ID.
 * Uses SWR with optimistic update support.
 */

'use client';

import { useEffect } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import { swrConfig } from '../lib/swrConfig';
import type { EventReviewWithUser } from '../lib/types/database';

async function fetchEventReviews([, eventId]: [string, string]): Promise<EventReviewWithUser[]> {
  const response = await fetch(`/api/events/${eventId}/reviews`);

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return Array.isArray(data?.reviews) ? data.reviews : [];
}

export function useEventReviews(eventId: string | null | undefined) {
  const swrKey = eventId ? (['/api/events/reviews', eventId] as [string, string]) : null;

  const { data, error, isLoading, mutate } = useSWR(swrKey, fetchEventReviews, {
    ...swrConfig,
    dedupingInterval: 30_000,
  });

  useEffect(() => {
    if (!swrKey) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') mutate();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [swrKey, mutate]);

  return {
    reviews: data ?? [],
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refetch: () => mutate(),
    mutate,
  };
}

export function invalidateEventReviews(eventId: string) {
  globalMutate(['/api/events/reviews', eventId]);
}
