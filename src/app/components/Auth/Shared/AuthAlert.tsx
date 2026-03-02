"use client";

import { AlertCircle, CheckCircle2, Info } from "@/app/lib/icons";

type AuthAlertTone = "error" | "warning" | "info" | "success";

interface AuthAlertProps {
  message: string;
  tone?: AuthAlertTone;
  id?: string;
  className?: string;
}

const toneClassMap: Record<AuthAlertTone, string> = {
  error: "auth-alert auth-alert-error",
  warning: "auth-alert auth-alert-warning",
  info: "auth-alert auth-alert-info",
  success: "auth-alert auth-alert-success",
};

const toneIconMap: Record<AuthAlertTone, typeof AlertCircle> = {
  error: AlertCircle,
  warning: AlertCircle,
  info: Info,
  success: CheckCircle2,
};

export function AuthAlert({ message, tone = "error", id, className = "" }: AuthAlertProps) {
  if (!message) return null;

  const Icon = toneIconMap[tone];
  const role = tone === "error" ? "alert" : "status";
  const ariaLive = tone === "error" ? "assertive" : "polite";

  return (
    <div id={id} role={role} aria-live={ariaLive} className={`${toneClassMap[tone]} ${className}`.trim()}>
      <Icon className="auth-alert-icon" aria-hidden="true" />
      <p className="auth-alert-message">{message}</p>
    </div>
  );
}

