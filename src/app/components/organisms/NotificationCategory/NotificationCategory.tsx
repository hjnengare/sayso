'use client';

import React from 'react';
import { SettingsCard } from '@/components/atoms/SettingsCard';
import { NotificationToggleItem } from '@/components/molecules/NotificationToggleItem';

export interface NotificationItem {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
}

export interface NotificationCategoryProps {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  iconColor?: 'coral' | 'sage';
  notifications: NotificationItem[];
  onToggle: (key: string) => void;
  withBlur?: boolean;
}

export const NotificationCategory: React.FC<NotificationCategoryProps> = ({
  icon,
  title,
  iconColor = 'coral',
  notifications,
  onToggle,
  withBlur = false,
}) => {
  return (
    <SettingsCard
      icon={icon}
      title={title}
      iconColor={iconColor}
      className={withBlur ? 'relative overflow-hidden' : ''}
    >
      {withBlur && (
        <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-coral/10 to-transparent rounded-full blur-lg" />
      )}
      <div className={withBlur ? 'relative z-10 space-y-4' : 'space-y-4'}>
        {notifications.map((notification) => (
          <NotificationToggleItem
            key={notification.key}
            label={notification.label}
            description={notification.description}
            enabled={notification.enabled}
            onToggle={() => onToggle(notification.key)}
          />
        ))}
      </div>
    </SettingsCard>
  );
};

