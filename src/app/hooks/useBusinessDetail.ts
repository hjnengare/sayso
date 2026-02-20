/**
 * Hook to fetch a single business by ID or slug from the API.
 * Uses SWR for caching, deduplication, and optimistic invalidation.
 */

'use client';

import { useEffect } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import { swrConfig } from '../lib/swrConfig';
import { businessUpdateEvents, notifyBusinessDeleted } from '../lib/utils/businessUpdateEvents';

async function fetchBusiness([, businessId]: [string, string]): Promise<any> {
  const response = await fetch(`/api/businesses/${businessId}`);

  if (!response.ok) {
    const err: any = new Error(`Failed to fetch business: ${response.status}`);
    err.status = response.status;
    throw err;
  }

  return response.json();
}

export function useBusinessDetail(businessId: string | null | undefined) {
  const swrKey = businessId ? (['/api/businesses/detail', businessId] as [string, string]) : null;

  const { data, error, isLoading, mutate } = useSWR(swrKey, fetchBusiness, {
    ...swrConfig,
    dedupingInterval: 30_000,
  });

  // Visibility-based refetch
  useEffect(() => {
    if (!swrKey) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') mutate();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [swrKey, mutate]);

  // Invalidate on businessUpdateEvents
  useEffect(() => {
    if (!businessId) return;
    const unsubUpdate = businessUpdateEvents.onUpdate((updatedId) => {
      if (updatedId === businessId) mutate();
    });
    const unsubDelete = businessUpdateEvents.onDelete((deletedId) => {
      if (deletedId === businessId) {
        mutate(undefined, { revalidate: false });
      }
    });
    return () => {
      unsubUpdate();
      unsubDelete();
    };
  }, [businessId, mutate]);

  const err = error as (Error & { status?: number }) | undefined;

  return {
    business: data ?? null,
    loading: isLoading,
    error: err ? err.message : null,
    errorStatus: err?.status ?? null,
    refetch: () => mutate(),
    mutate,
  };
}

/**
 * Globally invalidate a business's cached data.
 */
export function invalidateBusinessDetail(businessId: string) {
  globalMutate(['/api/businesses/detail', businessId]);
}
