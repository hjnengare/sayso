// Supabase Edge Function: Quicket → events_and_specials ingestor
//
// Full pipeline: fetch (paginated) → filter (SA + city + upcoming) →
//   detail fetch (concurrent) → map → consolidate → cleanup → upsert
// Schedule via pg_cron + pg_net every 6 hours (see migration 20260315_quicket_edge_function_cron.sql).

// @ts-ignore — Deno runtime import
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ==========================================================================
// Types
// ==========================================================================

type QuicketCategorySlug =
  | "music"
  | "festivals"
  | "tech-business"
  | "arts"
  | "food-drink"
  | "community";

interface QuicketVenue {
  id?: number;
  name?: string;
  addressLine1?: string;
  addressLine2?: string;
  latitude?: number;
  longitude?: number;
}

interface QuicketLocality {
  levelOne?: string;
  levelTwo?: string;
  levelThree?: string;
}

interface QuicketOrganiser {
  id?: number;
  name?: string;
  phone?: string;
  mobile?: string;
  facebookUrl?: string;
  twitterHandle?: string;
  hashTag?: string;
  organiserPageUrl?: string;
}

interface QuicketCategory { id?: number; name?: string; }
interface QuicketTicket {
  id?: number; name?: string; soldOut?: boolean;
  provisionallySoldOut?: boolean; price?: number;
  salesStart?: string; salesEnd?: string;
  description?: string; donation?: boolean; vendorTicket?: boolean;
}
interface QuicketSchedule { id?: number; name?: string; startDate?: string; endDate?: string; }

interface QuicketEvent {
  id: number;
  name: string;
  description?: string;
  url?: string;
  imageUrl?: string;
  dateCreated?: string;
  lastModified?: string;
  startDate?: string;
  endDate?: string;
  venue?: QuicketVenue;
  locality?: QuicketLocality;
  organiser?: QuicketOrganiser;
  categories?: QuicketCategory[];
  tickets?: QuicketTicket[];
  schedules?: QuicketSchedule[];
}

interface QuicketListResponse {
  results: QuicketEvent[];
  pageSize: number;
  pages: number;
  records: number;
  statusCode: number;
}

interface EventRow {
  title: string; type: "event"; business_id: string; created_by: string;
  start_date: string; end_date: string | null; location: string | null;
  description: string | null; icon: string; image: string | null;
  price: number | null; rating: number; booking_url: string | null;
  booking_contact: null; availability_status: "sold_out" | "limited" | null;
  quicket_category_slug: QuicketCategorySlug | null;
  quicket_category_label: string | null;
  quicket_event_id: number | null; event_name: string | null;
  event_description: string | null; event_url: string | null;
  event_image_url: string | null; event_start_date: string | null;
  event_end_date: string | null; event_created_at: string | null;
  event_last_modified: string | null; venue_id: number | null;
  venue_name: string | null; venue_address_line1: string | null;
  venue_address_line2: string | null; venue_latitude: number | null;
  venue_longitude: number | null; locality_level_one: string | null;
  locality_level_two: string | null; locality_level_three: string | null;
  organiser_id: number | null; organiser_name: string | null;
  organiser_phone: string | null; organiser_mobile: string | null;
  organiser_facebook_url: string | null; organiser_twitter_handle: string | null;
  organiser_hashtag: string | null; organiser_page_url: string | null;
  quicket_categories_json: QuicketCategory[] | null;
  tickets_json: QuicketTicket[] | null;
  minimum_ticket_price: number | null; maximum_ticket_price: number | null;
  tickets_available_boolean: boolean | null;
  schedules_json: QuicketSchedule[] | null; guestlist_count: number;
}

interface BatchFailure { batch: number; rows: number; message: string; code: string | null; details: string | null; hint: string | null; }

// ==========================================================================
// Constants
// ==========================================================================

const QUICKET_BASE_URL = "https://api.quicket.co.za/api/events";
const CITIES = ["Cape Town"];
const PAGE_SIZE = 100;
const MAX_PAGES = 30;
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [2_000, 5_000, 10_000];
const FETCH_TIMEOUT_MS = 30_000;
const DETAIL_TIMEOUT_MS = 8_000;
const DETAIL_CONCURRENCY = 8;
const BATCH_SIZE = 200;
const CLEANUP_DAYS = 1;

