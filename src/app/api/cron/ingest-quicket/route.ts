import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

interface QuicketCategory {
  id?: number;
  name?: string;
}

interface QuicketTicket {
  id?: number;
  name?: string;
  soldOut?: boolean;
  provisionallySoldOut?: boolean;
  price?: number;
  salesStart?: string;
  salesEnd?: string;
  description?: string;
  donation?: boolean;
  vendorTicket?: boolean;
}

interface QuicketSchedule {
  id?: number;
  name?: string;
  startDate?: string;
  endDate?: string;
}

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
  availability_status: "sold_out" | "limited" | null;
  quicket_category_slug: QuicketCategorySlug | null;
  quicket_category_label: string | null;
  quicket_event_id: number | null;
  event_name: string | null;
  event_description: string | null;
  event_url: string | null;
  event_image_url: string | null;
  event_start_date: string | null;
  event_end_date: string | null;
  event_created_at: string | null;
  event_last_modified: string | null;
  venue_id: number | null;
  venue_name: string | null;
  venue_address_line1: string | null;
  venue_address_line2: string | null;
  venue_latitude: number | null;
  venue_longitude: number | null;
  locality_level_one: string | null;
  locality_level_two: string | null;
  locality_level_three: string | null;
  organiser_id: number | null;
  organiser_name: string | null;
  organiser_phone: string | null;
  organiser_mobile: string | null;
  organiser_facebook_url: string | null;
  organiser_twitter_handle: string | null;
  organiser_hashtag: string | null;
  organiser_page_url: string | null;
  quicket_categories_json: QuicketCategory[] | null;
  tickets_json: QuicketTicket[] | null;
  minimum_ticket_price: number | null;
  maximum_ticket_price: number | null;
  tickets_available_boolean: boolean | null;
  schedules_json: QuicketSchedule[] | null;
  guestlist_count: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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

const CATEGORY_LABEL: Record<QuicketCategorySlug, string> = {
  music: "Music",
  festivals: "Festivals",
  "tech-business": "Tech & Business",
  arts: "Arts",
  "food-drink": "Food & Drink",
  community: "Community",
};

const NON_CATEGORY_NAMES = new Set(["other", "general", "misc", "miscellaneous"]);

const CATEGORY_NAME_ALIASES: Record<string, QuicketCategorySlug> = {
  music: "music", concert: "music", concerts: "music", "live music": "music",
  "night life": "music", nightlife: "music", party: "music", parties: "music", dj: "music",
  festival: "festivals", festivals: "festivals", carnival: "festivals",
  celebrations: "festivals", celebration: "festivals",
  tech: "tech-business", technology: "tech-business", business: "tech-business",
  networking: "tech-business", "business networking": "tech-business",
  startup: "tech-business", "start up": "tech-business", "start-up": "tech-business",
  conference: "tech-business", summit: "tech-business", innovation: "tech-business",
  fintech: "tech-business",
  arts: "arts", art: "arts", culture: "arts", theatre: "arts", theater: "arts",
  comedy: "arts", film: "arts", cinema: "arts", dance: "arts", performance: "arts",
  exhibition: "arts",
  food: "food-drink", drinks: "food-drink", drink: "food-drink",
  "food and drink": "food-drink", "food & drink": "food-drink", dining: "food-drink",
  restaurant: "food-drink", restaurants: "food-drink", brunch: "food-drink",
  lunch: "food-drink", dinner: "food-drink", "wine tasting": "food-drink",
  market: "food-drink", markets: "food-drink",
  community: "community", family: "community", families: "community",
  charity: "community", fundraiser: "community", workshop: "community",
  workshops: "community", education: "community", school: "community",
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
  { pattern: /\b(occasion|holiday|seasonal)\b/, slug: "festivals" },
];

const CATEGORY_KEYWORDS: Record<QuicketCategorySlug, string[]> = {
  festivals: ["festival", "fest", "carnival", "celebration", "block party", "street party"],
  music: ["music", "concert", "live music", "live show", "dj", "band", "orchestra", "choir", "gig", "jazz", "rock", "hip hop", "hip-hop", "house", "electronic"],
  "tech-business": ["tech", "technology", "business", "startup", "start-up", "entrepreneur", "entrepreneurship", "networking", "conference", "summit", "innovation", "digital", "fintech", "ai"],
  arts: ["art", "arts", "culture", "cultural", "theatre", "theater", "comedy", "film", "cinema", "dance", "poetry", "spoken word", "gallery", "exhibition", "performance"],
  "food-drink": ["food", "drink", "wine", "beer", "cocktail", "dining", "dinner", "lunch", "brunch", "culinary", "tasting", "restaurant", "market"],
  community: ["community", "family", "charity", "fundraiser", "network", "wellness", "health", "faith", "church", "school", "education", "workshop"],
};

