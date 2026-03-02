'use client';

import React from 'react';
import { Trash2 } from "@/app/lib/icons";
import { SettingsCard } from '@/components/atoms/SettingsCard';
import { DangerAction } from '@/components/molecules/DangerAction';

export interface DangerZoneSectionProps {
  onDeactivate: () => void;
  onDeleteAccount: () => void;
}

export const DangerZoneSection: React.FC<DangerZoneSectionProps> = ({
  onDeactivate,
  onDeleteAccount,
}) => {
  return (
    <SettingsCard
      icon={Trash2}
      title="Danger Zone"
      iconColor="coral"
      className="border-coral/20 ring-coral/20 mb-12"
    >
      <div className="space-y-4">
        <DangerAction
          title="Deactivate Account"
          description="Temporarily deactivate your account. You can reactivate it anytime by logging in."
          buttonText="Deactivate Account"
          onAction={onDeactivate}
          variant="primary"
          showBorder={false}
        />
        <DangerAction
          title="Delete Account"
          description="Permanently delete your account and all associated data. This action cannot be undone."
          buttonText="Delete Account"
          onAction={onDeleteAccount}
          variant="secondary"
          showBorder={true}
        />
      </div>
    </SettingsCard>
  );
};