const CATEGORY_LABEL: Record<QuicketCategorySlug, string> = {
  music: "Music", festivals: "Festivals", "tech-business": "Tech & Business",
  arts: "Arts", "food-drink": "Food & Drink", community: "Community",
};

const NON_CATEGORY_NAMES = new Set(["other", "general", "misc", "miscellaneous"]);

const CATEGORY_NAME_ALIASES: Record<string, QuicketCategorySlug> = {
  music: "music", concert: "music", concerts: "music", "live music": "music",
  "night life": "music", nightlife: "music", party: "music", parties: "music", dj: "music",
  festival: "festivals", festivals: "festivals", carnival: "festivals",
  celebrations: "festivals", celebration: "festivals",
  tech: "tech-business", technology: "tech-business", business: "tech-business",
  networking: "tech-business", conference: "tech-business", summit: "tech-business",
  innovation: "tech-business", fintech: "tech-business",
  arts: "arts", art: "arts", culture: "arts", theatre: "arts", theater: "arts",
  comedy: "arts", film: "arts", cinema: "arts", dance: "arts", performance: "arts",
  exhibition: "arts",
  food: "food-drink", drinks: "food-drink", drink: "food-drink",
  "food and drink": "food-drink", "food & drink": "food-drink", dining: "food-drink",
  restaurant: "food-drink", brunch: "food-drink", lunch: "food-drink",
  dinner: "food-drink", "wine tasting": "food-drink", market: "food-drink",
  community: "community", family: "community", charity: "community",
  fundraiser: "community", workshop: "community", education: "community",
  wellness: "community", health: "community", sports: "community", sport: "community",
  "health and wellness": "community", "sports and fitness": "community",
  "film and media": "arts", "travel and outdoor": "community", afrikaans: "arts",
  occasion: "festivals", "arts and culture": "arts", "hobbies and interests": "community",
  "business and industry": "tech-business", "charity and causes": "community",
  "faith and spirituality": "community", "family and education": "community",
  "holiday and seasonal": "festivals", "science and technology": "tech-business",
};

const CATEGORY_NAME_PATTERNS: Array<{ pattern: RegExp; slug: QuicketCategorySlug }> = [
  { pattern: /\b(festival|carnival|celebration)\b/, slug: "festivals" },
  { pattern: /\b(music|concert|gig|nightlife|dj|party)\b/, slug: "music" },
  { pattern: /\b(tech|technology|business|industry|startup|networking|conference|summit|innovation|fintech|science)\b/, slug: "tech-business" },
  { pattern: /\b(art|arts|culture|theatre|theater|comedy|film|media|cinema|dance|exhibition|performance|afrikaans)\b/, slug: "arts" },
  { pattern: /\b(food|drink|dining|restaurant|brunch|lunch|dinner|tasting|market)\b/, slug: "food-drink" },
  { pattern: /\b(community|family|charity|fundraiser|workshop|education|wellness|health|sport|fitness|outdoor|travel|faith|spirituality|hobbies)\b/, slug: "community" },
];

const CATEGORY_KEYWORDS: Record<QuicketCategorySlug, string[]> = {
  festivals: ["festival", "fest", "carnival", "celebration", "block party", "street party"],
  music: ["music", "concert", "live music", "dj", "band", "choir", "gig", "jazz", "rock", "hip hop", "house", "electronic"],
  "tech-business": ["tech", "technology", "business", "startup", "networking", "conference", "summit", "innovation", "digital", "fintech", "ai"],
  arts: ["art", "arts", "culture", "theatre", "theater", "comedy", "film", "cinema", "dance", "gallery", "exhibition", "performance"],
  "food-drink": ["food", "drink", "wine", "beer", "cocktail", "dining", "dinner", "lunch", "brunch", "tasting", "restaurant", "market"],
  community: ["community", "family", "charity", "fundraiser", "wellness", "health", "faith", "school", "education", "workshop"],
};

const CATEGORY_PRECEDENCE: QuicketCategorySlug[] = ["festivals", "music", "tech-business", "arts", "food-drink", "community"];

// ==========================================================================
// Utilities
// ==========================================================================

