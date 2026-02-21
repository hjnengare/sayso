/**
 * Hook to fetch business notifications for the current business-account user.
 * Uses SWR with realtime subscription for live updates.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import { swrConfig } from '../lib/swrConfig';
import { useAuth } from '../contexts/AuthContext';
import { getBrowserSupabase } from '../lib/supabase/client';
import { formatTimeAgo } from '../utils/formatTimeAgo';
import type { ToastNotificationData, NotificationType } from '../contexts/NotificationsContext';

interface BusinessNotificationApiItem {
  id: string;
  type: string;
  message: string;
  title: string;
  created_at?: string | null;
  read?: boolean;
  link?: string | null;
}

interface BusinessNotificationsFeedData {
  notifications: ToastNotificationData[];
  readIds: Set<string>;
}

function mapApiItem(item: BusinessNotificationApiItem, index: number): ToastNotificationData {
  return {
    id: item.id || `business-notification-${index}`,
    type: (item.type as NotificationType) || 'business',
    message: item.message || '',
    title: item.title || '',
    timeAgo: item.created_at ? formatTimeAgo(item.created_at) : 'just now',
    image: '/png/restaurants.png',
    imageAlt: 'Business notification',
    link: item.link || undefined,
  };
}

async function fetchBusinessNotifications([, userId]: [string, string]): Promise<BusinessNotificationsFeedData> {
  const response = await fetch('/api/notifications/business', {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    return { notifications: [], readIds: new Set() };
  }

  const data = await response.json();
  const items: BusinessNotificationApiItem[] = Array.isArray(data?.items) ? data.items : [];

  const notifications = items.map(mapApiItem);
  const readIds = new Set(
    items.filter(item => item.read).map(item => item.id).filter(Boolean)
  );

  return { notifications, readIds };
}

export function useBusinessNotificationsFeed() {
  const { user, isLoading: authLoading } = useAuth();
  const userCurrentRole = user?.profile?.account_role || user?.profile?.role || 'user';
  const isBusinessAccountUser = userCurrentRole === 'business_owner';

  const swrKey = (!authLoading && isBusinessAccountUser && user?.id)
    ? (['/api/notifications/business', user.id] as [string, string])
    : null;

  const { data, error, isLoading, mutate } = useSWR(swrKey, fetchBusinessNotifications, {
    ...swrConfig,
    dedupingInterval: 30_000,
  });

  // Toast queue — only for realtime INSERTs (not persisted in SWR cache)
  const [toastQueue, setToastQueue] = useState<ToastNotificationData[]>([]);
  const dismissToast = useCallback((id: string) => {
    setToastQueue(prev => prev.filter(n => n.id !== id));
  }, []);

  // Visibility-based refetch
  useEffect(() => {
    if (!swrKey) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') mutate();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [swrKey, mutate]);

  // Realtime subscription — optimistic prepend for INSERT, mutate for others
  useEffect(() => {
    if (!user?.id || !isBusinessAccountUser) return;

    const supabase = getBrowserSupabase();
    const channel = supabase
      .channel(`notifications-business-swr-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const newItem = payload.new as BusinessNotificationApiItem;
        const newNotification = mapApiItem(newItem, 0);
        // Optimistically prepend to SWR cache
        mutate(
          (prev) => ({
            notifications: [newNotification, ...(prev?.notifications ?? [])],
            readIds: prev?.readIds ?? new Set(),
          }),
          { revalidate: false }
        );
        // Show as toast
        setToastQueue(prev => [...prev, newNotification]);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        // Refetch on updates to keep read state in sync
        mutate();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, isBusinessAccountUser, mutate]);

  const unreadCount = (data?.notifications ?? []).filter(n => !(data?.readIds ?? new Set()).has(n.id)).length;

  return {
    notifications: data?.notifications ?? [],
    readIds: data?.readIds ?? new Set<string>(),
    unreadCount,
    toastQueue,
    dismissToast,
    loading: authLoading || isLoading,
    error: error ? (error as Error).message : null,
    refetch: () => mutate(),
    mutate,
  };
}

export function invalidateBusinessNotificationsFeed(userId: string) {
  globalMutate(['/api/notifications/business', userId]);
}
