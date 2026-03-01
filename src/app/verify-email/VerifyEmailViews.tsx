"use client";

import Link from "next/link";
import { Urbanist } from "next/font/google";
import { AlertCircle, ArrowLeft, CheckCircle, ExternalLink, Mail } from "lucide-react";
import type { ReactNode } from "react";

import { Loader as AppLoader } from "../components/Loader";
import WavyTypedTitle from "../components/Animations/WavyTypedTitle";

import { verifyEmailStyles } from "./verifyEmailStyles";

const urbanist = Urbanist({
  weight: ["400", "600", "700", "800"],
  subsets: ["latin"],
  display: "swap",
});

const FONT_STYLE = {
  fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
} as const;

type VerifyEmailShellProps = {
  children: ReactNode;
  prefersReduced: boolean;
};

type VerifyEmailResendViewProps = {
  isResending: boolean;
  isResendDisabled: boolean;
  resendCooldownMessage: string | null;
  resendRateLimitMessage: string | null;
  useDifferentEmailHref: string;
  onResend: () => Promise<void> | void;
};

type VerifyEmailMainViewProps = VerifyEmailResendViewProps & {
  displayEmail: string;
  verificationStatusMessage: string | null;
  onOpenInbox: () => void;
};

type VerifyEmailExpiredViewProps = VerifyEmailResendViewProps & {
  displayEmail: string | null;
  onChooseDifferentEmail: () => void;
};

export function VerifyEmailShell({ children, prefersReduced }: VerifyEmailShellProps) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: verifyEmailStyles }} />
      <div
        data-reduced={prefersReduced}
        className="h-[100dvh] bg-off-white flex flex-col relative overflow-x-hidden overflow-y-auto ios-inertia hide-scrollbar safe-area-full touch-pan-y"
        style={{ overscrollBehaviorY: "contain" }}
      >
        {children}
      </div>
    </>
  );
}

export function VerifyEmailSuccessView({ isSignedIn }: { isSignedIn: boolean }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="w-20 h-20 mx-auto mb-6 bg-card-bg/20 rounded-full flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-sage" />
        </div>
        <h2 className="text-2xl font-bold text-charcoal mb-3" style={FONT_STYLE}>
          Email Verified!
        </h2>
        <p className="text-base text-charcoal/70 mb-6" style={FONT_STYLE}>
          {isSignedIn ? "Redirecting you to continue setup..." : "Your email has been verified. Redirecting to login..."}
        </p>
        <div className="w-8 h-8 border-3 border-sage/20 border-t-sage rounded-full animate-spin mx-auto" />
      </div>
    </div>
  );
}

export function VerifyEmailExpiredView({
  displayEmail,
  isResending,
  isResendDisabled,
  resendCooldownMessage,
  resendRateLimitMessage,
  useDifferentEmailHref,
  onResend,
  onChooseDifferentEmail,
}: VerifyEmailExpiredViewProps) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="w-20 h-20 mx-auto mb-6 bg-coral/10 rounded-full flex items-center justify-center">
          <AlertCircle className="w-10 h-10 text-coral" />
        </div>
        <h2 className="text-2xl font-bold text-charcoal mb-3" style={FONT_STYLE}>
          Verification Link Expired
        </h2>
        <p className="text-base text-charcoal/70 mb-6 leading-relaxed" style={FONT_STYLE}>
          {displayEmail ? (
            <>
              The verification link for <strong className="text-charcoal">{displayEmail}</strong> has expired. Request a
              new one below.
            </>
          ) : (
            "Your verification link has expired. Request a new one below."
          )}
        </p>

        <div className="space-y-3">
          <button
            onClick={() => void onResend()}
            onKeyDown={(event) => {
              if (event.key === "Enter" && isResendDisabled) {
                event.preventDefault();
              }
            }}
            disabled={isResendDisabled || !displayEmail}
            className="w-full bg-gradient-to-r from-coral to-coral/80 text-white text-base font-600 py-4 px-4 rounded-full hover:from-coral/90 hover:to-coral transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 btn-target btn-press"
          >
            {isResending ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="w-5 h-5" />
                Resend Verification Email
              </>
            )}
          </button>
          {(resendCooldownMessage || resendRateLimitMessage) && (
            <div className="rounded-lg border border-sage/20 bg-card-bg/5 px-4 py-3">
              <p className="text-sm text-charcoal/80" style={FONT_STYLE}>
                {resendRateLimitMessage || resendCooldownMessage}
              </p>
            </div>
          )}
          {resendRateLimitMessage && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Link
                href={useDifferentEmailHref}
                className="w-full text-center text-sm text-charcoal/80 hover:text-charcoal transition-colors duration-300 py-2.5 border border-charcoal/15 rounded-lg"
              >
                Use a different email
              </Link>
              <Link
                href="/login"
                className="w-full text-center text-sm text-charcoal/80 hover:text-charcoal transition-colors duration-300 py-2.5 border border-charcoal/15 rounded-lg"
              >
                Go to login
              </Link>
            </div>
          )}
          {!displayEmail && (
            <button
              type="button"
              onClick={onChooseDifferentEmail}
              className="block w-full text-center text-base text-charcoal/60 hover:text-charcoal transition-colors duration-300 py-3"
            >
              Use a different email
            </button>
          )}
          <Link
            href="/login"
            className="block w-full text-center text-base text-charcoal/60 hover:text-charcoal transition-colors duration-300 py-3"
          >
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}

