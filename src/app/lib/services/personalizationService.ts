/**
 * Personalization Service (Zero-Stats / For You)
 *
 * For You feed on a platform with no engagement data: no reviews, views, clicks.
 * Scoring uses only user-declared preferences and business quality signals.
 *
 * Data sources:
 * - User: user_interests (categories), user_subcategories (strongest), user_dealbreakers (hard filters)
 * - Business: category/subcategory, verified, badge, has image, description completeness
 *
 * Formula:
 * score = subcategory_match (+5) + category_match (+2) + verified (+1) + badge (+1)
 *        + has_image (+0.5) + has_description (+0.5)
 * Dealbreakers are hard filters (exclude), not score penalties.
 */

export interface BusinessForScoring {
  id: string;
  primary_category_slug?: string | null;
  primary_subcategory_slug?: string | null;
  interest_id?: string | null;
  sub_interest_id?: string | null;
  category?: string;
  price_range?: string;
  description?: string | null;
  verified?: boolean;
  badge?: string | null;
  image_url?: string | null;
  uploaded_images?: string[] | null;
  /** Legacy / other callers; not used for zero-stats scoring */
  average_rating?: number;
  total_reviews?: number;
  distance_km?: number | null;
  percentiles?: Record<string, number> | null;
  created_at?: string;
  updated_at?: string;
}

export interface UserPreferences {
  interestIds: string[];
  subcategoryIds: string[];
  dealbreakerIds: string[];
  latitude?: number | null;
  longitude?: number | null;
}

export interface PersonalizationScore {
  totalScore: number;
  breakdown: {
    subcategoryMatch: number;
    categoryMatch: number;
    verifiedScore: number;
    badgeScore: number;
    hasImageScore: number;
    hasDescriptionScore: number;
    dealbreakerPenalty: number;
  };
  insights: string[];
}

/** Weights for zero-stats For You (no reviews, no views, no clicks). */
const WEIGHT_SUBCATEGORY = 5;
const WEIGHT_CATEGORY = 2;
const WEIGHT_VERIFIED = 1;
const WEIGHT_BADGE = 1;
const WEIGHT_HAS_IMAGE = 0.5;
const WEIGHT_HAS_DESCRIPTION = 0.5;

/**
 * Deal breaker rules — hard filters. On a zero-stats platform we do not use
 * review-derived percentiles for scoring; rules that need percentiles pass when data is missing.
 */
const DEALBREAKER_RULES: Record<string, (business: BusinessForScoring) => boolean> = {
  trustworthiness: (business) => business.verified !== false,
  punctuality: (business) => {
    const score = business.percentiles?.punctuality;
    if (score == null) return true; // No stats: allow
    return score >= 70;
  },
  friendliness: (business) => {
    const score = business.percentiles?.friendliness;
    if (score == null) return true;
    return score >= 65;
  },
  'value-for-money': (business) => {
    if (business.price_range) {
      return business.price_range === '$' || business.price_range === '$$';
    }
    const score = business.percentiles?.['cost-effectiveness'];
    if (score == null) return true;
    return score >= 75;
  },
  expensive: (business) =>
    business.price_range !== '$$$$' && business.price_range !== '$$$',
  'slow-service': (business) => {
    const score = business.percentiles?.punctuality;
    if (score == null) return true;
    return score >= 60;
  },
  'no-parking': () => true,
  'cash-only': () => true,
  'bad-hygiene': () => true,
};

function resolveCategoryId(b: BusinessForScoring): string | null | undefined {
  return b.primary_category_slug ?? b.interest_id ?? null;
}

function resolveSubcategoryId(b: BusinessForScoring): string | null | undefined {
  return b.primary_subcategory_slug ?? b.sub_interest_id ?? null;
}

function hasRealImage(b: BusinessForScoring): boolean {
  if (b.image_url && b.image_url.trim() !== '') return true;
  const imgs = b.uploaded_images;
  return Array.isArray(imgs) && imgs.length > 0;
}

function hasDescription(b: BusinessForScoring): boolean {
  const d = b.description;
  return typeof d === 'string' && d.trim().length > 0;
}

function calculateSubcategoryMatch(
  business: BusinessForScoring,
  userSubcategoryIds: string[]
): number {
  if (userSubcategoryIds.length === 0) return 0;
  const id = resolveSubcategoryId(business);
  if (!id) return 0;
  return userSubcategoryIds.includes(id) ? WEIGHT_SUBCATEGORY : 0;
}

function calculateCategoryMatch(
  business: BusinessForScoring,
  userInterestIds: string[]
): number {
  if (userInterestIds.length === 0) return 0;
  const id = resolveCategoryId(business);
  if (!id) return 0;
  return userInterestIds.includes(id) ? WEIGHT_CATEGORY : 0;
}

