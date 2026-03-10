/**
 * Algolia search client — server-side only.
 * All Algolia calls go through Next.js API routes; no keys are exposed to the browser.
 */

import { algoliasearch } from "algoliasearch";

export function getAlgoliaSearchClient() {
  const appId = process.env.ALGOLIA_APP_ID;
  const searchKey = process.env.ALGOLIA_SEARCH_KEY;
  if (!appId || !searchKey) {
    throw new Error("ALGOLIA_APP_ID and ALGOLIA_SEARCH_KEY are required");
  }
  return algoliasearch(appId, searchKey);
}

export const isAlgoliaConfigured = Boolean(
  process.env.ALGOLIA_APP_ID && process.env.ALGOLIA_SEARCH_KEY
);
