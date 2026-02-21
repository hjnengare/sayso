"use client";

import { useBusinessNotificationsFeed } from '../../hooks/useBusinessNotificationsFeed';
import ToastContainer from '../ToastNotification/ToastContainer';

/**
 * BusinessNotifications
 *
 * Mounts the SWR-backed business notifications feed (realtime + polling fallback)
 * and renders incoming realtime toasts. Replaces the old useBusinessNotifications hook.
 */
export default function BusinessNotifications() {
  const { toastQueue, dismissToast } = useBusinessNotificationsFeed();

  return (
    <ToastContainer
      notifications={toastQueue as any}
      onRemove={dismissToast}
      position="bottom-right"
      duration={6000}
    />
  );
}
