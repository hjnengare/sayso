/**
 * Hook to fetch events and specials with filter, search, and pagination.
 * Uses useSWRInfinite for correct multi-page accumulation and revalidation.
 */

'use client';

import { useCallback, useMemo } from 'react';
import useSWRInfinite from 'swr/infinite';
import { swrConfig } from '../lib/swrConfig';
import type { Event } from '../lib/types/Event';

const ITEMS_PER_PAGE = 20;
const REQUEST_TIMEOUT_MS = 12_000;

interface EventsPage {
  items: Event[];
  count: number;
}

function buildUrl(filter: string, search: string, offset: number): string {
  const url = new URL('/api/events-and-specials', typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  url.searchParams.set('limit', String(ITEMS_PER_PAGE));
  url.searchParams.set('offset', String(offset));
  if (filter !== 'all') url.searchParams.set('type', filter);
  if (search.trim()) url.searchParams.set('search', search.trim());
  return url.toString();
}

async function fetchEventsPage({ filter, search, offset }: { filter: string; search: string; offset: number }): Promise<EventsPage> {
  const url = buildUrl(filter, search, offset);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
    const data = await response.json();
    return {
      items: Array.isArray(data?.items) ? (data.items as Event[]) : [],
      count: Number(data?.count || 0),
    };
  } catch (err: any) {
    if (err?.name === 'AbortError') throw new Error('Request timed out. Please try again.');
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function useEventsSpecials(filter: string, search: string) {
  // getKey returns null to stop fetching once all pages are loaded
  const getKey = useCallback(
    (pageIndex: number, previousPage: EventsPage | null) => {
      if (previousPage && previousPage.items.length < ITEMS_PER_PAGE) return null;
      if (previousPage && pageIndex * ITEMS_PER_PAGE >= previousPage.count) return null;
      return { filter, search, offset: pageIndex * ITEMS_PER_PAGE };
    },
    [filter, search]
  );

  const { data: pages, error, isLoading, isValidating, setSize, size } = useSWRInfinite(
    getKey,
    fetchEventsPage,
    {
      ...swrConfig,
      dedupingInterval: 30_000,
      revalidateOnMount: true,
      revalidateFirstPage: false,
      persistSize: false,
    }
  );

  const items = useMemo<Event[]>(
    () => (pages ?? []).flatMap((p) => p.items),
    [pages]
  );

  const count = pages?.[0]?.count ?? 0;
  const loadedCount = items.length;
  const hasMore = loadedCount < count;
  const loadingMore = isValidating && !isLoading && size > (pages?.length ?? 0);

  const fetchMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setSize((s) => s + 1);
  }, [loadingMore, hasMore, setSize]);

  return {
    items,
    count,
    hasMore,
    loading: isLoading,
    loadingMore,
    error: error ? (error as Error).message : null,
    fetchMore,
  };
}
