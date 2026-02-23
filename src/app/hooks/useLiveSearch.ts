"use client";

import { useState, useEffect, useMemo } from "react";
import useSWR from "swr";
import { useDebounce } from "./useDebounce";
import { swrConfig } from "../lib/swrConfig";

export interface LiveSearchFilters {
  distanceKm: number | null;
  minRating: number | null;
}

export interface LiveSearchResult {
  id: string;
  slug?: string;
  name: string;
  category: string;
  location: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  image_url?: string;
  description?: string;
  price_range?: string;
  verified: boolean;
  stats?: {
    average_rating: number;
  };
  badge?: string;
  rating?: number;
  reviews?: number;
  lat?: number | null;
  lng?: number | null;
}

interface UseLiveSearchOptions {
  initialQuery?: string;
  debounceMs?: number;
}

async function fetchSearchResults(
  _key: string,
  q: string,
  distanceKm: number | null,
  minRating: number | null
): Promise<{ results: LiveSearchResult[]; error: string | null }> {
  const params = new URLSearchParams({ q });
  if (distanceKm) params.set("distanceKm", distanceKm.toString());
  if (minRating) params.set("minRating", minRating.toString());
  const response = await fetch(`/api/search?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Live search failed");
  }
  const payload = await response.json();
  return {
    results: payload.results || [],
    error: payload.error || null,
  };
}

export function useLiveSearch({ initialQuery = "", debounceMs = 300 }: UseLiveSearchOptions = {}) {
  const [query, setQuery] = useState(initialQuery);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [minRating, setMinRating] = useState<number | null>(null);
  const debouncedQuery = useDebounce(query, debounceMs);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const filters = useMemo<LiveSearchFilters>(
    () => ({
      distanceKm,
      minRating,
    }),
    [distanceKm, minRating]
  );

  const trimmedQuery = debouncedQuery.trim();
  const swrKey =
    trimmedQuery.length > 0
      ? (["search", trimmedQuery, filters.distanceKm, filters.minRating] as const)
      : null;

  const { data, error, isLoading } = useSWR(
    swrKey,
    ([, q, dKm, mRat]: [string, string, number | null, number | null]) =>
      fetchSearchResults("search", q, dKm, mRat),
    {
      ...swrConfig,
      dedupingInterval: 600, // short window to dedupe rapid keystrokes
      keepPreviousData: true, // keep last results visible while revalidating
    }
  );

  const resetFilters = () => {
    setDistanceKm(null);
    setMinRating(null);
  };

  return {
    query,
    setQuery,
    debouncedQuery,
    loading: swrKey ? isLoading : false,
    error: error ? (error as Error).message : data?.error ?? null,
    results: swrKey ? (data?.results ?? []) : [],
    filters,
    setDistanceKm,
    setMinRating,
    resetFilters,
  };
}
