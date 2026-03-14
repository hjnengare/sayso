/**
 * Algolia index names and TypeScript hit shapes for sayso-web.
 *
 * Indices:
 *   sayso_businesses  — active, public-facing businesses
 *   sayso_reviewers   — reviewer profiles (public fields only)
 *   sayso_events      — upcoming events from events_and_specials (type = 'event')
 *   sayso_specials    — upcoming specials from events_and_specials (type = 'special')
 *
 * Reviews are NOT indexed per product requirements.
 */

export const ALGOLIA_INDICES = {
  BUSINESSES: "sayso_businesses",
  REVIEWERS: "sayso_reviewers",
  EVENTS: "sayso_events",
  SPECIALS: "sayso_specials",
} as const;

// ---------------------------------------------------------------------------
// Business hit — mirrors what /api/search returns so the mapping is 1-to-1
// ---------------------------------------------------------------------------
export interface BusinessHit {
  objectID: string; // = businesses.id
  slug: string;
  name: string;
  description: string | null;
  category: string; // primary_subcategory_slug
  category_label: string; // primary_subcategory_label
  location: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  image_url: string | null;
  price_range: string | null;
  verified: boolean;
  badge: string | null;
  average_rating: number;
  total_reviews: number;
  /**
   * Cold-start ranking signals — computed at index time, not dependent on
   * user engagement. Ensures newly added businesses are fairly discoverable
   * before any reviews or ratings accumulate.
   *
   * completeness_score  0–4  one point each for phone, email, website, address
   * created_at_ts            Unix timestamp — newer listings get a recency bump
   */
  completeness_score: number;
  created_at_ts: number;
  /** Algolia geosearch field — null for businesses without coordinates */
  _geoloc: { lat: number; lng: number } | null;
}

// ---------------------------------------------------------------------------
// Cold-start helper — compute completeness score from a business record
// ---------------------------------------------------------------------------
export function computeCompletenessScore(record: {
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
}): number {
  return (
    (record.phone ? 1 : 0) +
    (record.email ? 1 : 0) +
    (record.website ? 1 : 0) +
    (record.address ? 1 : 0)
  );
}

// ---------------------------------------------------------------------------
// Reviewer hit
// ---------------------------------------------------------------------------
export interface ReviewerHit {
  objectID: string; // = profiles.user_id
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  is_top_reviewer: boolean;
  total_reviews: number;
}

// ---------------------------------------------------------------------------
// Index settings (apply via scripts/algolia-setup-indices.ts)
// ---------------------------------------------------------------------------

/**
 * Ranking strategy — designed for cold-start conditions:
 *
 * Tier 1  Textual relevance (Algolia built-in: typo, words, proximity, exact)
 * Tier 2  verified          — owner-verified businesses rank above unverified
 * Tier 3  completeness_score — profiles with phone/email/website/address rank
 *                              above sparse listings, independent of reviews
 * Tier 4  average_rating    — engagement signal; irrelevant until reviews exist
 * Tier 5  total_reviews     — volume signal; irrelevant until reviews exist
 * Tier 6  created_at_ts     — recency tiebreaker; newer listings are slightly
 *                              favoured so fresh additions remain discoverable
 *
 * Result: on day 0, tiers 4–5 are all 0 for every business, so the effective
 * order is relevance → verified → completeness → recency. As reviews
 * accumulate, tiers 4–5 naturally take over without any code changes.
 *
 * Search behaviour:
 *   - "coffee"                → matches category_label "Coffee Shop" + description
 *   - "where to drink coffee" → stop-words removed → "drink coffee" → category + description
 *   - "cafes in sea point"    → "cafes" plurals-normalised → "cafe" → category; "sea point" → location
 *   - "coffe shop"            → typo tolerance fixes → "coffee shop"
 *   - removeWordsIfNoResults  → progressively drops trailing words until results appear
 */
export const BUSINESS_INDEX_SETTINGS = {
  // ── Searchable attributes (priority order) ──────────────────────────────
  // name first — exact business name match wins; category_label second so
  // category searches ("coffee", "restaurant") rank above description matches.
  searchableAttributes: [
    "name",
    "category_label",
    "unordered(description)",
    "unordered(location)",
    "unordered(address)",
  ],

  // ── Faceting ─────────────────────────────────────────────────────────────
  // searchable() enables InstantSearch refinement list search within the facet.
  // filterOnly() keeps numeric/internal attrs out of the facet UI but filterable.
  attributesForFaceting: [
    "searchable(category_label)",
    "searchable(location)",
    "filterOnly(category)",
    "filterOnly(average_rating)",
    "filterOnly(completeness_score)",
    "price_range",
    "verified",
  ],

  // ── Custom ranking (cold-start safe) ─────────────────────────────────────
  customRanking: [
    "desc(verified)",
    "desc(completeness_score)",
    "desc(average_rating)",
    "desc(total_reviews)",
    "desc(created_at_ts)",
  ],

  // ── Language & recall ────────────────────────────────────────────────────
  // typoTolerance true  → 1 typo for 4-7 char words, 2 typos for 8+ char words
  // removeStopWords     → strips "where", "to", "in", "the", etc. before matching
  // ignorePlurals       → "cafes" matches "cafe", "coffees" matches "coffee"
  // queryLanguages      → activates English language rules for all of the above
  typoTolerance: true,
  removeStopWords: ["en"],
  ignorePlurals: ["en"],
  queryLanguages: ["en"],

  // ── Zero-result fallback ─────────────────────────────────────────────────
  // Progressively drops trailing query words until results are found.
  // "trendy coffee roasters sea point" → "trendy coffee roasters" → … → "coffee"
  removeWordsIfNoResults: "lastWords",

  // ── Advanced query syntax ────────────────────────────────────────────────
  // Allows quoted phrases ("coffee shop") and exclusions (-chain) in the query.
  advancedSyntax: true,

  // ── Retrieve ─────────────────────────────────────────────────────────────
  attributesToRetrieve: [
    "objectID",
    "slug",
    "name",
    "description",
    "category",
    "category_label",
    "location",
    "address",
    "phone",
    "email",
    "website",
    "image_url",
    "price_range",
    "verified",
    "badge",
    "average_rating",
    "total_reviews",
    "completeness_score",
    "created_at_ts",
    "_geoloc",
  ],
};

