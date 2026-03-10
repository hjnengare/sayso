/**
 * Configure Algolia index settings.
 * Run once (or after schema changes):
 *
 *   npx tsx scripts/algolia-setup-indices.ts
 *
 * Requires: ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY in .env
 */

import "dotenv/config";
import { algoliasearch } from "algoliasearch";
import {
  ALGOLIA_INDICES,
  BUSINESS_INDEX_SETTINGS,
  REVIEWER_INDEX_SETTINGS,
} from "../src/app/lib/algolia/indices";

const APP_ID = process.env.ALGOLIA_APP_ID;
const ADMIN_KEY = process.env.ALGOLIA_ADMIN_KEY;

if (!APP_ID || !ADMIN_KEY) {
  console.error("Missing ALGOLIA_APP_ID or ALGOLIA_ADMIN_KEY");
  process.exit(1);
}

const client = algoliasearch(APP_ID, ADMIN_KEY);

async function main() {
  console.log("Configuring Algolia indices…");

  await client.setSettings({
    indexName: ALGOLIA_INDICES.BUSINESSES,
    indexSettings: BUSINESS_INDEX_SETTINGS as Record<string, unknown>,
  });
  console.log(`✓ ${ALGOLIA_INDICES.BUSINESSES} settings applied`);

  await client.setSettings({
    indexName: ALGOLIA_INDICES.REVIEWERS,
    indexSettings: REVIEWER_INDEX_SETTINGS as Record<string, unknown>,
  });
  console.log(`✓ ${ALGOLIA_INDICES.REVIEWERS} settings applied`);

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
