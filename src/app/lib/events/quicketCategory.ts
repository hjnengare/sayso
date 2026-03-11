export const QUICKET_CATEGORY_OPTIONS = [
  { slug: "music", label: "Music" },
  { slug: "festivals", label: "Festivals" },
  { slug: "tech-business", label: "Tech & Business" },
  { slug: "arts", label: "Arts" },
  { slug: "food-drink", label: "Food & Drink" },
  { slug: "community", label: "Community" },
] as const;

export type QuicketCategorySlug = (typeof QUICKET_CATEGORY_OPTIONS)[number]["slug"];

export const QUICKET_CATEGORY_LABEL_BY_SLUG: Record<QuicketCategorySlug, string> = {
  music: "Music",
  festivals: "Festivals",
  "tech-business": "Tech & Business",
  arts: "Arts",
  "food-drink": "Food & Drink",
  community: "Community",
};

const NON_CATEGORY_NAMES = new Set(["other", "general", "misc", "miscellaneous"]);

const CATEGORY_NAME_ALIASES: Record<string, QuicketCategorySlug> = {
  // Music + nightlife
  music: "music",
  concert: "music",
  concerts: "music",
  "live music": "music",
  "night life": "music",
  nightlife: "music",
  party: "music",
  parties: "music",
  dj: "music",

  // Festivals
  festival: "festivals",
  festivals: "festivals",
  carnival: "festivals",
  celebrations: "festivals",
  celebration: "festivals",

  // Tech & Business
  tech: "tech-business",
  technology: "tech-business",
  business: "tech-business",
  networking: "tech-business",
  "business networking": "tech-business",
  startup: "tech-business",
  "start up": "tech-business",
  "start-up": "tech-business",
  conference: "tech-business",
  summit: "tech-business",
  innovation: "tech-business",
  fintech: "tech-business",

  // Arts
  arts: "arts",
  art: "arts",
  culture: "arts",
  theatre: "arts",
  theater: "arts",
  comedy: "arts",
  film: "arts",
  cinema: "arts",
  dance: "arts",
  performance: "arts",
  exhibition: "arts",

  // Food & drink
  food: "food-drink",
  drinks: "food-drink",
  drink: "food-drink",
  "food and drink": "food-drink",
  "food & drink": "food-drink",
  dining: "food-drink",
  restaurant: "food-drink",
  restaurants: "food-drink",
  brunch: "food-drink",
  lunch: "food-drink",
  dinner: "food-drink",
  "wine tasting": "food-drink",
  market: "food-drink",
  markets: "food-drink",

  // Community
  community: "community",
  family: "community",
  families: "community",
  charity: "community",
  fundraiser: "community",
  workshop: "community",
  workshops: "community",
  education: "community",
  school: "community",
  wellness: "community",
  health: "community",
  sports: "community",
  sport: "community",

  // Exact Quicket website category labels (normalized)
  "health and wellness": "community",
  "sports and fitness": "community",
  "film and media": "arts",
  "travel and outdoor": "community",
  afrikaans: "arts",
  occasion: "festivals",
  "arts and culture": "arts",
  "hobbies and interests": "community",
  "business and industry": "tech-business",
  "charity and causes": "community",
  "faith and spirituality": "community",
  "family and education": "community",
  "holiday and seasonal": "festivals",
  "science and technology": "tech-business",
};

const CATEGORY_NAME_PATTERNS: Array<{ pattern: RegExp; slug: QuicketCategorySlug }> = [
  { pattern: /\b(festival|carnival|celebration)\b/, slug: "festivals" },
  { pattern: /\b(music|concert|gig|nightlife|dj|party)\b/, slug: "music" },
  { pattern: /\b(tech|technology|business|industry|startup|networking|conference|summit|innovation|fintech|science)\b/, slug: "tech-business" },
  { pattern: /\b(art|arts|culture|theatre|theater|comedy|film|media|cinema|dance|exhibition|performance|afrikaans)\b/, slug: "arts" },
  { pattern: /\b(food|drink|dining|restaurant|brunch|lunch|dinner|tasting|market)\b/, slug: "food-drink" },
  { pattern: /\b(community|family|charity|fundraiser|workshop|education|wellness|health|sport|fitness|outdoor|travel|faith|spirituality|hobbies)\b/, slug: "community" },
  { pattern: /\b(occasion|holiday|seasonal)\b/, slug: "festivals" },
];

const CATEGORY_KEYWORDS: Record<QuicketCategorySlug, string[]> = {
  festivals: [
    "festival",
    "fest",
    "carnival",
    "celebration",
    "block party",
    "street party",
  ],
  music: [
    "music",
    "concert",
    "live music",
    "live show",
    "dj",
    "band",
    "orchestra",
    "choir",
    "gig",
    "jazz",
    "rock",
    "hip hop",
    "hip-hop",
    "house",
    "electronic",
  ],
  "tech-business": [
    "tech",
    "technology",
    "business",
    "startup",
    "start-up",
    "entrepreneur",
    "entrepreneurship",
    "networking",
    "conference",
    "summit",
    "innovation",
    "digital",
    "fintech",
    "ai",
  ],
  arts: [
    "art",
    "arts",
    "culture",
    "cultural",
    "theatre",
    "theater",
    "comedy",
    "film",
    "cinema",
    "dance",
    "poetry",
    "spoken word",
    "gallery",
    "exhibition",
    "performance",
  ],
  "food-drink": [
    "food",
    "drink",
    "wine",
    "beer",
    "cocktail",
    "dining",
    "dinner",
    "lunch",
    "brunch",
    "culinary",
    "tasting",
    "restaurant",
    "market",
  ],
  community: [
    "community",
    "family",
    "charity",
    "fundraiser",
    "network",
    "wellness",
    "health",
    "faith",
    "church",
    "school",
    "education",
    "workshop",
  ],
};

