"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Mail, X } from 'lucide-react';
import { InlineLoader } from '../Loader';

interface EmailVerificationBannerProps {
  onDismiss?: () => void;
  className?: string;
}

export default function EmailVerificationBanner({ onDismiss, className = "" }: EmailVerificationBannerProps) {
  const { user, resendVerificationEmail } = useAuth();
  const { showToast } = useToast();
  const [isResending, setIsResending] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show if user is verified or dismissed
  if (!user || user.email_verified || isDismissed) {
    return null;
  }

  const handleResend = async () => {
    if (!user.email) {
      showToast('No email address found. Please log in again.', 'error');
      return;
    }
    if (user.email_verified) {
      showToast('Your email is already verified.', 'info');
      return;
    }

    setIsResending(true);
    try {
      const result = await resendVerificationEmail(user.email);
      if (result.success) {
        showToast('Verification email sent! Check your inbox and spam folder.', 'success');
      } else if (result.errorCode === 'rate_limit') {
        showToast('Too many attempts. Please wait a few minutes and try again.', 'error');
      } else if (result.errorCode === 'already_verified') {
        showToast(result.errorMessage || 'Your email is already verified.', 'info');
      } else {
        console.error('[EmailVerificationBanner] Resend failed', {
          code: result.errorCode,
          message: result.errorMessage,
          email: user.email,
        });
        showToast(result.errorMessage || 'Failed to resend verification email. Please try again.', 'error');
      }
    } catch (error) {
      console.error('[EmailVerificationBanner] Unexpected resend error', {
        error,
        email: user.email,
      });
      showToast('Failed to resend verification email. Please try again.', 'error');
    } finally {
      setIsResending(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <div className={`bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-400 p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <Mail className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        
        <div className="flex-1 min-w-0">
          <p className="font-urbanist text-sm font-600 text-amber-800 mb-1">
            Email Verification Required
          </p>
          <p className="font-urbanist text-sm text-amber-700 mb-3">
            We've sent a confirmation email to <span className="font-600">{user.email}</span>. 
            Please verify to post reviews and appear on leaderboards.
          </p>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleResend}
              disabled={isResending}
              className="font-urbanist text-sm font-600 text-amber-800 hover:text-amber-900 underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              {isResending ? (
                <>
                  <InlineLoader size="xs" color="current" />
                  Sending...
                </>
              ) : (
                'Resend'
              )}
            </button>
            
            <span className="text-amber-600">•</span>
            
            <Link
              href="/verify-email"
              className="font-urbanist text-sm font-600 text-amber-800 hover:text-amber-900 underline"
            >
              Go to verification page
            </Link>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="text-amber-600 hover:text-amber-700 transition-colors flex-shrink-0"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
