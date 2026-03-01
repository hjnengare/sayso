"use client";

import Link from "next/link";
import type { FormEvent, RefObject } from "react";
import { ArrowLeft } from "lucide-react";
import { AnimatePresence, m } from "framer-motion";

import { InlineLoader } from "../Loader/Loader";

import WavyTypedTitle from "@/app/components/Animations/WavyTypedTitle";

import { authStyles } from "./Shared/authStyles";
import { AutoDismissFeedback } from "./Shared/AutoDismissFeedback";
import { EmailInput } from "./Shared/EmailInput";
import { PasswordInput } from "./Shared/PasswordInput";
import { SocialLoginButtons } from "./Shared/SocialLoginButtons";
import { UsernameInput } from "./Register/UsernameInput";
import { RegistrationProgress } from "./Register/RegistrationProgress";
import { usePasswordStrength } from "./Register/usePasswordStrength";

type AccountType = "personal" | "business";
type AuthMode = "login" | "register";

type MotionVariants = {
  initial: boolean | { opacity: number; y: number };
  animate: { opacity: number; y: number };
  exit: { opacity: number; y: number };
};

type AuthPageViewProps = {
  containerRef: RefObject<HTMLDivElement | null>;
  prefersReduced: boolean;
  title: string;
  subtitle: string;
  accountType: AccountType;
  authMode: AuthMode;
  existingAccountError: boolean;
  existingAccountLabel: string;
  motionVariants: MotionVariants;
  error: string;
  isOnline: boolean;
  isRegisterMode: boolean;
  isBusiness: boolean;
  isFormDisabled: boolean;
  isSubmitDisabled: boolean;
  personalUsername: string;
  businessUsername: string;
  usernameTouched: boolean;
  usernameError: string;
  email: string;
  emailTouched: boolean;
  emailError: string;
  password: string;
  passwordTouched: boolean;
  passwordError?: string;
  passwordStrength: ReturnType<typeof usePasswordStrength>;
  consent: boolean;
  onSetAccountType: (value: AccountType) => void;
  onSetAuthMode: (value: AuthMode) => void;
  onSwitchToLogin: () => void;
  onTryDifferentEmail: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onPersonalUsernameChange: (value: string) => void;
  onBusinessUsernameChange: (value: string) => void;
  onUsernameBlur: () => void;
  onEmailChange: (value: string) => void;
  onEmailBlur: () => void;
  onPasswordChange: (value: string) => void;
  onPasswordBlur: () => void;
  onConsentChange: (checked: boolean) => void;
};

