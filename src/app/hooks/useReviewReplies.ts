/**
 * Hook to fetch and manage replies for a review.
 * Uses SWR with optimistic add/update/delete.
 */

'use client';

import useSWR, { mutate as globalMutate } from 'swr';
import { swrConfig } from '../lib/swrConfig';
import { isOptimisticId, isValidUUID } from '../lib/utils/validation';

interface Reply {
  id: string;
  review_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at?: string;
  user?: any;
}

async function fetchReviewReplies([, reviewId]: [string, string]): Promise<Reply[]> {
  const response = await fetch(`/api/reviews/${reviewId}/replies`);

  if (!response.ok) return [];

  const data = await response.json();
  return (data.replies ?? []).map((reply: any) => ({
    ...reply,
    user_id: reply.user_id || reply.user?.id,
  }));
}

export function useReviewReplies(reviewId: string) {
  const isSkipped = !reviewId || isOptimisticId(reviewId) || !isValidUUID(reviewId);
  const swrKey = isSkipped ? null : (['/api/reviews/replies', reviewId] as [string, string]);

  const { data, isLoading, mutate } = useSWR(swrKey, fetchReviewReplies, {
    ...swrConfig,
    dedupingInterval: 30_000,
  });

  const addReply = async (content: string): Promise<Reply | null> => {
    if (!reviewId || !content.trim()) return null;

    try {
      const res = await fetch(`/api/reviews/${reviewId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) return null;

      const responseData = await res.json();
      const newReply: Reply = {
        ...responseData.reply,
        user_id: responseData.reply?.user_id || responseData.reply?.user?.id,
      };

      mutate((prev) => [...(prev ?? []), newReply], { revalidate: false });
      return newReply;
    } catch {
      return null;
    }
  };

  const updateReply = async (replyId: string, content: string): Promise<boolean> => {
    const prev = data ?? [];

    // Optimistic update
    mutate(
      prev.map(r => r.id === replyId ? { ...r, content } : r),
      { revalidate: false }
    );

    try {
      const res = await fetch(`/api/reviews/${reviewId}/replies/${replyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        mutate(prev, { revalidate: false });
        return false;
      }
      return true;
    } catch {
      mutate(prev, { revalidate: false });
      return false;
    }
  };

  const deleteReply = async (replyId: string): Promise<boolean> => {
    const prev = data ?? [];

    // Optimistic remove
    mutate(prev.filter(r => r.id !== replyId), { revalidate: false });

    try {
      const res = await fetch(`/api/reviews/${reviewId}/replies/${replyId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        mutate(prev, { revalidate: false });
        return false;
      }
      return true;
    } catch {
      mutate(prev, { revalidate: false });
      return false;
    }
  };

  return {
    replies: data ?? [],
    loading: isLoading,
    addReply,
    updateReply,
    deleteReply,
    refetch: () => mutate(),
    mutate,
  };
}

export function invalidateReviewReplies(reviewId: string) {
  globalMutate(['/api/reviews/replies', reviewId]);
}
