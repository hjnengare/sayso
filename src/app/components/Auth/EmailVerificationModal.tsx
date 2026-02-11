"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Mail, X, CheckCircle, ExternalLink } from 'lucide-react';
import { InlineLoader } from '../Loader';

interface EmailVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  action?: string; // The action that requires email verification
}

export default function EmailVerificationModal({ 
  isOpen, 
  onClose, 
  action = "continue" 
}: EmailVerificationModalProps) {
  const { user, resendVerificationEmail } = useAuth();
  const { showToast } = useToast();
  const [isResending, setIsResending] = useState(false);

  if (!isOpen || !user) return null;

  const handleResendVerification = async () => {
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
        showToast('Verification email sent! Check your inbox.', 'success');
      } else if (result.errorCode === 'rate_limit') {
        showToast('Too many attempts. Please wait a few minutes and try again.', 'error');
      } else if (result.errorCode === 'already_verified') {
        showToast(result.errorMessage || 'Your email is already verified.', 'info');
      } else {
        console.error('[EmailVerificationModal] Resend failed', {
          code: result.errorCode,
          message: result.errorMessage,
          email: user.email,
        });
        showToast(result.errorMessage || 'Failed to resend verification email. Please try again.', 'error');
      }
    } catch (error) {
      console.error('[EmailVerificationModal] Unexpected resend error', {
        error,
        email: user.email,
      });
      showToast('Failed to resend verification email. Please try again.', 'error');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-off-white rounded-lg shadow-lg border border-charcoal/10 max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <Mail className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-urbanist text-lg font-700 text-charcoal">
                Verify Your Email
              </h3>
              <p className="font-urbanist text-sm sm:text-xs text-charcoal/60">
                Required to {action}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-charcoal/5 flex items-center justify-center transition-colors duration-200"
          >
            <X className="w-4 h-4 text-charcoal/60" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          <p className="font-urbanist text-sm text-charcoal/70 mb-4 leading-relaxed">
            We've sent a verification link to <span className="font-600 text-charcoal">{user.email}</span>. 
            Please check your email and click the link to verify your account.
          </p>

          {/* Benefits */}
          <div className="bg-sage/5 rounded-lg p-4 mb-4">
            <h4 className="font-urbanist text-sm font-600 text-charcoal mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-sage" />
              What you'll unlock:
            </h4>
            <ul className="space-y-1 text-sm sm:text-xs text-charcoal/70">
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-sage rounded-full"></div>
                Post reviews and share experiences
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-sage rounded-full"></div>
                Save favorite businesses
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-sage rounded-full"></div>
                Join community leaderboard
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {/* Open Gmail Button */}
            <button
              onClick={() => window.open('https://mail.google.com', '_blank')}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white font-urbanist text-sm font-600 py-2.5 px-4 rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4" />
              Open Gmail
              <ExternalLink className="w-3 h-3" />
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2.5 border border-charcoal/20 text-charcoal/70 font-urbanist text-sm font-500 rounded-lg hover:bg-charcoal/5 transition-colors duration-200"
              >
                Later
              </button>
              <button
                onClick={handleResendVerification}
                disabled={isResending}
                className="bg-sage text-white font-urbanist text-sm font-600 py-2.5 px-4 rounded-lg hover:bg-sage/90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isResending ? (
                  <>
                    <InlineLoader size="xs" color="current" />
                    <span className="hidden sm:inline">Sending...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    <span className="hidden sm:inline">Resend</span>
                  </>
                )}
              </button>
            </div>

            {/* Go to Verify Email Page */}
            <Link
              href="/verify-email"
              onClick={onClose}
              className="block w-full bg-off-white border border-sage/30 text-sage font-urbanist text-sm font-600 py-2.5 px-4 rounded-lg hover:bg-sage/5 transition-all duration-300 text-center"
            >
              Go to Verification Page
            </Link>
          </div>

          {/* Help Text */}
          <p className="font-urbanist text-sm sm:text-xs text-charcoal/70 mt-3 text-center">
            Check your spam folder if you don't see the email
          </p>
        </div>
      </div>
    </div>
  );
}
