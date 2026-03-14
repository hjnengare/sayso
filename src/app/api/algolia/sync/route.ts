/**
 * Algolia sync webhook — called by Supabase Database Webhooks on:
 *   businesses           INSERT / UPDATE / DELETE
 *   profiles             INSERT / UPDATE / DELETE
 *   business_stats       UPDATE  (rating / review count changes)
 *   events_and_specials  INSERT / UPDATE / DELETE
 *
 * Setup in Supabase Dashboard → Database → Webhooks:
 *   URL:    https://<your-domain>/api/algolia/sync
 *   Method: POST
 *   Secret: ALGOLIA_SYNC_SECRET  (sent as Authorization: Bearer <secret>)
 *   Tables: businesses, profiles, business_stats, events_and_specials
 *   Events: INSERT, UPDATE, DELETE
 */

import { NextRequest, NextResponse } from "next/server";
import { getAlgoliaAdminClient } from "@/app/lib/algolia/server";
import {
  ALGOLIA_INDICES,
  BusinessHit,
  ReviewerHit,
  EventHit,
  SpecialHit,
  computeCompletenessScore,
} from "@/app/lib/algolia/indices";

export const runtime = "nodejs";

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
}

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const syncSecret = process.env.ALGOLIA_SYNC_SECRET;
  if (!syncSecret) {
    console.error("[algolia/sync] ALGOLIA_SYNC_SECRET is not set");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${syncSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Parse ─────────────────────────────────────────────────────────────────
  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { type, table, record, old_record } = payload;

  try {
    const client = getAlgoliaAdminClient();

    if (table === "businesses") {
      await handleBusinessEvent(client, type, record, old_record);
    } else if (table === "profiles") {
      await handleReviewerEvent(client, type, record, old_record);
    } else if (table === "business_stats") {
      await handleBusinessStatsEvent(client, type, record);
    } else if (table === "events_and_specials") {
      await handleEventsAndSpecialsEvent(client, type, record, old_record);
    }
  } catch (err) {
    console.error(`[algolia/sync] Error handling ${table}/${type}:`, err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// ── Business sync ──────────────────────────────────────────────────────────

async function handleBusinessEvent(
  client: ReturnType<typeof getAlgoliaAdminClient>,
  type: string,
  record: Record<string, unknown> | null,
  old_record: Record<string, unknown> | null
) {
  if (type === "DELETE") {
    const id = (old_record?.id ?? record?.id) as string | undefined;
    if (id) {
      await client.deleteObject({ indexName: ALGOLIA_INDICES.BUSINESSES, objectID: id });
    }
    return;
  }

  if (!record) return;

  // Skip hidden, system, or inactive businesses
  if (
    record.is_hidden === true ||
    record.is_system === true ||
    record.status !== "active"
  ) {
    // If it was previously indexed (UPDATE), remove it
    if (type === "UPDATE" && record.id) {
      await client.deleteObject({
        indexName: ALGOLIA_INDICES.BUSINESSES,
        objectID: record.id as string,
      }).catch(() => {}); // safe — object may not exist
    }
    return;
  }

  const hit = businessRecordToHit(record);
  await client.saveObject({ indexName: ALGOLIA_INDICES.BUSINESSES, body: hit });
}

// ── Reviewer sync ──────────────────────────────────────────────────────────

async function handleReviewerEvent(
  client: ReturnType<typeof getAlgoliaAdminClient>,
  type: string,
  record: Record<string, unknown> | null,
  old_record: Record<string, unknown> | null
) {
  if (type === "DELETE") {
    const id = (old_record?.user_id ?? record?.user_id) as string | undefined;
    if (id) {
      await client.deleteObject({ indexName: ALGOLIA_INDICES.REVIEWERS, objectID: id });
    }
    return;
  }

  if (!record) return;

  // Skip explicitly deactivated or nameless profiles
  if (record.is_active === false || !record.display_name) return;

  const hit = reviewerRecordToHit(record);
  await client.saveObject({ indexName: ALGOLIA_INDICES.REVIEWERS, body: hit });
}

// ── Business stats sync (partial update) ──────────────────────────────────

async function handleBusinessStatsEvent(
  client: ReturnType<typeof getAlgoliaAdminClient>,
  type: string,
  record: Record<string, unknown> | null
) {
  if (type === "DELETE" || !record?.business_id) return;

  await client.partialUpdateObject({
    indexName: ALGOLIA_INDICES.BUSINESSES,
    objectID: record.business_id as string,
    attributesToUpdate: {
      average_rating: (record.average_rating as number) ?? 0,
      total_reviews: (record.total_reviews as number) ?? 0,
    },
    createIfNotExists: false, // don't create stubs — backfill handles initial indexing
  });
}

// ── Mappers ────────────────────────────────────────────────────────────────

function businessRecordToHit(record: Record<string, unknown>): BusinessHit {
  const lat = record.lat as number | null;
  const lng = record.lng as number | null;

  const phone = (record.phone as string) ?? null;
  const email = (record.email as string) ?? null;
  const website = (record.website as string) ?? null;
  const address = (record.address as string) ?? null;

  const createdAt = record.created_at as string | null;

  return {
    objectID: record.id as string,
    slug: (record.slug as string) ?? "",
    name: (record.name as string) ?? "",
    description: (record.description as string) ?? null,
    category: (record.primary_subcategory_slug as string) ?? (record.category_raw as string) ?? "",
    category_label: (record.primary_subcategory_label as string) ?? "",
    location: (record.location as string) ?? "",
    address,
    phone,
    email,
    website,
    image_url: (record.image_url as string) ?? null,
    price_range: (record.price_range as string) ?? null,
    verified: Boolean(record.verified),
    badge: (record.badge as string) ?? null,
    // Stats default to 0 — updated incrementally via business_stats webhook
    average_rating: 0,
    total_reviews: 0,
    // Cold-start signals — computed at index time
    completeness_score: computeCompletenessScore({ phone, email, website, address }),
    created_at_ts: createdAt ? Math.floor(new Date(createdAt).getTime() / 1000) : 0,
    _geoloc: lat != null && lng != null ? { lat, lng } : null,
  };
}

function reviewerRecordToHit(record: Record<string, unknown>): ReviewerHit {
  return {
    objectID: record.user_id as string,
    display_name: (record.display_name as string) ?? null,
    username: (record.username as string) ?? null,
    avatar_url: (record.avatar_url as string) ?? null,
    is_top_reviewer: Boolean(record.is_top_reviewer),
    total_reviews: (record.reviews_count as number) ?? 0,
  };
}

// ── Events & Specials sync ─────────────────────────────────────────────────

/**
 * Strip ordinal numbers, date tokens, and noise from a title to produce a
 * canonical series key — mirrors the normalizeSeriesKey logic in
 * /api/events-and-specials/route.ts so Algolia distinct works correctly.
 */
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

// Strip HTML tags and truncate. Algolia hard limit is 10KB per record.
function truncateDescription(desc: unknown, maxChars = 500): string | null {
  if (!desc || typeof desc !== "string") return null;
  const stripped = desc.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!stripped) return null;
  return stripped.length > maxChars ? stripped.slice(0, maxChars).trimEnd() + "…" : stripped;
}

function buildSeriesKey(record: Record<string, unknown>): string {
  let title = ((record.title as string) ?? "").trim().toLowerCase();
  for (const pattern of SERIES_STRIP_PATTERNS) {
    title = title.replace(pattern, "");
  }
  title = title.replace(/\s+/g, " ").replace(/[-–—:,.\s]+$/, "").trim();
  const business = ((record.business_id as string) ?? "").trim().toLowerCase();
  const location = ((record.location as string) ?? "").trim().toLowerCase();
  return `${title}|${business}|${location}`;
}

function toUnixSeconds(dateStr: unknown): number | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const ts = new Date(dateStr).getTime();
  return Number.isFinite(ts) ? Math.floor(ts / 1000) : null;
}

async function handleEventsAndSpecialsEvent(
  client: ReturnType<typeof getAlgoliaAdminClient>,
  type: string,
  record: Record<string, unknown> | null,
  old_record: Record<string, unknown> | null
) {
  const rowType = (record?.type ?? old_record?.type) as string | undefined;
  const indexName =
    rowType === "event"
      ? ALGOLIA_INDICES.EVENTS
      : rowType === "special"
      ? ALGOLIA_INDICES.SPECIALS
      : null;

  if (!indexName) return; // unknown type — skip silently

  if (type === "DELETE") {
    const id = ((old_record?.id ?? record?.id) as string) ?? undefined;
    if (id) {
      await client.deleteObject({ indexName, objectID: id });
    }
    return;
  }

  if (!record) return;

  // Expire check: if the item is already over, remove from index rather than upsert
  const nowSeconds = Date.now() / 1000;
  const endTs = toUnixSeconds(record.end_date);
  const startTs = toUnixSeconds(record.start_date);
  const isExpired =
    endTs !== null ? endTs < nowSeconds : startTs !== null && startTs < nowSeconds;

  if (isExpired) {
    if (type === "UPDATE" && record.id) {
      await client
        .deleteObject({ indexName, objectID: record.id as string })
        .catch(() => {}); // safe — object may not be indexed yet
    }
    return;
  }

  if (rowType === "event") {
    const hit = eventRecordToHit(record);
    await client.saveObject({ indexName, body: hit });
  } else {
    const hit = specialRecordToHit(record);
    await client.saveObject({ indexName, body: hit });
  }
}

function eventRecordToHit(record: Record<string, unknown>): EventHit {
  const startTs = toUnixSeconds(record.start_date) ?? 0;
  const endTs = toUnixSeconds(record.end_date);
  return {
    objectID: record.id as string,
    title: (record.title as string) ?? "",
    description: truncateDescription(record.description),
    location: (record.location as string) ?? null,
    business_id: (record.business_id as string) ?? null,
    start_date_ts: startTs,
    end_date_ts: endTs,
    image_url: (record.image as string) ?? null,
    booking_url: (record.booking_url as string) ?? null,
    icon: (record.icon as string) ?? null,
    price: (record.price as number) ?? null,
    availability_status: (record.availability_status as string) ?? null,
    category_slug: (record.quicket_category_slug as string) ?? null,
    category_label: (record.quicket_category_label as string) ?? null,
    series_key: buildSeriesKey(record),
    is_community_event: !record.business_id,
  };
}

function specialRecordToHit(record: Record<string, unknown>): SpecialHit {
  const startTs = toUnixSeconds(record.start_date) ?? 0;
  const endTs = toUnixSeconds(record.end_date);
  return {
    objectID: record.id as string,
    title: (record.title as string) ?? "",
    description: truncateDescription(record.description),
    location: (record.location as string) ?? null,
    business_id: (record.business_id as string) ?? null,
    start_date_ts: startTs,
    end_date_ts: endTs,
    image_url: (record.image as string) ?? null,
    booking_url: (record.booking_url as string) ?? null,
    icon: (record.icon as string) ?? null,
    price: (record.price as number) ?? null,
  };
}