function normalize(v: string | null | undefined): string {
  return (v ?? "").trim().toLowerCase();
}

function normalizeCategoryToken(v: string | null | undefined): string {
  return normalize(v).replace(/&/g, " and ").replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function toIso(v: string | null | undefined): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

function isFiniteNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function normalizeJsonArray<T>(items: T[] | null | undefined): T[] | null {
  if (!Array.isArray(items) || items.length === 0) return null;
  return items.filter((i) => i != null);
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function buildDedupeKey(title: string, startDateIso: string, location: string | null): string {
  return `${normalize(title)}|${startDateIso.slice(0, 10)}|${normalize(location)}`;
}

function buildLocationString(venue?: string | null, city?: string | null, country?: string | null): string | null {
  const parts = [venue, city, country].filter((p): p is string => typeof p === "string" && p.trim().length > 0);
  return parts.length > 0 ? parts.join(" \u2022 ") : null;
}

function normalizeImageUrl(v: string | null | undefined): string | null {
  if (!v) return null;
  return v.startsWith("//") ? `https:${v}` : v;
}

function jsonOk(body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
}

function jsonError(message: string, status = 500): Response {
  return new Response(JSON.stringify({ error: message }), { status, headers: { "Content-Type": "application/json" } });
}

// ==========================================================================
// Category resolution
// ==========================================================================

function selectBestCategory(scores: Map<QuicketCategorySlug, number>): QuicketCategorySlug | null {
  let best: QuicketCategorySlug | null = null, bestScore = 0;
  for (const cat of CATEGORY_PRECEDENCE) {
    const s = scores.get(cat) ?? 0;
    if (s > bestScore) { best = cat; bestScore = s; }
  }
  return best;
}

function resolveCategory(event: QuicketEvent): { slug: QuicketCategorySlug; label: string } {
  const rawNames = (event.categories ?? [])
    .map((c) => (typeof c.name === "string" ? c.name.trim() : ""))
    .filter((n) => n.length > 0 && !NON_CATEGORY_NAMES.has(n.toLowerCase()));

  if (rawNames.length > 0) {
    const directScores = new Map<QuicketCategorySlug, number>();
    for (const name of rawNames) {
      const direct = CATEGORY_NAME_ALIASES[normalizeCategoryToken(name)];
      if (direct) directScores.set(direct, (directScores.get(direct) ?? 0) + 1);
    }
    const direct = selectBestCategory(directScores);
    if (direct) return { slug: direct, label: CATEGORY_LABEL[direct] };

    const patternScores = new Map<QuicketCategorySlug, number>();
    for (const name of rawNames) {
      const norm = normalizeCategoryToken(name);
      for (const entry of CATEGORY_NAME_PATTERNS) {
        if (entry.pattern.test(norm)) { patternScores.set(entry.slug, (patternScores.get(entry.slug) ?? 0) + 1); break; }
      }
    }
    const fromPattern = selectBestCategory(patternScores);
    if (fromPattern) return { slug: fromPattern, label: CATEGORY_LABEL[fromPattern] };
  }

  const haystack = normalize(`${event.name ?? ""} ${event.description ?? ""}`);
  let best: QuicketCategorySlug = "community", bestScore = 0;
  for (const cat of CATEGORY_PRECEDENCE) {
    let score = 0;
    for (const kw of CATEGORY_KEYWORDS[cat] ?? []) { if (haystack.includes(kw)) score++; }
    if (score > bestScore) { best = cat; bestScore = score; }
  }
  return { slug: best, label: CATEGORY_LABEL[best] };
}

// ==========================================================================
// Ticket stats
// ==========================================================================

function getTicketStats(tickets: QuicketTicket[] | null | undefined) {
  const nonDonation = (tickets ?? []).filter((t) => t?.donation !== true);
  if (nonDonation.length === 0) return { availabilityStatus: null, displayPrice: null, minimumTicketPrice: null, maximumTicketPrice: null, ticketsAvailableBoolean: null };
  const priced = nonDonation.map((t) => t.price).filter((p): p is number => isFiniteNum(p) && p > 0);
  const available = nonDonation.filter((t) => t.soldOut !== true && t.provisionallySoldOut !== true);
  const availablePriced = available.map((t) => t.price).filter((p): p is number => isFiniteNum(p) && p > 0);
  const soldOutCount = nonDonation.filter((t) => t.soldOut === true || t.provisionallySoldOut === true).length;
  return {
    availabilityStatus: available.length === 0 ? "sold_out" as const : soldOutCount > 0 ? "limited" as const : null,
    displayPrice: availablePriced.length > 0 ? Math.min(...availablePriced) : null,
    minimumTicketPrice: priced.length > 0 ? Math.min(...priced) : null,
    maximumTicketPrice: priced.length > 0 ? Math.max(...priced) : null,
    ticketsAvailableBoolean: available.length > 0,
  };
}

// ==========================================================================
// Filtering
// ==========================================================================

function isUpcoming(event: QuicketEvent): boolean {
  const now = new Date();
  const end = toIso(event.endDate);
  if (end && new Date(end) < now) return false;
  const start = toIso(event.startDate);
  if (!end && start && new Date(start) < new Date(now.getTime() - 86_400_000)) return false;
  return true;
}

function matchesCity(event: QuicketEvent, cities: string[]): boolean {
  const tokens = cities.map((c) => c.toLowerCase().trim()).filter(Boolean);
  if (tokens.length === 0) return true;
  const locality = event.locality?.levelThree?.toLowerCase()?.trim() ?? "";
  if (locality && tokens.some((c) => locality.includes(c) || c.includes(locality))) return true;
  const addr = [event.venue?.name, event.venue?.addressLine1, event.venue?.addressLine2]
    .filter((p): p is string => Boolean(p?.trim())).join(" ").toLowerCase();
  return tokens.some((c) => addr.includes(c));
}

// ==========================================================================
// Description
// ==========================================================================

function buildDescription(event: QuicketEvent): string | null {
  if (event.description) { const plain = stripHtml(event.description); if (plain.length > 0) return plain; }
  const cats = (event.categories ?? []).map((c) => c.name).filter((n): n is string => !!n && n.trim().length > 0 && n.toLowerCase() !== "other");
  if (cats.length) return cats.join(" \u00b7 ");
  return null;
}

// ==========================================================================
// Fetch helpers
// ==========================================================================

async function fetchWithTimeout(url: string, timeoutMs: number, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(url, { ...init, signal: controller.signal }); }
  finally { clearTimeout(id); }
}

async function fetchListPage(apiKey: string, page: number): Promise<QuicketListResponse> {
  const url = new URL(QUICKET_BASE_URL);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("pageSize", String(PAGE_SIZE));
  url.searchParams.set("page", String(page));

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(url.toString(), FETCH_TIMEOUT_MS);
      if (res.status === 429) { await sleep(parseInt(res.headers.get("retry-after") || "5", 10) * 1000); continue; }
      if (!res.ok) throw new Error(`Quicket API ${res.status}`);
      return (await res.json()) as QuicketListResponse;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES - 1) await sleep(RETRY_DELAYS_MS[attempt] ?? 10_000);
    }
  }
  throw lastError ?? new Error("fetchListPage failed");
}

