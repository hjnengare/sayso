"use client";

export type FlashToastType = "success" | "error" | "info" | "warning" | "sage";

export interface FlashToastPayload {
  message: string;
  type: FlashToastType;
  duration: number;
  targetPath: string;
  onceKey?: string;
  expiresAt: number;
}

export const FLASH_TOAST_STORAGE_KEY = "pending-flash-toast";
export const FLASH_TOAST_TTL_MS = 60_000;

function isFlashToastPayload(value: unknown): value is FlashToastPayload {
  if (!value || typeof value !== "object") return false;

  const payload = value as Record<string, unknown>;

  return (
    typeof payload.message === "string" &&
    typeof payload.type === "string" &&
    typeof payload.duration === "number" &&
    Number.isFinite(payload.duration) &&
    typeof payload.targetPath === "string" &&
    typeof payload.expiresAt === "number" &&
    Number.isFinite(payload.expiresAt) &&
    (payload.onceKey === undefined || typeof payload.onceKey === "string")
  );
}

export function isFlashToastExpired(payload: FlashToastPayload, now = Date.now()): boolean {
  return payload.expiresAt <= now;
}

export function writeFlashToast(payload: FlashToastPayload): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(FLASH_TOAST_STORAGE_KEY, JSON.stringify(payload));
}

export function clearFlashToast(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(FLASH_TOAST_STORAGE_KEY);
}

export function readFlashToast(): FlashToastPayload | null {
  if (typeof window === "undefined") return null;

  const raw = window.sessionStorage.getItem(FLASH_TOAST_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isFlashToastPayload(parsed)) {
      clearFlashToast();
      return null;
    }

    if (isFlashToastExpired(parsed)) {
      clearFlashToast();
      return null;
    }

    return parsed;
  } catch {
    clearFlashToast();
    return null;
  }
}
