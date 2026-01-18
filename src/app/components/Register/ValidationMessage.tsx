"use client";

import { AlertCircle, CheckCircle } from "lucide-react";

interface ValidationMessageProps {
  error: string;
  isValid: boolean;
  touched: boolean;
  value: string;
  successMessage?: string;
}

export default function ValidationMessage({ 
  error, 
  isValid, 
  touched, 
  value, 
  successMessage = "Looks good!" 
}: ValidationMessageProps) {
  if (error) {
    return (
      <p className="text-sm sm:text-xs text-orange-600 flex items-center gap-1 mt-1" role="alert">
        <AlertCircle className="w-3 h-3" />
        {error}
      </p>
    );
  }

  if (value && isValid && touched) {
    return (
      <p className="text-sm sm:text-xs text-coral flex items-center gap-1 mt-1" role="status">
        <CheckCircle className="w-3 h-3" />
        {successMessage}
      </p>
    );
  }

  return null;
}