async function fetchAllEvents(apiKey: string): Promise<QuicketEvent[]> {
  const all: QuicketEvent[] = [];
  let page = 1, totalPages = 1;
  while (page <= totalPages && page <= MAX_PAGES) {
    const resp = await fetchListPage(apiKey, page);
    all.push(...(resp.results ?? []));
    totalPages = resp.pages ?? 1;
    console.log(`[Quicket] Page ${page}/${totalPages}: ${resp.results?.length ?? 0} events`);
    page++;
    if (page <= totalPages) await sleep(300);
  }
  return all;
}

function normalizeDetailPayload(payload: unknown): QuicketEvent | null {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as Record<string, unknown>;
  if (Array.isArray(data.results) && data.results.length > 0) return data.results[0] as QuicketEvent;
  if (data.results && typeof data.results === "object" && !Array.isArray(data.results)) return data.results as QuicketEvent;
  if (typeof data.id === "number") return data as unknown as QuicketEvent;
  return null;
}

type DetailResult = { kind: "ok"; event: QuicketEvent } | { kind: "not_found" } | { kind: "unauthorized" } | { kind: "error" };

async function fetchEventDetail(apiKey: string, eventId: number, userToken?: string): Promise<DetailResult> {
  const candidates = [
    `https://api.quicket.co.za/api/events/${eventId}`,
    `https://api.quicket.co.za/api/Events/${eventId}`,
  ].flatMap((raw) => {
    const withKey = new URL(raw); withKey.searchParams.set("api_key", apiKey);
    return userToken ? [withKey.toString(), raw] : [withKey.toString()];
  });

  const headers: HeadersInit | undefined = userToken?.trim()
    ? { usertoken: userToken.trim(), accept: "application/json" }
    : undefined;

  let sawNotFound = false;
  for (const url of candidates) {
    try {
      const res = await fetchWithTimeout(url, DETAIL_TIMEOUT_MS, { headers });
      if (res.status === 404) { sawNotFound = true; continue; }
      if (res.status === 401 || res.status === 403) return { kind: "unauthorized" };
      if (!res.ok) continue;
      const detail = normalizeDetailPayload(await res.json());
      if (detail?.id) return { kind: "ok", event: detail };
    } catch {}
  }
  return sawNotFound ? { kind: "not_found" } : { kind: "error" };
}

