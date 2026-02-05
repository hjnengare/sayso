/**
 * Featured cold-start: quality/trust + diversity, stable (daily seed).
 * Fill from Pool A (trusted) first, then Pool B. Max 1 per subcategory first pass, max 3 per category.
 */

export type FeaturedColdStartCandidate = {
  id: string;
  featured_score: number;
  primary_category_slug: string | null;
  primary_subcategory_slug: string;
  primary_subcategory_label?: string | null;
  is_trusted: boolean;
};

export type FeaturedSelectionOptions = {
  limit: number;
  /** Max per category. Default 3 (looser than trending). */
  maxPerCategory?: number;
  /** Seed for tie-breaking (e.g. daily bucket). */
  seed?: number;
};

const DEFAULT_MAX_PER_CATEGORY = 3;

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function tieBreakOrder(
  a: FeaturedColdStartCandidate,
  b: FeaturedColdStartCandidate,
  seed: number,
): number {
  const ha = hashString(a.id + String(seed));
  const hb = hashString(b.id + String(seed));
  return ha - hb;
}

/**
 * Diversity-first selection for Featured.
 * Input is ordered: is_trusted desc, featured_score desc (Pool A then Pool B).
 * - Round 1: one per subcategory (winners), category cap 3.
 * - Round 2: 2nd per subcategory, same cap.
 * - Round 3: rest, same cap.
 */
export function selectFeaturedColdStart(
  candidates: FeaturedColdStartCandidate[],
  options: FeaturedSelectionOptions,
): FeaturedColdStartCandidate[] {
  const limit = Math.max(0, options.limit | 0);
  const maxPerCategory = options.maxPerCategory ?? DEFAULT_MAX_PER_CATEGORY;
  const seed = options.seed ?? 0;

  if (limit === 0 || candidates.length === 0) return [];

  const S = (c: FeaturedColdStartCandidate) =>
    (c.primary_subcategory_slug ?? '').trim().toLowerCase() || 'miscellaneous';
  const C = (c: FeaturedColdStartCandidate) =>
    (c.primary_category_slug ?? '').trim().toLowerCase() || 'miscellaneous';

  const bySubcategory = new Map<string, FeaturedColdStartCandidate[]>();
  for (const c of candidates) {
    const s = S(c);
    if (!bySubcategory.has(s)) bySubcategory.set(s, []);
    bySubcategory.get(s)!.push(c);
  }
  for (const arr of bySubcategory.values()) {
    arr.sort(
      (a, b) =>
        b.featured_score - a.featured_score ||
        tieBreakOrder(a, b, seed),
    );
  }

  const result: FeaturedColdStartCandidate[] = [];
  const usedIds = new Set<string>();
  const categoryCount = new Map<string, number>();

  const countForCategory = (cat: string) => categoryCount.get(cat) ?? 0;
  const canAdd = (cat: string) => countForCategory(cat) < maxPerCategory;

  const addOne = (c: FeaturedColdStartCandidate): boolean => {
    if (result.length >= limit) return false;
    if (usedIds.has(c.id)) return true;
    const cat = C(c);
    if (!canAdd(cat)) return false;
    usedIds.add(c.id);
    categoryCount.set(cat, countForCategory(cat) + 1);
    result.push(c);
    return true;
  };

  const winners: FeaturedColdStartCandidate[] = [];
  for (const arr of bySubcategory.values()) {
    if (arr.length > 0) winners.push(arr[0]);
  }
  winners.sort(
    (a, b) =>
      b.featured_score - a.featured_score || tieBreakOrder(a, b, seed),
  );

  for (const c of winners) {
    if (result.length >= limit) break;
    if (!usedIds.has(c.id)) addOne(c);
  }
  if (result.length >= limit) return dedupeAndCap(result, limit);

  const seconds: FeaturedColdStartCandidate[] = [];
  for (const arr of bySubcategory.values()) {
    if (arr.length >= 2) seconds.push(arr[1]);
  }
  seconds.sort(
    (a, b) =>
      b.featured_score - a.featured_score || tieBreakOrder(a, b, seed),
  );
  for (const c of seconds) {
    if (result.length >= limit) break;
    if (!usedIds.has(c.id)) addOne(c);
  }
  if (result.length >= limit) return dedupeAndCap(result, limit);

  const rest: FeaturedColdStartCandidate[] = [];
  for (const arr of bySubcategory.values()) {
    for (let j = 2; j < arr.length; j++) rest.push(arr[j]);
  }
  rest.sort(
    (a, b) =>
      b.featured_score - a.featured_score || tieBreakOrder(a, b, seed),
  );
  for (const c of rest) {
    if (result.length >= limit) break;
    if (!usedIds.has(c.id)) addOne(c);
  }

  return dedupeAndCap(result, limit);
}

function dedupeAndCap(
  list: FeaturedColdStartCandidate[],
  limit: number,
): FeaturedColdStartCandidate[] {
  const seen = new Set<string>();
  const out: FeaturedColdStartCandidate[] = [];
  for (const c of list) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    out.push(c);
    if (out.length >= limit) break;
  }
  return out;
}

/** Daily seed so Featured is stable (same list for the day). */
export function getFeaturedSeed(location?: string | null): number {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const bucket = Math.floor(now / dayMs);
  let h = 0;
  const loc = (location ?? '').toString().trim().toLowerCase();
  for (let i = 0; i < loc.length; i++) h = (h * 31 + loc.charCodeAt(i)) >>> 0;
  return (bucket * 1000003 + h) >>> 0;
}
