"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { generateNotificationBatch, type ToastNotificationData } from "../data/notificationData";

interface NotificationsContextType {
  notifications: ToastNotificationData[];
  unreadCount: number;
  isLoading: boolean;
  readNotifications: Set<string>;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  refetch: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

interface NotificationsProviderProps {
  children: ReactNode;
}

export function NotificationsProvider({ children }: NotificationsProviderProps) {
  const [notifications, setNotifications] = useState<ToastNotificationData[]>([]);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // For now, generate mock notifications
      // In production, this would fetch from an API
      const mockNotifications = generateNotificationBatch(10);
      setNotifications(mockNotifications);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = useCallback((id: string) => {
    setReadNotifications(prev => new Set(prev).add(id));
  }, []);

  const markAllAsRead = useCallback(() => {
    setReadNotifications(new Set(notifications.map(n => n.id)));
  }, [notifications]);

  const deleteNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    setReadNotifications(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  }, []);

  const unreadCount = notifications.filter(n => !readNotifications.has(n.id)).length;

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        readNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        refetch: fetchNotifications,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationsProvider");
  }
  return context;
}

