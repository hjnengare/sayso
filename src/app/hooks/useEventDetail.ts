/**
 * Hook to fetch a single event or special by ID from the API.
 * Covers both /event/[id] and /special/[id] since both use the same endpoint.
 */

'use client';

import { useEffect } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import { swrConfig } from '../lib/swrConfig';
import type { Event } from '../lib/types/Event';

interface EventDetailData {
  event: Event | null;
  occurrencesList: Array<{ id: string; start_date: string; end_date: string | null; booking_url?: string | null; location?: string | null }>;
  occurrencesCount: number;
  isExpired?: boolean;
}

async function fetchEventDetail([, eventId]: [string, string]): Promise<EventDetailData> {
  const response = await fetch(`/api/events-and-specials/${eventId}`);

  if (!response.ok) {
    const err: any = new Error(`Failed to fetch event: ${response.status}`);
    err.status = response.status;
    throw err;
  }

  const data = await response.json();
  const incoming = (data?.event ?? data?.special) as Event | undefined;

  return {
    event: incoming ?? null,
    occurrencesList: Array.isArray(data?.occurrences_list) ? data.occurrences_list : [],
    occurrencesCount: Number.isFinite(Number(data?.occurrences))
      ? Number(data.occurrences)
      : Array.isArray(data?.occurrences_list)
        ? data.occurrences_list.length
        : 1,
    isExpired: Boolean(data?.isExpired),
  };
}

export function useEventDetail(eventId: string | null | undefined) {
  const swrKey = eventId ? (['/api/events-and-specials', eventId] as [string, string]) : null;

  const { data, error, isLoading, mutate } = useSWR(swrKey, fetchEventDetail, {
    ...swrConfig,
    dedupingInterval: 60_000,
  });

  useEffect(() => {
    if (!swrKey) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') mutate();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [swrKey, mutate]);

  const err = error as (Error & { status?: number }) | undefined;

  return {
    event: data?.event ?? null,
    occurrencesList: data?.occurrencesList ?? [],
    occurrencesCount: data?.occurrencesCount ?? 1,
    isExpired: data?.isExpired ?? false,
    loading: isLoading,
    error: err ? err.message : null,
    errorStatus: err?.status ?? null,
    refetch: () => mutate(),
    mutate,
  };
}

export function invalidateEventDetail(eventId: string) {
  globalMutate(['/api/events-and-specials', eventId]);
}
