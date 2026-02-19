"use client";

import { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { getBrowserSupabase } from "./client";

export type ChannelStatus = 'subscribed' | 'timed_out' | 'closed' | 'channel_error';

export interface RealtimeChannelConfig {
  channelName: string;
  onStatusChange?: (status: ChannelStatus) => void;
  onError?: (error: Error) => void;
}

/**
 * Create a scoped Realtime channel for business-specific events
 */
export function createBusinessChannel(
  businessId: string,
  config?: Omit<RealtimeChannelConfig, 'channelName'>
) {
  const supabase = getBrowserSupabase();
  const channelName = `business-${businessId}`;
  
  const channel = supabase.channel(channelName, {
    config: {
      broadcast: { self: false },
      presence: { key: '' },
    },
  });

  if (config?.onStatusChange) {
    channel.on('system', { event: 'channel:*' }, (payload: any) => {
      if (payload.type === 'channel') {
        config.onStatusChange?.(payload.status as ChannelStatus);
      }
    });
  }

  return channel;
}

/**
 * Create a scoped Realtime channel for user-specific events (badges, notifications)
 */
export function createUserChannel(
  userId: string,
  config?: Omit<RealtimeChannelConfig, 'channelName'>
) {
  const supabase = getBrowserSupabase();
  const channelName = `user-${userId}`;
  
  const channel = supabase.channel(channelName, {
    config: {
      broadcast: { self: false },
      presence: { key: '' },
    },
  });

  if (config?.onStatusChange) {
    channel.on('system', { event: 'channel:*' }, (payload: any) => {
      if (payload.type === 'channel') {
        config.onStatusChange?.(payload.status as ChannelStatus);
      }
    });
  }

  return channel;
}

/**
 * Subscribe to reviews for a specific business
 */
export function subscribeToReviews(
  businessId: string,
  onInsert: (payload: RealtimePostgresChangesPayload<any>) => void,
  onUpdate: (payload: RealtimePostgresChangesPayload<any>) => void,
  onDelete: (payload: RealtimePostgresChangesPayload<any>) => void
): RealtimeChannel {
  const supabase = getBrowserSupabase();
  
  return supabase
    .channel(`reviews-business-${businessId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'reviews',
        filter: `business_id=eq.${businessId}`,
      },
      onInsert
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'reviews',
        filter: `business_id=eq.${businessId}`,
      },
      onUpdate
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'reviews',
        filter: `business_id=eq.${businessId}`,
      },
      onDelete
    )
    .subscribe();
}

/**
 * Subscribe to helpful votes for specific reviews
 */
export function subscribeToHelpfulVotes(
  businessId: string,
  onUpdate: (payload: RealtimePostgresChangesPayload<any>) => void
): RealtimeChannel {
  const supabase = getBrowserSupabase();
  
  return supabase
    .channel(`helpful-votes-business-${businessId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'review_helpful_votes',
        // Note: We'll need to filter by review IDs client-side or use a view
      },
      onUpdate
    )
    .subscribe();
}

/**
 * Subscribe to user badges
 */
export function subscribeToUserBadges(
  userId: string,
  onInsert: (payload: RealtimePostgresChangesPayload<any>) => void
): RealtimeChannel {
  const supabase = getBrowserSupabase();
  
  return supabase
    .channel(`user-badges-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'user_badges',
        filter: `user_id=eq.${userId}`,
      },
      onInsert
    )
    .subscribe();
}

/**
 * Subscribe to business stats updates
 */
export function subscribeToBusinessStats(
  businessId: string,
  onUpdate: (payload: RealtimePostgresChangesPayload<any>) => void
): RealtimeChannel {
  const supabase = getBrowserSupabase();
  
  return supabase
    .channel(`business-stats-${businessId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'business_stats',
        filter: `business_id=eq.${businessId}`,
      },
      onUpdate
    )
    .subscribe();
}

/**
 * Utility to safely unsubscribe and remove a channel
 */
export async function unsubscribeChannel(channel: RealtimeChannel | null) {
  if (channel) {
    await channel.unsubscribe();
    const supabase = getBrowserSupabase();
    supabase.removeChannel(channel);
  }
}

/**
 * Debounce helper for high-frequency updates
 */
export function createDebouncedHandler<T>(
  handler: (data: T) => void,
  delay: number = 300
): (data: T) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return (data: T) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      handler(data);
      timeoutId = null;
    }, delay);
  };
}
