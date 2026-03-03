import {
  clearFlashToast,
  FLASH_TOAST_STORAGE_KEY,
  isFlashToastExpired,
  readFlashToast,
  writeFlashToast,
  type FlashToastPayload,
} from "./flashToast";

describe("flashToast storage helpers", () => {
  const payload: FlashToastPayload = {
    message: "Email verified. Account secured.",
    type: "sage",
    duration: 3000,
    targetPath: "/profile",
    onceKey: "email-verified-redirect-success",
    expiresAt: Date.now() + 60_000,
  };

  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("writes and reads a valid flash toast payload", () => {
    writeFlashToast(payload);

    expect(readFlashToast()).toEqual(payload);
  });

  it("clears malformed payloads", () => {
    window.sessionStorage.setItem(FLASH_TOAST_STORAGE_KEY, "{not-json");

    expect(readFlashToast()).toBeNull();
    expect(window.sessionStorage.getItem(FLASH_TOAST_STORAGE_KEY)).toBeNull();
  });

  it("treats expired payloads as invalid and clears them", () => {
    writeFlashToast({
      ...payload,
      expiresAt: Date.now() - 1,
    });

    expect(readFlashToast()).toBeNull();
    expect(window.sessionStorage.getItem(FLASH_TOAST_STORAGE_KEY)).toBeNull();
  });

  it("preserves targetPath, duration, and onceKey", () => {
    writeFlashToast(payload);
    const stored = readFlashToast();

    expect(stored?.targetPath).toBe("/profile");
    expect(stored?.duration).toBe(3000);
    expect(stored?.onceKey).toBe("email-verified-redirect-success");
    expect(isFlashToastExpired(stored!)).toBe(false);
  });

  it("clears the pending flash toast entry", () => {
    writeFlashToast(payload);

    clearFlashToast();

    expect(window.sessionStorage.getItem(FLASH_TOAST_STORAGE_KEY)).toBeNull();
  });
});
