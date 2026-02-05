export type TrendingDiversifyOptions<T> = {
  /**
   * Extracts a category key used for diversification.
   * Defaults to `sub_interest_id || category || bucket || 'miscellaneous'`.
   */
  getCategoryKey?: (item: T) => string | null | undefined;
};

function defaultCategoryKey(item: any): string {
  const raw =
    item?.sub_interest_id ??
    item?.subInterestId ??
    item?.category ??
    item?.bucket ??
    item?.category_label ??
    item?.subInterestLabel ??
    'miscellaneous';

  const key = String(raw ?? 'miscellaneous').trim().toLowerCase();
  return key || 'miscellaneous';
}

/**
 * Selects up to `limit` items while trying to diversify across categories.
 * Implementation:
 * 1) Take the first item per category (in input order) until `limit`.
 * 2) Backfill remaining slots from the remaining items (still in input order).
 *
 * Notes:
 * - If the input only contains 0–1 unique categories, this is effectively a slice.
 * - Callers can pre-shuffle `items` to keep the selection random but diversified.
 */
export function diversifyTrendingItems<T>(
  items: T[],
  limit: number,
  options: TrendingDiversifyOptions<T> = {},
): T[] {
  const safeLimit = Math.max(0, limit | 0);
  if (safeLimit === 0 || items.length === 0) return [];
  if (items.length <= safeLimit) return items.slice();

  const getCategoryKey = options.getCategoryKey ?? ((item: T) => defaultCategoryKey(item));

  const usedCategories = new Set<string>();
  const usedIds = new Set<T>();
  const result: T[] = [];

  // 1) One per category (in input order)
  for (const item of items) {
    const keyRaw = getCategoryKey(item);
    const key = String(keyRaw ?? 'miscellaneous').trim().toLowerCase() || 'miscellaneous';
    if (usedCategories.has(key)) continue;
    result.push(item);
    usedCategories.add(key);
    usedIds.add(item);
    if (result.length >= safeLimit) return result;
  }

  // 2) Backfill remaining slots from the rest (in input order)
  for (const item of items) {
    if (usedIds.has(item)) continue;
    result.push(item);
    if (result.length >= safeLimit) break;
  }

  return result.slice(0, safeLimit);
}
