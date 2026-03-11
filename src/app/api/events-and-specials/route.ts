import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSupabase } from "@/app/lib/supabase/server";
import { getServiceSupabase } from "@/app/lib/admin";
import type { Database } from "@/app/types/supabase";
import { formatDateRangeLabel, mapEventsAndSpecialsRowToEventCard, type EventsAndSpecialsRow } from "@/app/lib/events/mapEvent";
import { createEventOrSpecial } from "@/app/lib/events/createEventSpecial";
import {
  QUICKET_CATEGORY_LABEL_BY_SLUG,
  QUICKET_CATEGORY_OPTIONS,
  isQuicketEvent,
  normalizeQuicketCategory,
  normalizeQuicketCategoryParam,
  shouldIncludeForQuicketCategoryFilter,
} from "@/app/lib/events/quicketCategory";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_RAW_ROWS = 4000;
const BOOKING_SELECT_FRAGMENT =
  ",booking_url,booking_contact,cta_source,whatsapp_number,whatsapp_prefill_template";
const CATEGORY_SELECT_FRAGMENT = ",quicket_category_slug,quicket_category_label";
const FETCH_TIMEOUT_MS = 10_000;
const CACHE_CONTROL = "public, s-maxage=30, stale-while-revalidate=300";

type EventsCursor = {
  kind: "offset";
  offset: number;
};

function parseEventsCursor(rawCursor: string | null): number {
  if (!rawCursor) return 0;

  try {
    const decoded = JSON.parse(Buffer.from(rawCursor, "base64url").toString("utf8")) as Partial<EventsCursor>;
    if (decoded.kind === "offset" && typeof decoded.offset === "number" && Number.isFinite(decoded.offset)) {
      return Math.max(0, Math.floor(decoded.offset));
    }
  } catch {
    return 0;
  }

  return 0;
}

function encodeEventsCursor(offset: number): string {
  return Buffer.from(JSON.stringify({ kind: "offset", offset }), "utf8").toString("base64url");
}

function parseBooleanSearchParam(value: string | null): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

async function getEventsSupabase() {
  try {
    return getServiceSupabase();
  } catch {
    console.warn("[events-and-specials] Service role not configured, falling back to anon server client.");
    return createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`timeout:${label}`)), ms);
    promise
      .then((v) => {
        clearTimeout(id);
        resolve(v);
      })
      .catch((err) => {
        clearTimeout(id);
        reject(err);
      });
  });
}

/**
 * Strip numbering, date tokens, and noise from a title to produce a canonical series key.
 * "Weekend Play Session 3 - 15 Feb" and "Weekend Play Session 1 - 8 Feb" → same key.
 */
