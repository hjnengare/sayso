'use client';

import React from 'react';
import { Lock, Key, Shield } from "@/app/lib/icons";
import { SettingsCard } from '@/components/atoms/SettingsCard';
import { ExpandableSection } from '@/components/atoms/ExpandableSection';
import { PasswordChangeForm } from '../PasswordChangeForm';

export interface SecurityPrivacySectionProps {
  activeSection: string | null;
  onToggleSection: (section: string) => void;
  passwordFormProps: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
    showCurrentPassword: boolean;
    showNewPassword: boolean;
    showConfirmPassword: boolean;
    onCurrentPasswordChange: (value: string) => void;
    onNewPasswordChange: (value: string) => void;
    onConfirmPasswordChange: (value: string) => void;
    onToggleShowCurrent: () => void;
    onToggleShowNew: () => void;
    onToggleShowConfirm: () => void;
    onSubmit: (e: React.FormEvent) => void;
    onCancel: () => void;
    saving?: boolean;
    error?: string | null;
    success?: string | null;
  };
}

export const SecurityPrivacySection: React.FC<SecurityPrivacySectionProps> = ({
  activeSection,
  onToggleSection,
  passwordFormProps,
}) => {
  return (
    <SettingsCard icon={Lock} title="Security & Privacy" iconColor="sage">
      {/* Change Password Section */}
      <div className="border-b border-charcoal/10 pb-4 mb-6">
        <ExpandableSection
          icon={Key}
          label="Change Password"
          isExpanded={activeSection === 'password'}
          onToggle={() => onToggleSection('password')}
          showBorder={false}
        >
          <PasswordChangeForm {...passwordFormProps} />
        </ExpandableSection>
      </div>

      {/* Privacy Section */}
      <ExpandableSection
        icon={Shield}
        label="Privacy Settings"
        isExpanded={activeSection === 'privacy'}
        onToggle={() => onToggleSection('privacy')}
        showBorder={false}
        className="mb-0"
      >
        <div className="mt-4 space-y-4">
          <p className="text-sm text-charcoal/70">
            Manage your privacy preferences and data visibility.
          </p>
          {/* TODO: Add privacy settings */}
        </div>
      </ExpandableSection>
    </SettingsCard>
  );
};

