"use client";

import { Circle, CheckCircle } from "lucide-react";

interface RegistrationProgressProps {
  usernameValid: boolean;
  emailValid: boolean;
  passwordStrong: boolean;
  consentGiven: boolean;
}

export function RegistrationProgress({
  usernameValid,
  emailValid,
  passwordStrong,
  consentGiven
}: RegistrationProgressProps) {
  const completedSteps = [usernameValid, emailValid, passwordStrong, consentGiven].filter(Boolean).length;
  const progress = (completedSteps / 4) * 100;

  return (
    <div className="space-y-4 pt-6" style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 600 }}>
      {/* Progress bar */}
      <div className="relative h-1.5 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
        <div
          className="absolute top-0 left-0 h-full rounded-full transition-all duration-500 ease-out bg-navbar-bg"
          style={{
            width: `${progress}%`,
          }}
        />
      </div>

      {/* Progress indicators */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className={`flex flex-col items-center gap-2 flex-1 transition-all duration-300 ${usernameValid ? 'scale-100' : 'scale-95 opacity-60'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
            usernameValid
              ? 'bg-gradient-to-br from-white via-white to-white/95 backdrop-blur-xl border border-white/60 ring-1 ring-white/30 shadow-sm'
              : 'bg-white/10 backdrop-blur-sm border border-white/20'
          }`}>
            {usernameValid ? <CheckCircle className="w-4 h-4 text-navbar-bg/90" /> : <Circle className="w-4 h-4 text-white/40" />}
          </div>
          <span className={`text-sm sm:text-xs font-medium transition-colors duration-300 ${usernameValid ? 'text-white' : 'text-white/50'}`} style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 600 }}>
            Username
          </span>
        </div>

        <div className={`flex flex-col items-center gap-2 flex-1 transition-all duration-300 ${emailValid ? 'scale-100' : 'scale-95 opacity-60'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
            emailValid
              ? 'bg-gradient-to-br from-white via-white to-white/95 backdrop-blur-xl border border-white/60 ring-1 ring-white/30 shadow-sm'
              : 'bg-white/10 backdrop-blur-sm border border-white/20'
          }`}>
            {emailValid ? <CheckCircle className="w-4 h-4 text-navbar-bg/90" /> : <Circle className="w-4 h-4 text-white/40" />}
          </div>
          <span className={`text-sm sm:text-xs font-medium transition-colors duration-300 ${emailValid ? 'text-white' : 'text-white/50'}`} style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 600 }}>
            Email
          </span>
        </div>

        <div className={`flex flex-col items-center gap-2 flex-1 transition-all duration-300 ${passwordStrong ? 'scale-100' : 'scale-95 opacity-60'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
            passwordStrong
              ? 'bg-gradient-to-br from-white via-white to-white/95 backdrop-blur-xl border border-white/60 ring-1 ring-white/30 shadow-sm'
              : 'bg-white/10 backdrop-blur-sm border border-white/20'
          }`}>
            {passwordStrong ? <CheckCircle className="w-4 h-4 text-navbar-bg/90" /> : <Circle className="w-4 h-4 text-white/40" />}
          </div>
          <span className={`text-sm sm:text-xs font-medium transition-colors duration-300 ${passwordStrong ? 'text-white' : 'text-white/50'}`} style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 600 }}>
            Password
          </span>
        </div>

        <div className={`flex flex-col items-center gap-2 flex-1 transition-all duration-300 ${consentGiven ? 'scale-100' : 'scale-95 opacity-60'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
            consentGiven
              ? 'bg-gradient-to-br from-white via-white to-white/95 backdrop-blur-xl border border-white/60 ring-1 ring-white/30 shadow-sm'
              : 'bg-white/10 backdrop-blur-sm border border-white/20'
          }`}>
            {consentGiven ? <CheckCircle className="w-4 h-4 text-navbar-bg/90" /> : <Circle className="w-4 h-4 text-white/40" />}
          </div>
          <span className={`text-sm sm:text-xs font-medium transition-colors duration-300 ${consentGiven ? 'text-white' : 'text-white/50'}`} style={{ fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 600 }}>
            Terms
          </span>
        </div>
      </div>
    </div>
  );
}
