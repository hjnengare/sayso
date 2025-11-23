"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthService } from "../lib/auth";
import { useToast } from "../contexts/ToastContext";
import { RateLimiter } from "../lib/rateLimiting";

// Import shared components
import { authStyles } from "../components/Auth/Shared/authStyles";
import { AuthHeader } from "../components/Auth/Shared/AuthHeader";
import { EmailInput } from "../components/Auth/Shared/EmailInput";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();
  const { showToast } = useToast();

  // Validation function
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const getEmailError = () => {
    if (!emailTouched) return "";
    if (!email) return "Email is required";
    if (!validateEmail(email)) return "Please enter a valid email address";
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    // Mark field as touched for validation
    setEmailTouched(true);

    if (!email) {
      setError("Please enter your email address");
      showToast("Please enter your email address", 'sage', 3000);
      setIsSubmitting(false);
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      showToast("Please enter a valid email address", 'sage', 3000);
      setIsSubmitting(false);
      return;
    }

    try {
      // Check rate limit before requesting password reset
      const normalizedEmail = email.trim().toLowerCase();
      const rateLimitResult = await RateLimiter.checkRateLimit(normalizedEmail, 'password_reset');
      
      if (!rateLimitResult.allowed) {
        const errorMsg = rateLimitResult.message || 'Too many password reset requests. Please try again later.';
        setError(errorMsg);
        showToast(errorMsg, 'sage', 5000);
        setIsSubmitting(false);
        return;
      }

      const { error: resetError } = await AuthService.resetPasswordForEmail(email);

      if (resetError) {
        setError(resetError.message);
        showToast(resetError.message, 'sage', 4000);
      } else {
        // Clear rate limit on successful password reset request
        await RateLimiter.recordSuccess(normalizedEmail, 'password_reset');
        setEmailSent(true);
        showToast("Password reset email sent! Check your inbox.", 'success', 5000);
      }
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to send reset email';
      setError(errorMsg);
      showToast(errorMsg, 'sage', 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (emailSent) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: authStyles }} />
        <div className="min-h-[100dvh] bg-off-white flex flex-col relative overflow-hidden ios-inertia hide-scrollbar safe-area-full">
          <AuthHeader
            backLink="/login"
            title="Check your email"
            subtitle="Password reset instructions sent"
          />

          <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg mx-auto relative z-10 flex-1 flex flex-col justify-center py-8 sm:py-12">
            <div className="bg-off-white/95 rounded-lg p-5 sm:p-7 md:p-9 mb-4 relative overflow-hidden border border-white/30 backdrop-blur-lg shadow-[0_10px_30px_rgba(0,0,0,0.06),0_22px_70px_rgba(0,0,0,0.10)] animate-scale-in">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-sage/10 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-sage" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>

                <div className="space-y-2">
                  <h2 className="font-urbanist text-xl font-700 text-charcoal">
                    Email sent!
                  </h2>
                  <p className="font-urbanist text-sm text-charcoal/70">
                    We&apos;ve sent password reset instructions to:
                  </p>
                  <p className="font-urbanist text-base font-600 text-sage">
                    {email}
                  </p>
                </div>

                <div className="bg-sage/5 rounded-xl p-4 text-left space-y-2">
                  <p className="font-urbanist text-sm sm:text-xs text-charcoal/70">
                    <strong className="text-charcoal">Next steps:</strong>
                  </p>
                  <ol className="font-urbanist text-sm sm:text-xs text-charcoal/70 space-y-1 list-decimal list-inside">
                    <li>Check your inbox (and spam folder)</li>
                    <li>Click the reset link in the email</li>
                    <li>Create a new password</li>
                  </ol>
                  <p className="font-urbanist text-sm sm:text-xs text-charcoal/60 italic pt-2">
                    The reset link expires in 60 minutes
                  </p>
                </div>

                <div className="pt-4 space-y-3">
                  <button
                    onClick={() => router.push('/login')}
                    className="w-full btn-premium text-white text-base font-semibold py-3 px-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-sage/30 transform hover:scale-105 active:scale-95"
                  >
                    Back to Login
                  </button>

                  <button
                    onClick={() => {
                      setEmailSent(false);
                      setEmail("");
                      setEmailTouched(false);
                    }}
                    className="w-full text-sm text-sage hover:text-coral transition-colors duration-300 font-500"
                  >
                    Use a different email
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: authStyles }} />
      <div className="min-h-[100dvh] bg-off-white flex flex-col relative overflow-hidden ios-inertia hide-scrollbar safe-area-full">

        <AuthHeader
          backLink="/login"
          title="Forgot password?"
          subtitle="Enter your email to reset your password"
        />

        <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg mx-auto relative z-10 flex-1 flex flex-col justify-center py-8 sm:py-12">
          <div className="bg-off-white/95 rounded-lg p-5 sm:p-7 md:p-9 mb-4 relative overflow-hidden border border-white/30 backdrop-blur-lg shadow-[0_10px_30px_rgba(0,0,0,0.06),0_22px_70px_rgba(0,0,0,0.10)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.08),0_30px_90px_rgba(0,0,0,0.14)] transition-shadow duration-300 animate-scale-in">

            <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                  <p className="font-urbanist text-[14px] font-600 text-red-600">{error}</p>
                </div>
              )}

              <div className="mb-4 text-center">
                <p className="font-urbanist text-sm text-charcoal/70">
                  Enter the email address associated with your account and we&apos;ll send you a link to reset your password.
                </p>
              </div>

              {/* Email Input */}
              <EmailInput
                value={email}
                onChange={(value) => {
                  setEmail(value);
                  if (!emailTouched) setEmailTouched(true);
                }}
                onBlur={() => setEmailTouched(true)}
                error={getEmailError()}
                touched={emailTouched}
                disabled={isSubmitting}
              />

              {/* Submit Button */}
              <div className="pt-2 flex justify-center">
                <div className="w-full">
                  <button
                    type="submit"
                    disabled={isSubmitting || !email}
                    style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif' }}
                    className={`group block w-full text-base font-semibold py-3 px-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-offset-2 relative overflow-hidden text-center min-h-[48px] whitespace-nowrap transform hover:scale-105 active:scale-95 ${
                      isSubmitting || !email
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
                        : 'btn-premium text-white focus:ring-sage/30'
                    }`}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {isSubmitting && (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      )}
                      {isSubmitting ? "Sending..." : "Send reset link"}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-coral to-coral/90 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full"></div>
                  </button>
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="text-center mt-4 pt-4 border-t border-light-gray/30">
              <div className="font-urbanist text-sm sm:text-base font-600 text-charcoal/70">
                Remember your password?{" "}
                <Link
                  href="/login"
                  className="text-coral font-600 hover:text-coral/80 transition-colors duration-300 relative group"
                >
                  <span>Sign in</span>
                  <div className="absolute inset-x-0 -bottom-1 h-0.5 bg-coral/30 group-hover:bg-coral/60 transition-colors duration-300 rounded-full"></div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
