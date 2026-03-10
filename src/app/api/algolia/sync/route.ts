/**
 * Algolia sync webhook — called by Supabase Database Webhooks on:
 *   businesses        INSERT / UPDATE / DELETE
 *   profiles          INSERT / UPDATE / DELETE
 *   business_stats    UPDATE  (rating / review count changes)
 *
 * Setup in Supabase Dashboard → Database → Webhooks:
 *   URL:    https://<your-domain>/api/algolia/sync
 *   Method: POST
 *   Secret: ALGOLIA_SYNC_SECRET  (sent as Authorization: Bearer <secret>)
 *   Tables: businesses, profiles, business_stats
 *   Events: INSERT, UPDATE, DELETE
 */

import { NextRequest, NextResponse } from "next/server";
import { getAlgoliaAdminClient } from "@/app/lib/algolia/server";
import {
  ALGOLIA_INDICES,
  BusinessHit,
  ReviewerHit,
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
