"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { RateLimiter } from "../lib/rateLimiting";
import { usePredefinedPageTitle } from "../hooks/usePageTitle";

// Import shared components
import { EmailInput } from "../components/Auth/Shared/EmailInput";
import { PasswordInput } from "../components/Auth/Shared/PasswordInput";
import { SocialLoginButtons } from "../components/Auth/Shared/SocialLoginButtons";

// Import register-specific components
import { UsernameInput } from "../components/Auth/Register/UsernameInput";
import { usePasswordStrength, validatePassword } from "../components/Auth/Register/usePasswordStrength";

export default function RegisterPage() {
  usePredefinedPageTitle('register');
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [consent, setConsent] = useState(false);
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const { register, isLoading: authLoading, error: authError } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  // Validation functions
  const validateUsername = (username: string) => {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const getUsernameError = () => {
    if (!usernameTouched) return "";
    if (!username) return "Username is required";
    if (username.length < 3) return "Username must be at least 3 characters";
    if (username.length > 20) return "Username must be less than 20 characters";
    if (!validateUsername(username)) return "Username can only contain letters, numbers, and underscores";
    return "";
  };

  const getEmailError = () => {
    if (!emailTouched) return "";
    if (!email) return "Email is required";
    if (!validateEmail(email)) return "Please enter a valid email address";
    return "";
  };

  const isSubmitDisabled =
    submitting || authLoading || !consent ||
    !username || !email || !password || !validateUsername(username) || !validateEmail(email);

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    if (!usernameTouched) setUsernameTouched(true);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (!emailTouched) setEmailTouched(true);
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (!passwordTouched) setPasswordTouched(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submitting || authLoading) return;

    setError("");
    setSubmitting(true);

    try {
      if (!username?.trim() || !email?.trim() || !password?.trim()) {
        setError("Complete all fields");
        showToast("All fields required", 'sage', 2500);
        setSubmitting(false);
        return;
      }

      if (!validateUsername(username.trim())) {
        setError("Username is invalid");
        showToast("Username invalid", 'sage', 2500);
        setSubmitting(false);
        return;
      }

      if (!validateEmail(email.trim())) {
        setError("Email is invalid");
        showToast("Email invalid", 'sage', 2500);
        setSubmitting(false);
        return;
      }

      if (!consent) {
        setError("Accept terms to continue");
        showToast("Accept terms first", 'sage', 2500);
        setSubmitting(false);
        return;
      }

      const passwordError = validatePassword(password);
      if (passwordError) {
        setError(passwordError);
        showToast(passwordError, 'sage', 2500);
        setSubmitting(false);
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();
      const rateLimitResult = await RateLimiter.checkRateLimit(normalizedEmail, 'register');
      
      if (!rateLimitResult.allowed) {
        const errorMsg = rateLimitResult.message || 'Too many attempts. Try again later.';
        setError(errorMsg);
        showToast(errorMsg, 'sage', 3500);
        setSubmitting(false);
        return;
      }

      const success = await register(normalizedEmail, password, username.trim());
      
      if (success) {
        await RateLimiter.recordSuccess(normalizedEmail, 'register');
        setUsername("");
        setEmail("");
        setPassword("");
        showToast("Account created. Verify email.", 'sage', 3000);
      } else {
        const errorMsg = authError || "Something went wrong. Try again.";
        setError(errorMsg);
        showToast(errorMsg, 'sage', 3000);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Connection error. Try again.';
      setError(errorMessage);
      showToast(errorMessage, 'sage', 3000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-off-white flex flex-col overflow-y-auto">
      {/* Back button */}
      <div className="absolute top-6 left-6 z-20">
        <Link href="/onboarding" className="p-2 hover:bg-white/50 rounded-lg transition-colors">
          <ArrowLeft className="w-6 h-6 text-charcoal" strokeWidth={2} />
        </Link>
      </div>

      {/* Header */}
      <div className="text-center pt-20 pb-8">
        <h1 className="text-4xl font-bold text-charcoal mb-2">Create an account</h1>
        <p className="text-charcoal/60">Share honest reviews and climb leaderboards</p>
      </div>

      {/* Form Container */}
      <div className="flex justify-center items-start px-4 pb-12">
        <div className="w-full max-w-md">
          <div className="bg-white border border-charcoal/10 rounded-xl shadow-md p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-red-700">{error}</p>
                </div>
              )}

              {/* Username Input */}
              <UsernameInput
                value={username}
                onChange={(value) => {
                  setUsername(value);
                  if (!usernameTouched) setUsernameTouched(true);
                }}
                onBlur={() => setUsernameTouched(true)}
                error={username && usernameTouched && !validateUsername(username) ? "Invalid username" : ""}
                touched={usernameTouched}
                disabled={submitting}
              />

              {/* Email Input */}
              <EmailInput
                value={email}
                onChange={(value) => {
                  setEmail(value);
                  if (!emailTouched) setEmailTouched(true);
                }}
                onBlur={() => setEmailTouched(true)}
                error={email && emailTouched && !validateEmail(email) ? "Invalid email" : ""}
                touched={emailTouched}
                disabled={submitting}
              />

              {/* Password Input */}
              <PasswordInput
                value={password}
                onChange={(value) => {
                  setPassword(value);
                  if (!passwordTouched) setPasswordTouched(true);
                }}
                onBlur={() => setPasswordTouched(true)}
                disabled={submitting}
                showStrength={false}
                touched={passwordTouched}
              />

              {/* Terms Checkbox */}
              <label className="flex items-start gap-3 text-sm text-charcoal/70 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1 w-4 h-4 border border-charcoal/30 rounded accent-sage"
                />
                <span>
                  I agree to the{" "}
                  <Link href="/terms" className="underline text-charcoal hover:text-sage transition-colors font-semibold">
                    Terms of Use
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="underline text-charcoal hover:text-sage transition-colors font-semibold">
                    Privacy Policy
                  </Link>
                </span>
              </label>

              {/* Sign Up Button */}
              <button
                type="submit"
                disabled={isSubmitDisabled}
                className="w-full bg-sage hover:bg-sage/90 disabled:bg-charcoal/20 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Creating account...
                  </>
                ) : (
                  "Create account"
                )}
              </button>

              {/* Social Login */}
              <SocialLoginButtons />
            </form>

            {/* Footer */}
            <div className="text-center mt-6 pt-6 border-t border-charcoal/10">
              <p className="text-sm text-charcoal/60">
                Already have an account?{" "}
                <Link href="/login" className="text-charcoal font-semibold hover:text-sage transition-colors">
                  Log in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
