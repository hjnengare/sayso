"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { BadgeNotification } from '../components/Realtime/RealtimeIndicators';
import { useRealtimeBadges } from '../hooks/useRealtime';
import { useAuth } from './AuthContext';

interface RealtimeContextType {
  showBadgeNotification: (badge: BadgeData) => void;
  isRealtimeEnabled: boolean;
}

interface BadgeData {
  name: string;
  description?: string;
  icon?: string;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [currentBadge, setCurrentBadge] = useState<BadgeData | null>(null);
  const [badgeQueue, setBadgeQueue] = useState<BadgeData[]>([]);
  const { newBadges, clearNewBadges } = useRealtimeBadges(user?.id);

  // Process new badges from realtime
  useEffect(() => {
    if (newBadges.length > 0) {
      setBadgeQueue((prev) => [...prev, ...newBadges]);
      clearNewBadges();
    }
  }, [newBadges, clearNewBadges]);

  // Display badges from queue one at a time
  useEffect(() => {
    if (!currentBadge && badgeQueue.length > 0) {
      const [nextBadge, ...rest] = badgeQueue;
      setCurrentBadge(nextBadge);
      setBadgeQueue(rest);

      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        setCurrentBadge(null);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [currentBadge, badgeQueue]);

  const showBadgeNotification = useCallback((badge: BadgeData) => {
    setBadgeQueue((prev) => [...prev, badge]);
  }, []);

  const handleClose = useCallback(() => {
    setCurrentBadge(null);
  }, []);

  return (
    <RealtimeContext.Provider
      value={{
        showBadgeNotification,
        isRealtimeEnabled: true,
      }}
    >
      {children}
      <AnimatePresence>
        {currentBadge && (
          <BadgeNotification badge={currentBadge} onClose={handleClose} />
        )}
      </AnimatePresence>
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}
