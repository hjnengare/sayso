/**
 * Hook to fetch top reviewers from the API.
 * Uses SWR for caching and deduplication.
 */

'use client';

import useSWR from 'swr';
import { swrConfig } from '../lib/swrConfig';
import type { Reviewer } from '../types/community';

interface ReviewersTopData {
  reviewers: Reviewer[];
  mode: 'stage1' | 'normal';
}

async function fetchReviewersTop([, limit]: [string, number]): Promise<ReviewersTopData> {
  const response = await fetch(`/api/reviewers/top?limit=${limit}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch top reviewers: ${response.status}`);
  }

  const data = await response.json();
  return {
    reviewers: Array.isArray(data?.reviewers) ? data.reviewers : [],
    mode: data?.mode === 'normal' ? 'normal' : 'stage1',
  };
}

export function useReviewersTop(limit = 12) {
  const swrKey = ['/api/reviewers/top', limit] as [string, number];

  const { data, error, isLoading } = useSWR(swrKey, fetchReviewersTop, {
    ...swrConfig,
    dedupingInterval: 60_000,
  });

  return {
    reviewers: data?.reviewers ?? [],
    mode: data?.mode ?? 'stage1',
    loading: isLoading,
    error: error ? (error as Error).message : null,
  };
}
