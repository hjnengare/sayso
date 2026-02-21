"use client";

import ToastContainer from "../ToastNotification/ToastContainer";
import { useNotifications } from "../../contexts/NotificationsContext";

export default function NotificationToasts() {
  const { toastQueue, dismissToast } = useNotifications();
  return (
    <ToastContainer
      notifications={toastQueue as any}
      onRemove={dismissToast}
      position="bottom-right"
      duration={6000}
    />
  );
}
