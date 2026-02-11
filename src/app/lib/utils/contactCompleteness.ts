export type ContactCompletenessCandidate = {
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  hours?: unknown;
};

const CONTACT_FIELD_WEIGHTS = {
  phone: 2,
  email: 2,
  website: 2,
  address: 1,
  hours: 1,
} as const;

export const CONTACT_COMPLETENESS_MAX_WEIGHTED_SCORE =
  CONTACT_FIELD_WEIGHTS.phone +
  CONTACT_FIELD_WEIGHTS.email +
  CONTACT_FIELD_WEIGHTS.website +
  CONTACT_FIELD_WEIGHTS.address +
  CONTACT_FIELD_WEIGHTS.hours;

function normalizeText(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export function hasValidPhone(phone: string | null | undefined): boolean {
  const value = normalizeText(phone);
  if (!value) return false;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7;
}

export function hasValidEmail(email: string | null | undefined): boolean {
  const value = normalizeText(email).toLowerCase();
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function hasValidWebsite(website: string | null | undefined): boolean {
  const raw = normalizeText(website);
  if (!raw) return false;

  const value = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    const parsed = new URL(value);
    return Boolean(parsed.hostname && parsed.hostname.includes("."));
  } catch {
    return false;
  }
}

export function hasValidAddress(address: string | null | undefined): boolean {
  const value = normalizeText(address);
  return value.length >= 5;
}

export function hasValidHours(hours: unknown): boolean {
  if (hours == null) return false;
  if (typeof hours === "string") {
    const value = hours.trim().toLowerCase();
    if (!value || value === "null" || value === "{}" || value === "[]") return false;
    return /[a-z0-9]/i.test(value);
  }
  if (Array.isArray(hours)) return hours.length > 0;
  if (typeof hours === "object") return Object.keys(hours as Record<string, unknown>).length > 0;
  return false;
}

export function calculateContactCompletenessScore(
  business: ContactCompletenessCandidate
): number {
  let score = 0;
  if (hasValidPhone(business.phone)) score += CONTACT_FIELD_WEIGHTS.phone;
  if (hasValidEmail(business.email)) score += CONTACT_FIELD_WEIGHTS.email;
  if (hasValidWebsite(business.website)) score += CONTACT_FIELD_WEIGHTS.website;
  if (hasValidAddress(business.address)) score += CONTACT_FIELD_WEIGHTS.address;
  if (hasValidHours(business.hours)) score += CONTACT_FIELD_WEIGHTS.hours;
  return score;
}

export function calculateContactCompletenessNormalizedScore(
  business: ContactCompletenessCandidate
): number {
  return calculateContactCompletenessScore(business) / CONTACT_COMPLETENESS_MAX_WEIGHTED_SCORE;
}

export function calculateContactRankingBoost(
  business: ContactCompletenessCandidate,
  maxBoost: number
): number {
  return calculateContactCompletenessNormalizedScore(business) * maxBoost;
}

export function compareContactCompletenessDesc(
  a: ContactCompletenessCandidate,
  b: ContactCompletenessCandidate
): number {
  return calculateContactCompletenessScore(b) - calculateContactCompletenessScore(a);
}

/**
 * Re-rank an already ranked list with a bounded contact-completeness lift.
 * Existing order remains the dominant signal through `baseRankWeight`.
 */
export function reRankByContactCompleteness<T extends ContactCompletenessCandidate>(
  items: T[],
  options?: { baseRankWeight?: number }
): T[] {
  if (items.length < 2) return [...items];

  const baseRankWeight = Math.max(1, Math.floor(options?.baseRankWeight ?? 6));
  const total = items.length;

  return items
    .map((item, index) => {
      const contactScore = calculateContactCompletenessScore(item);
      const baseRankSignal = (total - index) * baseRankWeight;
      return {
        item,
        index,
        contactScore,
        blendedScore: baseRankSignal + contactScore,
      };
    })
    .sort((a, b) => {
      if (b.blendedScore !== a.blendedScore) return b.blendedScore - a.blendedScore;
      if (b.contactScore !== a.contactScore) return b.contactScore - a.contactScore;
      return a.index - b.index;
    })
    .map((entry) => entry.item);
}
