/**
 * Placeholder image resolution — taxonomy-driven, 1:1 with canonical subcategory slugs.
 * All logic lives in subcategoryPlaceholders.ts. This file keeps backward-compatible export names.
 */

import {
  getSubcategoryPlaceholder,
  getSubcategoryPlaceholderFromCandidates,
  isPlaceholderImage as isPlaceholderImageImpl,
} from "./subcategoryPlaceholders";

/** Resolve placeholder by a single canonical subcategory slug (or use default). */
export function getCategoryPlaceholder(
  category: string | undefined | null,
  _interestId?: string | undefined | null
): string {
  return getSubcategoryPlaceholder(category);
}

/**
 * Resolve placeholder using the first candidate that is a canonical slug.
 * Pass e.g. [subInterestId, subInterestLabel, category] — first canonical slug wins.
 */
export function getCategoryPlaceholderFromLabels(
  labels: Array<string | undefined | null>,
  _interestId?: string | undefined | null
): string {
  return getSubcategoryPlaceholderFromCandidates(labels);
}

export const isPlaceholderImage = isPlaceholderImageImpl;

/** @deprecated Use getCategoryPlaceholder */
export const getCategoryPng = getCategoryPlaceholder;
/** @deprecated Use getCategoryPlaceholderFromLabels */
export const getCategoryPngFromLabels = getCategoryPlaceholderFromLabels;
/** @deprecated Use isPlaceholderImage */
export const isPngIcon = isPlaceholderImage;
