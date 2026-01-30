/**
 * SMS adapter for OTP and other outbound SMS.
 * Replace with your provider (Twilio, Africa's Talking, etc.); do not hardcode secrets.
 */

const SMS_PROVIDER = process.env.SMS_PROVIDER; // e.g. 'twilio' | 'africas_talking'
const SMS_FROM = process.env.SMS_FROM; // e.g. +27... or short code

export interface SendSmsOptions {
  toE164: string;
  body: string;
}

/**
 * Send SMS. Returns true if sent (or skipped in dev), false on failure.
 * In development without a provider configured, logs and returns true so OTP flow can be tested.
 */
export async function sendSms(options: SendSmsOptions): Promise<{ success: boolean; error?: string }> {
  const { toE164, body } = options;
  if (!toE164 || !body) {
    return { success: false, error: 'Missing to or body' };
  }

  if (!SMS_PROVIDER || !SMS_FROM) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[SMS] No SMS_PROVIDER/SMS_FROM configured; skipping send. Body:', body.slice(0, 20) + '...');
      return { success: true };
    }
    return { success: false, error: 'SMS not configured' };
  }

  try {
    if (SMS_PROVIDER === 'twilio') {
      return await sendViaTwilio(toE164, body);
    }
    if (SMS_PROVIDER === 'africas_talking') {
      return await sendViaAfricasTalking(toE164, body);
    }
    console.warn('[SMS] Unknown SMS_PROVIDER:', SMS_PROVIDER);
    return { success: false, error: 'SMS provider not implemented' };
  } catch (err) {
    console.error('[SMS] Send failed:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'SMS send failed',
    };
  }
}

async function sendViaTwilio(toE164: string, body: string): Promise<{ success: boolean; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    return { success: false, error: 'Twilio not configured' };
  }
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      },
      body: new URLSearchParams({
        To: toE164,
        From: SMS_FROM,
        Body: body,
      }).toString(),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    return { success: false, error: text || res.statusText };
  }
  return { success: true };
}

async function sendViaAfricasTalking(toE164: string, body: string): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.AFRICAS_TALKING_API_KEY;
  const username = process.env.AFRICAS_TALKING_USERNAME;
  if (!apiKey || !username) {
    return { success: false, error: 'Africa\'s Talking not configured' };
  }
  const res = await fetch('https://api.africastalking.com/version1/messaging', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      apiKey,
    },
    body: new URLSearchParams({
      username,
      to: toE164,
      message: body,
    }).toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    return { success: false, error: text || res.statusText };
  }
  return { success: true };
}

/**
 * Mask phone for display (e.g. +27•••1234).
 */
export function maskPhoneE164(e164: string): string {
  if (!e164 || e164.length < 4) return '••••••••';
  return e164.slice(0, 3) + '•••' + e164.slice(-4);
}