const CATEGORY_PRECEDENCE: QuicketCategorySlug[] = [
  "festivals", "music", "tech-business", "arts", "food-drink", "community",
];

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function normalizeCategoryToken(value: string | null | undefined): string {
  return normalize(value)
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toIso(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

function isFiniteNum(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeJsonArray<T>(items: T[] | null | undefined): T[] | null {
  if (!Array.isArray(items) || items.length === 0) return null;
  return items.filter((item) => item != null);
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

function buildLocationString(
  venueName: string | null | undefined,
  city: string | null | undefined,
  country: string | null | undefined,
): string | null {
  const parts = [venueName, city, country].filter(
    (p): p is string => typeof p === "string" && p.trim().length > 0,
  );
  return parts.length > 0 ? parts.join(" \u2022 ") : null;
}

function normalizeImageUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.startsWith("//") ? `https:${value}` : value;
}

// ---------------------------------------------------------------------------
// Category resolution
// ---------------------------------------------------------------------------

function selectBestCategory(scores: Map<QuicketCategorySlug, number>): QuicketCategorySlug | null {
  let best: QuicketCategorySlug | null = null;
  let bestScore = 0;
  for (const category of CATEGORY_PRECEDENCE) {
    const score = scores.get(category) ?? 0;
    if (score > bestScore) { best = category; bestScore = score; }
  }
  return best;
}

function deriveCategoryFromNames(names: string[]): QuicketCategorySlug | null {
  if (names.length === 0) return null;
  const directScores = new Map<QuicketCategorySlug, number>();
  for (const name of names) {
    const norm = normalizeCategoryToken(name);
    const direct = CATEGORY_NAME_ALIASES[norm];
    if (direct) directScores.set(direct, (directScores.get(direct) ?? 0) + 1);
  }
  const directWinner = selectBestCategory(directScores);
  if (directWinner) return directWinner;

  const patternScores = new Map<QuicketCategorySlug, number>();
  for (const name of names) {
    const norm = normalizeCategoryToken(name);
    for (const entry of CATEGORY_NAME_PATTERNS) {
      if (entry.pattern.test(norm)) {
        patternScores.set(entry.slug, (patternScores.get(entry.slug) ?? 0) + 1);
        break;
      }
    }
  }
  return selectBestCategory(patternScores);
}

function deriveCategoryFromText(input: string | null | undefined): QuicketCategorySlug {
  const haystack = normalize(input);
  if (!haystack) return "community";
  let best: QuicketCategorySlug = "community";
  let bestScore = 0;
  for (const category of CATEGORY_PRECEDENCE) {
    let score = 0;
    for (const keyword of CATEGORY_KEYWORDS[category] ?? []) {
      if (haystack.includes(keyword)) score++;
    }
    if (score > bestScore) { best = category; bestScore = score; }
  }
  return bestScore > 0 ? best : "community";
}

function resolveCategory(event: QuicketEvent): { slug: QuicketCategorySlug; label: string } {
  const rawNames = (event.categories ?? [])
    .map((c) => (typeof c.name === "string" ? c.name.trim() : ""))
    .filter((n) => n.length > 0 && !NON_CATEGORY_NAMES.has(n.toLowerCase()));

  const hasProvidedCategories = rawNames.length > 0;
  const slug = hasProvidedCategories
    ? (deriveCategoryFromNames(rawNames) ?? "community")
    : deriveCategoryFromText(`${event.name ?? ""} ${event.description ?? ""}`);

  return { slug, label: CATEGORY_LABEL[slug] };
}

// ---------------------------------------------------------------------------
// Ticket stats
// ---------------------------------------------------------------------------

function getTicketStats(tickets: QuicketTicket[] | null | undefined) {
  const nonDonation = (tickets ?? []).filter((t) => t?.donation !== true);
  if (nonDonation.length === 0) {
    return { availabilityStatus: null, displayPrice: null, minimumTicketPrice: null, maximumTicketPrice: null, ticketsAvailableBoolean: null };
  }
  const priced = nonDonation
    .map((t) => t.price)
    .filter((p): p is number => isFiniteNum(p) && p > 0);
  const available = nonDonation.filter((t) => t.soldOut !== true && t.provisionallySoldOut !== true);
  const availablePriced = available.map((t) => t.price).filter((p): p is number => isFiniteNum(p) && p > 0);
  const soldOutCount = nonDonation.filter((t) => t.soldOut === true || t.provisionallySoldOut === true).length;
  const availabilityStatus: "sold_out" | "limited" | null =
    available.length === 0 ? "sold_out" : soldOutCount > 0 ? "limited" : null;
  return {
    availabilityStatus,
    displayPrice: availablePriced.length > 0 ? Math.min(...availablePriced) : null,
    minimumTicketPrice: priced.length > 0 ? Math.min(...priced) : null,
    maximumTicketPrice: priced.length > 0 ? Math.max(...priced) : null,
    ticketsAvailableBoolean: available.length > 0,
  };
}

// ---------------------------------------------------------------------------
// Event filtering
// ---------------------------------------------------------------------------

function isUpcoming(event: QuicketEvent): boolean {
  const now = new Date();
  const end = toIso(event.endDate);
  if (end && new Date(end) < now) return false;
  const start = toIso(event.startDate);
  if (!end && start && new Date(start) < new Date(now.getTime() - 86_400_000)) return false;
  return true;
}

function matchesCity(event: QuicketEvent, cities: string[]): boolean {
  const cityTokens = cities.map((c) => c.toLowerCase().trim()).filter(Boolean);
  if (cityTokens.length === 0) return true;
  const localityCity = event.locality?.levelThree?.toLowerCase()?.trim() ?? "";
  if (localityCity && cityTokens.some((c) => localityCity.includes(c) || c.includes(localityCity))) return true;
  const addr = [event.venue?.name, event.venue?.addressLine1, event.venue?.addressLine2]
    .filter((p): p is string => Boolean(p?.trim()))
    .join(" ")
    .toLowerCase();
  return cityTokens.some((c) => addr.includes(c));
}

// ---------------------------------------------------------------------------
// Description
// ---------------------------------------------------------------------------

function buildDescription(event: QuicketEvent): string | null {
  if (event.description) {
    const plain = stripHtml(event.description);
    if (plain.length > 0) return plain;
  }
  const cats = (event.categories ?? [])
    .map((c) => c.name)
    .filter((n): n is string => !!n && n.trim().length > 0 && n.toLowerCase() !== "other");
  if (cats.length) return cats.join(" \u00b7 ");
  return null;
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

async function fetchWithTimeout(url: string, timeoutMs: number, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(id);
  }
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
      if (res.status === 429) {
        const wait = parseInt(res.headers.get("retry-after") || "5", 10);
        await sleep(wait * 1000);
        continue;
      }
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
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages && page <= MAX_PAGES) {
    const resp = await fetchListPage(apiKey, page);
    all.push(...(resp.results ?? []));
    totalPages = resp.pages ?? 1;
    page++;
    if (page <= totalPages) await sleep(300);
  }
  return all;
}

function normalizeDetailPayload(payload: unknown): QuicketEvent | null {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as Record<string, unknown>;
  if (Array.isArray(data.results) && data.results.length > 0) {
    const first = data.results[0];
    return first && typeof first === "object" ? (first as QuicketEvent) : null;
  }
  if (data.results && typeof data.results === "object" && !Array.isArray(data.results)) return data.results as QuicketEvent;
  if (typeof data.id === "number") return data as unknown as QuicketEvent;
  return null;
}

type DetailResult =
  | { kind: "ok"; event: QuicketEvent }
  | { kind: "not_found" }
  | { kind: "unauthorized" }
  | { kind: "error"; reason: string };

async function fetchEventDetail(apiKey: string, eventId: number, userToken?: string): Promise<DetailResult> {
  const candidates = [
    `https://api.quicket.co.za/api/events/${eventId}`,
    `https://api.quicket.co.za/api/Events/${eventId}`,
  ].flatMap((raw) => {
    const withKey = new URL(raw);
    withKey.searchParams.set("api_key", apiKey);
    return userToken ? [withKey.toString(), raw] : [withKey.toString()];
  });

  const headers: HeadersInit | undefined = userToken?.trim()
    ? { usertoken: userToken.trim(), accept: "application/json" }
    : undefined;

  let sawNotFound = false;
  let lastError = "";

  for (const url of candidates) {
    try {
      const res = await fetchWithTimeout(url, DETAIL_TIMEOUT_MS, { headers });
      if (res.status === 404) { sawNotFound = true; continue; }
      if (res.status === 401 || res.status === 403) return { kind: "unauthorized" };
      if (!res.ok) { lastError = `${eventId}:${res.status}`; continue; }
      const detail = normalizeDetailPayload(await res.json());
      if (detail?.id) return { kind: "ok", event: detail };
    } catch (err) {
      lastError = String(err);
    }
  }

  if (sawNotFound) return { kind: "not_found" };
  return { kind: "error", reason: lastError || `${eventId}:unknown` };
}

async function fetchEventDetails(apiKey: string, userToken: string | undefined, events: QuicketEvent[]): Promise<Map<number, QuicketEvent>> {
  const detailById = new Map<number, QuicketEvent>();
  if (events.length === 0) return detailById;

  let index = 0;
  let authUnavailable = false;

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

// ---------------------------------------------------------------------------
// Map + consolidate
// ---------------------------------------------------------------------------

function mapEvent(base: QuicketEvent, detail: QuicketEvent | null, bizId: string, userId: string): EventRow | null {
  const event = detail ? { ...base, ...detail, venue: detail.venue ?? base.venue, locality: detail.locality ?? base.locality, organiser: detail.organiser ?? base.organiser, categories: detail.categories ?? base.categories, tickets: detail.tickets ?? base.tickets, schedules: detail.schedules ?? base.schedules } : base;

  const title = event.name?.trim();
  if (!title) return null;
  const startDateIso = toIso(event.startDate);
  if (!startDateIso) return null;

  const ticketStats = getTicketStats(event.tickets);
  const category = resolveCategory(event);
  const venueLatitude = isFiniteNum(event.venue?.latitude) ? event.venue!.latitude! : null;
  const venueLongitude = isFiniteNum(event.venue?.longitude) ? event.venue!.longitude! : null;

  return {
    title,
    type: "event",
    business_id: bizId,
    created_by: userId,
    start_date: startDateIso,
    end_date: toIso(event.endDate),
    location: buildLocationString(event.venue?.name, event.locality?.levelThree, event.locality?.levelOne),
    description: buildDescription(event),
    icon: "quicket",
    image: normalizeImageUrl(event.imageUrl),
    price: ticketStats.displayPrice,
    rating: 0,
    booking_url: event.url || null,
    booking_contact: null,
    availability_status: ticketStats.availabilityStatus,
    quicket_category_slug: category.slug,
    quicket_category_label: category.label,
    quicket_event_id: isFiniteNum(event.id) ? event.id : null,
    event_name: event.name?.trim() || null,
    event_description: event.description ?? null,
    event_url: event.url || null,
    event_image_url: normalizeImageUrl(event.imageUrl),
    event_start_date: toIso(event.startDate),
    event_end_date: toIso(event.endDate),
    event_created_at: toIso(event.dateCreated),
    event_last_modified: toIso(event.lastModified),
    venue_id: isFiniteNum(event.venue?.id) ? event.venue!.id! : null,
    venue_name: event.venue?.name || null,
    venue_address_line1: event.venue?.addressLine1 || null,
    venue_address_line2: event.venue?.addressLine2 || null,
    venue_latitude: venueLatitude,
    venue_longitude: venueLongitude,
    locality_level_one: event.locality?.levelOne || null,
    locality_level_two: event.locality?.levelTwo || null,
    locality_level_three: event.locality?.levelThree || null,
    organiser_id: isFiniteNum(event.organiser?.id) ? event.organiser!.id! : null,
    organiser_name: event.organiser?.name || null,
    organiser_phone: event.organiser?.phone || null,
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
    if (row.minimum_ticket_price != null) ex.minimum_ticket_price = ex.minimum_ticket_price == null ? row.minimum_ticket_price : Math.min(ex.minimum_ticket_price, row.minimum_ticket_price);
    if (row.maximum_ticket_price != null) ex.maximum_ticket_price = ex.maximum_ticket_price == null ? row.maximum_ticket_price : Math.max(ex.maximum_ticket_price, row.maximum_ticket_price);
    if (ex.tickets_available_boolean == null) ex.tickets_available_boolean = row.tickets_available_boolean;
    else if (row.tickets_available_boolean === true) ex.tickets_available_boolean = true;
    if (row.availability_status === "sold_out") ex.availability_status = "sold_out";
    else if (row.availability_status === "limited" && ex.availability_status == null) ex.availability_status = "limited";
  }
  return Array.from(map.values());
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function resolveCreatedByUserId(supabase: ReturnType<typeof createClient<any>>, userId: string): Promise<string> {
  if (!UUID_PATTERN.test(userId.trim())) throw new Error(`Invalid SYSTEM_USER_ID: ${userId}`);
  try {
    const { data, error } = await (supabase as any).schema("auth").from("users").select("id").eq("id", userId).maybeSingle();
    if (!error && data?.id) return userId;
  } catch {}
  const { data: profile } = await supabase.from("profiles").select("user_id").eq("user_id", userId).maybeSingle();
  if ((profile as { user_id?: string } | null)?.user_id) return userId;
  throw new Error(`SYSTEM_USER_ID not found in auth.users/profiles: ${userId}`);
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const auth = req.headers.get("authorization");
      if (auth !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const apiKey = process.env.QUICKET_API_KEY;
    const userToken = process.env.QUICKET_USER_TOKEN;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bizId = process.env.SYSTEM_BUSINESS_ID;
    const configuredUserId = process.env.SYSTEM_USER_ID;

    if (!apiKey || !supabaseUrl || !serviceKey || !bizId || !configuredUserId) {
      return NextResponse.json({ error: "Missing env vars" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const createdByUserId = await resolveCreatedByUserId(supabase, configuredUserId);
    console.log(`[Cron/Quicket] Using created_by: ${createdByUserId}`);

    // 1. Cleanup expired Quicket events
    const cutoff = new Date(Date.now() - 86_400_000).toISOString();
    await supabase.from("events_and_specials").delete().eq("icon", "quicket").eq("type", "event").lt("end_date", cutoff);
    await supabase.from("events_and_specials").delete().eq("icon", "quicket").eq("type", "event").is("end_date", null).lt("start_date", cutoff);

    // 2. Fetch all from Quicket, filter to SA + cities + upcoming
    const allEvents = await fetchAllEvents(apiKey);
    console.log(`[Cron/Quicket] Fetched ${allEvents.length} total events`);

    const filtered = allEvents.filter(
      (e) => {
        const country = e.locality?.levelOne?.toLowerCase()?.trim();
        if (country && country !== "south africa") return false;
        return isUpcoming(e) && matchesCity(e, CITIES);
      }
    );
    console.log(`[Cron/Quicket] Filtered to ${filtered.length} (SA + ${CITIES.join(",")} + upcoming)`);

    // 3. Fetch event details concurrently
    const detailById = await fetchEventDetails(apiKey, userToken, filtered);
    console.log(`[Cron/Quicket] Fetched detail for ${detailById.size} events`);

    // 4. Map + consolidate
    const mapped = filtered
      .map((e) => mapEvent(e, detailById.get(e.id) ?? null, bizId, createdByUserId))
      .filter((r): r is EventRow => r !== null);
    const rows = consolidate(mapped);
    console.log(`[Cron/Quicket] Mapped ${mapped.length} → consolidated ${rows.length}`);

    if (rows.length === 0) {
      return NextResponse.json({ source: "quicket", fetched: allEvents.length, filtered: filtered.length, mapped: 0, consolidated: 0, inserted: 0, updated: 0, failed: 0 });
    }

    // 5. Upsert in batches
    let inserted = 0;
    let updated = 0;
    const batchFailures: Array<{ batch: number; rows: number; message: string }> = [];

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const { data, error } = await supabase.rpc("upsert_events_and_specials_consolidated", { p_rows: batch });
      if (error) {
        batchFailures.push({ batch: batchNum, rows: batch.length, message: error.message });
        console.error(`[Cron/Quicket] Batch ${batchNum} failed:`, error.message);
        continue;
      }
      const first = Array.isArray(data) ? data[0] : data;
      inserted += Number(first?.inserted ?? 0);
      updated += Number(first?.updated ?? 0);
    }

    const result = {
      source: "quicket",
      created_by: createdByUserId,
      fetched: allEvents.length,
      filtered: filtered.length,
      detail_fetched: detailById.size,
      mapped: mapped.length,
      consolidated: rows.length,
      inserted,
      updated,
      failed: Math.max(0, rows.length - inserted - updated),
    };

    if (batchFailures.length > 0) {
      console.error("[Cron/Quicket] Upsert failures:", batchFailures);
      return NextResponse.json({ ...result, error: "Partial upsert failure", batch_failures: batchFailures }, { status: 500 });
    }

    console.log("[Cron/Quicket] Ingest complete:", result);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Cron/Quicket] Fatal:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
