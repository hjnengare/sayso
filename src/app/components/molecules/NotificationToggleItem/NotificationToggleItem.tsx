'use client';

import React from 'react';
import { Toggle } from '@/components/atoms/Toggle';

export interface NotificationToggleItemProps {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}

export const NotificationToggleItem: React.FC<NotificationToggleItemProps> = ({
  label,
  description,
  enabled,
  onToggle,
}) => {
  return (
    <div className="flex items-center justify-between py-3 border-b border-charcoal/10 last:border-b-0">
      <div className="flex-1">
        <p className="text-base font-500 text-charcoal mb-1">{label}</p>
        <p className="text-sm text-charcoal/70">{description}</p>
      </div>
      <Toggle enabled={enabled} onToggle={onToggle} />
    </div>
  );
};

