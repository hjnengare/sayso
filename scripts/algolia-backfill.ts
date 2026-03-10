/**
 * Algolia backfill — indexes all existing Supabase data.
 *
 * Run once after setting up Algolia:
 *
 *   npx tsx scripts/algolia-backfill.ts
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   ALGOLIA_APP_ID
 *   ALGOLIA_ADMIN_KEY
 *
 * The script is idempotent — re-running it replaces existing records.
 * Batches of 500 objects are sent to Algolia per request.
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { algoliasearch } from "algoliasearch";
import {
  ALGOLIA_INDICES,
  BusinessHit,
  ReviewerHit,
  computeCompletenessScore,
} from "../src/app/lib/algolia/indices";

// ── Config ─────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID;
const ALGOLIA_ADMIN_KEY = process.env.ALGOLIA_ADMIN_KEY;

for (const [key, val] of Object.entries({
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: SUPABASE_SERVICE_KEY,
  ALGOLIA_APP_ID: ALGOLIA_APP_ID,
  ALGOLIA_ADMIN_KEY: ALGOLIA_ADMIN_KEY,
})) {
  if (!val) {
    console.error(`Missing env var: ${key}`);
    process.exit(1);
  }
}

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);
const algolia = algoliasearch(ALGOLIA_APP_ID!, ALGOLIA_ADMIN_KEY!);

const BATCH_SIZE = 500;

// ── Business backfill ──────────────────────────────────────────────────────

async function backfillBusinesses() {
  console.log("\n── Backfilling businesses ──────────────────────────────");
  let offset = 0;
  let totalIndexed = 0;

  while (true) {
    const { data, error } = await supabase
      .from("businesses")
      .select(
        `id, slug, name, description, created_at,
         primary_subcategory_slug, primary_subcategory_label, primary_category_slug, category_raw,
         location, address, phone, email, website,
         image_url, price_range, verified, badge, lat, lng,
         is_hidden, is_system, status,
         business_stats (average_rating, total_reviews)`
      )
      .eq("status", "active")
      .or("is_hidden.is.null,is_hidden.eq.false")
      .or("is_system.is.null,is_system.eq.false")
      .neq("name", "Sayso System")
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) throw new Error(`Supabase error fetching businesses: ${error.message}`);
    if (!data || data.length === 0) break;

    const hits: BusinessHit[] = data.map((b) => {
      const stats = (b.business_stats as Array<{ average_rating: number; total_reviews: number }> | null)?.[0];
      const lat = b.lat as number | null;
      const lng = b.lng as number | null;

      const phone = b.phone ?? null;
      const email = b.email ?? null;
      const website = b.website ?? null;
      const address = b.address ?? null;
      const createdAt = b.created_at as string | null;

      return {
        objectID: b.id,
        slug: b.slug ?? "",
        name: b.name ?? "",
        description: b.description ?? null,
        category: b.primary_subcategory_slug ?? b.category_raw ?? "",
        category_label: b.primary_subcategory_label ?? "",
        location: b.location ?? "",
        address,
        phone,
        email,
        website,
        image_url: b.image_url ?? null,
        price_range: b.price_range ?? null,
        verified: Boolean(b.verified),
        badge: b.badge ?? null,
        average_rating: stats?.average_rating ?? 0,
        total_reviews: stats?.total_reviews ?? 0,
        completeness_score: computeCompletenessScore({ phone, email, website, address }),
        created_at_ts: createdAt ? Math.floor(new Date(createdAt).getTime() / 1000) : 0,
        _geoloc: lat != null && lng != null ? { lat, lng } : null,
      };
    });

    await algolia.saveObjects({ indexName: ALGOLIA_INDICES.BUSINESSES, objects: hits });

    totalIndexed += hits.length;
    process.stdout.write(`  indexed ${totalIndexed} businesses…\r`);

    if (data.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
  }

  console.log(`\n✓ Businesses: ${totalIndexed} records indexed`);
}

// ── Reviewer backfill ──────────────────────────────────────────────────────

async function backfillReviewers() {
  console.log("\n── Backfilling reviewers ───────────────────────────────");
  let offset = 0;
  let totalIndexed = 0;

  while (true) {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, display_name, username, avatar_url, is_top_reviewer, reviews_count, is_active")
      .or("is_active.is.null,is_active.eq.true")
      .not("display_name", "is", null)
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) throw new Error(`Supabase error fetching profiles: ${error.message}`);
    if (!data || data.length === 0) break;

    const hits: ReviewerHit[] = data.map((p) => ({
      objectID: p.user_id,
      display_name: p.display_name ?? null,
      username: p.username ?? null,
      avatar_url: p.avatar_url ?? null,
      is_top_reviewer: Boolean(p.is_top_reviewer),
      total_reviews: (p.reviews_count as number) ?? 0,
    }));

    await algolia.saveObjects({ indexName: ALGOLIA_INDICES.REVIEWERS, objects: hits });

    totalIndexed += hits.length;
    process.stdout.write(`  indexed ${totalIndexed} reviewers…\r`);

    if (data.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
  }

  console.log(`\n✓ Reviewers: ${totalIndexed} records indexed`);
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("Sayso → Algolia backfill");
  console.log(`App ID: ${ALGOLIA_APP_ID}`);

  await backfillBusinesses();
  await backfillReviewers();

  console.log("\nBackfill complete.");
}

main().catch((err) => {
  console.error("\nBackfill failed:", err);
  process.exit(1);
});