async function fetchEventDetails(apiKey: string, userToken: string | undefined, events: QuicketEvent[]): Promise<Map<number, QuicketEvent>> {
  const detailById = new Map<number, QuicketEvent>();
  if (events.length === 0) return detailById;

  let index = 0, authUnavailable = false;
  await Promise.all(
    Array.from({ length: Math.min(DETAIL_CONCURRENCY, events.length) }, async () => {
      while (true) {
        if (authUnavailable) break;
        const i = index++;
        if (i >= events.length) break;
        const result = await fetchEventDetail(apiKey, events[i].id, userToken);
        if (result.kind === "ok") detailById.set(events[i].id, result.event);
        if (result.kind === "unauthorized") { authUnavailable = true; break; }
      }
    }),
  );
  return detailById;
}

// ==========================================================================
// Map + consolidate
// ==========================================================================

function mapEvent(base: QuicketEvent, detail: QuicketEvent | null, bizId: string, userId: string): EventRow | null {
  const event = detail ? { ...base, ...detail, venue: detail.venue ?? base.venue, locality: detail.locality ?? base.locality, organiser: detail.organiser ?? base.organiser, categories: detail.categories ?? base.categories, tickets: detail.tickets ?? base.tickets, schedules: detail.schedules ?? base.schedules } : base;

  const title = event.name?.trim();
  if (!title) return null;
  const startDateIso = toIso(event.startDate);
  if (!startDateIso) return null;

  const ticketStats = getTicketStats(event.tickets);
  const category = resolveCategory(event);

  return {
    title, type: "event", business_id: bizId, created_by: userId,
    start_date: startDateIso, end_date: toIso(event.endDate),
    location: buildLocationString(event.venue?.name, event.locality?.levelThree, event.locality?.levelOne),
    description: buildDescription(event), icon: "quicket",
    image: normalizeImageUrl(event.imageUrl), price: ticketStats.displayPrice,
    rating: 0, booking_url: event.url || null, booking_contact: null,
    availability_status: ticketStats.availabilityStatus,
    quicket_category_slug: category.slug, quicket_category_label: category.label,
    quicket_event_id: isFiniteNum(event.id) ? event.id : null,
    event_name: event.name?.trim() || null, event_description: event.description ?? null,
    event_url: event.url || null, event_image_url: normalizeImageUrl(event.imageUrl),
    event_start_date: toIso(event.startDate), event_end_date: toIso(event.endDate),
    event_created_at: toIso(event.dateCreated), event_last_modified: toIso(event.lastModified),
    venue_id: isFiniteNum(event.venue?.id) ? event.venue!.id! : null,
    venue_name: event.venue?.name || null,
    venue_address_line1: event.venue?.addressLine1 || null,
    venue_address_line2: event.venue?.addressLine2 || null,
    venue_latitude: isFiniteNum(event.venue?.latitude) ? event.venue!.latitude! : null,
    venue_longitude: isFiniteNum(event.venue?.longitude) ? event.venue!.longitude! : null,
    locality_level_one: event.locality?.levelOne || null,
    locality_level_two: event.locality?.levelTwo || null,
    locality_level_three: event.locality?.levelThree || null,
    organiser_id: isFiniteNum(event.organiser?.id) ? event.organiser!.id! : null,
    organiser_name: event.organiser?.name || null, organiser_phone: event.organiser?.phone || null,
    organiser_mobile: event.organiser?.mobile || null,
    organiser_facebook_url: event.organiser?.facebookUrl || null,
    organiser_twitter_handle: event.organiser?.twitterHandle || null,
    organiser_hashtag: event.organiser?.hashTag || null,
    organiser_page_url: event.organiser?.organiserPageUrl || null,
    quicket_categories_json: normalizeJsonArray(event.categories),
    tickets_json: normalizeJsonArray(event.tickets),
    minimum_ticket_price: ticketStats.minimumTicketPrice,
    maximum_ticket_price: ticketStats.maximumTicketPrice,
    tickets_available_boolean: ticketStats.ticketsAvailableBoolean,
    schedules_json: normalizeJsonArray(event.schedules),
    guestlist_count: 0,
  };
}

