"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { usePrefersReducedMotion } from "../../utils/hooks/usePrefersReducedMotion";
import { useScrollReveal } from "../../hooks/useScrollReveal";
import { RateLimiter } from "../../lib/rateLimiting";
import { usePredefinedPageTitle } from "../../hooks/usePageTitle";
import { InlineLoader } from "../../components/Loader/Loader";
import { getBrowserSupabase } from "../../lib/supabase/client";
import WavyTypedTitle from "../../../components/Animations/WavyTypedTitle";

// Import shared components
import { authStyles } from "../../components/Auth/Shared/authStyles";
import { EmailInput } from "../../components/Auth/Shared/EmailInput";
import { PasswordInput } from "../../components/Auth/Shared/PasswordInput";
import { BusinessNameInput } from "../../components/Auth/Shared/BusinessNameInput";
import { AuthAlert } from "../../components/Auth/Shared/AuthAlert";
import { authCopy, existingAccountMessage, formatAuthMessage } from "../../components/Auth/Shared/authCopy";
// Note: SocialLoginButtons not imported - business accounts use email+password only

// Import register-specific components
import { UsernameInput } from "../../components/Auth/Register/UsernameInput";
import { RegistrationProgress } from "../../components/Auth/Register/RegistrationProgress";
import { usePasswordStrength, validatePassword } from "../../components/Auth/Register/usePasswordStrength";

