/**
 * Canonical taxonomy-driven placeholder images for businesses.
 *
 * Rules:
 * - 39 canonical subcategory slugs (source of truth from api/subcategories).
 * - 1:1 mapping: each slug maps to exactly one image under public/businessImagePlaceholders.
 * - No aliases, no fuzzy matching, no token parsing.
 * - Missing slug → dev warning + global default.
 */

const P = "/businessImagePlaceholders";

/** All 39 canonical subcategory slugs (matches api/subcategories FALLBACK_SUBCATEGORIES) */
export const CANONICAL_SUBCATEGORY_SLUGS = [
  "restaurants",
  "cafes",
  "bars",
  "fast-food",
  "fine-dining",
  "gyms",
  "spas",
  "salons",
  "wellness",
  "nail-salons",
  "education-learning",
  "transport-travel",
  "finance-insurance",
  "plumbers",
  "electricians",
  "legal-services",
  "hiking",
  "cycling",
  "water-sports",
  "camping",
  "events-festivals",
  "sports-recreation",
  "nightlife",
  "comedy-clubs",
  "cinemas",
  "museums",
  "galleries",
  "theaters",
  "concerts",
  "family-activities",
  "pet-services",
  "childcare",
  "veterinarians",
  "fashion",
  "electronics",
  "home-decor",
  "books",
  "miscellaneous",
] as const;

export type CanonicalSubcategorySlug = (typeof CANONICAL_SUBCATEGORY_SLUGS)[number];

/**
 * Canonical slug → display label (matches api/subcategories FALLBACK_SUBCATEGORIES).
 * Use this everywhere so sub_interest_id always shows the correct label — no "Miscellaneous" leak.
 */
export const SUBCATEGORY_SLUG_TO_LABEL: Record<CanonicalSubcategorySlug, string> = {
  restaurants: "Restaurants",
  cafes: "Cafés & Coffee",
  bars: "Bars & Pubs",
  "fast-food": "Fast Food",
  "fine-dining": "Fine Dining",
  gyms: "Gyms & Fitness",
  spas: "Spas",
  salons: "Hair Salons",
  wellness: "Wellness Centers",
  "nail-salons": "Nail Salons",
  "education-learning": "Education & Learning",
  "transport-travel": "Transport & Travel",
  "finance-insurance": "Finance & Insurance",
  plumbers: "Plumbers",
  electricians: "Electricians",
  "legal-services": "Legal Services",
  hiking: "Hiking",
  cycling: "Cycling",
  "water-sports": "Water Sports",
  camping: "Camping",
  "events-festivals": "Events & Festivals",
  "sports-recreation": "Sports & Recreation",
  nightlife: "Nightlife",
  "comedy-clubs": "Comedy Clubs",
  cinemas: "Cinemas",
  museums: "Museums",
  galleries: "Art Galleries",
  theaters: "Theaters",
  concerts: "Concerts",
  "family-activities": "Family Activities",
  "pet-services": "Pet Services",
  childcare: "Childcare",
  veterinarians: "Veterinarians",
  fashion: "Fashion & Clothing",
  electronics: "Electronics",
  "home-decor": "Home Decor",
  books: "Books & Media",
  miscellaneous: "Miscellaneous",
};

/**
 * Returns the display label for a subcategory slug. Use for all business cards/APIs.
 * Unknown slug → "Miscellaneous" (no leak of raw slug).
 */
export function getSubcategoryLabel(slug: string | undefined | null): string {
  if (slug == null || typeof slug !== "string") return "Miscellaneous";
  const key = slug.trim().toLowerCase();
  return SUBCATEGORY_SLUG_TO_LABEL[key as CanonicalSubcategorySlug] ?? "Miscellaneous";
}

/**
 * Deterministic 1:1 mapping: canonical slug → placeholder image path.
 * File names align with public/businessImagePlaceholders folder structure.
 */
