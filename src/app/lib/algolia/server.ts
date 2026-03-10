/**
 * Algolia admin client — server-side only.
 * Uses the admin API key; never import this in client components.
 */

import { algoliasearch } from "algoliasearch";

export function getAlgoliaAdminClient() {
  const appId = process.env.ALGOLIA_APP_ID;
  const adminKey = process.env.ALGOLIA_ADMIN_KEY;

  if (!appId || !adminKey) {
    throw new Error(
      "Algolia admin client requires ALGOLIA_APP_ID and ALGOLIA_ADMIN_KEY"
    );
  }

  return algoliasearch(appId, adminKey);
}
