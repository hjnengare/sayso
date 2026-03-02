'use client';

import React from 'react';
import { Bell } from "@/app/lib/icons";
import { SettingsCard } from '@/components/atoms/SettingsCard';

export const NotificationsSection: React.FC = () => {
  return (
    <SettingsCard icon={Bell} title="Notifications" iconColor="sage">
      <div className="space-y-2">
        <p className="text-sm text-charcoal/70">
          Manage your notification preferences.
        </p>
        {/* TODO: Add notification settings */}
      </div>
    </SettingsCard>
  );
};

