"use client";

import { useId, useState } from "react";
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";

interface PasswordInputProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  disabled?: boolean;
  placeholder?: string;
  showStrength?: boolean;
  strength?: {
    score: number;
    feedback: string;
    checks: {
      length: boolean;
      uppercase: boolean;
      lowercase: boolean;
      number: boolean;
    };
  };
  touched: boolean;
  error?: string;
  autoComplete?: string;
}

export function PasswordInput({
  id,
  label = "Password",
  value,
  onChange,
  onBlur,
  disabled = false,
  placeholder = "Create a strong password",
  showStrength = false,
  strength,
  touched,
  error,
  autoComplete = "current-password",
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const generatedId = useId().replace(/:/g, "");
  const inputId = id ?? `auth-password-${generatedId}`;
  const errorId = `${inputId}-error`;

  const hasError = touched && !!error;
  const isStrong = showStrength && strength && strength.score >= 3 && touched && !hasError;
  const isWeak = showStrength && strength && strength.score > 0 && strength.score < 3 && !hasError;

  // Adapt checks to support only 'length' property
  const checks = strength?.checks || { length: false };
  const lengthCheck = checks.length;
  const uppercaseCheck = 'uppercase' in checks ? checks.uppercase : false;
  const lowercaseCheck = 'lowercase' in checks ? checks.lowercase : false;
  const numberCheck = 'number' in checks ? checks.number : false;

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-semibold text-white mb-2" style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
        {label}
      </label>
      <div className="relative group">
        <div className={`absolute left-4 sm:left-5 top-1/2 transform -translate-y-1/2 transition-colors duration-300 z-10 ${
          hasError ? 'text-navbar-bg' :
          isStrong ? 'text-sage' :
          isWeak ? 'text-amber-500' :
          'text-charcoal/60 group-focus-within:text-sage'
        }`}>
          {hasError ? <AlertCircle className="w-5 h-5" /> :
            isStrong ? <CheckCircle className="w-5 h-5" /> :
            isWeak ? <AlertCircle className="w-5 h-5" /> :
            <Lock className="w-5 h-5" />}
        </div>
        <input
          id={inputId}
          name={inputId}
          type={showPassword ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          autoComplete={autoComplete}
          aria-invalid={hasError ? "true" : "false"}
          aria-describedby={hasError ? errorId : undefined}
          style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
          className={`w-full bg-white/95 backdrop-blur-sm border pl-12 sm:pl-14 pr-12 sm:pr-16 py-3 sm:py-4 md:py-5 text-body font-semibold text-charcoal placeholder-charcoal/50 placeholder:font-normal focus:outline-none focus:ring-2 transition-all duration-300 hover:border-sage/50 input-mobile rounded-full ${
            hasError ? 'border-navbar-bg focus:border-navbar-bg focus:ring-navbar-bg/20' :
            isStrong ? 'border-navbar-bg focus:border-navbar-bg focus:ring-navbar-bg/20' :
            isWeak ? 'border-amber-300 focus:border-navbar-bg focus:ring-navbar-bg/20' :
            'border-white/60 focus:ring-navbar-bg/30 focus:border-navbar-bg'
          }`}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 sm:right-5 top-1/2 transform -translate-y-1/2 text-charcoal/60 hover:text-charcoal transition-colors duration-300 p-1 z-10 rounded-full"
          disabled={disabled}
          aria-label={showPassword ? "Hide password" : "Show password"}
          aria-controls={inputId}
        >
          {showPassword ? (
            <EyeOff className="w-5 h-5" />
          ) : (
            <Eye className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Error message */}
      {hasError && error && (
        <p id={errorId} className="auth-field-feedback auth-field-feedback-error" role="alert">
          <AlertCircle className="w-3 h-3" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
