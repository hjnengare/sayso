/**
 * SWR hook for event ratings (average + count) with realtime invalidation.
 */
'use client';

import { useEffect } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import { swrConfig } from '../lib/swrConfig';
import { getBrowserSupabase } from '../lib/supabase/client';

type EventRatingResponse = {
  rating: number;
  total_reviews: number;
};

async function fetchEventRatings([, eventId]: [string, string]): Promise<EventRatingResponse> {
  const res = await fetch(`/api/events/${eventId}/ratings`);
  if (!res.ok) return { rating: 0, total_reviews: 0 };
  const data = await res.json();
  return {
    rating: Number(data?.rating) || 0,
    total_reviews: Number(data?.total_reviews) || 0,
  };
}

export function useEventRatings(
  eventId: string | null | undefined,
  fallbackRating = 0,
  fallbackTotalReviews = 0,
) {
  const swrKey = eventId ? (['/api/events/ratings', eventId] as [string, string]) : null;

  const { data, error, isLoading, mutate } = useSWR<EventRatingResponse>(
    swrKey,
    fetchEventRatings,
    {
      ...swrConfig,
      dedupingInterval: 30_000,
      fallbackData: { rating: fallbackRating, total_reviews: fallbackTotalReviews },
    }
  );

  // Revalidate on visibility return
  useEffect(() => {
    if (!swrKey) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') mutate();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [swrKey, mutate]);

  // Realtime: listen to event_reviews table for this event and mutate ratings
  useEffect(() => {
    if (!eventId) return;
    const supabase = getBrowserSupabase();
    const channel = supabase
      .channel(`event-ratings-${eventId}-${Date.now()}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'event_reviews',
        filter: `event_id=eq.${eventId}`,
      }, () => {
        mutate();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, mutate]);

  return {
    rating: data?.rating ?? fallbackRating,
    totalReviews: data?.total_reviews ?? fallbackTotalReviews,
    loading: isLoading,
    error: error ? (error as Error).message : null,
    mutate,
  };
}

export function invalidateEventRatings(eventId: string) {
  globalMutate(['/api/events/ratings', eventId]);
}