export function AuthPageView({
  containerRef,
  prefersReduced,
  title,
  subtitle,
  accountType,
  authMode,
  existingAccountError,
  existingAccountLabel,
  motionVariants,
  error,
  isOnline,
  isRegisterMode,
  isBusiness,
  isFormDisabled,
  isSubmitDisabled,
  personalUsername,
  businessUsername,
  usernameTouched,
  usernameError,
  email,
  emailTouched,
  emailError,
  password,
  passwordTouched,
  passwordError,
  passwordStrength,
  consent,
  onSetAccountType,
  onSetAuthMode,
  onSwitchToLogin,
  onTryDifferentEmail,
  onSubmit,
  onPersonalUsernameChange,
  onBusinessUsernameChange,
  onUsernameBlur,
  onEmailChange,
  onEmailBlur,
  onPasswordChange,
  onPasswordBlur,
  onConsentChange,
}: AuthPageViewProps) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: authStyles }} />
      <div
        ref={containerRef}
        data-reduced={prefersReduced}
        className="bg-off-white flex flex-col relative safe-area-full"
        style={{ paddingBottom: "max(0px, env(safe-area-inset-bottom))" }}
      >
        <div className="floating-orb floating-orb-1" aria-hidden="true" />
        <div className="floating-orb floating-orb-2" aria-hidden="true" />
        <div className="floating-orb floating-orb-3" aria-hidden="true" />
        <div className="floating-orb floating-orb-4" aria-hidden="true" />
        <div className="floating-orb floating-orb-5" aria-hidden="true" />
        <div className="floating-orb floating-orb-6" aria-hidden="true" />

        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 animate-slide-in-left animate-delay-200">
          <Link
            href="/onboarding"
            className="text-charcoal hover:text-charcoal/80 transition-colors duration-300 p-2 hover:bg-off-white/50 rounded-lg block backdrop-blur-sm"
          >
            <ArrowLeft className="w-6 h-6" strokeWidth={2.5} />
          </Link>
        </div>

        <div className="text-center mb-4 pt-16 sm:pt-20">
          <div className="inline-block relative mb-4 animate-fade-in-up animate-delay-400">
            <WavyTypedTitle
              text={title}
              as="h2"
              className="text-3xl md:text-4xl font-semibold mb-2 text-center leading-[1.2] px-2 tracking-tight text-charcoal"
              typingSpeedMs={40}
              startDelayMs={300}
              waveVariant="subtle"
              loopWave={false}
              triggerOnTypingComplete={true}
              enableScrollTrigger={false}
              disableWave={true}
              style={{
                fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                fontWeight: 700,
              }}
            />
          </div>

          <p
            className="text-body font-normal text-charcoal/70 mb-4 leading-[1.55] px-2 max-w-[70ch] mx-auto animate-fade-in-up animate-delay-700"
            style={{
              fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
              fontWeight: 400,
            }}
          >
            {subtitle}
          </p>
        </div>

        <div className="flex justify-center px-4">
          <div className="inline-flex rounded-full bg-white/70 shadow-sm p-1">
            <button
              type="button"
              onClick={() => onSetAccountType("personal")}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                accountType === "personal" ? "bg-navbar-bg/90 text-white shadow-md" : "text-charcoal/70 hover:text-charcoal"
              }`}
              style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
            >
              Personal Account
            </button>
            <button
              type="button"
              onClick={() => onSetAccountType("business")}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                accountType === "business" ? "bg-navbar-bg/90 text-white shadow-md" : "text-charcoal/70 hover:text-charcoal"
              }`}
              style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
            >
              Business Account
            </button>
          </div>
        </div>

        <div className="w-full mx-auto max-w-[2000px] flex-1 flex flex-col justify-center py-8 sm:py-12 px-0 lg:px-10 2xl:px-16">
          <div className="w-full sm:max-w-md lg:max-w-lg xl:max-w-xl sm:mx-auto relative z-10">
            <section data-section>
              <m.div
                layout
                className="relative bg-gradient-to-br from-card-bg via-card-bg to-card-bg/95 rounded-[12px] overflow-hidden backdrop-blur-md shadow-md px-2 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10 lg:px-12 lg:py-10 xl:px-16 xl:py-12"
              >
                <div className="flex items-center justify-center pb-6">
                  <div className="inline-flex rounded-full bg-white/15 p-1">
                    <button
                      type="button"
                      onClick={() => onSetAuthMode("register")}
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                        authMode === "register" ? "bg-white text-charcoal shadow-sm" : "text-white/70 hover:text-white"
                      }`}
                      style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
                    >
                      Register
                    </button>
                    <button
                      type="button"
                      onClick={() => onSetAuthMode("login")}
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                        authMode === "login" ? "bg-white text-charcoal shadow-sm" : "text-white/70 hover:text-white"
                      }`}
                      style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
                    >
                      Login
                    </button>
                  </div>
                </div>

                {existingAccountError ? (
                  <div className="space-y-6 text-center relative z-10">
                    <div className="bg-off-white border border-blue-200 rounded-[12px] p-6">
                      <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
                      >
                        Account Already Exists
                      </h3>

                      <p
                        className="text-blue-700 mb-6"
                        style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
                      >
                        Email already registered for a {existingAccountLabel} account. Log in or use a different email.
                      </p>

                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={onSwitchToLogin}
                          className="inline-flex items-center justify-center w-full px-6 py-3 bg-blue-600 text-white text-body font-semibold rounded-full hover:bg-blue-700 transition-all duration-300"
                          style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
                        >
                          Switch to Login
                        </button>

                        <button
                          type="button"
                          onClick={onTryDifferentEmail}
                          className="inline-flex items-center justify-center w-full px-6 py-3 bg-gray-100 text-gray-700 text-body font-semibold rounded-full hover:bg-gray-200 transition-all duration-300"
                          style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
                        >
                          Try Different Email
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <AnimatePresence mode="wait">
                    <m.div
                      key={`${accountType}-${authMode}`}
                      {...motionVariants}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                    >
                      <form onSubmit={onSubmit} className="space-y-4 relative z-10">
                        <AutoDismissFeedback type="error" message={error || null}>
                          <div className="bg-off-white border border-error-100 rounded-[12px] p-4 text-center">
                            <p
                              className="text-caption font-semibold text-error-600"
                              style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
                            >
                              {error}
                            </p>
                          </div>
                        </AutoDismissFeedback>

                        <AutoDismissFeedback type="error" message={!isOnline && !error && isRegisterMode ? "offline" : null}>
                          <div className="bg-off-white border border-orange-200 rounded-[12px] p-4 text-center">
                            <p
                              className="text-caption font-semibold text-orange-600"
                              style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
                            >
                              You&apos;re offline. We&apos;ll try again when you&apos;re back online.
                            </p>
                          </div>
                        </AutoDismissFeedback>

                        {isRegisterMode && (
                          <>
                            {isBusiness ? (
                              <>
                                <UsernameInput
                                  value={businessUsername}
                                  onChange={onBusinessUsernameChange}
                                  onBlur={onUsernameBlur}
                                  error={usernameError}
                                  touched={usernameTouched}
                                  disabled={isFormDisabled}
                                />
                                <p
                                  className="text-xs text-white/80 mt-1"
                                  style={{ fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}
                                >
                                  This is your account username.
                                </p>
                              </>
                            ) : (
                              <UsernameInput
                                value={personalUsername}
                                onChange={onPersonalUsernameChange}
                                onBlur={onUsernameBlur}
                                error={usernameError}
                                touched={usernameTouched}
                                disabled={isFormDisabled}
                              />
                            )}
                          </>
                        )}

                        <EmailInput
                          value={email}
                          onChange={onEmailChange}
                          onBlur={onEmailBlur}
                          error={emailError}
                          touched={emailTouched}
                          disabled={isFormDisabled}
                          placeholder={isBusiness ? "business@company.com" : "you@example.com"}
                          label={isBusiness ? "Business Email" : "Email"}
                        />

                        <PasswordInput
                          value={password}
                          onChange={onPasswordChange}
                          onBlur={onPasswordBlur}
                          disabled={isFormDisabled}
                          showStrength={isRegisterMode}
                          strength={passwordStrength}
                          touched={passwordTouched}
                          error={!isRegisterMode ? passwordError : undefined}
                          placeholder={isRegisterMode ? "Create a password" : "Enter your password"}
                        />

                        {!isRegisterMode && (
                          <div className="text-right">
                            <Link
                              href="/forgot-password"
                              className="text-body-sm text-white hover:text-coral transition-colors duration-300 font-medium"
                              style={{
                                fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                fontWeight: 600,
                              }}
                            >
                              Forgot password?
                            </Link>
                          </div>
                        )}

                        {isRegisterMode && (
                          <div className="pt-2">
                            <label
                              className="flex items-start gap-3 text-body-sm text-white cursor-pointer"
                              style={{
                                fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                fontWeight: 400,
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={consent}
                                onChange={(event) => onConsentChange(event.target.checked)}
                                className="mt-1 w-4 h-4 border-white/40 bg-white/20 text-sage focus:ring-sage/30 focus:ring-offset-0 rounded"
                              />
                              <span className="flex-1 leading-relaxed">
                                I agree to the{" "}
                                <Link
                                  href="/terms"
                                  className="underline text-white hover:text-coral transition-colors font-semibold decoration-white/50"
                                >
                                  Terms of Use
                                </Link>{" "}
                                and{" "}
                                <Link
                                  href="/privacy"
                                  className="underline text-white hover:text-coral transition-colors font-semibold decoration-white/50"
                                >
                                  Privacy Policy
                                </Link>
                              </span>
                            </label>
                          </div>
                        )}

                        <div className="pt-4 flex flex-col items-center gap-2">
                          <button
                            type="submit"
                            disabled={isSubmitDisabled}
                            style={{
                              fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                              fontWeight: 600,
                            }}
                            className="w-full bg-gradient-to-r from-coral to-coral/80 text-white text-body font-semibold py-4 px-2 rounded-full hover:from-coral/90 hover:to-coral transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 btn-target btn-press"
                          >
                            {isFormDisabled ? (
                              <>
                                <InlineLoader size="xs" variant="wavy" color="white" />
                                {isRegisterMode ? "Creating account..." : "Signing in..."}
                              </>
                            ) : isRegisterMode ? (
                              isBusiness ? "Create business account" : "Create account"
                            ) : (
                              "Sign in"
                            )}
                          </button>
                        </div>

                        {isRegisterMode && !isBusiness && (
                          <RegistrationProgress
                            usernameValid={!!personalUsername && !usernameError}
                            emailValid={!!email && !emailError}
                            passwordStrong={passwordStrength.score >= 3}
                            consentGiven={consent}
                          />
                        )}

                        {!isBusiness && <SocialLoginButtons accountType="user" />}
                      </form>

                      <div className="text-center mt-6 pt-6 border-t border-white/20">
                        <div
                          className="text-body-sm sm:text-body text-white"
                          style={{
                            fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                            fontWeight: 400,
                          }}
                        >
                          {authMode === "register" ? "Already have an account?" : "Don't have an account?"}{" "}
                          <button
                            type="button"
                            onClick={() => onSetAuthMode(authMode === "register" ? "login" : "register")}
                            className="text-white font-semibold hover:text-coral transition-colors duration-300 relative group"
                            style={{
                              fontFamily: "Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                              fontWeight: 600,
                            }}
                          >
                            {authMode === "register" ? "Log in" : "Sign up"}
                          </button>
                        </div>
                      </div>
                    </m.div>
                  </AnimatePresence>
                )}
              </m.div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
