"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import {
  subscribeToReviews,
  subscribeToHelpfulVotes,
  subscribeToUserBadges,
  subscribeToBusinessStats,
  unsubscribeChannel,
  createDebouncedHandler,
  ChannelStatus,
} from "../lib/supabase/realtime";
import { getBrowserSupabase } from "../lib/supabase/client";
import type { ReviewWithUser } from "../lib/types/database";

/**
 * Hook to manage Realtime connection status
 */
export function useRealtimeStatus() {
  const [status, setStatus] = useState<ChannelStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (status === 'subscribed') {
      setIsConnected(true);
    } else if (status === 'closed' || status === 'channel_error' || status === 'timed_out') {
      setIsConnected(false);
    }
  }, [status]);

  return { status, isConnected, setStatus };
}

/**
 * Hook to subscribe to real-time review updates for a business
 */
export function useRealtimeReviews(
  businessId: string | null | undefined,
  initialReviews: ReviewWithUser[] = []
) {
  const [reviews, setReviews] = useState<ReviewWithUser[]>(initialReviews);
  const [isLive, setIsLive] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabase = useRef(getBrowserSupabase());

  // Sync initial reviews when prop changes
  useEffect(() => {
    setReviews(initialReviews);
  }, [initialReviews]);

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase.current
        .from('profiles')
        .select('id, display_name, username, avatar_url, is_top_reviewer')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  }, []);

  const handleInsert = useCallback(async (payload: RealtimePostgresChangesPayload<any>) => {
    if (payload.new && payload.new.business_id === businessId) {
      // Fetch user data for the new review
      const userData = await fetchUserData(payload.new.user_id);
      
      const newReview: ReviewWithUser = {
        ...payload.new,
        user: userData || {
          id: payload.new.user_id,
          display_name: 'Anonymous User',
          username: 'anonymous',
        },
      };

      setReviews((prev) => [newReview, ...prev]);
    }
  }, [businessId, fetchUserData]);

  const handleUpdate = useCallback(async (payload: RealtimePostgresChangesPayload<any>) => {
    const newRecord = payload.new as any;
    if (newRecord && newRecord.business_id === businessId) {
      setReviews((prev) =>
        prev.map((review) =>
          review.id === newRecord.id
            ? { ...review, ...newRecord }
            : review
        )
      );
    }
  }, [businessId]);

  const handleDelete = useCallback((payload: RealtimePostgresChangesPayload<any>) => {
    const oldRecord = payload.old as any;
    if (oldRecord && oldRecord.business_id === businessId) {
      setReviews((prev) => prev.filter((review) => review.id !== oldRecord.id));
    }
  }, [businessId]);

  useEffect(() => {
    if (!businessId) return;

    const channel = subscribeToReviews(
      businessId,
      handleInsert,
      handleUpdate,
      handleDelete
    );

    channelRef.current = channel;
    setIsLive(true);

    return () => {
      setIsLive(false);
      unsubscribeChannel(channelRef.current);
      channelRef.current = null;
    };
  }, [businessId, handleInsert, handleUpdate, handleDelete]);

  return { reviews, isLive, setReviews };
}

/**
 * Hook to subscribe to helpful vote updates (with debouncing)
 */
export function useRealtimeHelpfulVotes(
  businessId: string | null | undefined,
  reviewIds: string[] = []
) {
  const [helpfulCounts, setHelpfulCounts] = useState<Record<string, number>>({});
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabase = useRef(getBrowserSupabase());

  const updateHelpfulCount = useCallback(async (reviewId: string) => {
    try {
      const { count, error } = await supabase.current
        .from('review_helpful_votes')
        .select('*', { count: 'exact', head: true })
        .eq('review_id', reviewId);

      if (error) throw error;

      setHelpfulCounts((prev) => ({
        ...prev,
        [reviewId]: count || 0,
      }));
    } catch (error) {
      console.error('Error fetching helpful count:', error);
    }
  }, []);

  const debouncedUpdate = useRef(
    createDebouncedHandler((reviewId: string) => updateHelpfulCount(reviewId), 500)
  );

  const handleVoteChange = useCallback((payload: RealtimePostgresChangesPayload<any>) => {
    const newRecord = payload.new as any;
    const oldRecord = payload.old as any;
    const reviewId = newRecord?.review_id || oldRecord?.review_id;
    if (reviewId && reviewIds.includes(reviewId)) {
      debouncedUpdate.current(reviewId);
    }
  }, [reviewIds]);

  useEffect(() => {
    if (!businessId) return;

    const channel = subscribeToHelpfulVotes(businessId, handleVoteChange);
    channelRef.current = channel;

    return () => {
      unsubscribeChannel(channelRef.current);
      channelRef.current = null;
    };
  }, [businessId, handleVoteChange]);

  return { helpfulCounts, setHelpfulCounts };
}

/**
 * Hook to subscribe to user badge awards
 */
export function useRealtimeBadges(userId: string | null | undefined) {
  const [newBadges, setNewBadges] = useState<any[]>([]);
  const [hasNewBadge, setHasNewBadge] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabase = useRef(getBrowserSupabase());

  const fetchBadgeDetails = useCallback(async (badgeId: string) => {
    try {
      const { data, error } = await supabase.current
        .from('badges')
        .select('*')
        .eq('id', badgeId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching badge details:', error);
      return null;
    }
  }, []);

  const handleBadgeInsert = useCallback(async (payload: RealtimePostgresChangesPayload<any>) => {
    if (payload.new && payload.new.user_id === userId) {
      const badgeDetails = await fetchBadgeDetails(payload.new.badge_id);
      
      if (badgeDetails) {
        const newBadge = {
          ...badgeDetails,
          awarded_at: payload.new.awarded_at,
        };
        
        setNewBadges((prev) => [...prev, newBadge]);
        setHasNewBadge(true);
      }
    }
  }, [userId, fetchBadgeDetails]);

  useEffect(() => {
    if (!userId) return;

    const channel = subscribeToUserBadges(userId, handleBadgeInsert);
    channelRef.current = channel;

    return () => {
      unsubscribeChannel(channelRef.current);
      channelRef.current = null;
    };
  }, [userId, handleBadgeInsert]);

  const clearNewBadges = useCallback(() => {
    setNewBadges([]);
    setHasNewBadge(false);
  }, []);

  return { newBadges, hasNewBadge, clearNewBadges };
}

/**
 * Hook to subscribe to business stats updates
 */
export function useRealtimeBusinessStats(businessId: string | null | undefined) {
  const [stats, setStats] = useState<any>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const handleStatsUpdate = useCallback((payload: RealtimePostgresChangesPayload<any>) => {
    if (payload.new && payload.new.business_id === businessId) {
      setStats(payload.new);
    }
  }, [businessId]);

  useEffect(() => {
    if (!businessId) return;

    const channel = subscribeToBusinessStats(businessId, handleStatsUpdate);
    channelRef.current = channel;

    return () => {
      unsubscribeChannel(channelRef.current);
      channelRef.current = null;
    };
  }, [businessId, handleStatsUpdate]);

  return { stats };
}
