'use client';

import React from 'react';
import { PasswordInput } from '@/components/atoms/PasswordInput';

export interface PasswordChangeFormProps {
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
}

export const PasswordChangeForm: React.FC<PasswordChangeFormProps> = ({
  currentPassword,
  newPassword,
  confirmPassword,
  showCurrentPassword,
  showNewPassword,
  showConfirmPassword,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onToggleShowCurrent,
  onToggleShowNew,
  onToggleShowConfirm,
  onSubmit,
  onCancel,
  saving = false,
  error,
  success,
}) => {
  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-coral/10 border border-coral/20">
          <p className="text-sm text-coral">{error}</p>
        </div>
      )}
      {success && (
        <div className="p-3 rounded-lg bg-card-bg/10 border border-sage/20">
          <p className="text-sm text-sage">{success}</p>
        </div>
      )}
      <PasswordInput
        label="Current Password"
        value={currentPassword}
        onChange={onCurrentPasswordChange}
        showPassword={showCurrentPassword}
        onToggleShow={onToggleShowCurrent}
      />
      <PasswordInput
        label="New Password"
        value={newPassword}
        onChange={onNewPasswordChange}
        showPassword={showNewPassword}
        onToggleShow={onToggleShowNew}
      />
      <PasswordInput
        label="Confirm New Password"
        value={confirmPassword}
        onChange={onConfirmPasswordChange}
        showPassword={showConfirmPassword}
        onToggleShow={onToggleShowConfirm}
      />
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-full text-sm font-600 font-google-sans bg-white/40 text-charcoal hover:bg-charcoal hover:text-white transition-all duration-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 rounded-full text-sm font-600 font-google-sans bg-coral text-white hover:bg-coral/90 transition-all duration-300 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
};


