"use client";

import { useId, useState } from "react";
import { User, AlertCircle, CheckCircle } from "lucide-react";
import { AutoDismissFeedback } from "../Shared/AutoDismissFeedback";

interface UsernameInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string;
  touched: boolean;
  disabled?: boolean;
}

export function UsernameInput({
  id,
  value,
  onChange,
  onBlur,
  error,
  touched,
  disabled = false
}: UsernameInputProps) {
  const generatedId = useId().replace(/:/g, "");
  const inputId = id ?? `auth-username-${generatedId}`;
  const errorId = `${inputId}-error`;
  const successId = `${inputId}-success`;
  const hasError = touched && !!error;
  const isValid = touched && value && !error;

  const [focusKey, setFocusKey] = useState(0);

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-semibold text-white mb-2" style={{ fontFamily: '"Google Sans", -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}>
        Username
      </label>
      <div className="relative group">
        <div className={`absolute left-4 sm:left-5 top-1/2 transform -translate-y-1/2 transition-colors duration-300 z-10 ${
          hasError ? 'text-navbar-bg' :
          isValid ? 'text-sage' :
          'text-charcoal/60 group-focus-within:text-sage'
        }`}>
          {hasError ? <AlertCircle className="w-5 h-5" /> :
            isValid ? <CheckCircle className="w-5 h-5" /> :
            <User className="w-5 h-5" />}
        </div>
        <input
          id={inputId}
          name={inputId}
          type="text"
          placeholder="Choose a username"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onFocus={() => setFocusKey((k) => k + 1)}
          autoComplete="username"
          aria-invalid={hasError ? "true" : "false"}
          aria-describedby={hasError ? errorId : isValid ? successId : undefined}
          style={{ fontFamily: '"Google Sans", -apple-system, BlinkMacSystemFont, system-ui, sans-serif', fontWeight: 600 }}
          className={`w-full bg-white/95 backdrop-blur-sm border pl-12 sm:pl-14 pr-4 py-3 sm:py-4 md:py-5 text-body font-semibold text-charcoal placeholder-charcoal/50 placeholder:font-normal focus:outline-none focus:ring-2 transition-all duration-300 hover:border-sage/50 input-mobile rounded-full ${
            hasError ? 'border-navbar-bg focus:border-navbar-bg focus:ring-navbar-bg/20' :
            isValid ? 'border-sage/40 focus:border-navbar-bg focus:ring-navbar-bg/20' :
            'border-white/60 focus:ring-navbar-bg/30 focus:border-navbar-bg'
          }`}
          disabled={disabled}
        />
      </div>

      {/* Username validation feedback — auto-dismiss */}
      <AutoDismissFeedback type="error" message={hasError ? error! : null} resetKey={focusKey}>
        <p id={errorId} className="auth-field-feedback auth-field-feedback-error" role="alert">
          <AlertCircle className="w-3 h-3" aria-hidden="true" />
          {error}
        </p>
      </AutoDismissFeedback>
      <AutoDismissFeedback type="success" message={isValid ? "Username looks good." : null} resetKey={focusKey}>
        <p id={successId} className="auth-field-feedback auth-field-feedback-success" role="status">
          <CheckCircle className="w-3 h-3" aria-hidden="true" />
          Username looks good.
        </p>
      </AutoDismissFeedback>
    </div>
  );
}