export const REVIEWER_INDEX_SETTINGS = {
  searchableAttributes: ["display_name", "unordered(username)"],
  customRanking: ["desc(is_top_reviewer)", "desc(total_reviews)"],
  attributesToRetrieve: [
    "objectID",
    "display_name",
    "username",
    "avatar_url",
    "is_top_reviewer",
    "total_reviews",
  ],
} as const;

// ---------------------------------------------------------------------------
// Event hit — source: events_and_specials where type = 'event'
// ---------------------------------------------------------------------------
export interface EventHit {
  objectID: string;            // = events_and_specials.id
  title: string;
  description: string | null;
  location: string | null;
  business_id: string | null;
  /** Unix seconds — used for customRanking and numeric filter at query time */
  start_date_ts: number;
  end_date_ts: number | null;
  image_url: string | null;    // mapped from 'image' column
  booking_url: string | null;
  icon: string | null;
  price: number | null;
  availability_status: string | null;
  category_slug: string | null;   // quicket_category_slug
  category_label: string | null;  // quicket_category_label
  /**
   * Canonical key for Algolia `distinct` deduplication of recurring series.
   * Computed by normalising the title (stripping ordinal numbers, date tokens)
   * and combining with business_id and location.
   */
  series_key: string;
  is_community_event: boolean;
}

// ---------------------------------------------------------------------------
// Special hit — source: events_and_specials where type = 'special'
// ---------------------------------------------------------------------------
export interface SpecialHit {
  objectID: string;            // = events_and_specials.id
  title: string;
  description: string | null;
  location: string | null;
  business_id: string | null;
  start_date_ts: number;
  end_date_ts: number | null;
  image_url: string | null;
  booking_url: string | null;
  icon: string | null;
  price: number | null;
}

// ---------------------------------------------------------------------------
// Event index settings
// ---------------------------------------------------------------------------
/**
 * Ranking strategy:
 *   Tier 1  Textual relevance (Algolia built-in)
 *   Tier 2  start_date_ts asc — upcoming events first; stale events rank lower
 *
 * distinct + attributeForDistinct on series_key prevents recurring events
 * ("Weekend Play Session 1", "Weekend Play Session 2", …) from flooding results.
 * Only the next upcoming instance of each series surfaces in search.
 */
export const EVENT_INDEX_SETTINGS = {
  searchableAttributes: [
    "title",
    "category_label",
    "unordered(description)",
    "unordered(location)",
  ],

  attributesForFaceting: [
    "searchable(category_label)",
    "filterOnly(category_slug)",
    "filterOnly(availability_status)",
    "filterOnly(business_id)",
    "filterOnly(start_date_ts)",
    "filterOnly(is_community_event)",
  ],

  // Upcoming events surface first; within the same start time, relevance wins
  customRanking: ["asc(start_date_ts)"],

  // Deduplicate recurring series — expose only the next upcoming occurrence
  attributeForDistinct: "series_key",
  distinct: true,

  typoTolerance: true,
  removeStopWords: ["en"],
  ignorePlurals: ["en"],
  queryLanguages: ["en"],
  removeWordsIfNoResults: "lastWords",
  advancedSyntax: true,

  attributesToRetrieve: [
    "objectID",
    "title",
    "description",
    "location",
    "business_id",
    "start_date_ts",
    "end_date_ts",
    "image_url",
    "booking_url",
    "icon",
    "price",
    "availability_status",
    "category_slug",
    "category_label",
    "series_key",
    "is_community_event",
  ],
};

// ---------------------------------------------------------------------------
// Special index settings
// ---------------------------------------------------------------------------
export const SPECIAL_INDEX_SETTINGS = {
  searchableAttributes: [
    "title",
    "unordered(description)",
    "unordered(location)",
  ],

  attributesForFaceting: [
    "filterOnly(business_id)",
    "filterOnly(start_date_ts)",
  ],

  customRanking: ["asc(start_date_ts)"],

  typoTolerance: true,
  removeStopWords: ["en"],
  ignorePlurals: ["en"],
  queryLanguages: ["en"],
  removeWordsIfNoResults: "lastWords",
  advancedSyntax: true,

  attributesToRetrieve: [
    "objectID",
    "title",
    "description",
    "location",
    "business_id",
    "start_date_ts",
    "end_date_ts",
    "image_url",
    "booking_url",
    "icon",
    "price",
  ],
};