const CATEGORY_PRECEDENCE: QuicketCategorySlug[] = [
  "festivals",
  "music",
  "tech-business",
  "arts",
  "food-drink",
  "community",
];

const normalize = (value: string | null | undefined): string =>
  (value ?? "").trim().toLowerCase();

const normalizeCategoryToken = (value: string | null | undefined): string =>
  normalize(value)
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function normalizeQuicketCategoryParam(raw: string | null | undefined): QuicketCategorySlug | null {
  const normalized = normalize(raw);
  if (!normalized) return null;
  return QUICKET_CATEGORY_OPTIONS.some((option) => option.slug === normalized)
    ? (normalized as QuicketCategorySlug)
    : null;
}

export function cleanQuicketCategoryNames(names: Array<string | null | undefined> | null | undefined): string[] {
  if (!Array.isArray(names)) return [];

  return names
    .map((name) => (typeof name === "string" ? name.trim() : ""))
    .filter((name) => {
      if (!name) return false;
      const lowered = name.toLowerCase();
      return !NON_CATEGORY_NAMES.has(lowered);
    });
}

function scoreCategory(haystack: string, category: QuicketCategorySlug): number {
  const keywords = CATEGORY_KEYWORDS[category] ?? [];
  let score = 0;

  for (const keyword of keywords) {
    if (haystack.includes(keyword)) score += 1;
  }

  return score;
}

function selectBestCategory(scores: Map<QuicketCategorySlug, number>): QuicketCategorySlug | null {
  let best: QuicketCategorySlug | null = null;
  let bestScore = 0;

  for (const category of CATEGORY_PRECEDENCE) {
    const score = scores.get(category) ?? 0;
    if (score > bestScore) {
      best = category;
      bestScore = score;
    }
  }

  return best;
}

function deriveCategoryFromNames(names: string[]): QuicketCategorySlug | null {
  if (names.length === 0) return null;

  const directScores = new Map<QuicketCategorySlug, number>();
  for (const name of names) {
    const normalizedName = normalizeCategoryToken(name);
    if (!normalizedName) continue;

    const direct = CATEGORY_NAME_ALIASES[normalizedName];
    if (direct) {
      directScores.set(direct, (directScores.get(direct) ?? 0) + 1);
    }
  }

  const directWinner = selectBestCategory(directScores);
  if (directWinner) {
    return directWinner;
  }

  const patternScores = new Map<QuicketCategorySlug, number>();
  for (const name of names) {
    const normalizedName = normalizeCategoryToken(name);
    if (!normalizedName) continue;

    for (const entry of CATEGORY_NAME_PATTERNS) {
      if (entry.pattern.test(normalizedName)) {
        patternScores.set(entry.slug, (patternScores.get(entry.slug) ?? 0) + 1);
        break;
      }
    }
  }

  return selectBestCategory(patternScores);
}

export function deriveQuicketCategorySlugFromText(
  input: string | null | undefined
): QuicketCategorySlug {
  const haystack = normalize(input);
  if (!haystack) return "community";

  let bestCategory: QuicketCategorySlug = "community";
  let bestScore = 0;

  for (const category of CATEGORY_PRECEDENCE) {
    const score = scoreCategory(haystack, category);
    if (score > bestScore) {
      bestCategory = category;
      bestScore = score;
    }
  }

  return bestScore > 0 ? bestCategory : "community";
}

export function normalizeQuicketCategory(params: {
  categoryNames?: Array<string | null | undefined> | null;
  fallbackText?: string | null;
}): { slug: QuicketCategorySlug; label: string; rawNames: string[] } {
  const hasProvidedCategories = Array.isArray(params.categoryNames)
    && params.categoryNames.some((name) => normalize(name).length > 0);
  const rawNames = cleanQuicketCategoryNames(params.categoryNames);
  const slugFromNames = deriveCategoryFromNames(rawNames);
  const slug = hasProvidedCategories
    ? (slugFromNames ?? "community")
    : deriveQuicketCategorySlugFromText(params.fallbackText ?? "");

  return {
    slug,
    label: QUICKET_CATEGORY_LABEL_BY_SLUG[slug],
    rawNames,
  };
}

export function isQuicketEvent(params: {
  type?: string | null;
  icon?: string | null;
}): boolean {
  return normalize(params.type) === "event" && normalize(params.icon) === "quicket";
}

export function shouldIncludeForQuicketCategoryFilter(params: {
  selectedCategory: QuicketCategorySlug | null;
  type?: string | null;
  icon?: string | null;
  quicketCategorySlug?: string | null;
}): boolean {
  const { selectedCategory } = params;
  if (!selectedCategory) return true;
  if (!isQuicketEvent(params)) return true;

  return (normalizeQuicketCategoryParam(params.quicketCategorySlug) ?? "community") === selectedCategory;
}
