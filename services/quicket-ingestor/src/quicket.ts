import {
  buildDedupeKey,
  buildLocationString,
  stripHtml,
  sleep,
  log,
} from "./utils.js";

// ---------------------------------------------------------------------------
// Types — Quicket API response
// ---------------------------------------------------------------------------

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

interface QuicketResponse {
  results: QuicketEvent[];
  pageSize: number;
  pages: number;
  records: number;
  statusCode: number;
}

export type QuicketCategorySlug =
  | "music"
  | "festivals"
  | "tech-business"
  | "arts"
  | "food-drink"
  | "community";

/** Row shape matching public.events_and_specials. */
export interface EventRow {
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

export interface FetchConfig {
  apiKey: string;
  quicketUserToken?: string;
  cities: string[];
  systemBusinessId: string;
  systemUserId: string;
  pageSize: number;
}

export interface FetchResult {
  fetchedCount: number;
  filteredCount: number;
  detailFetchedCount: number;
  mappedCount: number;
  consolidatedCount: number;
  rows: EventRow[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const QUICKET_BASE_URL = "https://api.quicket.co.za/api/events";
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [2_000, 5_000, 10_000];
const FETCH_TIMEOUT_MS = 30_000;
const MAX_PAGES = 30;

const DETAIL_TIMEOUT_MS = 8_000;
const DETAIL_MAX_RETRIES = 1;
const DETAIL_CONCURRENCY = 8;

const QUICKET_CATEGORY_LABEL_BY_SLUG: Record<QuicketCategorySlug, string> = {
  music: "Music",
  festivals: "Festivals",
  "tech-business": "Tech & Business",
  arts: "Arts",
  "food-drink": "Food & Drink",
  community: "Community",
};

const NON_CATEGORY_NAMES = new Set(["other", "general", "misc", "miscellaneous"]);

const CATEGORY_NAME_ALIASES: Record<string, QuicketCategorySlug> = {
  music: "music",
  concert: "music",
  concerts: "music",
  "live music": "music",
  "night life": "music",
  nightlife: "music",
  party: "music",
  parties: "music",
  dj: "music",

  festival: "festivals",
  festivals: "festivals",
  carnival: "festivals",
  celebrations: "festivals",
  celebration: "festivals",

  tech: "tech-business",
  technology: "tech-business",
  business: "tech-business",
  networking: "tech-business",
  "business networking": "tech-business",
  startup: "tech-business",
  "start up": "tech-business",
  "start-up": "tech-business",
  conference: "tech-business",
  summit: "tech-business",
  innovation: "tech-business",
  fintech: "tech-business",

  arts: "arts",
  art: "arts",
  culture: "arts",
  theatre: "arts",
  theater: "arts",
  comedy: "arts",
  film: "arts",
  cinema: "arts",
  dance: "arts",
  performance: "arts",
  exhibition: "arts",

  food: "food-drink",
  drinks: "food-drink",
  drink: "food-drink",
  "food and drink": "food-drink",
  "food & drink": "food-drink",
  dining: "food-drink",
  restaurant: "food-drink",
  restaurants: "food-drink",
  brunch: "food-drink",
  lunch: "food-drink",
  dinner: "food-drink",
  "wine tasting": "food-drink",
  market: "food-drink",
  markets: "food-drink",

  community: "community",
  family: "community",
  families: "community",
  charity: "community",
  fundraiser: "community",
  workshop: "community",
  workshops: "community",
  education: "community",
  school: "community",
  wellness: "community",
  health: "community",
  sports: "community",
  sport: "community",

  "health and wellness": "community",
  "sports and fitness": "community",
  "film and media": "arts",
  "travel and outdoor": "community",
  afrikaans: "arts",
  occasion: "festivals",
  "arts and culture": "arts",
  "hobbies and interests": "community",
  "business and industry": "tech-business",
  "charity and causes": "community",
  "faith and spirituality": "community",
  "family and education": "community",
  "holiday and seasonal": "festivals",
  "science and technology": "tech-business",
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
  "festivals",
  "music",
  "tech-business",
  "arts",
  "food-drink",
  "community",
];

// ---------------------------------------------------------------------------
// Helpers
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

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeJsonArray<T>(items: T[] | null | undefined): T[] | null {
  if (!Array.isArray(items) || items.length === 0) return null;
  return items.filter((item) => item != null);
}

function mergeEvents(base: QuicketEvent, detail: QuicketEvent | null): QuicketEvent {
  if (!detail) return base;
  return {
    ...base,
    ...detail,
    venue: detail.venue ?? base.venue,
    locality: detail.locality ?? base.locality,
    organiser: detail.organiser ?? base.organiser,
    categories: detail.categories ?? base.categories,
    tickets: detail.tickets ?? base.tickets,
    schedules: detail.schedules ?? base.schedules,
  };
}

function isUpcoming(event: QuicketEvent): boolean {
  const now = new Date();
  const end = toIso(event.endDate);

  if (end) {
    const endDate = new Date(end);
    if (endDate < now) return false;
  }

  const start = toIso(event.startDate);
  if (!end && start) {
    const startDate = new Date(start);
    const oneDayAgo = new Date(now.getTime() - 86_400_000);
    if (startDate < oneDayAgo) return false;
  }

  return true;
}

function matchesConfiguredCity(event: QuicketEvent, cities: string[]): boolean {
  const cityTokens = cities.map((city) => city.toLowerCase().trim()).filter(Boolean);
  if (cityTokens.length === 0) return true;

  const localityCity = event.locality?.levelThree?.toLowerCase()?.trim() ?? "";
  if (localityCity && cityTokens.some((city) => localityCity.includes(city) || city.includes(localityCity))) {
    return true;
  }

  const addr = [
    event.venue?.name,
    event.venue?.addressLine1,
    event.venue?.addressLine2,
  ]
    .filter((part): part is string => Boolean(part && part.trim().length > 0))
    .join(" ")
    .toLowerCase();

  return cityTokens.some((city) => addr.includes(city));
}

function cleanQuicketCategoryNames(
  names: Array<string | null | undefined> | null | undefined,
): string[] {
  if (!Array.isArray(names)) return [];

  return names
    .map((name) => (typeof name === "string" ? name.trim() : ""))
    .filter((name) => {
      if (!name) return false;
      return !NON_CATEGORY_NAMES.has(name.toLowerCase());
    });
}

function scoreCategory(haystack: string, category: QuicketCategorySlug): number {
  let score = 0;
  for (const keyword of CATEGORY_KEYWORDS[category] ?? []) {
    if (haystack.includes(keyword)) score += 1;
  }
  return score;
}

function selectBestCategory(scores: Map<QuicketCategorySlug, number>): QuicketCategorySlug | null {
  let best: QuicketCategorySlug | null = null;
  let bestScore = 0;

  for (const category of CATEGORY_PRECEDENCE) {
    const score = scores.get(category) ?? 0;
    if (score > bestScore) {
      best = category;
      bestScore = score;
    }
  }

  return best;
}

function deriveCategoryFromNames(names: string[]): QuicketCategorySlug | null {
  if (names.length === 0) return null;

  const directScores = new Map<QuicketCategorySlug, number>();
  for (const name of names) {
    const normalizedName = normalizeCategoryToken(name);
    if (!normalizedName) continue;

    const direct = CATEGORY_NAME_ALIASES[normalizedName];
    if (direct) {
      directScores.set(direct, (directScores.get(direct) ?? 0) + 1);
    }
  }

  const directWinner = selectBestCategory(directScores);
  if (directWinner) return directWinner;

  const patternScores = new Map<QuicketCategorySlug, number>();
  for (const name of names) {
    const normalizedName = normalizeCategoryToken(name);
    if (!normalizedName) continue;

    for (const entry of CATEGORY_NAME_PATTERNS) {
      if (entry.pattern.test(normalizedName)) {
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

  let bestCategory: QuicketCategorySlug = "community";
  let bestScore = 0;

  for (const category of CATEGORY_PRECEDENCE) {
    const score = scoreCategory(haystack, category);
    if (score > bestScore) {
      bestCategory = category;
      bestScore = score;
    }
  }

  return bestScore > 0 ? bestCategory : "community";
}

function normalizeQuicketCategory(params: {
  categoryNames?: Array<string | null | undefined> | null;
  fallbackText?: string | null;
}): { slug: QuicketCategorySlug; label: string } {
  const hasProvidedCategories = Array.isArray(params.categoryNames)
    && params.categoryNames.some((name) => normalize(name).length > 0);
  const rawNames = cleanQuicketCategoryNames(params.categoryNames);
  const slugFromNames = deriveCategoryFromNames(rawNames);
  const slug = hasProvidedCategories
    ? (slugFromNames ?? "community")
    : deriveCategoryFromText(params.fallbackText ?? "");

  return {
    slug,
    label: QUICKET_CATEGORY_LABEL_BY_SLUG[slug],
  };
}

function getTicketStats(tickets: QuicketTicket[] | null | undefined): {
  availabilityStatus: "sold_out" | "limited" | null;
  displayPrice: number | null;
  minimumTicketPrice: number | null;
  maximumTicketPrice: number | null;
  ticketsAvailableBoolean: boolean | null;
} {
  const nonDonation = (tickets ?? []).filter((ticket) => ticket?.donation !== true);
  if (nonDonation.length === 0) {
    return {
      availabilityStatus: null,
      displayPrice: null,
      minimumTicketPrice: null,
      maximumTicketPrice: null,
      ticketsAvailableBoolean: null,
    };
  }

  const priced = nonDonation
    .map((ticket) => ticket.price)
    .filter((price): price is number => isFiniteNumber(price) && price > 0);

  const availableTickets = nonDonation.filter(
    (ticket) => ticket.soldOut !== true && ticket.provisionallySoldOut !== true,
  );

  const availablePriced = availableTickets
    .map((ticket) => ticket.price)
    .filter((price): price is number => isFiniteNumber(price) && price > 0);

  const soldOutCount = nonDonation.filter(
    (ticket) => ticket.soldOut === true || ticket.provisionallySoldOut === true,
  ).length;

  const availabilityStatus: "sold_out" | "limited" | null =
    availableTickets.length === 0 ? "sold_out" : soldOutCount > 0 ? "limited" : null;

  return {
    availabilityStatus,
    displayPrice: availablePriced.length > 0 ? Math.min(...availablePriced) : null,
    minimumTicketPrice: priced.length > 0 ? Math.min(...priced) : null,
    maximumTicketPrice: priced.length > 0 ? Math.max(...priced) : null,
    ticketsAvailableBoolean: availableTickets.length > 0,
  };
}

function buildDescription(event: QuicketEvent): string | null {
  if (event.description) {
    const plain = stripHtml(event.description);
    if (plain.length > 0) return plain;
  }

  const categories = event.categories
    ?.map((category) => category.name)
    .filter((name): name is string => !!name && name.trim().length > 0 && name.toLowerCase() !== "other");
  if (categories?.length) return categories.join(" \u00b7 ");

  return null;
}

function normalizeImageUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.startsWith("//") ? `https:${value}` : value;
}

function normalizeQuicketDetailPayload(payload: unknown): QuicketEvent | null {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as Record<string, unknown>;

  if (Array.isArray(data.results) && data.results.length > 0) {
    const first = data.results[0];
    return first && typeof first === "object" ? (first as QuicketEvent) : null;
  }

  if (data.results && typeof data.results === "object" && !Array.isArray(data.results)) {
    return data.results as QuicketEvent;
  }

  if (typeof data.id === "number") {
    return data as unknown as QuicketEvent;
  }

  return null;
}

async function fetchJsonWithTimeout(
  url: string,
  timeoutMs: number,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

// ---------------------------------------------------------------------------
// Fetch a single page from Quicket
// ---------------------------------------------------------------------------

async function fetchPage(
  apiKey: string,
  pageSize: number,
  page: number,
): Promise<QuicketResponse> {
  const url = new URL(QUICKET_BASE_URL);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("pageSize", String(pageSize));
  url.searchParams.set("page", String(page));

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    try {
      const res = await fetchJsonWithTimeout(url.toString(), FETCH_TIMEOUT_MS);

      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get("retry-after") || "5", 10);
        log.warn(`Rate-limited by Quicket. Waiting ${retryAfter}s...`);
        await sleep(retryAfter * 1000);
        continue;
      }

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Quicket API ${res.status}: ${body.slice(0, 200)}`);
      }

      return (await res.json()) as QuicketResponse;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES - 1) {
        const delay = RETRY_DELAYS_MS[attempt] ?? 10_000;
        log.warn(
          `Fetch attempt ${attempt + 1} failed (page ${page}): ${lastError.message}. Retrying in ${delay}ms...`,
        );
        await sleep(delay);
      }
    }
  }

  throw lastError ?? new Error("fetchPage failed after retries");
}

// ---------------------------------------------------------------------------
// Fetch all pages from Quicket
// ---------------------------------------------------------------------------

async function fetchAllEvents(apiKey: string, pageSize: number): Promise<QuicketEvent[]> {
  const allEvents: QuicketEvent[] = [];
  let currentPage = 1;
  let totalPages = 1;

  while (currentPage <= totalPages && currentPage <= MAX_PAGES) {
    const response = await fetchPage(apiKey, pageSize, currentPage);
    const events = response.results ?? [];
    allEvents.push(...events);

    totalPages = response.pages ?? 1;
    log.info(`  Page ${currentPage}/${totalPages}: ${events.length} events (${allEvents.length} total)`);

    currentPage += 1;
    if (currentPage <= totalPages) await sleep(300);
  }

  return allEvents;
}

type DetailFetchResult =
  | { kind: "ok"; event: QuicketEvent }
  | { kind: "not_found" }
  | { kind: "unauthorized" }
  | { kind: "error"; reason: string };

function buildDetailUrls(apiKey: string, eventId: number, includeNoKeyVariants: boolean): string[] {
  const candidates = [
    `https://api.quicket.co.za/api/events/${eventId}`,
    `https://api.quicket.co.za/api/Events/${eventId}`,
  ];

  const urlsWithApiKey = candidates.map((raw) => {
    const url = new URL(raw);
    url.searchParams.set("api_key", apiKey);
    return url.toString();
  });

  if (!includeNoKeyVariants) return urlsWithApiKey;

  return [
    ...urlsWithApiKey,
    ...candidates,
  ];
}

function buildDetailHeaders(quicketUserToken?: string): HeadersInit | undefined {
  const token = quicketUserToken?.trim();
  if (!token) return undefined;
  return {
    usertoken: token,
    accept: "application/json",
  };
}

async function fetchEventDetail(
  apiKey: string,
  eventId: number,
  quicketUserToken?: string,
): Promise<DetailFetchResult> {
  const detailUrls = buildDetailUrls(apiKey, eventId, Boolean(quicketUserToken?.trim()));
  const headers = buildDetailHeaders(quicketUserToken);

  for (let attempt = 0; attempt <= DETAIL_MAX_RETRIES; attempt += 1) {
    let sawNotFound = false;
    let lastError = "";

    for (const detailUrl of detailUrls) {
      try {
        const response = await fetchJsonWithTimeout(detailUrl, DETAIL_TIMEOUT_MS, {
          headers,
        });

        if (response.status === 404) {
          sawNotFound = true;
          continue;
        }

        if (response.status === 401 || response.status === 403) {
          return { kind: "unauthorized" };
        }

        if (!response.ok) {
          lastError = `detail:${eventId}:${response.status}`;
          continue;
        }

        const payload = (await response.json()) as unknown;
        const detail = normalizeQuicketDetailPayload(payload);
        if (detail && detail.id) {
          return { kind: "ok", event: detail };
        }
      } catch (error) {
        lastError = String(error);
      }
    }

    if (sawNotFound) return { kind: "not_found" };
    if (attempt < DETAIL_MAX_RETRIES) {
      await sleep(150 * (attempt + 1));
    } else if (lastError.length > 0) {
      return { kind: "error", reason: lastError };
    }
  }

  return { kind: "error", reason: `detail:${eventId}:unknown` };
}

async function fetchEventDetails(
  apiKey: string,
  quicketUserToken: string | undefined,
  events: QuicketEvent[],
): Promise<Map<number, QuicketEvent>> {
  const detailById = new Map<number, QuicketEvent>();
  if (events.length === 0) return detailById;

  let index = 0;
  let detailAuthUnavailable = false;
  let detailFailures = 0;
  const workerCount = Math.min(DETAIL_CONCURRENCY, events.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (true) {
        if (detailAuthUnavailable) break;

        const currentIndex = index;
        index += 1;
        if (currentIndex >= events.length) break;

        const event = events[currentIndex];
        const detail = await fetchEventDetail(apiKey, event.id, quicketUserToken);

        if (detail.kind === "ok") {
          detailById.set(event.id, detail.event);
          continue;
        }

        if (detail.kind === "unauthorized") {
          if (!detailAuthUnavailable) {
            detailAuthUnavailable = true;
            log.warn(
              "Quicket detail endpoint returned 401/403. Set QUICKET_USER_TOKEN in services/quicket-ingestor/.env. Continuing with list payload only.",
            );
          }
          break;
        }

        if (detail.kind === "error") {
          detailFailures += 1;
        }
      }
    }),
  );

  if (detailFailures > 0) {
    log.warn(`Failed to fetch Quicket detail for ${detailFailures} events; using list payload fallback.`);
  }

  return detailById;
}

// ---------------------------------------------------------------------------
// Map a single Quicket event → EventRow
// ---------------------------------------------------------------------------

function mapQuicketEvent(
  baseEvent: QuicketEvent,
  detailEvent: QuicketEvent | null,
  systemBusinessId: string,
  systemUserId: string,
): EventRow | null {
  const event = mergeEvents(baseEvent, detailEvent);

  try {
    const title = event.name?.trim();
    if (!title) return null;

    const startDateIso = toIso(event.startDate);
    if (!startDateIso) return null;

    const ticketStats = getTicketStats(event.tickets);
    const category = normalizeQuicketCategory({
      categoryNames: event.categories?.map((categoryItem) => categoryItem.name),
      fallbackText: `${event.name ?? ""} ${event.description ?? ""}`,
    });

    const venueLatitude = isFiniteNumber(event.venue?.latitude) ? event.venue.latitude : null;
    const venueLongitude = isFiniteNumber(event.venue?.longitude) ? event.venue.longitude : null;

    return {
      title,
      type: "event",
      business_id: systemBusinessId,
      created_by: systemUserId,
      start_date: startDateIso,
      end_date: toIso(event.endDate),
      location: buildLocationString(
        event.venue?.name,
        event.locality?.levelThree,
        event.locality?.levelOne,
      ),
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
      quicket_event_id: isFiniteNumber(event.id) ? event.id : null,
      event_name: event.name?.trim() || null,
      event_description: event.description ?? null,
      event_url: event.url || null,
      event_image_url: normalizeImageUrl(event.imageUrl),
      event_start_date: toIso(event.startDate),
      event_end_date: toIso(event.endDate),
      event_created_at: toIso(event.dateCreated),
      event_last_modified: toIso(event.lastModified),
      venue_id: isFiniteNumber(event.venue?.id) ? event.venue.id : null,
      venue_name: event.venue?.name || null,
      venue_address_line1: event.venue?.addressLine1 || null,
      venue_address_line2: event.venue?.addressLine2 || null,
      venue_latitude: venueLatitude,
      venue_longitude: venueLongitude,
      locality_level_one: event.locality?.levelOne || null,
      locality_level_two: event.locality?.levelTwo || null,
      locality_level_three: event.locality?.levelThree || null,
      organiser_id: isFiniteNumber(event.organiser?.id) ? event.organiser.id : null,
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
  } catch (err) {
    log.warn(`Skipping malformed event "${event.name ?? event.id}": ${String(err)}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Consolidate duplicates within one fetch run
// ---------------------------------------------------------------------------

function consolidateEvents(rows: EventRow[]): EventRow[] {
  const map = new Map<string, EventRow>();

  for (const row of rows) {
    const key = buildDedupeKey(row.title, row.start_date, row.location);
    const existing = map.get(key);

    if (!existing) {
      map.set(key, { ...row });
      continue;
    }

    if (new Date(row.start_date) < new Date(existing.start_date)) existing.start_date = row.start_date;

    if (row.end_date && existing.end_date && new Date(row.end_date) > new Date(existing.end_date)) {
      existing.end_date = row.end_date;
    } else if (row.end_date && !existing.end_date) {
      existing.end_date = row.end_date;
    }

    if (row.description && (!existing.description || row.description.length > existing.description.length)) {
      existing.description = row.description;
    }

    if (
      row.event_description
      && (!existing.event_description || row.event_description.length > existing.event_description.length)
    ) {
      existing.event_description = row.event_description;
    }

    if (row.image && !existing.image) existing.image = row.image;
    if (row.event_image_url && !existing.event_image_url) existing.event_image_url = row.event_image_url;
    if (row.booking_url && !existing.booking_url) existing.booking_url = row.booking_url;
    if (row.event_url && !existing.event_url) existing.event_url = row.event_url;

    if (row.price != null && (existing.price == null || row.price < existing.price)) existing.price = row.price;

    if (row.minimum_ticket_price != null) {
      existing.minimum_ticket_price = existing.minimum_ticket_price == null
        ? row.minimum_ticket_price
        : Math.min(existing.minimum_ticket_price, row.minimum_ticket_price);
    }

    if (row.maximum_ticket_price != null) {
      existing.maximum_ticket_price = existing.maximum_ticket_price == null
        ? row.maximum_ticket_price
        : Math.max(existing.maximum_ticket_price, row.maximum_ticket_price);
    }

    if (existing.tickets_available_boolean == null) {
      existing.tickets_available_boolean = row.tickets_available_boolean;
    } else if (row.tickets_available_boolean === true) {
      existing.tickets_available_boolean = true;
    }

    if (row.availability_status === "sold_out") {
      existing.availability_status = "sold_out";
    } else if (row.availability_status === "limited" && existing.availability_status == null) {
      existing.availability_status = "limited";
    }

    if (!existing.quicket_event_id && row.quicket_event_id) existing.quicket_event_id = row.quicket_event_id;
    if (!existing.event_name && row.event_name) existing.event_name = row.event_name;

    if (!existing.event_start_date && row.event_start_date) {
      existing.event_start_date = row.event_start_date;
    } else if (existing.event_start_date && row.event_start_date) {
      existing.event_start_date = new Date(row.event_start_date) < new Date(existing.event_start_date)
        ? row.event_start_date
        : existing.event_start_date;
    }

    if (!existing.event_end_date && row.event_end_date) {
      existing.event_end_date = row.event_end_date;
    } else if (existing.event_end_date && row.event_end_date) {
      existing.event_end_date = new Date(row.event_end_date) > new Date(existing.event_end_date)
        ? row.event_end_date
        : existing.event_end_date;
    }

    if (!existing.event_created_at && row.event_created_at) {
      existing.event_created_at = row.event_created_at;
    } else if (existing.event_created_at && row.event_created_at) {
      existing.event_created_at = new Date(row.event_created_at) < new Date(existing.event_created_at)
        ? row.event_created_at
        : existing.event_created_at;
    }

    if (!existing.event_last_modified && row.event_last_modified) {
      existing.event_last_modified = row.event_last_modified;
    } else if (existing.event_last_modified && row.event_last_modified) {
      existing.event_last_modified = new Date(row.event_last_modified) > new Date(existing.event_last_modified)
        ? row.event_last_modified
        : existing.event_last_modified;
    }

    if (!existing.venue_id && row.venue_id) existing.venue_id = row.venue_id;
    if (!existing.venue_name && row.venue_name) existing.venue_name = row.venue_name;
    if (!existing.venue_address_line1 && row.venue_address_line1) existing.venue_address_line1 = row.venue_address_line1;
    if (!existing.venue_address_line2 && row.venue_address_line2) existing.venue_address_line2 = row.venue_address_line2;
    if (existing.venue_latitude == null && row.venue_latitude != null) existing.venue_latitude = row.venue_latitude;
    if (existing.venue_longitude == null && row.venue_longitude != null) existing.venue_longitude = row.venue_longitude;

    if (!existing.locality_level_one && row.locality_level_one) existing.locality_level_one = row.locality_level_one;
    if (!existing.locality_level_two && row.locality_level_two) existing.locality_level_two = row.locality_level_two;
    if (!existing.locality_level_three && row.locality_level_three) existing.locality_level_three = row.locality_level_three;

    if (!existing.organiser_id && row.organiser_id) existing.organiser_id = row.organiser_id;
    if (!existing.organiser_name && row.organiser_name) existing.organiser_name = row.organiser_name;
    if (!existing.organiser_phone && row.organiser_phone) existing.organiser_phone = row.organiser_phone;
    if (!existing.organiser_mobile && row.organiser_mobile) existing.organiser_mobile = row.organiser_mobile;
    if (!existing.organiser_facebook_url && row.organiser_facebook_url) {
      existing.organiser_facebook_url = row.organiser_facebook_url;
    }
    if (!existing.organiser_twitter_handle && row.organiser_twitter_handle) {
      existing.organiser_twitter_handle = row.organiser_twitter_handle;
    }
    if (!existing.organiser_hashtag && row.organiser_hashtag) existing.organiser_hashtag = row.organiser_hashtag;
    if (!existing.organiser_page_url && row.organiser_page_url) existing.organiser_page_url = row.organiser_page_url;

    if (!existing.quicket_categories_json && row.quicket_categories_json) {
      existing.quicket_categories_json = row.quicket_categories_json;
    }
    if (!existing.tickets_json && row.tickets_json) existing.tickets_json = row.tickets_json;
    if (!existing.schedules_json && row.schedules_json) existing.schedules_json = row.schedules_json;
  }

  return Array.from(map.values());
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

export async function fetchAndProcessAll(config: FetchConfig): Promise<FetchResult> {
  log.info("Fetching all events from Quicket...");

  const allEvents = await fetchAllEvents(config.apiKey, config.pageSize);
  log.info(`Fetched ${allEvents.length} total events from Quicket.`);

  const filtered = allEvents.filter((event) => {
    const country = event.locality?.levelOne?.toLowerCase()?.trim();
    if (country && country !== "south africa") return false;
    if (!isUpcoming(event)) return false;
    if (!matchesConfiguredCity(event, config.cities)) return false;
    return true;
  });

  log.info(
    `Filtered: ${allEvents.length} total → ${filtered.length} matching (SA + cities + upcoming).`,
  );

  const detailByEventId = await fetchEventDetails(config.apiKey, config.quicketUserToken, filtered);
  log.info(`Fetched detail payload for ${detailByEventId.size} events.`);

  const mapped = filtered
    .map((event) =>
      mapQuicketEvent(
        event,
        detailByEventId.get(event.id) ?? null,
        config.systemBusinessId,
        config.systemUserId,
      ),
    )
    .filter((row): row is EventRow => row !== null);

  log.info(`Mapped ${mapped.length} valid events.`);

  const consolidated = consolidateEvents(mapped);
  log.info(`Consolidation: ${mapped.length} mapped → ${consolidated.length} unique events.`);

  return {
    fetchedCount: allEvents.length,
    filteredCount: filtered.length,
    detailFetchedCount: detailByEventId.size,
    mappedCount: mapped.length,
    consolidatedCount: consolidated.length,
    rows: consolidated,
  };
}
