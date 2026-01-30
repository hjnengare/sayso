/**
 * Business claim verification helpers.
 * Tier 1: Business email domain match (auto-verify), Phone OTP.
 * Tier 2: CIPC. Tier 3: Documents (last resort).
 */

/** Free/personal email domains that cannot auto-verify (Tier 1). */
const PERSONAL_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.za', 'outlook.com', 'hotmail.com',
  'live.com', 'icloud.com', 'me.com', 'mac.com', 'aol.com', 'mail.com', 'protonmail.com',
  'zoho.com', 'yandex.com', 'gmx.com', 'webmail.co.za', 'mweb.co.za', 'telkomsa.net',
]);

/**
 * Extract the domain from an email address (lowercase, no subdomains stripped).
 * e.g. "Info@AbcPlumbing.co.za" → "abcplumbing.co.za"
 */
export function getEmailDomain(email: string | null | undefined): string | null {
  if (!email || typeof email !== 'string') return null;
  const parts = email.trim().toLowerCase().split('@');
  return parts.length === 2 && parts[1].length > 0 ? parts[1] : null;
}

/**
 * Extract the hostname domain from a website URL (no protocol, no path, lowercase).
 * e.g. "https://www.AbcPlumbing.co.za/about" → "www.abcplumbing.co.za"
 * We compare normalized: strip "www." for comparison so www.abcplumbing.co.za matches abcplumbing.co.za.
 */
export function getWebsiteDomain(website: string | null | undefined): string | null {
  if (!website || typeof website !== 'string') return null;
  const raw = website.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0] || '';
  if (!raw) return null;
  return raw.startsWith('www.') ? raw.slice(4) : raw;
}

/**
 * Check if the business email domain matches the business website domain (Tier 1 auto-verify).
 * Free personal domains (Gmail, Yahoo, etc.) never match for auto-verify.
 */
export function businessEmailDomainMatchesWebsite(
  businessEmail: string | null | undefined,
  businessWebsite: string | null | undefined
): boolean {
  const emailDomain = getEmailDomain(businessEmail);
  const websiteDomain = getWebsiteDomain(businessWebsite);
  if (!emailDomain || !websiteDomain) return false;
  if (PERSONAL_EMAIL_DOMAINS.has(emailDomain)) return false;
  return emailDomain === websiteDomain;
}

/**
 * Whether the given email domain is a personal/free domain (cannot auto-verify).
 */
export function isPersonalEmailDomain(email: string | null | undefined): boolean {
  const domain = getEmailDomain(email);
  return domain ? PERSONAL_EMAIL_DOMAINS.has(domain) : true;
}
