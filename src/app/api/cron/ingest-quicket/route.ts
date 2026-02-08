import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes

// ---------------------------------------------------------------------------
// Quicket API types
// ---------------------------------------------------------------------------

interface QuicketEvent {
  id: number;
  name: string;
  description?: string;
  url?: string;
  imageUrl?: string;
  startDate?: string;
  endDate?: string;
  venue?: {
    name?: string;
    addressLine1?: string;
    latitude?: number;
    longitude?: number;
  };
  locality?: {
    levelOne?: string;
    levelTwo?: string;
    levelThree?: string;
  };
  categories?: Array<{ id?: number; name?: string }>;
  tickets?: Array<{
    price?: number;
    soldOut?: boolean;
    donation?: boolean;
  }>;
}

interface QuicketResponse {
  results: QuicketEvent[];
  pageSize: number;
  pages: number;
  records: number;
  statusCode: number;
}

interface EventRow {
  title: string;
  type: "event";
  business_id: string;
  created_by: string;
  start_date: string;
  end_date: string | null;
  location: string | null;
  description: string | null;
  icon: string;
  image: string | null;
  price: number | null;
  rating: number;
  booking_url: string | null;
  booking_contact: null;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const QUICKET_BASE = "https://api.quicket.co.za/api/events";
const CITIES = ["Cape Town", "Johannesburg", "Durban"];
const PAGE_SIZE = 100;
const MAX_PAGES = 30;
const BATCH_SIZE = 200;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

function normalizeText(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

function buildDedupeKey(title: string, startDate: string, location: string | null): string {
  return `${normalizeText(title)}|${startDate.slice(0, 10)}|${normalizeText(location)}`;
}

function buildLocation(
  venue?: string | null,
  city?: string | null,
  country?: string | null
): string | null {
  const parts = [venue, city, country].filter(
    (p): p is string => typeof p === "string" && p.trim().length > 0
  );
  return parts.length > 0 ? parts.join(" \u2022 ") : null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isUpcoming(event: QuicketEvent): boolean {
  const now = new Date();
  if (event.endDate) {
    const end = new Date(event.endDate);
    if (!isNaN(end.getTime()) && end < now) return false;
  }
  if (event.startDate && !event.endDate) {
    const start = new Date(event.startDate);
    const oneDayAgo = new Date(now.getTime() - 86_400_000);
    if (!isNaN(start.getTime()) && start < oneDayAgo) return false;
  }
  return true;
}

function matchesCity(event: QuicketEvent): boolean {
  const cityLower = CITIES.map((c) => c.toLowerCase());
  const l3 = event.locality?.levelThree?.toLowerCase()?.trim();
  if (l3 && cityLower.some((c) => l3.includes(c) || c.includes(l3))) return true;
  const addr = (event.venue?.addressLine1 ?? "").toLowerCase();
  if (cityLower.some((c) => addr.includes(c))) return true;
  return false;
}

function getCheapestPrice(tickets: QuicketEvent["tickets"]): number | null {
  if (!tickets?.length) return null;
  const prices = tickets
    .filter((t) => !t.donation && !t.soldOut && t.price != null && t.price > 0)
    .map((t) => t.price!);
  return prices.length > 0 ? Math.min(...prices) : null;
}

function buildDescription(event: QuicketEvent): string | null {
  if (event.description) {
    const plain = stripHtml(event.description);
    if (plain.length > 0) return plain.length > 500 ? plain.slice(0, 497) + "..." : plain;
  }
  const cats = event.categories?.map((c) => c.name).filter((n): n is string => !!n && n !== "Other");
  if (cats?.length) return cats.join(" \u00b7 ");
  return null;
}

// ---------------------------------------------------------------------------
// Fetch all pages
// ---------------------------------------------------------------------------

async function fetchAllEvents(apiKey: string): Promise<QuicketEvent[]> {
  const all: QuicketEvent[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && page <= MAX_PAGES) {
    const url = `${QUICKET_BASE}?api_key=${apiKey}&pageSize=${PAGE_SIZE}&page=${page}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Quicket API ${res.status}`);
    const data = (await res.json()) as QuicketResponse;
    all.push(...(data.results ?? []));
    totalPages = data.pages ?? 1;
    page++;
    if (page <= totalPages) await sleep(300);
  }

  return all;
}

// ---------------------------------------------------------------------------
// Map + consolidate
// ---------------------------------------------------------------------------

function mapEvent(event: QuicketEvent, bizId: string, userId: string): EventRow | null {
  const title = event.name?.trim();
  if (!title) return null;
  const startDate = event.startDate ? new Date(event.startDate).toISOString() : null;
  if (!startDate) return null;

  return {
    title,
    type: "event",
    business_id: bizId,
    created_by: userId,
    start_date: startDate,
    end_date: event.endDate ? new Date(event.endDate).toISOString() : null,
    location: buildLocation(event.venue?.name, event.locality?.levelThree, event.locality?.levelOne),
    description: buildDescription(event),
    icon: "quicket",
    image: event.imageUrl
      ? event.imageUrl.startsWith("//") ? `https:${event.imageUrl}` : event.imageUrl
      : null,
    price: getCheapestPrice(event.tickets),
    rating: 0,
    booking_url: event.url || null,
    booking_contact: null,
  };
}

function consolidate(rows: EventRow[]): EventRow[] {
  const map = new Map<string, EventRow>();
  for (const row of rows) {
    const key = buildDedupeKey(row.title, row.start_date, row.location);
    const existing = map.get(key);
    if (!existing) { map.set(key, { ...row }); continue; }
    if (new Date(row.start_date) < new Date(existing.start_date)) existing.start_date = row.start_date;
    if (row.end_date && existing.end_date && new Date(row.end_date) > new Date(existing.end_date)) existing.end_date = row.end_date;
    else if (row.end_date && !existing.end_date) existing.end_date = row.end_date;
    if (row.description && (!existing.description || row.description.length > existing.description.length)) existing.description = row.description;
    if (row.image && !existing.image) existing.image = row.image;
    if (row.booking_url && !existing.booking_url) existing.booking_url = row.booking_url;
    if (row.price != null && (existing.price == null || row.price < existing.price)) existing.price = row.price;
  }
  return Array.from(map.values());
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const auth = req.headers.get("authorization");
      if (auth !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const apiKey = process.env.QUICKET_API_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bizId = process.env.SYSTEM_BUSINESS_ID;
    const userId = process.env.SYSTEM_USER_ID;

    if (!apiKey || !supabaseUrl || !serviceKey || !bizId || !userId) {
      return NextResponse.json({ error: "Missing env vars" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Cleanup expired events
    const cutoff = new Date(Date.now() - 1 * 86_400_000).toISOString();
    await supabase
      .from("events_and_specials")
      .delete()
      .eq("icon", "quicket")
      .eq("type", "event")
      .lt("end_date", cutoff);

    await supabase
      .from("events_and_specials")
      .delete()
      .eq("icon", "quicket")
      .eq("type", "event")
      .is("end_date", null)
      .lt("start_date", cutoff);

    // 2. Fetch all events
    const allEvents = await fetchAllEvents(apiKey);

    // 3. Filter: SA + city + upcoming
    const filtered = allEvents.filter((e) => {
      const country = e.locality?.levelOne?.toLowerCase()?.trim();
      if (country && country !== "south africa") return false;
      if (!isUpcoming(e)) return false;
      if (!matchesCity(e)) return false;
      return true;
    });

    // 4. Map + consolidate
    const mapped = filtered
      .map((e) => mapEvent(e, bizId, userId))
      .filter((r): r is EventRow => r !== null);
    const rows = consolidate(mapped);

    // 5. Upsert in batches
    let inserted = 0;
    let updated = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const { data, error } = await supabase.rpc("upsert_events_and_specials_consolidated", {
        p_rows: batch,
      });
      if (error) {
        console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, error.message);
        continue;
      }
      const first = Array.isArray(data) ? data[0] : data;
      inserted += Number(first?.inserted ?? 0);
      updated += Number(first?.updated ?? 0);
    }

    const result = {
      source: "quicket",
      fetched: allEvents.length,
      filtered: filtered.length,
      mapped: mapped.length,
      consolidated: rows.length,
      inserted,
      updated,
    };

    console.log("[Cron] Quicket ingest complete:", result);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Cron] Quicket ingest failed:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
