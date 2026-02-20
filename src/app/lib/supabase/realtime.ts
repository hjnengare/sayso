"use client";

import { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { getBrowserSupabase } from "./client";

export type ChannelStatus = 'subscribed' | 'timed_out' | 'closed' | 'channel_error';
type SupabaseChannelStatus = 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR';

// Reuse a single browser client so channels can be tracked/removed reliably.
const supabaseClient = getBrowserSupabase();

// Registry prevents duplicate channels per name within this module.
const channelRegistry = new Map<string, RealtimeChannel>();

const statusMap: Record<SupabaseChannelStatus, ChannelStatus> = {
  SUBSCRIBED: 'subscribed',
  TIMED_OUT: 'timed_out',
  CLOSED: 'closed',
  CHANNEL_ERROR: 'channel_error',
};

const mapStatus = (status: SupabaseChannelStatus | string): ChannelStatus =>
  statusMap[status as SupabaseChannelStatus] ?? 'channel_error';

const rememberChannel = (name: string, channel: RealtimeChannel) => {
  channelRegistry.set(name, channel);
};

const removeChannelFromRegistry = (channel: RealtimeChannel | null) => {
  if (!channel) return;
  const topic = (channel as any)?.topic as string | undefined;
  if (topic && channelRegistry.get(topic) === channel) {
    channelRegistry.delete(topic);
    return;
  }

  // Fallback: scan registry if topic is missing or doesn't match.
  for (const [key, value] of channelRegistry.entries()) {
    if (value === channel) {
      channelRegistry.delete(key);
      break;
    }
  }
};

const createChannel = (channelName: string, options?: Parameters<typeof supabaseClient.channel>[1]) => {
  const existing = channelRegistry.get(channelName);
  if (existing) {
    // Prevent duplicate live channels with the same name.
    void unsubscribeChannel(existing);
    channelRegistry.delete(channelName);
  }

  const channel = supabaseClient.channel(channelName, options);
  rememberChannel(channelName, channel);
  return channel;
};

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
  const channelName = `business-${businessId}`;
  const channel = createChannel(channelName, {
    config: {
      broadcast: { self: false },
      presence: { key: '' },
    },
  });

  channel.subscribe((status, err) => {
    const mapped = mapStatus(status);
    config?.onStatusChange?.(mapped);
    if (err && config?.onError) config.onError(err);
    if (status === 'CHANNEL_ERROR' && !err && config?.onError) {
      config.onError(new Error('Realtime channel error'));
    }
  });

  return channel;
}

/**
 * Create a scoped Realtime channel for user-specific events (badges, notifications)
 */
export function createUserChannel(
  userId: string,
  config?: Omit<RealtimeChannelConfig, 'channelName'>
) {
  const channelName = `user-${userId}`;
  const channel = createChannel(channelName, {
    config: {
      broadcast: { self: false },
      presence: { key: '' },
    },
  });

  channel.subscribe((status, err) => {
    const mapped = mapStatus(status);
    config?.onStatusChange?.(mapped);
    if (err && config?.onError) config.onError(err);
    if (status === 'CHANNEL_ERROR' && !err && config?.onError) {
      config.onError(new Error('Realtime channel error'));
    }
  });

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
  const channelName = `reviews-business-${businessId}`;
  const channel = createChannel(channelName);

  channel
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

  return channel;
}

/**
 * Subscribe to helpful votes for specific reviews
 * WARNING: This stream is still unfiltered at the DB level; prefer passing reviewIds to reduce client work.
 */
export function subscribeToHelpfulVotes(
  businessId: string,
  onUpdate: (payload: RealtimePostgresChangesPayload<any>) => void,
  reviewIds?: string[]
): RealtimeChannel {
  const channelName = `helpful-votes-business-${businessId}`;
  const channel = createChannel(channelName);

  const shouldHandle = (payload: RealtimePostgresChangesPayload<any>) => {
    if (!reviewIds || reviewIds.length === 0) return true;
    const candidateId =
      (payload.new as any)?.review_id ??
      (payload.old as any)?.review_id ??
      null;
    return candidateId ? reviewIds.includes(candidateId) : false;
  };

  const filteredHandler = (payload: RealtimePostgresChangesPayload<any>) => {
    if (!shouldHandle(payload)) return;
    onUpdate(payload);
  };

  // Limit to the events that actually change counts to reduce noise.
  channel
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'review_helpful_votes',
      },
      filteredHandler
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'review_helpful_votes',
      },
      filteredHandler
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to user badges
 */
export function subscribeToUserBadges(
  userId: string,
  onInsert: (payload: RealtimePostgresChangesPayload<any>) => void
): RealtimeChannel {
  const channelName = `user-badges-${userId}`;
  const channel = createChannel(channelName);

  channel
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

  return channel;
}

/**
 * Subscribe to business stats updates
 */
export function subscribeToBusinessStats(
  businessId: string,
  onUpdate: (payload: RealtimePostgresChangesPayload<any>) => void
): RealtimeChannel {
  const channelName = `business-stats-${businessId}`;
  const channel = createChannel(channelName);

  channel
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

  return channel;
}

/**
 * Utility to safely unsubscribe and remove a channel
 */
export async function unsubscribeChannel(channel: RealtimeChannel | null) {
  if (!channel) return;

  try {
    await channel.unsubscribe();
  } catch {
    // Ignore — safe, idempotent teardown.
  }

  try {
    supabaseClient.removeChannel(channel);
  } catch {
    // Ignore remove errors to keep teardown safe.
  }

  removeChannelFromRegistry(channel);
}

/**
 * Debounce helper for high-frequency updates
 */
export function createDebouncedHandler<T>(
  handler: (data: T) => void,
  delay: number = 300
): (data: T) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
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
