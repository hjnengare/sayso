/**
 * Central Top Contributor eligibility rule.
 *
 * A user qualifies as a Top Contributor (and appears in ReviewerCard
 * sections) when they meet at least ONE of these thresholds.
 *
 * Adjust the numbers here — every consumer imports from this single file.
 */

export const TOP_CONTRIBUTOR_MIN_REVIEWS = 3;
export const TOP_CONTRIBUTOR_MIN_HELPFUL = 5;

/**
 * Returns true when the user qualifies as a Top Contributor.
 */
export function isTopContributor(
  reviewCount: number,
  helpfulVotesReceived: number = 0,
): boolean {
  return (
    reviewCount >= TOP_CONTRIBUTOR_MIN_REVIEWS ||
    helpfulVotesReceived >= TOP_CONTRIBUTOR_MIN_HELPFUL
  );
}