export function VerifyEmailLoadingView({ isVerifyingLink }: { isVerifyingLink: boolean }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-6 space-y-3">
        <AppLoader size="lg" variant="wavy" color="sage" />
        {isVerifyingLink && <p className="text-sm text-charcoal/70">Verifying your link and signing you in...</p>}
      </div>
    </div>
  );
}

export function VerifyEmailErrorView({
  message,
  useDifferentEmailHref,
}: {
  message: string;
  useDifferentEmailHref: string;
}) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-6 space-y-4">
        <p className="text-lg text-charcoal">{message}</p>
        <Link href={useDifferentEmailHref} className="text-sage hover:text-sage/80 underline">
          Go to registration
        </Link>
        <div>
          <Link href="/login" className="text-charcoal/70 hover:text-charcoal underline">
            Go to login
          </Link>
        </div>
      </div>
    </div>
  );
}

export function VerifyEmailInvalidLinkView({ useDifferentEmailHref }: { useDifferentEmailHref: string }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-6 space-y-4">
        <p className="text-lg text-charcoal">Verification link invalid or expired.</p>
        <Link href={useDifferentEmailHref} className="text-sage hover:text-sage/80 underline">
          Go to registration
        </Link>
      </div>
    </div>
  );
}

export function VerifyEmailMainView({
  displayEmail,
  isResending,
  isResendDisabled,
  resendCooldownMessage,
  resendRateLimitMessage,
  verificationStatusMessage,
  useDifferentEmailHref,
  onOpenInbox,
  onResend,
}: VerifyEmailMainViewProps) {
  return (
    <>
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 animate-slide-in-left animate-delay-200">
        <Link
          href="/home"
          className="text-charcoal hover:text-charcoal/80 transition-colors duration-300 p-2 hover:bg-off-white/50 rounded-lg block backdrop-blur-sm"
        >
          <ArrowLeft className="w-6 h-6" strokeWidth={2.5} />
        </Link>
      </div>

      <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg mx-auto relative z-10 flex-1 flex flex-col justify-center py-8 sm:py-12">
        <div className="text-center mb-4 pt-16 sm:pt-20">
          <div className="inline-block relative mb-4 animate-fade-in-up animate-delay-400">
            <WavyTypedTitle
              text="Check Your Email"
              as="h2"
              className={`${urbanist.className} text-3xl md:text-4xl font-semibold mb-2 text-center leading-[1.2] px-2 tracking-tight text-charcoal`}
              typingSpeedMs={40}
              startDelayMs={300}
              waveVariant="subtle"
              loopWave={false}
              style={{ fontFamily: urbanist.style.fontFamily }}
            />
          </div>
          <p className="text-body font-normal text-charcoal/70 mb-4 leading-[1.55] px-2 max-w-[70ch] mx-auto animate-fade-in-up animate-delay-700" style={FONT_STYLE}>
            We&apos;ve sent a confirmation email to verify your account and unlock full features!
          </p>
        </div>

        <div className="bg-card-bg rounded-lg p-5 sm:p-7 md:p-9 mb-4 relative overflow-hidden shadow-md transition-shadow duration-300 animate-scale-in">
          <div className="text-center mb-6">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center">
              <Mail className="w-10 h-10 text-charcoal" />
            </div>

            <button
              onClick={onOpenInbox}
              className="bg-navbar-bg rounded-full p-4 mb-6 border-0 w-full hover:bg-navbar-bg transition-all duration-300 cursor-pointer group"
            >
              <p className="text-lg font-600 text-white group-hover:text-white transition-colors duration-300 flex items-center justify-center gap-2" style={FONT_STYLE}>
                {displayEmail}
                <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </p>
            </button>
          </div>

          <div className="text-center mb-8">
            <p className="text-sm text-charcoal/70 mb-6 leading-relaxed" style={FONT_STYLE}>
              Please check your email and click the verification link to activate your account. The link will
              automatically redirect you back to the app once verified.
            </p>

            <div className="bg-gradient-to-r from-sage/5 to-coral/5 rounded-lg p-6 mb-6 text-left border border-sage/10">
              <h3 className="text-base font-600 text-charcoal mb-4 flex items-center gap-2" style={FONT_STYLE}>
                <CheckCircle className="w-5 h-5 text-sage" />
                Why verify your email?
              </h3>
              <ul className="text-sm text-charcoal/80 space-y-2 list-disc pl-5" style={FONT_STYLE}>
                <li>Unlock full app features (posting, saving, leaderboards)</li>
                <li>Secure account recovery and password resets</li>
                <li>Receive important updates and notifications</li>
                <li>Build trust within the community</li>
              </ul>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <button
              onClick={() => void onResend()}
              onKeyDown={(event) => {
                if (event.key === "Enter" && isResendDisabled) {
                  event.preventDefault();
                }
              }}
              disabled={isResendDisabled}
              className="w-full bg-gradient-to-r from-coral to-coral/80 text-white text-sm font-600 py-4 px-4 rounded-full hover:from-coral/90 hover:to-coral transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 btn-target btn-press"
            >
              {isResending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Resend Verification Email
                </>
              )}
            </button>
            {(resendCooldownMessage || resendRateLimitMessage) && (
              <div className="rounded-lg border border-sage/20 bg-card-bg/5 px-4 py-3">
                <p className="text-sm text-charcoal/80" style={FONT_STYLE}>
                  {resendRateLimitMessage || resendCooldownMessage}
                </p>
              </div>
            )}
            {resendRateLimitMessage && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Link
                  href={useDifferentEmailHref}
                  className="w-full text-center text-sm text-charcoal/80 hover:text-charcoal transition-colors duration-300 py-2.5 border border-charcoal/15 rounded-lg"
                >
                  Use a different email
                </Link>
                <Link
                  href="/login"
                  className="w-full text-center text-sm text-charcoal/80 hover:text-charcoal transition-colors duration-300 py-2.5 border border-charcoal/15 rounded-lg"
                >
                  Go to login
                </Link>
              </div>
            )}
          </div>

          {verificationStatusMessage && (
            <div className="mb-5 rounded-lg border border-coral/20 bg-coral/5 px-4 py-3">
              <p className="text-sm text-charcoal/80" style={FONT_STYLE}>
                {verificationStatusMessage}
              </p>
            </div>
          )}

          <p className="text-xs text-charcoal/70 text-center">
            Didn&apos;t receive the email? Check your spam folder or try resending.
          </p>
          <div className="text-center mt-4">
            <Link
              href="/login"
              className="text-xs text-charcoal/60 hover:text-charcoal/80 transition-colors duration-300 underline"
            >
              I&apos;ve verified my email
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
