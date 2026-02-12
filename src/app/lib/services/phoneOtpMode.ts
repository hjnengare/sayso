export type PhoneOtpMode = 'auto' | 'twilio';

function parsePhoneOtpMode(rawMode: string): PhoneOtpMode | null {
  if (rawMode === 'auto' || rawMode === 'twilio') {
    return rawMode;
  }
  return null;
}

export function getPhoneOtpMode(): PhoneOtpMode {
  const rawMode = (process.env.PHONE_OTP_MODE ?? '').trim().toLowerCase();
  const parsedMode = parsePhoneOtpMode(rawMode);

  if (rawMode && !parsedMode) {
    console.warn(`[PHONE OTP] Unknown PHONE_OTP_MODE="${rawMode}". Falling back to safe default.`);
  }

  const fallbackMode: PhoneOtpMode = process.env.NODE_ENV === 'production' ? 'twilio' : 'auto';
  const resolvedMode = parsedMode ?? fallbackMode;

  if (process.env.NODE_ENV === 'production' && resolvedMode !== 'twilio') {
    throw new Error('[PHONE OTP] Production requires PHONE_OTP_MODE=twilio.');
  }

  return resolvedMode;
}

export function isPhoneOtpAutoMode(): boolean {
  // TEMPORARY: Auto-verify OTP until Twilio integration is complete.
  // DO NOT ENABLE IN PRODUCTION.
  return getPhoneOtpMode() === 'auto';
}

