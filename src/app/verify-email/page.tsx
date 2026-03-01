"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { getBrowserSupabase } from "../lib/supabase/client";
import type { AuthUser } from "../lib/types/database";
import {
  VerifyEmailErrorView,
  VerifyEmailExpiredView,
  VerifyEmailInvalidLinkView,
  VerifyEmailLoadingView,
  VerifyEmailMainView,
  VerifyEmailShell,
  VerifyEmailSuccessView,
} from "./VerifyEmailViews";
const RESEND_COOLDOWN_SECONDS = 60;

function isExpiredVerificationError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("expired") ||
    lower.includes("invalid") ||
    lower.includes("otp has expired") ||
    lower.includes("token has expired") ||
    lower.includes("email link is invalid")
  );
}

export default function VerifyEmailPage() {
  const { user, resendVerificationEmail, refreshUser, isLoading } = useAuth();
  const { showToast, showToastOnce } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDev = process.env.NODE_ENV !== "production";
  const codeInUrl = searchParams.get("code");
  const hasCodeInUrl = Boolean(codeInUrl);

  const [isResending, setIsResending] = useState(false);
  const [isProcessingCodeExchange, setIsProcessingCodeExchange] = useState(false);
  const [verificationLinkError, setVerificationLinkError] = useState<string | null>(null);
  const [resendCooldownSeconds, setResendCooldownSeconds] = useState(0);
  const [resendRateLimitMessage, setResendRateLimitMessage] = useState<string | null>(null);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [verificationStatusMessage, setVerificationStatusMessage] = useState<string | null>(null);

  // Detect expired link from ?expired=1 synchronously to avoid flashes
  const [linkExpired, setLinkExpired] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("expired") === "1";
  });

  // Read sessionStorage synchronously during init to avoid a flash of "No verification pending"
  const [pendingEmail] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("pendingVerificationEmail");
  });
  const [pendingAccountType] = useState<"user" | "business_owner" | null>(() => {
    if (typeof window === "undefined") return null;
    const accountType = sessionStorage.getItem("pendingVerificationAccountType");
    return accountType === "business_owner" || accountType === "user"
      ? (accountType as "user" | "business_owner")
      : null;
  });

  const redirectingRef = useRef(false);
  const checkingRef = useRef(false);
  const resendSubmittingRef = useRef(false);
  const verificationCallbackHandledRef = useRef(false);
  const verificationCodeHandledRef = useRef(false);
  const prefersReduced = usePrefersReducedMotion();
  const debugLog = useCallback((message: string, payload?: Record<string, unknown>) => {
    if (!isDev) return;
    if (payload) {
      console.log(`[VerifyEmail] ${message}`, payload);
      return;
    }
    console.log(`[VerifyEmail] ${message}`);
  }, [isDev]);

  // Clean ?expired param from URL without re-render
  useEffect(() => {
    if (!linkExpired || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.delete("expired");
    window.history.replaceState({}, "", url.pathname + (url.search || ""));
  }, [linkExpired]);

  // Ensure scroll is not locked from previous routes/modals
  useEffect(() => {
    if (typeof window === "undefined") return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "auto";
    document.documentElement.style.overflow = "auto";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  const getPostVerifyRedirect = useCallback((candidate?: AuthUser | null): string => {
    const resolvedUser = candidate || user;
    if (!resolvedUser) return "/verify-email";

    const profile = resolvedUser.profile as (AuthUser["profile"] & { is_admin?: boolean }) | undefined;
    const roleRaw =
      profile?.account_role ||
      profile?.role ||
      (resolvedUser as any)?.current_role ||
      "";
    const role = String(roleRaw).toLowerCase();

    const isAdmin = profile?.is_admin === true || role === "admin" || role === "super_admin" || role === "superadmin";
    if (isAdmin) return "/admin";

    const isBusinessAccount =
      role === "business_owner" ||
      role === "business" ||
      role === "owner";
    if (isBusinessAccount) return "/my-businesses";

    const onboardingDone = Boolean(profile?.onboarding_completed_at);
    return onboardingDone ? "/profile" : "/interests";
  }, [user]);

  useEffect(() => {
    if (resendCooldownSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldownSeconds((current) => (current > 1 ? current - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldownSeconds]);

  const handleResendVerification = useCallback(async (
    overrideEmail?: string,
    options?: { onSuccess?: () => void }
  ) => {
    const email = overrideEmail || user?.email || pendingEmail;
    if (!email) {
      showToast("No email address found. Please register or log in again.", "error", 3200);
      return;
    }
    if (user?.email_verified) {
      showToast("Your email is already verified.", "info", 2600);
      return;
    }
    if (resendSubmittingRef.current || isResending || resendCooldownSeconds > 0) return;

    resendSubmittingRef.current = true;
    setIsResending(true);
    setResendRateLimitMessage(null);

    try {
      const result = await resendVerificationEmail(email);
      if (result.success) {
        setResendCooldownSeconds(RESEND_COOLDOWN_SECONDS);
        showToast("Email sent. Check inbox.", "sage", 2500);
        options?.onSuccess?.();
        return;
      }

      if (result.errorCode === "rate_limit") {
        setResendRateLimitMessage("Too many attempts. Please wait a few minutes and try again.");
        setResendCooldownSeconds((current) => Math.max(current, RESEND_COOLDOWN_SECONDS));
        showToast("Too many attempts. Please wait a few minutes and try again.", "error", 3200);
        return;
      }

      if (result.errorCode === "already_verified") {
        showToast(result.errorMessage || "Your email is already verified.", "info", 3000);
        return;
      }

      const errorMessage = result.errorMessage || "Could not resend. Please wait a moment and try again.";
      console.error("[VerifyEmail] Resend verification failed", {
        email,
        code: result.errorCode,
        message: result.errorMessage,
      });
      showToast(errorMessage, "error", 3200);
    } catch (error) {
      console.error("[VerifyEmail] Unexpected resend verification error", { email, error });
      showToast("Failed to resend. Try again.", "error", 3000);
    } finally {
      resendSubmittingRef.current = false;
      setIsResending(false);
    }
  }, [
    isResending,
    pendingEmail,
    resendCooldownSeconds,
    resendVerificationEmail,
    showToast,
    user?.email_verified,
    user?.email,
  ]);

  const handleOpenInbox = () => {
    const email = user?.email || pendingEmail;
    if (!email) return;

    const domain = email.split("@")[1]?.toLowerCase();
    let inboxUrl = "https://mail.google.com";

    if (domain?.includes("gmail")) inboxUrl = "https://mail.google.com";
    else if (domain?.includes("outlook") || domain?.includes("hotmail") || domain?.includes("live"))
      inboxUrl = "https://outlook.live.com/mail";
    else if (domain?.includes("yahoo")) inboxUrl = "https://mail.yahoo.com";
    else if (domain?.includes("icloud") || domain?.includes("me.com")) inboxUrl = "https://www.icloud.com/mail";
    else if (domain) inboxUrl = `https://${domain}`;

    window.open(inboxUrl, "_blank");
  };

  const isResendDisabled = isResending || resendCooldownSeconds > 0;
  const resendCooldownMessage =
    resendCooldownSeconds > 0
      ? `We've sent a link. Try again in ${resendCooldownSeconds} second${resendCooldownSeconds === 1 ? "" : "s"}.`
      : null;
  const useDifferentEmailHref = pendingAccountType === "business_owner" ? "/business/register" : "/register";

  const checkVerificationStatus = useCallback(async (options?: {
    manual?: boolean;
    showSuccessToast?: boolean;
    fromVerificationCallback?: boolean;
    successToastMessage?: string;
    successToastOnceKey?: string;
  }): Promise<boolean> => {
    const {
      manual = false,
      showSuccessToast = true,
      fromVerificationCallback = false,
      successToastMessage = "Email verified successfully",
      successToastOnceKey,
    } = options || {};
    if (redirectingRef.current || checkingRef.current) return false;

    checkingRef.current = true;
    if (manual) {
      setVerificationStatusMessage(null);
    }

    const supabase = getBrowserSupabase();
    const notVerifiedMessage =
      "We still can't detect verification. Please check your inbox and try again.";
    const verificationSessionMessage =
      "Verification completed. Please open the verification link in the same browser to continue automatically.";

    try {
      debugLog("checkVerificationStatus started", {
        manual,
        fromVerificationCallback,
      });

      // Backward compatibility path for legacy /verify-email?verified=1 callbacks.
      if (fromVerificationCallback) {
        const currentUrl = typeof window !== "undefined" ? new URL(window.location.href) : null;
        const callbackCode = currentUrl?.searchParams.get("code") || searchParams.get("code");
        debugLog("legacy callback verification detected", {
          hasCode: Boolean(callbackCode),
        });
        if (callbackCode) {
          const { error: callbackExchangeError } = await supabase.auth.exchangeCodeForSession(callbackCode);
          if (callbackExchangeError) {
            debugLog("legacy callback exchange failed", {
              error: callbackExchangeError.message,
            });
          }
        }
      }

      // Ensure a valid active session exists before checking confirmed state.
      let { data: sessionData } = await supabase.auth.getSession();
      let session = sessionData.session;

      debugLog("session lookup completed", {
        hasSession: Boolean(session),
      });

      if (!session) {
        await supabase.auth.refreshSession().catch(() => undefined);
        ({ data: sessionData } = await supabase.auth.getSession());
        session = sessionData.session;
        debugLog("session refresh attempted", {
          hasSessionAfterRefresh: Boolean(session),
        });
      }

      if (!session) {
        if (manual || fromVerificationCallback) {
          setVerificationStatusMessage(verificationSessionMessage);
        }
        return false;
      }

      if (!session.user?.email_confirmed_at) {
        if (manual || fromVerificationCallback) {
          setVerificationStatusMessage(notVerifiedMessage);
        }
        return false;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      debugLog("getUser completed", {
        hasUser: Boolean(userData?.user),
        hasEmailConfirmedAt: Boolean(userData?.user?.email_confirmed_at),
      });
      if (userError || !userData?.user) {
        if (manual || fromVerificationCallback) {
          setVerificationStatusMessage(verificationSessionMessage);
        }
        return false;
      }

      const authUser = userData.user;
      if (!authUser.email_confirmed_at) {
        if (manual || fromVerificationCallback) setVerificationStatusMessage(notVerifiedMessage);
        return false;
      }

      // Ensure profile exists and role/account_type are synced before redirect decisions.
      try {
        const syncResponse = await fetch('/api/auth/sync-profile-role', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        });

        if (!syncResponse.ok) {
          debugLog('sync-profile-role failed', { status: syncResponse.status });
        }
      } catch (syncError) {
        debugLog('sync-profile-role error', { error: String(syncError) });
      }

      if (typeof window !== "undefined") {
        sessionStorage.removeItem("pendingVerificationEmail");
        sessionStorage.removeItem("pendingVerificationAccountType");
      }

      await refreshUser();

      let profile: AuthUser["profile"] | undefined = user?.profile;
      const { data: profileData } = await supabase
        .from("profiles")
        .select("role, account_role, onboarding_completed_at")
        .eq("user_id", authUser.id)
        .maybeSingle();

      if (profileData) {
        profile = {
          ...(profile || {}),
          role: profileData.role as any,
          account_role: profileData.account_role as any,
          onboarding_completed_at: profileData.onboarding_completed_at || undefined,
        } as AuthUser["profile"];
      }

      const verifiedUser: AuthUser = {
        id: authUser.id,
        email: authUser.email || user?.email || "",
        email_verified: true,
        created_at: authUser.created_at,
        updated_at: authUser.updated_at || authUser.created_at,
        profile,
      };

      setVerificationSuccess(true);
      setVerificationStatusMessage(null);
      if (showSuccessToast) {
        if (successToastOnceKey) {
          showToastOnce(successToastOnceKey, successToastMessage, "sage", 3000);
        } else {
          showToast(successToastMessage, "sage", 2200);
        }
      }
      redirectingRef.current = true;
      const redirectTarget = getPostVerifyRedirect(verifiedUser);
      debugLog("redirect chosen", { redirectTarget });
      router.replace(redirectTarget);
      return true;
    } catch {
      if (manual) {
        setVerificationStatusMessage("Could not check verification status. Please try again.");
      }
      return false;
    } finally {
      checkingRef.current = false;
    }
  }, [
    debugLog,
    getPostVerifyRedirect,
    refreshUser,
    router,
    searchParams,
    showToast,
    showToastOnce,
    user?.email,
    user?.profile,
  ]);

  // PKCE flow: exchange auth code for session when verification link lands on /verify-email.
  useEffect(() => {
    if (!hasCodeInUrl) return;
    if (redirectingRef.current || verificationCodeHandledRef.current) return;
    verificationCodeHandledRef.current = true;

    let cancelled = false;

    const runCodeExchange = async () => {
      setIsProcessingCodeExchange(true);
      setVerificationLinkError(null);
      setVerificationStatusMessage(null);

      try {
        const supabase = getBrowserSupabase();
        const currentUrl = new URL(window.location.href);
        const callbackCode = currentUrl.searchParams.get("code");

        debugLog("URL contains code", {
          hasCode: Boolean(callbackCode),
        });

        if (!callbackCode) {
          if (!cancelled) {
            setVerificationLinkError("Verification link invalid or expired. Please request a new link.");
          }
          return;
        }

        debugLog("exchangeCodeForSession ran", {
          path: currentUrl.pathname,
        });
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(callbackCode);

        if (exchangeError) {
          debugLog("exchangeCodeForSession failed", {
            error: exchangeError.message,
          });
          if (!cancelled) {
            if (isExpiredVerificationError(exchangeError.message || "")) {
              setLinkExpired(true);
            } else {
              setVerificationLinkError("Verification link invalid or expired. Please request a new link.");
            }
          }
          return;
        }

        const { data: sessionData } = await supabase.auth.getSession();
        debugLog("session exists", {
          hasSession: Boolean(sessionData.session),
        });
        if (!sessionData.session) {
          if (!cancelled) {
            setVerificationLinkError("Verification succeeded but we could not establish a session. Please log in.");
          }
          return;
        }

        const { data: userData, error: userError } = await supabase.auth.getUser();
        debugLog("email_confirmed_at exists", {
          hasUser: Boolean(userData?.user),
          hasEmailConfirmedAt: Boolean(userData?.user?.email_confirmed_at),
          userError: userError?.message,
        });
        if (userError || !userData?.user?.email_confirmed_at) {
          if (!cancelled) {
            setVerificationLinkError("Verification link invalid or expired. Please request a new link.");
          }
          return;
        }

        // Remove verification params so the effect doesn't rerun on refresh.
        currentUrl.searchParams.delete("code");
        currentUrl.searchParams.delete("token");
        currentUrl.searchParams.delete("token_hash");
        currentUrl.searchParams.delete("verified");
        window.history.replaceState({}, "", currentUrl.pathname + (currentUrl.search || ""));

        const verified = await checkVerificationStatus({
          manual: false,
          showSuccessToast: true,
          successToastMessage: "Email verified. Account secured.",
          successToastOnceKey: "email-verified-v2",
        });
        if (!verified && !cancelled && !redirectingRef.current) {
          setVerificationLinkError("Could not confirm verification. Please log in or request a new link.");
        }
      } catch (error) {
        if (isDev) {
          console.error("[VerifyEmail] unexpected code exchange error", error);
        }
        if (!cancelled) {
          setVerificationLinkError("Could not complete verification automatically. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setIsProcessingCodeExchange(false);
        }
      }
    };

    void runCodeExchange();

    return () => {
      cancelled = true;
    };
  }, [checkVerificationStatus, debugLog, hasCodeInUrl, isDev]);

  // Handle callback returns such as /verify-email?verified=1 from email links.
  // Retry a few times because session cookies can arrive slightly after navigation.
  useEffect(() => {
    if (hasCodeInUrl) return;
    if (redirectingRef.current) return;
    if (verificationCallbackHandledRef.current) return;
    if (searchParams.get("verified") !== "1") return;
    verificationCallbackHandledRef.current = true;

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("verified");
      window.history.replaceState({}, "", url.pathname + (url.search || ""));
    }

    let cancelled = false;
    let timeoutId: number | null = null;
    let attempt = 0;
    const maxAttempts = 5;

    const runVerificationCheck = async () => {
      if (cancelled || redirectingRef.current) return;
      attempt += 1;

      const verified = await checkVerificationStatus({
        manual: false,
        fromVerificationCallback: true,
        showSuccessToast: true,
        successToastMessage: "Email verified. Account secured.",
        successToastOnceKey: "email-verified-v1",
      });

      if (verified || cancelled || redirectingRef.current || attempt >= maxAttempts) {
        return;
      }

      timeoutId = window.setTimeout(() => {
        void runVerificationCheck();
      }, 700);
    };

    timeoutId = window.setTimeout(() => {
      void runVerificationCheck();
    }, 350);

    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [checkVerificationStatus, hasCodeInUrl, searchParams]);

  // Cross-tab verification: listen for Supabase auth events so the original
  // /verify-email tab auto-redirects when verification completes in another tab/browser.
  useEffect(() => {
    const supabase = getBrowserSupabase();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      debugLog("auth event received", { event });
      if (event !== "SIGNED_IN" && event !== "USER_UPDATED") return;
      if (redirectingRef.current) {
        debugLog("auth event ignored: already redirecting", { event });
        return;
      }
      if (checkingRef.current) {
        debugLog("auth event ignored: already checking", { event });
        return;
      }
      if (verificationSuccess) {
        debugLog("auth event ignored: already verified", { event });
        return;
      }
      debugLog("auth event triggering verification check", { event });
      setVerificationLinkError(null);
      await checkVerificationStatus({
        manual: false,
        showSuccessToast: true,
        successToastMessage: "Email verified. Account secured.",
        successToastOnceKey: "email-verified-auth-event",
      });
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [checkVerificationStatus, debugLog, verificationSuccess]);

  // Already-verified guard: redirect off /verify-email if session is already confirmed.
  // Covers arriving with a live verified session and AuthContext catching up after auth events.
  useEffect(() => {
    if (isLoading) return;
    if (!user?.email_verified) return;
    if (redirectingRef.current) return;
    redirectingRef.current = true;
    const destination = getPostVerifyRedirect(user);
    debugLog("already verified, redirecting", { destination });
    router.replace(destination);
  }, [user?.id, user?.email_verified, isLoading, getPostVerifyRedirect, router, debugLog]);

  const displayEmail = user?.email || pendingEmail;

  if (verificationSuccess) {
    return (
      <VerifyEmailShell prefersReduced={prefersReduced}>
        <VerifyEmailSuccessView isSignedIn={Boolean(user)} />
      </VerifyEmailShell>
    );
  }

  if (linkExpired) {
    return (
      <VerifyEmailShell prefersReduced={prefersReduced}>
        <VerifyEmailExpiredView
          displayEmail={displayEmail}
          isResending={isResending}
          isResendDisabled={isResendDisabled}
          resendCooldownMessage={resendCooldownMessage}
          resendRateLimitMessage={resendRateLimitMessage}
          useDifferentEmailHref={useDifferentEmailHref}
          onChooseDifferentEmail={() => {
            router.push(useDifferentEmailHref);
          }}
          onResend={() => {
            if (!displayEmail) {
              router.push(useDifferentEmailHref);
              return;
            }

            return handleResendVerification(displayEmail, {
              onSuccess: () => setLinkExpired(false),
            });
          }}
        />
      </VerifyEmailShell>
    );
  }

  if (isLoading || isProcessingCodeExchange || (hasCodeInUrl && !verificationLinkError)) {
    return (
      <VerifyEmailShell prefersReduced={prefersReduced}>
        <VerifyEmailLoadingView isVerifyingLink={isProcessingCodeExchange || hasCodeInUrl} />
      </VerifyEmailShell>
    );
  }

  if (verificationLinkError) {
    return (
      <VerifyEmailShell prefersReduced={prefersReduced}>
        <VerifyEmailErrorView
          message={verificationLinkError}
          useDifferentEmailHref={useDifferentEmailHref}
        />
      </VerifyEmailShell>
    );
  }

  if (!displayEmail && !hasCodeInUrl) {
    return (
      <VerifyEmailShell prefersReduced={prefersReduced}>
        <VerifyEmailInvalidLinkView useDifferentEmailHref={useDifferentEmailHref} />
      </VerifyEmailShell>
    );
  }

  return (
    <VerifyEmailShell prefersReduced={prefersReduced}>
      <VerifyEmailMainView
        displayEmail={displayEmail!}
        isResending={isResending}
        isResendDisabled={isResendDisabled}
        resendCooldownMessage={resendCooldownMessage}
        resendRateLimitMessage={resendRateLimitMessage}
        verificationStatusMessage={verificationStatusMessage}
        useDifferentEmailHref={useDifferentEmailHref}
        onOpenInbox={handleOpenInbox}
        onResend={() => handleResendVerification()}
      />
    </VerifyEmailShell>
  );
}