const STRIP_PATTERNS = [
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

const normalizeSeriesKey = (row: Pick<EventsAndSpecialsRow, "title" | "business_id" | "location">) => {
  let title = (row.title ?? "").toString().trim().toLowerCase();

  for (const pattern of STRIP_PATTERNS) {
    title = title.replace(pattern, "");
  }

  title = title.replace(/\s+/g, " ").replace(/[-–—:,.\s]+$/, "").trim();

  const business = (row.business_id ?? "").toString().trim().toLowerCase();
  const location = (row.location ?? "").toString().trim().toLowerCase();
  return `${title}|${business}|${location}`;
};

/**
 * GET /api/events-and-specials
 * List upcoming items from public.events_and_specials, consolidated into "series cards".
 *
 * Query params:
 * - type?: event | special
 * - city?: ignored (schema doesn't include city)
 * - limit?: number (default 20)
 * - category?: quicket category slug (music | festivals | tech-business | arts | food-drink | community)
 * - excludeSoldOut?: boolean (home rail use-case; excludes sold-out events only)
 */
export async function GET(req: NextRequest) {
  const reqStart = Date.now();
  try {
    const { searchParams } = new URL(req.url);
    const typeParam = (searchParams.get("type") || "").trim().toLowerCase();
    const limitParam = parseInt(searchParams.get("limit") || "20", 10);
    const offsetParam = parseEventsCursor(searchParams.get("cursor")) || parseInt(searchParams.get("offset") || "0", 10);
    const excludeSoldOut = parseBooleanSearchParam(searchParams.get("excludeSoldOut"));

    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 20;
    const offset = Number.isFinite(offsetParam) ? Math.max(offsetParam, 0) : 0;

    const type = typeParam === "event" || typeParam === "special" ? (typeParam as "event" | "special") : null;
    const selectedCategory = normalizeQuicketCategoryParam(searchParams.get("category"));

    // Search param: applied as ILIKE across title, location, description
    const searchParam = (searchParams.get("search") || "").trim().slice(0, 200);
    // Escape ILIKE wildcards in user input so they're treated as literals
    const ilikePat = searchParam.replace(/%/g, "\\%").replace(/_/g, "\\_");

    const supabase = await getEventsSupabase();

    // SAST-aware cutoff: midnight today in UTC+2
    const nowUtc = new Date();
    const sastMidnight = new Date(nowUtc);
    sastMidnight.setUTCHours(sastMidnight.getUTCHours() + 2);
    sastMidnight.setUTCHours(0, 0, 0, 0);
    sastMidnight.setUTCHours(sastMidnight.getUTCHours() - 2);
    const bufferStart = sastMidnight.toISOString();

    const baseSelect =
      "id,title,type,business_id,start_date,end_date,location,description,icon,image,price,rating,availability_status";

    let query = supabase
      .from("events_and_specials")
      .select(baseSelect + BOOKING_SELECT_FRAGMENT + CATEGORY_SELECT_FRAGMENT)
      // Include items still active via end_date (multi-day) even if start_date is earlier.
      .or(`end_date.gte.${bufferStart},and(end_date.is.null,start_date.gte.${bufferStart})`)
      .order("start_date", { ascending: true })
      .limit(MAX_RAW_ROWS);

    if (type) {
      query = query.eq("type", type);
    }

    if (ilikePat) {
      query = query.or(
        `title.ilike.%${ilikePat}%,location.ilike.%${ilikePat}%,description.ilike.%${ilikePat}%`
      );
    }

    let data: any[] | null = null;
    let error: any = null;

    ({ data, error } = await withTimeout(query as any, FETCH_TIMEOUT_MS, "events-and-specials:primary") as any);

    const errorMessage = String(error?.message ?? "");
    const isMissingOptionalColumn =
      error &&
      /does not exist/i.test(errorMessage) &&
      /(events_and_specials\.)?(booking_url|cta_source|whatsapp_number|whatsapp_prefill_template|quicket_category_slug|quicket_category_label)/i.test(errorMessage);

    if (isMissingOptionalColumn) {
      console.warn("[events-and-specials] optional columns missing; retrying without optional fields.");
      let retryQuery = supabase
        .from("events_and_specials")
        .select(baseSelect)
        .or(`end_date.gte.${bufferStart},and(end_date.is.null,start_date.gte.${bufferStart})`)
        .order("start_date", { ascending: true })
        .limit(MAX_RAW_ROWS);

      if (type) {
        retryQuery = retryQuery.eq("type", type);
      }

      if (ilikePat) {
        retryQuery = retryQuery.or(
          `title.ilike.%${ilikePat}%,location.ilike.%${ilikePat}%,description.ilike.%${ilikePat}%`
        );
      }

      ({ data, error } = await withTimeout(
        retryQuery as any,
        FETCH_TIMEOUT_MS,
        "events-and-specials:retry-no-cta"
      ) as any);
    }

    if (error) {
      console.error("[events-and-specials] query error:", error);
      const response = NextResponse.json(
        {
          error: "Failed to fetch events and specials",
          details: error.message ?? "Unknown query error",
          items: [],
          count: 0,
          nextCursor: null,
          limit,
          offset,
          selectedCategory: null,
          categoryBuckets: [],
        },
        { status: 503 }
      );
      response.headers.set("Cache-Control", "no-store");
      response.headers.set("X-Query-Duration-MS", String(Date.now() - reqStart));
      return response;
    }

    const rawRows = (data || []) as unknown as EventsAndSpecialsRow[];

    // Fetch business visibility status for events with business_id
    // Events linked to hidden/system businesses should still appear,
    // but without business attribution
    const businessIds = [...new Set(rawRows.map(r => r.business_id).filter(Boolean))];
    const hiddenOrSystemBusinessIds = new Set<string>();
    
    if (businessIds.length > 0) {
      const { data: businessData } = await supabase
        .from('businesses')
        .select('id, is_hidden, is_system, name')
        .in('id', businessIds);
      
      for (const biz of businessData || []) {
        if (biz.is_hidden === true || biz.is_system === true || biz.name === 'Sayso System') {
          hiddenOrSystemBusinessIds.add(biz.id);
        }
      }
    }
    
    // Clear business_id for events linked to hidden/system businesses
    let processedRows = rawRows.map(row => {
      if (row.business_id && hiddenOrSystemBusinessIds.has(row.business_id)) {
        return { ...row, business_id: null, _isExternalEvent: true };
      }
      return row;
    }) as (EventsAndSpecialsRow & { _isExternalEvent?: boolean })[];

    // Keep specials as-is, but remove non-Quicket events from the unified feed.
    processedRows = processedRows.filter((row) => {
      if (row.type !== "event") return true;
      return (row.icon ?? "").toLowerCase() === "quicket";
    });

    // Re-derive category at read time for Quicket events so existing rows
    // benefit from the latest taxonomy rules even before a full re-ingest.
    processedRows = processedRows.map((row) => {
      if (!isQuicketEvent(row)) return row;

      const storedSlug = normalizeQuicketCategoryParam(row.quicket_category_slug ?? null);
      if (storedSlug) {
        return {
          ...row,
          quicket_category_slug: storedSlug,
          quicket_category_label: row.quicket_category_label ?? QUICKET_CATEGORY_LABEL_BY_SLUG[storedSlug],
        };
      }

      const categoryNames =
        row.quicket_category_label && row.quicket_category_label.trim().toLowerCase() !== "community"
          ? [row.quicket_category_label]
          : [];

      const derived = normalizeQuicketCategory({
        categoryNames,
      });

      return {
        ...row,
        quicket_category_slug: derived.slug,
        quicket_category_label: derived.label,
      };
    });

    if (selectedCategory) {
      processedRows = processedRows.filter((row) =>
        shouldIncludeForQuicketCategoryFilter({
          selectedCategory,
          type: row.type,
          icon: row.icon,
          quicketCategorySlug: row.quicket_category_slug ?? null,
        })
      );
    }

    if (excludeSoldOut) {
      processedRows = processedRows.filter(
        (row) => !(row.type === "event" && row.availability_status === "sold_out"),
      );
    }

    // Consolidate into series cards.
    const series = new Map<
      string,
      {
        representative: EventsAndSpecialsRow & { _isExternalEvent?: boolean };
        occurrences: number;
        minStart: string;
        maxEnd: string;
        startDates: string[];
        isExternalEvent: boolean;
        firstNonNull: {
          image: string | null;
          icon: string | null;
          description: string | null;
          booking_url: string | null;
          booking_contact: string | null;
          cta_source: string | null;
          whatsapp_number: string | null;
          whatsapp_prefill_template: string | null;
          price: number | null;
          rating: number | null;
          quicket_category_slug: EventsAndSpecialsRow["quicket_category_slug"];
          quicket_category_label: EventsAndSpecialsRow["quicket_category_label"];
        };
      }
    >();

    for (const row of processedRows) {
      const key = normalizeSeriesKey(row);
      const start = row.start_date;
      const end = row.end_date ?? row.start_date;

      const existing = series.get(key);
      if (!existing) {
        series.set(key, {
          representative: row,
          occurrences: 1,
          minStart: start,
          maxEnd: end,
          startDates: [start],
          isExternalEvent: !!(row as any)._isExternalEvent,
          firstNonNull: {
            image: row.image ?? null,
            icon: row.icon ?? null,
            description: row.description ?? null,
            booking_url: (row as any).booking_url ?? null,
            booking_contact: (row as any).booking_contact ?? null,
            cta_source: (row as any).cta_source ?? null,
            whatsapp_number: (row as any).whatsapp_number ?? null,
            whatsapp_prefill_template: (row as any).whatsapp_prefill_template ?? null,
            price: row.price ?? null,
            rating: row.rating ?? null,
            quicket_category_slug: row.quicket_category_slug ?? null,
            quicket_category_label: row.quicket_category_label ?? null,
          },
        });
        continue;
      }

      existing.occurrences += 1;
      existing.startDates.push(start);

      if (new Date(start).getTime() < new Date(existing.minStart).getTime()) {
        existing.minStart = start;
        // keep representative stable by MIN(id) below, not by date
      }
      if (new Date(end).getTime() > new Date(existing.maxEnd).getTime()) {
        existing.maxEnd = end;
      }

      // Stable representative id: MIN(id)
      if (String(row.id).localeCompare(String(existing.representative.id)) < 0) {
        existing.representative = row;
      }

      if (!existing.firstNonNull.image && row.image) existing.firstNonNull.image = row.image;
      if (!existing.firstNonNull.icon && row.icon) existing.firstNonNull.icon = row.icon;
      if (!existing.firstNonNull.description && row.description) existing.firstNonNull.description = row.description;
      if (!existing.firstNonNull.booking_url && (row as any).booking_url) existing.firstNonNull.booking_url = (row as any).booking_url;
      if (!existing.firstNonNull.booking_contact && (row as any).booking_contact) existing.firstNonNull.booking_contact = (row as any).booking_contact;
      if (!existing.firstNonNull.cta_source && (row as any).cta_source) existing.firstNonNull.cta_source = (row as any).cta_source;
      if (!existing.firstNonNull.whatsapp_number && (row as any).whatsapp_number) existing.firstNonNull.whatsapp_number = (row as any).whatsapp_number;
      if (!existing.firstNonNull.whatsapp_prefill_template && (row as any).whatsapp_prefill_template) existing.firstNonNull.whatsapp_prefill_template = (row as any).whatsapp_prefill_template;
      if (existing.firstNonNull.price == null && row.price != null) existing.firstNonNull.price = row.price;
      if (existing.firstNonNull.rating == null && row.rating != null) existing.firstNonNull.rating = row.rating;
      if (!existing.firstNonNull.quicket_category_slug && row.quicket_category_slug) existing.firstNonNull.quicket_category_slug = row.quicket_category_slug;
      if (!existing.firstNonNull.quicket_category_label && row.quicket_category_label) existing.firstNonNull.quicket_category_label = row.quicket_category_label;
    }

    const consolidated = Array.from(series.values())
      .map((s) => {
        const representative: EventsAndSpecialsRow = {
          ...s.representative,
          start_date: s.minStart,
          end_date: s.maxEnd === s.minStart ? null : s.maxEnd,
          image: s.firstNonNull.image,
          icon: s.firstNonNull.icon,
          description: s.firstNonNull.description,
          price: s.firstNonNull.price,
          rating: s.firstNonNull.rating,
          booking_url: s.firstNonNull.booking_url,
          booking_contact: s.firstNonNull.booking_contact,
          cta_source: s.firstNonNull.cta_source as any,
          whatsapp_number: s.firstNonNull.whatsapp_number,
          whatsapp_prefill_template: s.firstNonNull.whatsapp_prefill_template,
          quicket_category_slug: s.firstNonNull.quicket_category_slug,
          quicket_category_label: s.firstNonNull.quicket_category_label,
        };

        const dateRangeLabel =
          s.occurrences > 1 ? formatDateRangeLabel(s.minStart, s.maxEnd) : null;

        return mapEventsAndSpecialsRowToEventCard(representative, {
          occurrencesCount: s.occurrences,
          dateRangeLabel,
          startDates: s.startDates.slice().sort(),
          isExternalEvent: s.isExternalEvent,
        });
      })
      .sort((a, b) => new Date(a.startDateISO || a.startDate).getTime() - new Date(b.startDateISO || b.startDate).getTime());

    const quicketCategoryCounts = new Map<string, number>();
    for (const item of consolidated) {
      const isQuicketEvent = item.type === "event" && (item.icon ?? "").toLowerCase() === "quicket";
      if (!isQuicketEvent) continue;
      const slug = normalizeQuicketCategoryParam(item.category) ?? "community";
      quicketCategoryCounts.set(slug, (quicketCategoryCounts.get(slug) ?? 0) + 1);
    }

    const categoryBuckets = QUICKET_CATEGORY_OPTIONS.map((option) => ({
      slug: option.slug,
      label: option.label,
      count: quicketCategoryCounts.get(option.slug) ?? 0,
    }));

    // When a search query is active return all consolidated matches (client handles display).
    // For normal browsing, apply server-side pagination.
    const pagedBase = searchParam ? consolidated : consolidated.slice(offset, offset + limit);

    const eventIds = pagedBase.filter((item) => item.type === "event").map((item) => item.id);
    const specialIds = pagedBase.filter((item) => item.type === "special").map((item) => item.id);

    const [eventReviewRows, specialReviewRows] = await Promise.all([
      eventIds.length > 0
        ? supabase
            .from("event_reviews")
            .select("event_id")
            .in("event_id", eventIds)
            .then(({ data, error }) => {
              if (error) {
                console.warn("[events-and-specials] event review count query error:", error);
                return [] as Array<{ event_id: string }>;
              }
              return (data ?? []) as Array<{ event_id: string }>;
            })
        : Promise.resolve([] as Array<{ event_id: string }>),
      specialIds.length > 0
        ? supabase
            .from("special_reviews")
            .select("special_id")
            .in("special_id", specialIds)
            .then(({ data, error }) => {
              if (error) {
                console.warn("[events-and-specials] special review count query error:", error);
                return [] as Array<{ special_id: string }>;
              }
              return (data ?? []) as Array<{ special_id: string }>;
            })
        : Promise.resolve([] as Array<{ special_id: string }>),
    ]);

    const reviewCounts = new Map<string, number>();
    for (const row of eventReviewRows) {
      reviewCounts.set(row.event_id, (reviewCounts.get(row.event_id) ?? 0) + 1);
    }
    for (const row of specialReviewRows) {
      reviewCounts.set(row.special_id, (reviewCounts.get(row.special_id) ?? 0) + 1);
    }

    const paged = pagedBase.map((item) => ({
      ...item,
      reviews: reviewCounts.get(item.id) ?? 0,
    }));
    const nextCursor = consolidated.length > offset + limit ? encodeEventsCursor(offset + limit) : null;

    const response = NextResponse.json({
      items: paged,
      count: consolidated.length,
      nextCursor,
      limit,
      offset,
      selectedCategory,
      categoryBuckets,
    });
    response.headers.set("Cache-Control", CACHE_CONTROL);
    response.headers.set("X-Query-Duration-MS", String(Date.now() - reqStart));
    return response;
  } catch (err) {
    console.error("[events-and-specials] error:", err);
    const response = NextResponse.json(
      {
        error: "Failed to fetch events and specials",
        details: err instanceof Error ? err.message : "Unknown server error",
        items: [],
        count: 0,
        nextCursor: null,
        limit: 20,
        offset: 0,
        selectedCategory: null,
        categoryBuckets: [],
      },
      { status: 503 }
    );
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("X-Query-Duration-MS", String(Date.now() - reqStart));
    return response;
  }
}

/**
 * POST /api/events-and-specials
 * Create event/special with centralized permission checks.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase(req);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized. Please log in first." }, { status: 401 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const result = await createEventOrSpecial({
      supabase,
      userId: user.id,
      body,
    });

    if (result.ok === false) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true, data: result.data }, { status: 201 });
  } catch (error: any) {
    console.error("[events-and-specials] create error:", error);
    return NextResponse.json(
      { error: "Failed to create listing", details: error?.message ?? "Unknown error" },
      { status: 500 },
    );
  }
}
