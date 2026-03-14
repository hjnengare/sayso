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
  EventHit,
  SpecialHit,
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

// ── Series key helper (mirrors normalizeSeriesKey in events-and-specials/route.ts)

const SERIES_STRIP_PATTERNS = [
  /\s*[-–—:]\s*\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*(?:\s+\d{2,4})?/gi,
  /\s*\(?\b(?:day|part|session|week|round|set|show|edition|no\.?|number)\s*#?\d+\b\)?/gi,
  /\s*#\d+/g,
  /\s+\d{1,2}(?:st|nd|rd|th)?$/i,
  /\s*[-–—]\s*(?:mon|tue|wed|thu|fri|sat|sun)\w*(?:\s+\d{1,2})?/gi,
  /\s*\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
  /\s*\d{1,2}:\d{2}(?:\s*(?:am|pm))?/gi,
  /\s*\|\s*\d+$/,
  /\s*\(\d+(?:\s*of\s*\d+)?\)/g,
];

function buildSeriesKey(title: string, businessId: string | null, location: string | null): string {
  let t = (title ?? "").trim().toLowerCase();
  for (const pattern of SERIES_STRIP_PATTERNS) {
    t = t.replace(pattern, "");
  }
  t = t.replace(/\s+/g, " ").replace(/[-–—:,.\s]+$/, "").trim();
  const b = (businessId ?? "").trim().toLowerCase();
  const l = (location ?? "").trim().toLowerCase();
  return `${t}|${b}|${l}`;
}

function toUnixSeconds(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const ts = new Date(dateStr).getTime();
  return Number.isFinite(ts) ? Math.floor(ts / 1000) : null;
}

// Strip HTML tags and truncate. Algolia hard limit is 10KB per record.
function truncateDescription(desc: string | null | undefined, maxChars = 500): string | null {
  if (!desc) return null;
  const stripped = desc.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!stripped) return null;
  return stripped.length > maxChars ? stripped.slice(0, maxChars).trimEnd() + "…" : stripped;
}

// ── Events & Specials backfill ─────────────────────────────────────────────

async function backfillEventsAndSpecials() {
  console.log("\n── Backfilling events & specials ───────────────────────");

  const now = new Date().toISOString();
  let offset = 0;
  let totalEvents = 0;
  let totalSpecials = 0;

  while (true) {
    const { data, error } = await supabase
      .from("events_and_specials")
      .select(
        "id, title, type, business_id, start_date, end_date, location, description, icon, image, price, availability_status, booking_url, quicket_category_slug, quicket_category_label"
      )
      // Only index non-expired records
      .or(`end_date.gte.${now},and(end_date.is.null,start_date.gte.${now})`)
      .in("type", ["event", "special"])
      .order("start_date", { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) throw new Error(`Supabase error fetching events_and_specials: ${error.message}`);
    if (!data || data.length === 0) break;

    const eventHits: EventHit[] = [];
    const specialHits: SpecialHit[] = [];

    for (const row of data) {
      const startTs = toUnixSeconds(row.start_date) ?? 0;
      const endTs = toUnixSeconds(row.end_date);

      if (row.type === "event") {
        eventHits.push({
          objectID: row.id,
          title: row.title ?? "",
          description: truncateDescription(row.description),
          location: row.location ?? null,
          business_id: row.business_id ?? null,
          start_date_ts: startTs,
          end_date_ts: endTs,
          image_url: row.image ?? null,
          booking_url: (row as any).booking_url ?? null,
          icon: row.icon ?? null,
          price: row.price ?? null,
          availability_status: row.availability_status ?? null,
          category_slug: (row as any).quicket_category_slug ?? null,
          category_label: (row as any).quicket_category_label ?? null,
          series_key: buildSeriesKey(row.title ?? "", row.business_id ?? null, row.location ?? null),
          is_community_event: !row.business_id,
        });
      } else {
        specialHits.push({
          objectID: row.id,
          title: row.title ?? "",
          description: truncateDescription(row.description),
          location: row.location ?? null,
          business_id: row.business_id ?? null,
          start_date_ts: startTs,
          end_date_ts: endTs,
          image_url: row.image ?? null,
          booking_url: (row as any).booking_url ?? null,
          icon: row.icon ?? null,
          price: row.price ?? null,
        });
      }
    }

    if (eventHits.length > 0) {
      await algolia.saveObjects({ indexName: ALGOLIA_INDICES.EVENTS, objects: eventHits });
      totalEvents += eventHits.length;
    }
    if (specialHits.length > 0) {
      await algolia.saveObjects({ indexName: ALGOLIA_INDICES.SPECIALS, objects: specialHits });
      totalSpecials += specialHits.length;
    }

    process.stdout.write(`  indexed ${totalEvents} events, ${totalSpecials} specials…\r`);

    if (data.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
  }

  console.log(`\n✓ Events:   ${totalEvents} records indexed`);
  console.log(`✓ Specials: ${totalSpecials} records indexed`);
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("Sayso → Algolia backfill");
  console.log(`App ID: ${ALGOLIA_APP_ID}`);

  await backfillBusinesses();
  await backfillReviewers();
  await backfillEventsAndSpecials();

  console.log("\nBackfill complete.");
}

main().catch((err) => {
  console.error("\nBackfill failed:", err);
  process.exit(1);
});
