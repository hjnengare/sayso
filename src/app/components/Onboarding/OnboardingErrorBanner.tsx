"use client";

import { AlertCircle } from "lucide-react";
import { AutoDismissFeedback } from "../Auth/Shared/AutoDismissFeedback";

interface OnboardingErrorBannerProps {
  error: Error | string | null;
  className?: string;
}

export default function OnboardingErrorBanner({
  error,
  className = "",
}: OnboardingErrorBannerProps) {
  const errorMessage = error
    ? error instanceof Error
      ? error.message
      : String(error)
    : null;

  return (
    <AutoDismissFeedback type="error" message={errorMessage}>
      <div className={`
        bg-red-50 border border-red-200 rounded-[12px] p-4
        flex items-start gap-3
        ${className}
      `}>
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm font-semibold text-red-600 flex-1">
          {errorMessage}
        </p>
      </div>
    </AutoDismissFeedback>
  );
}