export const SUBCATEGORY_PLACEHOLDER_MAP: Record<CanonicalSubcategorySlug, string> = {
  // Food & Drink
  restaurants: `${P}/Food & Drink/restauarants.jpg`,
  cafes: `${P}/Food & Drink/cafés & coffee.jpg`,
  bars: `${P}/Food & Drink/bars & pubs.jpg`,
  "fast-food": `${P}/Food & Drink/fast food.jpg`,
  "fine-dining": `${P}/Food & Drink/fine dining.jpg`,

  // Beauty & Wellness
  gyms: `${P}/Beauty & Wellness/gyms & fitness.jpg`,
  spas: `${P}/Beauty & Wellness/spas.jpg`,
  salons: `${P}/Beauty & Wellness/hair salons.jpg`,
  wellness: `${P}/Beauty & Wellness/wellness centers.jpg`,
  "nail-salons": `${P}/Beauty & Wellness/nail salons.jpg`,

  // Professional Services
  "education-learning": `${P}/Professional Services/education & learning.jpg`,
  "transport-travel": `${P}/Professional Services/transport & travel.jpg`,
  "finance-insurance": `${P}/Professional Services/finance & insurance.jpg`,
  plumbers: `${P}/Professional Services/plumbers.jpg`,
  electricians: `${P}/Professional Services/electricians .jpg`,
  "legal-services": `${P}/Professional Services/legal services.jpg`,

  // Outdoors & Adventure
  hiking: `${P}/Outdoors & Adventure/hiking.jpg`,
  cycling: `${P}/Outdoors & Adventure/cycling.jpg`,
  "water-sports": `${P}/Outdoors & Adventure/watersports.jpg`,
  camping: `${P}/Outdoors & Adventure/camping.jpg`,

  // Entertainment & Experiences
  "events-festivals": `${P}/Entertainment & Experiences/events & festivals.jpg`,
  "sports-recreation": `${P}/Entertainment & Experiences/sports & recreation.jpg`,
  nightlife: `${P}/Entertainment & Experiences/nightlife.jpg`,
  "comedy-clubs": `${P}/Entertainment & Experiences/comedy clubs.jpg`,
  cinemas: `${P}/Entertainment & Experiences/cinemas.jpg`,

  // Arts & Culture
  museums: `${P}/Arts & Culture/museums.jpg`,
  galleries: `${P}/Arts & Culture/art galleries.jpg`,
  theaters: `${P}/Arts & Culture/theatres.jpg`,
  concerts: `${P}/Arts & Culture/concerts.jpg`,

  // Family & Pets
  "family-activities": `${P}/Family & Pets/family activities.jpg`,
  "pet-services": `${P}/Family & Pets/pet services.jpg`,
  childcare: `${P}/Family & Pets/childcare.jpg`,
  veterinarians: `${P}/Family & Pets/veterinarians.jpg`,

  // Shopping & Lifestyle
  fashion: `${P}/Shopping & Lifestyle/fashion & clothing.jpg`,
  electronics: `${P}/Shopping & Lifestyle/electronics.jpg`,
  "home-decor": `${P}/Shopping & Lifestyle/home decor.jpg`,
  books: `${P}/Shopping & Lifestyle/books & media.jpg`,

  // Miscellaneous (public/businessImagePlaceholders/Miscellaneous/miscellaneous.jpeg)
  miscellaneous: `${P}/Miscellaneous/miscellaneous.jpeg`,
};

/** Global fallback — same file as miscellaneous slug. */
export const DEFAULT_PLACEHOLDER = `${P}/Miscellaneous/miscellaneous.jpeg`;

const slugSet = new Set<string>(CANONICAL_SUBCATEGORY_SLUGS);

export function isCanonicalSlug(slug: string | undefined | null): slug is CanonicalSubcategorySlug {
  if (slug == null || typeof slug !== "string") return false;
  return slugSet.has(slug.trim());
}

/**
 * Returns the placeholder image path for a canonical subcategory slug.
 * If the slug is not in the taxonomy, logs a dev warning and returns the global default.
 */
export function getSubcategoryPlaceholder(slug: string | undefined | null): string {
  if (slug == null || typeof slug !== "string") {
    return DEFAULT_PLACEHOLDER;
  }
  const trimmed = slug.trim();
  if (!trimmed) return DEFAULT_PLACEHOLDER;

  const path = SUBCATEGORY_PLACEHOLDER_MAP[trimmed as CanonicalSubcategorySlug];
  if (path) return path;

  if (process.env.NODE_ENV === "development") {
    console.warn(
      "[subcategoryPlaceholders] No placeholder for slug:",
      JSON.stringify(trimmed),
      "- using default. Ensure slug is one of CANONICAL_SUBCATEGORY_SLUGS."
    );
  }
  return DEFAULT_PLACEHOLDER;
}

/**
 * Returns the placeholder for the first candidate that is a canonical slug.
 * No fuzzy matching, no token parsing. Use when you have multiple possible slugs (e.g. subInterestId, category).
 */
export function getSubcategoryPlaceholderFromCandidates(
  candidates: ReadonlyArray<string | undefined | null>
): string {
  for (const c of candidates) {
    if (c != null && typeof c === "string" && slugSet.has(c.trim())) {
      return SUBCATEGORY_PLACEHOLDER_MAP[c.trim() as CanonicalSubcategorySlug];
    }
  }
  return DEFAULT_PLACEHOLDER;
}

/**
 * Detects whether a URL is a placeholder (businessImagePlaceholders or legacy PNG).
 */
export function isPlaceholderImage(imageUrl: string | undefined | null): boolean {
  if (!imageUrl || typeof imageUrl !== "string") return false;
  return (
    imageUrl.includes("/businessImagePlaceholders/") ||
    imageUrl.includes("/png/") ||
    imageUrl.endsWith(".png")
  );
}
