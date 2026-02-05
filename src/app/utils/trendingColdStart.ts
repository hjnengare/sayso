/**
 * Cold-start trending: diversity-first selection with deterministic rotation.
 * Pick best per subcategory, then interleave with category cap. No stats required.
 */

export type ColdStartCandidate = {
  id: string;
  cold_start_score: number;
  primary_category_slug: string | null;
  primary_subcategory_slug: string;
  primary_subcategory_label?: string | null;
};

export type ColdStartSelectionOptions = {
  /** Max items to return (N). */
  limit: number;
  /** Max per category in round 1–2 (soft). Default 2. */
  maxPerCategory?: number;
  /** Max per category in round 3 (last resort). Default 3. */
  maxPerCategoryRelaxed?: number;
  /** Seed for tie-breaking / interleave order (e.g. from time bucket + location). */
  seed?: number;
};

const DEFAULT_MAX_PER_CATEGORY = 2;
const DEFAULT_MAX_PER_CATEGORY_RELAXED = 3;

/** Deterministic tie-break: same score → order by hash(id + seed). */
function tieBreakOrder(a: ColdStartCandidate, b: ColdStartCandidate, seed: number): number {
  const ha = hashString(a.id + String(seed));
  const hb = hashString(b.id + String(seed));
  return ha - hb;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Round-based diversity-first selection.
 * Round 1: one per subcategory (winners), sort by score desc, fill up to N with category cap (max 2 per category).
 * Round 2: 2nd-best per subcategory, interleave, same category cap.
 * Round 3: relax to 3 per category, avoid same subcategory back-to-back when possible.
 */
export function selectColdStartTrending(
  candidates: ColdStartCandidate[],
  options: ColdStartSelectionOptions,
): ColdStartCandidate[] {
  const limit = Math.max(0, options.limit | 0);
  const maxPerCategory = options.maxPerCategory ?? DEFAULT_MAX_PER_CATEGORY;
  const maxPerCategoryRelaxed = options.maxPerCategoryRelaxed ?? DEFAULT_MAX_PER_CATEGORY_RELAXED;
  const seed = options.seed ?? 0;

  if (limit === 0 || candidates.length === 0) return [];

  const S = (c: ColdStartCandidate) =>
    (c.primary_subcategory_slug ?? '').trim().toLowerCase() || 'miscellaneous';
  const C = (c: ColdStartCandidate) =>
    (c.primary_category_slug ?? '').trim().toLowerCase() || 'miscellaneous';

  // Group by subcategory (S), each group sorted by score desc
  const bySubcategory = new Map<string, ColdStartCandidate[]>();
  for (const c of candidates) {
    const s = S(c);
    if (!bySubcategory.has(s)) bySubcategory.set(s, []);
    bySubcategory.get(s)!.push(c);
  }
  for (const arr of bySubcategory.values()) {
    arr.sort((a, b) => b.cold_start_score - a.cold_start_score);
  }

  const result: ColdStartCandidate[] = [];
  const usedIds = new Set<string>();
  const categoryCount = new Map<string, number>();

  const countForCategory = (cat: string) => categoryCount.get(cat) ?? 0;
  const canAddCategory = (cat: string, relaxed: boolean) =>
    countForCategory(cat) < (relaxed ? maxPerCategoryRelaxed : maxPerCategory);

  const addOne = (c: ColdStartCandidate, relaxed: boolean): boolean => {
    if (result.length >= limit) return false;
    if (usedIds.has(c.id)) return true;
    const cat = C(c);
    if (!canAddCategory(cat, relaxed)) return false;
    usedIds.add(c.id);
    categoryCount.set(cat, countForCategory(cat) + 1);
    result.push(c);
    return true;
  };

  // Round 1: one per subcategory (winners), then sort by score and fill with category cap
  const winners: ColdStartCandidate[] = [];
  for (const arr of bySubcategory.values()) {
    if (arr.length > 0) winners.push(arr[0]);
  }
  winners.sort(
    (a, b) =>
      b.cold_start_score - a.cold_start_score || tieBreakOrder(a, b, seed),
  );

  for (const c of winners) {
    if (result.length >= limit) break;
    if (!usedIds.has(c.id)) addOne(c, false);
  }
  if (result.length >= limit) return dedupeAndCap(result, limit);

  // Round 2: 2nd from each subcategory, interleave (use seed for order)
  const seconds: ColdStartCandidate[] = [];
  for (const arr of bySubcategory.values()) {
    if (arr.length >= 2) seconds.push(arr[1]);
  }
  seconds.sort(
    (a, b) =>
      b.cold_start_score - a.cold_start_score || tieBreakOrder(a, b, seed),
  );
  for (const c of seconds) {
    if (result.length >= limit) break;
    if (!usedIds.has(c.id)) addOne(c, false);
  }
  if (result.length >= limit) return dedupeAndCap(result, limit);

  // Round 3: relax category cap, still prefer not same subcategory back-to-back
  const rest: ColdStartCandidate[] = [];
  for (const arr of bySubcategory.values()) {
    for (let j = 2; j < arr.length; j++) rest.push(arr[j]);
  }
  rest.sort(
    (a, b) =>
      b.cold_start_score - a.cold_start_score || tieBreakOrder(a, b, seed),
  );
  let lastSub = '';
  for (let i = 0; i < rest.length && result.length < limit; i++) {
    const c = rest[i];
    if (!c || usedIds.has(c.id)) continue;
    const cat = C(c);
    if (!canAddCategory(cat, true)) continue;
    const sub = S(c);
    if (sub === lastSub && result.length < limit) {
      const other = rest.find((x) => !usedIds.has(x.id) && S(x) !== sub && canAddCategory(C(x), true));
      if (other) {
        addOne(other, true);
        lastSub = S(other);
        continue;
      }
    }
    addOne(c, true);
    lastSub = sub;
  }

  return dedupeAndCap(result, limit);
}

function dedupeAndCap(list: ColdStartCandidate[], limit: number): ColdStartCandidate[] {
  const seen = new Set<string>();
  const out: ColdStartCandidate[] = [];
  for (const c of list) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    out.push(c);
    if (out.length >= limit) break;
  }
  return out;
}

/** Compute a deterministic seed from time bucket (e.g. 15 min) and location. Same window = same seed. */
export function getTrendingSeed(timeBucketMinutes = 15, location?: string | null): number {
  const now = Date.now();
  const bucketMs = timeBucketMinutes * 60 * 1000;
  const bucket = Math.floor(now / bucketMs);
  let h = 0;
  const loc = (location ?? '').toString().trim().toLowerCase();
  for (let i = 0; i < loc.length; i++) h = (h * 31 + loc.charCodeAt(i)) >>> 0;
  return (bucket * 1000003 + h) >>> 0;
}