function consolidate(rows: EventRow[]): EventRow[] {
  const map = new Map<string, EventRow>();
  for (const row of rows) {
    const key = buildDedupeKey(row.title, row.start_date, row.location);
    const ex = map.get(key);
    if (!ex) { map.set(key, { ...row }); continue; }
    if (new Date(row.start_date) < new Date(ex.start_date)) ex.start_date = row.start_date;
    if (row.end_date && ex.end_date && new Date(row.end_date) > new Date(ex.end_date)) ex.end_date = row.end_date;
    else if (row.end_date && !ex.end_date) ex.end_date = row.end_date;
    if (row.description && (!ex.description || row.description.length > ex.description.length)) ex.description = row.description;
    if (row.image && !ex.image) ex.image = row.image;
    if (row.booking_url && !ex.booking_url) ex.booking_url = row.booking_url;
    if (row.price != null && (ex.price == null || row.price < ex.price)) ex.price = row.price;
  }
  return Array.from(map.values());
}

// ==========================================================================
// DB
// ==========================================================================

async function cleanupOldEvents(supabase: SupabaseClient): Promise<number> {
  const cutoff = new Date(Date.now() - CLEANUP_DAYS * 86_400_000).toISOString();
  const { count: c1 } = await supabase.from("events_and_specials").delete({ count: "exact" }).eq("icon", "quicket").eq("type", "event").lt("end_date", cutoff);
  const { count: c2 } = await supabase.from("events_and_specials").delete({ count: "exact" }).eq("icon", "quicket").eq("type", "event").is("end_date", null).lt("start_date", cutoff);
  const deleted = (c1 ?? 0) + (c2 ?? 0);
  if (deleted > 0) console.log(`[Quicket] Cleaned up ${deleted} old events`);
  return deleted;
}

async function upsertEvents(supabase: SupabaseClient, rows: EventRow[]): Promise<{ inserted: number; updated: number; failed: number; batchFailures: BatchFailure[] }> {
  let inserted = 0, updated = 0;
  const batchFailures: BatchFailure[] = [];

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const { data, error } = await supabase.rpc("upsert_events_and_specials_consolidated", { p_rows: batch });

    if (error) {
      batchFailures.push({ batch: batchNum, rows: batch.length, message: error.message, code: error.code ?? null, details: error.details ?? null, hint: error.hint ?? null });
      console.error(`[Quicket] Batch ${batchNum} failed:`, error.message);
      continue;
    }

    const first = Array.isArray(data) ? data[0] : data;
    const ins = Number(first?.inserted ?? 0);
    const upd = Number(first?.updated ?? 0);
    inserted += ins;
    updated += upd;
    console.log(`[Quicket] Batch ${batchNum}: ${ins} inserted, ${upd} updated`);
  }

  return { inserted, updated, failed: Math.max(0, rows.length - inserted - updated), batchFailures };
}