export default function BusinessRegisterPage() {
  usePredefinedPageTitle("register");
  const prefersReduced = usePrefersReducedMotion();
  const [username, setUsername] = useState("");
  const [publicBusinessName, setPublicBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [consent, setConsent] = useState(false);
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [publicBusinessNameTouched, setPublicBusinessNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [existingAccountError, setExistingAccountError] = useState(false);
  const [existingAccountLabel, setExistingAccountLabel] = useState("Personal");

  const { register, isLoading: authLoading, error: authError } = useAuth();
  const isLoading = authLoading;
  const { showToast } = useToast();
  const containerRef = useRef(null);
  const supabase = getBrowserSupabase();

  // Use password strength hook
  const passwordStrength = usePasswordStrength(password, email);

  // Initialize scroll reveal (runs once per page load)
  useScrollReveal({ threshold: 0.1, rootMargin: "0px 0px -50px 0px", once: true });

  // Ensure the document can scroll (clears any stale scroll locks from menus/modals).
  // This runs client-side only and doesn't change markup, preventing hydration mismatch.
  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  // Validation functions
  const validateUsername = (username: string) => {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePublicBusinessName = (name: string) => {
    const trimmed = name.trim();
    return trimmed.length >= 2 && trimmed.length <= 80;
  };

  const getUsernameError = () => {
    if (!usernameTouched) return "";
    if (!username) return authCopy.usernameRequired;
    if (username.length < 3) return authCopy.usernameMin;
    if (username.length > 20) return authCopy.usernameMax;
    if (!validateUsername(username)) return authCopy.usernameFormat;
    return "";
  };

  const getEmailError = () => {
    if (!emailTouched) return "";
    if (!email) return authCopy.emailRequired;
    if (!validateEmail(email)) return authCopy.emailInvalid;
    return "";
  };

  const getPublicBusinessNameError = () => {
    if (!publicBusinessNameTouched) return "";
    if (!publicBusinessName) return authCopy.publicBusinessNameRequired;
    if (!validatePublicBusinessName(publicBusinessName)) return authCopy.publicBusinessNameInvalid;
    return "";
  };

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Offline detection
  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    updateOnlineStatus();
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  // Hydration-safe disabled state
  const isFormDisabled = mounted ? (submitting || isLoading) : false;
  const isSubmitDisabled = mounted ? (
    submitting || isLoading || !consent || passwordStrength.score < 3 ||
    !username ||
    !publicBusinessName ||
    !email ||
    !password ||
    !validateUsername(username) ||
    !validatePublicBusinessName(publicBusinessName) ||
    !validateEmail(email)
  ) : true;

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    if (!usernameTouched) setUsernameTouched(true);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (!emailTouched) setEmailTouched(true);
  };

  const handlePublicBusinessNameChange = (value: string) => {
    setPublicBusinessName(value);
    if (!publicBusinessNameTouched) setPublicBusinessNameTouched(true);
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (!passwordTouched) setPasswordTouched(true);
  };

  const checkEmailExists = async (
    normalizedEmail: string
  ): Promise<{ exists: boolean; role?: "user" | "business_owner" | "admin" } | null> => {
    try {
      const { data, error: emailError } = await supabase
        .from("profiles")
        .select("user_id, role")
        .eq("email", normalizedEmail)
        .limit(1);

      if (emailError) return null;
      const exists = (data?.length || 0) > 0;
      return { exists, role: data?.[0]?.role };
    } catch {
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submitting || isLoading) return;

    setError("");
    setExistingAccountError(false);
    setSubmitting(true);

    try {
      // Enhanced validation
      if (!username?.trim() || !publicBusinessName?.trim() || !email?.trim() || !password?.trim()) {
        setError(authCopy.requiredFields);
        showToast(authCopy.requiredFields, "sage", 3000);
        setSubmitting(false);
        return;
      }

      if (!validateUsername(username.trim())) {
        setError(authCopy.usernameFormat);
        showToast(authCopy.usernameFormat, "sage", 3000);
        setSubmitting(false);
        return;
      }

      if (!validatePublicBusinessName(publicBusinessName.trim())) {
        setError(authCopy.publicBusinessNameInvalid);
        showToast(authCopy.publicBusinessNameInvalid, "sage", 3000);
        setSubmitting(false);
        return;
      }

      if (!validateEmail(email.trim())) {
        const errorMsg = authCopy.emailInvalid;
        setError(errorMsg);
        showToast(errorMsg, "sage", 3000);
        setSubmitting(false);
        return;
      }

      if (email.trim().length > 254) {
        const errorMsg = authCopy.emailTooLong;
        setError(errorMsg);
        showToast(errorMsg, "sage", 3000);
        setSubmitting(false);
        return;
      }

      if (email.trim().includes("..") || email.trim().startsWith(".") || email.trim().endsWith(".")) {
        const errorMsg = authCopy.emailFormatInvalid;
        setError(errorMsg);
        showToast(errorMsg, "sage", 3000);
        setSubmitting(false);
        return;
      }

      if (!consent) {
        setError(authCopy.consentRequired);
        showToast(authCopy.consentRequired, "sage", 3000);
        setSubmitting(false);
        return;
      }

      const passwordError = validatePassword(password);
      if (passwordError) {
        setError(passwordError);
        showToast(passwordError, "sage", 4000);
        setSubmitting(false);
        return;
      }

      if (passwordStrength.score < 3) {
        const errorMsg = authCopy.passwordStrength;
        setError(errorMsg);
        showToast(errorMsg, "sage", 3000);
        setSubmitting(false);
        return;
      }

      if (!isOnline) {
        setError(authCopy.offline);
        showToast(authCopy.offline, "sage", 4000);
        setSubmitting(false);
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();
      const rateLimitResult = await RateLimiter.checkRateLimit(normalizedEmail, "register");

      if (!rateLimitResult.allowed) {
        const errorMsg = formatAuthMessage(rateLimitResult.message || "", authCopy.rateLimited);
        setError(errorMsg);
        showToast(errorMsg, "sage", 5000);
        setSubmitting(false);
        return;
      }

      // FLOW: BUSINESS REGISTER (NO SHARED EMAILS)
      // 1) If email exists in profiles, block signup and ask for a different email.
      // 2) If email does not exist, signUp and create a business profile.
      //    Supabase sends the verification email; redirect to /verify-email.
      const emailCheck = await checkEmailExists(normalizedEmail);

      if (emailCheck === null) {
        const msg = authCopy.authRequestFailed;
        setError(msg);
        showToast(msg, "sage", 4000);
        setSubmitting(false);
        return;
      }

      if (emailCheck.exists) {
        const accountLabel =
          emailCheck.role === "business_owner"
            ? "Business"
            : emailCheck.role === "admin"
              ? "Admin"
              : "Personal";
        setExistingAccountLabel(accountLabel);
        setExistingAccountError(true);
        const msg = existingAccountMessage(accountLabel);
        setError(msg);
        showToast(msg, "sage", 4000);
        setSubmitting(false);
        return;
      }

      // STEP 2: Create a brand-new business auth user
      const success = await register(
        normalizedEmail,
        password,
        username.trim(),
        "business_owner",
        publicBusinessName.trim()
      );

      if (success) {
        await RateLimiter.recordSuccess(normalizedEmail, "register");

        setUsername("");
        setPublicBusinessName("");
        setEmail("");
        setPassword("");
        showToast("Business account created. Please check your email to confirm your account.", "success", 5000);
      } else {
        if (authError) {
          const lower = authError.toLowerCase();
          if (lower.includes("fetch") || lower.includes("network")) {
            setError(authCopy.connectionIssue);
            showToast(authCopy.connectionIssue, "sage", 4000);
          } else if (
            lower.includes("already in use") ||
            lower.includes("already registered") ||
            lower.includes("already exists") ||
            lower.includes("email already") ||
            lower.includes("already taken") ||
            lower.includes("duplicate") ||
            lower.includes("user_exists")
          ) {
            setExistingAccountError(true);
            const existingMessage = existingAccountMessage(existingAccountLabel || "Personal");
            setError(existingMessage);
            showToast(existingMessage, "sage", 4000);
          } else if (
            lower.includes("invalid email") ||
            (lower.includes("email address") && lower.includes("invalid"))
          ) {
            const msg = authCopy.emailInvalid;
            setError(msg);
            showToast(msg, "sage", 4000);
          } else if (lower.includes("password") && (lower.includes("weak") || lower.includes("requirements"))) {
            setError(authCopy.passwordMin);
            showToast(authCopy.passwordMin, "sage", 4000);
          } else if (lower.includes("too many requests") || lower.includes("rate limit")) {
            setError(authCopy.rateLimited);
            showToast(authCopy.rateLimited, "sage", 4000);
          } else {
            const parsedMessage = formatAuthMessage(authError, authCopy.registrationFailed);
            setError(parsedMessage);
            showToast(parsedMessage, "sage", 4000);
          }
        } else {
          setError(authCopy.registrationFailed);
          showToast(authCopy.registrationFailed, "sage", 4000);
        }
      }
    } catch (error: unknown) {
      console.error("Registration error:", error);
      const errorMessage = formatAuthMessage(error instanceof Error ? error.message : "", authCopy.authRequestFailed);
      setError(errorMessage);
      showToast(errorMessage, "sage", 4000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: authStyles }} />
      {/* Let the document handle scrolling to avoid nested scroll containers on mobile. */}
      <div ref={containerRef} data-reduced={prefersReduced} className="min-h-[100dvh] bg-off-white flex flex-col relative safe-area-full" style={{ paddingBottom: "max(0px, env(safe-area-inset-bottom))" }}>

        {/* Premium floating orbs background */}
        <div className="floating-orb floating-orb-1" aria-hidden="true" />
        <div className="floating-orb floating-orb-2" aria-hidden="true" />
        <div className="floating-orb floating-orb-3" aria-hidden="true" />
        <div className="floating-orb floating-orb-4" aria-hidden="true" />
        <div className="floating-orb floating-orb-5" aria-hidden="true" />
        <div className="floating-orb floating-orb-6" aria-hidden="true" />

        {/* Back button with entrance animation */}
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 animate-slide-in-left animate-delay-200">
          <Link href="/onboarding" className="text-charcoal hover:text-charcoal/80 transition-colors duration-300 p-2 hover:bg-off-white/50 rounded-lg block backdrop-blur-sm">
            <ArrowLeft className="w-6 h-6" strokeWidth={2.5} />
          </Link>
        </div>

        {/* Header with premium styling and animations */}
        <div className="text-center mb-4 pt-16 sm:pt-20">
          <div className="inline-block relative mb-4 animate-fade-in-up animate-delay-400">
            <WavyTypedTitle
              text="Create a business account"
              as="h2"
              className="text-3xl md:text-4xl font-semibold mb-2 text-center leading-[1.2] px-2 tracking-tight text-charcoal"
              typingSpeedMs={40}
              startDelayMs={300}
              waveVariant="subtle"
              loopWave={false}
              triggerOnTypingComplete={true}
              enableScrollTrigger={false}
              style={{
                fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                fontWeight: 700,
              }}
            />
          </div>
          <p className="text-body font-normal text-charcoal/70 mb-4 leading-[1.55] px-2 max-w-[70ch] mx-auto animate-fade-in-up animate-delay-700" style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 400 }}>
            Register your business to manage your presence, respond to reviews, and connect with customers.
          </p>
        </div>

        <div className="w-full mx-auto max-w-[2000px] flex-1 flex flex-col justify-center py-8 sm:py-12 px-0 lg:px-10 2xl:px-16">
          <div className="w-full sm:max-w-md lg:max-w-lg xl:max-w-xl sm:mx-auto relative z-10">
          {/* Form Card */}
          <section data-section>
          <div className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[12px] overflow-hidden backdrop-blur-md shadow-md px-2 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 lg:px-12 lg:py-10 xl:px-16 xl:py-12">

            {existingAccountError ? (
              <div className="space-y-6 text-center relative z-10">
                <div className="bg-blue-50 border border-blue-200 rounded-[12px] p-6">
                  <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>

                  <h3
                    className="text-lg font-semibold text-blue-900 mb-2"
                    style={{
                      fontFamily:
                        "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                    }}
                  >
                    Account already exists
                  </h3>

                  <p
                    className="text-blue-700 mb-6"
                    style={{
                      fontFamily:
                        "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                    }}
                  >
                    {existingAccountMessage(existingAccountLabel)}
                  </p>

                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => {
                        setExistingAccountError(false);
                        setError("");
                        setEmail("");
                      }}
                      className="inline-flex items-center justify-center w-full px-6 py-3 bg-gray-100 text-gray-700 text-body font-semibold rounded-full hover:bg-gray-200 transition-all duration-300"
                      style={{
                        fontFamily:
                          "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                      }}
                    >
                      Try Different Email
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
                {/* Error Message */}
                {error && (
                  <AuthAlert message={error} tone="error" />
                )}

                {/* Offline Message */}
                {!isOnline && !error && (
                  <AuthAlert message={authCopy.offline} tone="warning" />
                )}

                {/* Username Input */}
                <UsernameInput
                  value={username}
                  onChange={handleUsernameChange}
                  onBlur={() => setUsernameTouched(true)}
                  error={getUsernameError()}
                  touched={usernameTouched}
                  disabled={isFormDisabled}
                />
                <p
                  className="text-xs text-white/80 mt-1"
                  style={{
                    fontFamily:
                      "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                  }}
                >
                  This is your account username (not your public business name).
                </p>

                {/* Public Business Name Input */}
                <BusinessNameInput
                  value={publicBusinessName}
                  onChange={handlePublicBusinessNameChange}
                  onBlur={() => setPublicBusinessNameTouched(true)}
                  error={getPublicBusinessNameError()}
                  touched={publicBusinessNameTouched}
                  disabled={isFormDisabled}
                  label="Public Business Name"
                  placeholder="Your public business name"
                  successMessage="Public business name looks good."
                />

                {/* Email Input */}
                <EmailInput
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={() => setEmailTouched(true)}
                  error={getEmailError()}
                  touched={emailTouched}
                  disabled={isFormDisabled}
                  placeholder="you@example.com"
                />

                {/* Password Input */}
                <PasswordInput
                  value={password}
                  onChange={handlePasswordChange}
                  onBlur={() => setPasswordTouched(true)}
                  disabled={isFormDisabled}
                  showStrength={true}
                  strength={{
                    ...passwordStrength,
                    checks: {
                      length: passwordStrength.checks.length,
                      uppercase: false,
                      lowercase: false,
                      number: false,
                    }
                  }}
                  touched={passwordTouched}
                  error={passwordTouched ? validatePassword(password) || undefined : undefined}
                  autoComplete="new-password"
                />

                {/* Terms consent */}
                <div className="pt-2">
                  <label className="flex items-start gap-3 text-body-sm text-white cursor-pointer" style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 400 }}>
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="mt-1 w-4 h-4 border-white/40 bg-white/20 text-sage focus:ring-sage/30 focus:ring-offset-0 rounded"
                    />
                    <span className="flex-1 leading-relaxed">
                      I agree to the{" "}
                      <Link href="/terms" className="underline text-white hover:text-coral transition-colors font-semibold decoration-white/50">
                        Terms of Use
                      </Link>{" "}
                      and{" "}
                      <Link href="/privacy" className="underline text-white hover:text-coral transition-colors font-semibold decoration-white/50">
                        Privacy Policy
                      </Link>
                    </span>
                  </label>
                </div>

                  {/* Sign Up Button and Personal Links */}
                  <div className="pt-4 flex flex-col items-center gap-2">
                    <button
                      type="submit"
                      disabled={isSubmitDisabled}
                      style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 600 }}
                      className="w-full bg-gradient-to-r from-coral to-coral/80 text-white text-body font-semibold py-4 px-2 rounded-full hover:from-coral/90 hover:to-coral transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 btn-target btn-press"
                    >
                      {isFormDisabled ? (
                        <>
                          <InlineLoader size="xs" variant="wavy" color="white" />
                          Creating account...
                        </>
                      ) : (
                        "Create business account"
                      )}
                    </button>
                    {/* Personal Account Links */}
                    <div className="mt-2 text-center">
                      <Link
                        href="/login"
                        className="text-body-sm text-white/80 hover:text-coral font-medium underline-offset-2 hover:underline transition-colors duration-200"
                        style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 500 }}
                      >
                        Log in to a Personal Account
                      </Link>
                      <span className="mx-2 text-white/30" aria-hidden="true">|</span>
                      <Link
                        href="/register"
                        className="text-body-sm text-white/80 hover:text-coral font-medium underline-offset-2 hover:underline transition-colors duration-200"
                        style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 500 }}
                      >
                        Sign up for a Personal Account
                      </Link>
                    </div>
                  </div>

                {/* Registration progress */}
                <RegistrationProgress
                  usernameValid={!!username && !getUsernameError()}
                  emailValid={!!email && !getEmailError()}
                  passwordStrong={passwordStrength.score >= 3}
                  consentGiven={consent}
                />

                {/* Note: No OAuth for business accounts - email+password only */}
              </form>
            )}

            {/* Footer */}
              <div className="text-center mt-6 pt-6 border-t border-white/20">
              <div className="text-body-sm sm:text-body text-white" style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 400 }}>
                Already have a business account?{" "}
                <Link
                  href="/business/login"
                  className="text-white font-semibold hover:text-coral transition-colors duration-300 relative group"
                  style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 600 }}
                >
                  Log in
                </Link>
              </div>
            </div>
          </div>
          </section>
          </div>
        </div>
      </div>
    </>
  );
}

