"use client";

import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useCallback, useState } from 'react';
import { AuthService } from '../lib/auth';

export function useEmailVerification() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<string>('');

  const isEmailVerified = user?.email_verified ?? false;
  const userEmail = user?.email;

  const requireEmailVerification = useCallback((action: string) => {
    setPendingAction(action);
    setShowModal(true);
    return false;
  }, []);

  const resendVerificationEmail = useCallback(async (): Promise<boolean> => {
    if (!userEmail) {
      showToast('No email found. Log in again.', 'error');
      return false;
    }

    if (isEmailVerified) {
      showToast('Your email is already verified.', 'info');
      return false;
    }

    try {
      const { error } = await AuthService.resendVerificationEmail(userEmail);
      
      if (error) {
        console.error('[useEmailVerification] Resend failed', {
          email: userEmail,
          code: error.code,
          message: error.message,
          details: error.details,
        });
        if (error.code === 'rate_limit') {
          showToast('Too many attempts. Please wait a few minutes and try again.', 'error');
        } else {
          showToast(error.message || 'Failed to resend verification email. Please try again.', 'error');
        }
        return false;
      } else {
        showToast('Email sent. Check inbox.', 'success', 2500);
        return true;
      }
    } catch (error) {
      console.error('[useEmailVerification] Unexpected resend error', { email: userEmail, error });
      showToast('Failed to resend. Try again.', 'error');
      return false;
    }
  }, [isEmailVerified, userEmail, showToast]);

  const checkEmailVerification = useCallback((action: string): boolean => {
    if (!isEmailVerified) {
      requireEmailVerification(action);
      return false;
    }
    return true;
  }, [isEmailVerified, requireEmailVerification]);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setPendingAction('');
  }, []);

  return {
    isEmailVerified,
    userEmail,
    requireEmailVerification,
    resendVerificationEmail,
    checkEmailVerification,
    showModal,
    pendingAction,
    closeModal,
  };
}