// ==========================================================================
// Auth
// ==========================================================================

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function resolveCreatedByUserId(supabase: SupabaseClient, userId: string): Promise<string> {
  if (!UUID_PATTERN.test(userId.trim())) throw new Error(`Invalid SYSTEM_USER_ID: ${userId}`);
  try {
    const { data, error } = await supabase.schema("auth").from("users").select("id").eq("id", userId).maybeSingle();
    if (!error && data?.id) return userId;
  } catch {}
  const { data: profile } = await supabase.from("profiles").select("user_id").eq("user_id", userId).maybeSingle();
  if (profile?.user_id) return userId;
  throw new Error(`SYSTEM_USER_ID not found: ${userId}`);
}

// ==========================================================================
// Edge Function handler
// ==========================================================================

// @ts-ignore — Deno.serve
Deno.serve(async (_req: Request) => {
  const startMs = Date.now();

  try {
    // @ts-ignore
    const apiKey = Deno.env.get("QUICKET_API_KEY");
    // @ts-ignore
    const userToken = Deno.env.get("QUICKET_USER_TOKEN");
    // @ts-ignore
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    // @ts-ignore
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    // @ts-ignore
    const systemBusinessId = Deno.env.get("SYSTEM_BUSINESS_ID");
    // @ts-ignore
    const configuredSystemUserId = Deno.env.get("SYSTEM_USER_ID");

    if (!apiKey) return jsonError("QUICKET_API_KEY not configured");
    if (!supabaseUrl || !supabaseServiceKey) return jsonError("Supabase credentials not configured");
    if (!systemBusinessId) return jsonError("SYSTEM_BUSINESS_ID not configured");
    if (!configuredSystemUserId) return jsonError("SYSTEM_USER_ID not configured");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const createdByUserId = await resolveCreatedByUserId(supabase, configuredSystemUserId);
    console.log(`[Quicket] Using created_by: ${createdByUserId}`);

    // 1. Cleanup
    const cleanedUp = await cleanupOldEvents(supabase);

    // 2. Fetch all from Quicket
    const allEvents = await fetchAllEvents(apiKey);
    console.log(`[Quicket] Fetched ${allEvents.length} total events`);

    // 3. Filter: SA + city + upcoming
    const filtered = allEvents.filter((e) => {
      const country = e.locality?.levelOne?.toLowerCase()?.trim();
      if (country && country !== "south africa") return false;
      return isUpcoming(e) && matchesCity(e, CITIES);
    });
    console.log(`[Quicket] Filtered to ${filtered.length}`);

    // 4. Fetch details
    const detailById = await fetchEventDetails(apiKey, userToken ?? undefined, filtered);
    console.log(`[Quicket] Detail fetched for ${detailById.size}`);

    // 5. Map + consolidate
    const mapped = filtered
      .map((e) => mapEvent(e, detailById.get(e.id) ?? null, systemBusinessId, createdByUserId))
      .filter((r): r is EventRow => r !== null);
    const rows = consolidate(mapped);
    console.log(`[Quicket] Mapped ${mapped.length} → consolidated ${rows.length}`);

    if (rows.length === 0) {
      return jsonOk({ success: true, source: "quicket", created_by: createdByUserId, fetched: allEvents.length, filtered: filtered.length, mapped: 0, consolidated: 0, inserted: 0, updated: 0, failed: 0, cleaned_up: cleanedUp, elapsed_ms: Date.now() - startMs });
    }

    // 6. Upsert
    const { inserted, updated, failed, batchFailures } = await upsertEvents(supabase, rows);
    const elapsed = Date.now() - startMs;
    const metrics = { source: "quicket", created_by: createdByUserId, fetched: allEvents.length, filtered: filtered.length, detail_fetched: detailById.size, mapped: mapped.length, consolidated: rows.length, inserted, updated, failed, cleaned_up: cleanedUp, elapsed_ms: elapsed, timestamp: new Date().toISOString() };

    if (batchFailures.length > 0) {
      console.error("[Quicket] Upsert failures:", batchFailures);
      return new Response(JSON.stringify({ ...metrics, error: "Partial upsert failure", batch_failures: batchFailures }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    console.log("[Quicket] Ingest complete:", metrics);
    return jsonOk({ success: true, ...metrics });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Quicket] Fatal: ${message}`);
    return jsonError(message, 500);
  }
});
