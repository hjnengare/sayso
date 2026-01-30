/**
 * Hook to fetch curated businesses from the API
 * Returns top3 businesses for hero display and next10 for the list
 */

import { useState, useEffect, useCallback } from 'react';
import type { CuratedBusinessUI, CuratedBusinessesUIResponse } from '../lib/types/curation';

export interface UseCuratedBusinessesOptions {
  interestId?: string | null;
  limit?: number;
  userLat?: number | null;
  userLng?: number | null;
  skip?: boolean;
}

export interface UseCuratedBusinessesResult {
  top3: CuratedBusinessUI[];
  next10: CuratedBusinessUI[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  refetch: () => void;
}

/**
 * Hook to fetch curated businesses with top3/next10 structure
 * 
 * @param options - Configuration options
 * @param options.interestId - Filter by interest (null = all interests)
 * @param options.limit - Total businesses to fetch (default 13)
 * @param options.userLat - User latitude for distance-based ranking
 * @param options.userLng - User longitude for distance-based ranking
 * @param options.skip - Skip fetching if true
 */
export function useCuratedBusinesses(options: UseCuratedBusinessesOptions = {}): UseCuratedBusinessesResult {
  const [top3, setTop3] = useState<CuratedBusinessUI[]>([]);
  const [next10, setNext10] = useState<CuratedBusinessUI[]>([]);
  const [loading, setLoading] = useState(!options.skip);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchCuratedBusinesses = useCallback(async () => {
    if (options.skip) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      
      if (options.interestId) {
        params.set('interest_id', options.interestId);
      }
      if (options.limit) {
        params.set('limit', options.limit.toString());
      }
      if (options.userLat !== undefined && options.userLat !== null) {
        params.set('lat', options.userLat.toString());
      }
      if (options.userLng !== undefined && options.userLng !== null) {
        params.set('lng', options.userLng.toString());
      }

      const response = await fetch(`/api/curated?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch curated businesses: ${response.status}`);
      }

      const data: CuratedBusinessesUIResponse = await response.json();
      
      setTop3(data.top3 || []);
      setNext10(data.next10 || []);
      setTotalCount(data.totalCount || 0);
    } catch (err) {
      console.error('Error fetching curated businesses:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setTop3([]);
      setNext10([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [options.interestId, options.limit, options.userLat, options.userLng, options.skip]);

  useEffect(() => {
    fetchCuratedBusinesses();
  }, [fetchCuratedBusinesses]);

  const refetch = useCallback(() => {
    fetchCuratedBusinesses();
  }, [fetchCuratedBusinesses]);

  return {
    top3,
    next10,
    loading,
    error,
    totalCount,
    refetch,
  };
}

/**
 * Hook to fetch curated businesses for multiple interests at once
 * Useful for displaying a grid of categories with top businesses
 */
export function useCuratedByInterests(
  interestIds: string[],
  options: Omit<UseCuratedBusinessesOptions, 'interestId'> = {}
): Record<string, UseCuratedBusinessesResult & { interestId: string }> {
  const [results, setResults] = useState<Record<string, UseCuratedBusinessesResult & { interestId: string }>>({});

  const fetchAll = useCallback(async () => {
    if (options.skip || interestIds.length === 0) return;

    const newResults: Record<string, UseCuratedBusinessesResult & { interestId: string }> = {};

    await Promise.all(
      interestIds.map(async (interestId) => {
        try {
          const params = new URLSearchParams();
          params.set('interest_id', interestId);
          if (options.limit) params.set('limit', options.limit.toString());
          if (options.userLat) params.set('lat', options.userLat.toString());
          if (options.userLng) params.set('lng', options.userLng.toString());

          const response = await fetch(`/api/curated?${params.toString()}`);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status}`);
          }

          const data: CuratedBusinessesUIResponse = await response.json();
          
          newResults[interestId] = {
            interestId,
            top3: data.top3 || [],
            next10: data.next10 || [],
            loading: false,
            error: null,
            totalCount: data.totalCount || 0,
            refetch: () => {},
          };
        } catch (err) {
          newResults[interestId] = {
            interestId,
            top3: [],
            next10: [],
            loading: false,
            error: err instanceof Error ? err.message : 'Unknown error',
            totalCount: 0,
            refetch: () => {},
          };
        }
      })
    );

    setResults(newResults);
  }, [interestIds, options.limit, options.userLat, options.userLng, options.skip]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return results;
}