function calculateDealbreakerPenalty(
  business: BusinessForScoring,
  userDealbreakerIds: string[]
): number {
  if (userDealbreakerIds.length === 0) return 0;
  let penalty = 0;
  for (const dealbreakerId of userDealbreakerIds) {
    const rule = DEALBREAKER_RULES[dealbreakerId];
    if (rule) {
      try {
        if (!rule(business)) penalty -= 50;
      } catch {
        // ignore
      }
    }
  }
  return penalty;
}

function generateInsights(
  business: BusinessForScoring,
  userPreferences: UserPreferences
): string[] {
  const insights: string[] = [];
  const categoryId = resolveCategoryId(business);
  const subcategoryId = resolveSubcategoryId(business);
  const categoryLabel = business.category ?? business.primary_subcategory_slug ?? 'this category';

  if (categoryId && userPreferences.interestIds.includes(categoryId)) {
    insights.push(`Matches your interest in ${categoryLabel}`);
  }
  if (subcategoryId && userPreferences.subcategoryIds.includes(subcategoryId)) {
    insights.push(`Perfect match for your preferred ${categoryLabel}`);
  }
  if (business.price_range === '$' || business.price_range === '$$') {
    insights.push(`Great value for money`);
  }
  if (business.verified) {
    insights.push(`Verified business`);
  }

  const violations: string[] = [];
  for (const dealbreakerId of userPreferences.dealbreakerIds) {
    const rule = DEALBREAKER_RULES[dealbreakerId];
    if (rule) {
      try {
        if (!rule(business)) violations.push(dealbreakerId);
      } catch {
        // ignore
      }
    }
  }
  if (violations.length > 0) {
    insights.push(`May not match your preferences: ${violations.join(', ')}`);
  }

  return insights;
}

/**
 * Calculate personalization score for For You (zero-stats).
 * Only uses: subcategory match, category match, verified, badge, has image, has description.
 * Dealbreaker penalty is applied so that violators get a large negative score (still filtered elsewhere).
 */
export function calculatePersonalizationScore(
  business: BusinessForScoring,
  userPreferences: UserPreferences
): PersonalizationScore {
  const subcategoryMatch = calculateSubcategoryMatch(business, userPreferences.subcategoryIds);
  const categoryMatch = calculateCategoryMatch(business, userPreferences.interestIds);
  const dealbreakerPenalty = calculateDealbreakerPenalty(business, userPreferences.dealbreakerIds);
  const verifiedScore = business.verified ? WEIGHT_VERIFIED : 0;
  const badgeScore =
    business.badge != null && String(business.badge).trim() !== '' ? WEIGHT_BADGE : 0;
  const hasImageScore = hasRealImage(business) ? WEIGHT_HAS_IMAGE : 0;
  const hasDescriptionScore = hasDescription(business) ? WEIGHT_HAS_DESCRIPTION : 0;

  const totalScore =
    subcategoryMatch +
    categoryMatch +
    verifiedScore +
    badgeScore +
    hasImageScore +
    hasDescriptionScore +
    dealbreakerPenalty;

  return {
    totalScore,
    breakdown: {
      subcategoryMatch,
      categoryMatch,
      verifiedScore,
      badgeScore,
      hasImageScore,
      hasDescriptionScore,
      dealbreakerPenalty,
    },
    insights: generateInsights(business, userPreferences),
  };
}

/**
 * Sort businesses by personalization score (highest first).
 */
export function sortByPersonalization(
  businesses: BusinessForScoring[],
  userPreferences: UserPreferences
): BusinessForScoring[] {
  return businesses
    .map((business) => ({
      business,
      score: calculatePersonalizationScore(business, userPreferences),
    }))
    .sort((a, b) => b.score.totalScore - a.score.totalScore)
    .map((item) => item.business);
}

/**
 * Filter out businesses that violate any deal breaker (hard filter).
 */
export function filterByDealbreakers(
  businesses: BusinessForScoring[],
  userDealbreakerIds: string[]
): BusinessForScoring[] {
  if (userDealbreakerIds.length === 0) return businesses;
  return businesses.filter((business) => {
    for (const dealbreakerId of userDealbreakerIds) {
      const rule = DEALBREAKER_RULES[dealbreakerId];
      if (rule) {
        try {
          if (!rule(business)) return false;
        } catch {
          return true;
        }
      }
    }
    return true;
  });
}

/**
 * Add personalization_score to each business (for tracking / diversity).
 */
export function boostPersonalMatches(
  businesses: BusinessForScoring[],
  userPreferences: UserPreferences
): (BusinessForScoring & { personalization_score: number })[] {
  return businesses.map((business) => {
    const score = calculatePersonalizationScore(business, userPreferences);
    return {
      ...business,
      personalization_score: score.totalScore,
    } as BusinessForScoring & { personalization_score: number };
  });
}
