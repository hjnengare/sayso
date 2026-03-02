'use client';

import React from 'react';
import { Shield } from "@/app/lib/icons";
import { SettingsCard } from '@/components/atoms/SettingsCard';
import { NotificationToggleItem } from '@/components/molecules/NotificationToggleItem';

export interface PrivacySettingsProps {
  settings: {
    key: string;
    label: string;
    description: string;
    enabled: boolean;
  }[];
  onToggle: (key: string) => void;
}

export const PrivacySettingsSection: React.FC<PrivacySettingsProps> = ({
  settings,
  onToggle,
}) => {
  return (
    <SettingsCard
      icon={Shield}
      title="Privacy Settings"
      iconColor="sage"
      className="relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-sage/10 to-transparent rounded-full blur-lg" />
      <div className="relative z-10 space-y-4">
        {settings.map((setting) => (
          <NotificationToggleItem
            key={setting.key}
            label={setting.label}
            description={setting.description}
            enabled={setting.enabled}
            onToggle={() => onToggle(setting.key)}
          />
        ))}
      </div>
    </SettingsCard>
  );
};

