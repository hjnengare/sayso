'use client';

import React from 'react';
import Link from 'next/link';
import { User, ArrowLeft, Mail } from "@/app/lib/icons";
import { SettingsCard } from '@/components/atoms/SettingsCard';
import { ProfileInfoItem } from '@/components/molecules/ProfileInfoItem';

export interface ProfileSettingsSectionProps {
  email?: string;
  accountCreated?: string;
}

export const ProfileSettingsSection: React.FC<ProfileSettingsSectionProps> = ({
  email,
  accountCreated,
}) => {
  return (
    <SettingsCard
      icon={User}
      title="Profile Information"
      iconColor="coral"
      className="relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-coral/10 to-transparent rounded-full blur-lg" />
      <div className="relative z-10">
        <div className="space-y-4">
          <ProfileInfoItem
            label="Email"
            value={email || 'N/A'}
            icon={Mail}
            iconColor="coral"
          />
          <ProfileInfoItem
            label="Account Created"
            value={accountCreated || 'N/A'}
            showBorder={false}
          />
        </div>
        <Link
          href="/profile"
          className="mt-6 inline-flex items-center gap-2 text-sm font-600 text-coral hover:text-coral/80 transition-colors"
        >
          Edit Profile <ArrowLeft className="w-4 h-4 rotate-180" />
        </Link>
      </div>
    </SettingsCard>
  );
};

