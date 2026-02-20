/**
 * Hook to check and toggle the saved state of an event/special for the current user.
 * Uses SWR with optimistic toggle.
 */

'use client';

import useSWR, { mutate as globalMutate } from 'swr';
import { swrConfig } from '../lib/swrConfig';
import { useAuth } from '../contexts/AuthContext';

async function fetchSavedEvent([, eventId]: [string, string]): Promise<boolean> {
  const response = await fetch(`/api/user/saved-events?event_id=${eventId}`, {
    credentials: 'include',
  });

  if (!response.ok) return false;

  const data = await response.json();
  return Boolean(data?.isSaved);
}

export function useSavedEvent(eventId: string | null | undefined) {
  const { user, isLoading: authLoading } = useAuth();

  const swrKey = (!authLoading && user?.id && eventId)
    ? (['/api/user/saved-events', eventId] as [string, string])
    : null;

  const { data, error, isLoading, mutate } = useSWR(swrKey, fetchSavedEvent, {
    ...swrConfig,
    dedupingInterval: 30_000,
  });

  const toggle = async () => {
    if (!eventId || !user) return;

    const current = data ?? false;
    const next = !current;

    // Optimistic update
    mutate(next, { revalidate: false });

    try {
      const response = next
        ? await fetch('/api/user/saved-events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ event_id: eventId }),
          })
        : await fetch(`/api/user/saved-events?event_id=${eventId}`, {
            method: 'DELETE',
            credentials: 'include',
          });

      if (!response.ok) {
        // Revert on failure
        mutate(current, { revalidate: false });
      }
    } catch {
      mutate(current, { revalidate: false });
    }
  };

  return {
    isSaved: data ?? false,
    loading: authLoading || isLoading,
    error: error ? (error as Error).message : null,
    toggle,
    mutate,
  };
}

export function invalidateSavedEvent(eventId: string) {
  globalMutate(['/api/user/saved-events', eventId]);
}
