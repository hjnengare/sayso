import jwt from "jsonwebtoken";
import {
  buildDedupeKey,
  buildLocationString,
  stripHtml,
  sleep,
  log,
} from "./utils.js";

// ---------------------------------------------------------------------------
// Types — Meetup GraphQL response
// ---------------------------------------------------------------------------

interface MeetupVenue {
  name?: string;
  lat?: number;
  lon?: number;
  address?: string;
  city?: string;
  country?: string;
}

interface MeetupGroup {
  name?: string;
  urlname?: string;
  city?: string;
  country?: string;
}

interface MeetupPhoto {
  highResUrl?: string;
  baseUrl?: string;
}

interface MeetupEvent {
  id: string;
  title?: string;
  dateTime?: string;
  endTime?: string;
  description?: string;
  shortDescription?: string;
  eventUrl?: string;
  featuredEventPhoto?: MeetupPhoto;
  venue?: MeetupVenue;
  group?: MeetupGroup;
}

interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

interface SearchEdge {
  node?: {
    result?: Partial<MeetupEvent> & { __typename?: string };
  };
}

interface SearchResult {
  pageInfo: PageInfo;
  edges: SearchEdge[];
}

interface GqlResponse {
  data?: {
    keywordSearch?: SearchResult;
  };
  errors?: Array<{ message: string }>;
}

/** Row shape matching public.events_and_specials (subset handled by RPC). */
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
  price: null;
  rating: number;
  booking_url: string | null;
  booking_contact: null;
  // Venue details stored for future RPC expansion
  venue_name: string | null;
  venue_latitude: number | null;
  venue_longitude: number | null;
  // Organiser details stored for future RPC expansion
  organiser_name: string | null;
  organiser_page_url: string | null;
}

export interface FetchConfig {
  clientKey: string;
  memberId: string;
  signingSecret: string;
  systemBusinessId: string;
  systemUserId: string;
  radiusKm: number;
  pageSize: number;
  fetchWindowDays: number;
}

export interface FetchResult {
  fetchedCount: number;
  mappedCount: number;
  consolidatedCount: number;
  rows: EventRow[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MEETUP_GQL_URL = "https://api.meetup.com/gql";
const MEETUP_TOKEN_URL = "https://secure.meetup.com/oauth2/access";
const FETCH_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [2_000, 5_000, 10_000];
const MAX_PAGES = 20;

// Cape Town city centre
const CAPE_TOWN_LAT = -33.9249;
const CAPE_TOWN_LON = 18.4241;

// ---------------------------------------------------------------------------
// GraphQL query
// ---------------------------------------------------------------------------

const EVENTS_QUERY = `
  query GetEventsNearLocation(
    $lat: Float!
    $lon: Float!
    $radius: Float!
    $after: String
    $first: Int!
    $startDate: DateTime!
    $endDate: DateTime!
  ) {
    keywordSearch(
      filter: {
        lat: $lat
        lon: $lon
        radius: $radius
        source: EVENTS
        query: ""
        startDateRange: $startDate
        endDateRange: $endDate
      }
      input: { first: $first, after: $after }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          result {
            ... on Event {
              id
              title
              dateTime
              endTime
              description
              shortDescription
              eventUrl
              featuredEventPhoto {
                highResUrl
                baseUrl
              }
              venue {
                name
                lat
                lon
                address
                city
                country
              }
              group {
                name
                urlname
                city
                country
              }
            }
          }
        }
      }
    }
  }
`;

// ---------------------------------------------------------------------------
// JWT + token exchange
// ---------------------------------------------------------------------------

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

function buildSignedJwt(clientKey: string, memberId: string, signingSecret: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: memberId,
    iss: clientKey,
    aud: "api.meetup.com",
    exp: now + 60,
    iat: now,
  };

  // Normalize PEM key — env vars may have literal \n instead of real newlines
  const pem = signingSecret.replace(/\\n/g, "\n");

  return jwt.sign(payload, pem, { algorithm: "RS256" });
}

async function fetchAccessToken(
  clientKey: string,
  memberId: string,
  signingSecret: string
): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.accessToken;
  }

  const signedJwt = buildSignedJwt(clientKey, memberId, signingSecret);

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: signedJwt,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(MEETUP_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Meetup token exchange failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  const accessToken = data.access_token;
  if (!accessToken) {
    throw new Error("Meetup token exchange returned no access_token");
  }

  const expiresIn = typeof data.expires_in === "number" ? data.expires_in : 3600;
  tokenCache = {
    accessToken,
    expiresAt: Date.now() + expiresIn * 1000,
  };

  log.info("Meetup access token obtained.");
  return accessToken;
}

// ---------------------------------------------------------------------------
// GraphQL request
// ---------------------------------------------------------------------------

async function gqlRequest(
  accessToken: string,
  variables: Record<string, unknown>
): Promise<GqlResponse> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      let res: Response;
      try {
        res = await fetch(MEETUP_GQL_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ query: EVENTS_QUERY, variables }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get("retry-after") || "5", 10);
        log.warn(`Rate-limited by Meetup. Waiting ${retryAfter}s...`);
        await sleep(retryAfter * 1000);
        continue;
      }

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Meetup GQL ${res.status}: ${body.slice(0, 200)}`);
      }

      return (await res.json()) as GqlResponse;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES - 1) {
        const delay = RETRY_DELAYS_MS[attempt] ?? 10_000;
        log.warn(`GQL attempt ${attempt + 1} failed: ${lastError.message}. Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  throw lastError ?? new Error("gqlRequest failed after retries");
}

// ---------------------------------------------------------------------------
// Fetch all pages
// ---------------------------------------------------------------------------

async function fetchAllEvents(config: FetchConfig): Promise<MeetupEvent[]> {
  const accessToken = await fetchAccessToken(
    config.clientKey,
    config.memberId,
    config.signingSecret
  );

  const now = new Date();
  const endWindow = new Date(now.getTime() + config.fetchWindowDays * 24 * 60 * 60 * 1000);

  const allEvents: MeetupEvent[] = [];
  let cursor: string | null = null;
  let page = 0;

  while (page < MAX_PAGES) {
    const variables: Record<string, unknown> = {
      lat: CAPE_TOWN_LAT,
      lon: CAPE_TOWN_LON,
      radius: config.radiusKm,
      first: config.pageSize,
      after: cursor,
      startDate: now.toISOString(),
      endDate: endWindow.toISOString(),
    };

    const response = await gqlRequest(accessToken, variables);

    if (response.errors && response.errors.length > 0) {
      throw new Error(`Meetup GQL errors: ${response.errors.map((e) => e.message).join(", ")}`);
    }

    const search = response.data?.keywordSearch;
    if (!search) break;

    const events = (search.edges ?? [])
      .map((edge) => edge.node?.result)
      .filter((result): result is MeetupEvent => {
        // Only keep actual Event nodes (not Groups etc.)
        return !!result && typeof result.id === "string" && result.id.length > 0;
      });

    allEvents.push(...events);

    log.info(`  Page ${page + 1}: ${events.length} events (${allEvents.length} total so far).`);

    if (!search.pageInfo.hasNextPage || !search.pageInfo.endCursor) break;
    cursor = search.pageInfo.endCursor;
    page++;

    if (page < MAX_PAGES) await sleep(300);
  }

  return allEvents;
}

// ---------------------------------------------------------------------------
// Map a single Meetup event → EventRow
// ---------------------------------------------------------------------------

function resolveImage(photo: MeetupPhoto | undefined): string | null {
  return photo?.highResUrl ?? photo?.baseUrl ?? null;
}

function resolveDescription(event: MeetupEvent): string | null {
  if (event.description) {
    const plain = stripHtml(event.description);
    if (plain.length > 0) return plain;
  }
  if (event.shortDescription) {
    const plain = stripHtml(event.shortDescription);
    if (plain.length > 0) return plain;
  }
  return null;
}

function resolveGroupUrl(group: MeetupGroup | undefined): string | null {
  if (!group?.urlname) return null;
  return `https://www.meetup.com/${group.urlname}/`;
}

function mapMeetupEvent(
  event: MeetupEvent,
  systemBusinessId: string,
  systemUserId: string
): EventRow | null {
  try {
    const title = event.title?.trim();
    if (!title) return null;

    const startDate = event.dateTime ? new Date(event.dateTime).toISOString() : null;
    if (!startDate) return null;

    const endDate = event.endTime ? new Date(event.endTime).toISOString() : null;

    const venue = event.venue;
    const group = event.group;

    const location = buildLocationString(
      venue?.name,
      venue?.city ?? group?.city,
      venue?.country ?? group?.country
    );

    const venueLatitude =
      typeof venue?.lat === "number" && isFinite(venue.lat) ? venue.lat : null;
    const venueLongitude =
      typeof venue?.lon === "number" && isFinite(venue.lon) ? venue.lon : null;

    return {
      title,
      type: "event",
      business_id: systemBusinessId,
      created_by: systemUserId,
      start_date: startDate,
      end_date: endDate,
      location,
      description: resolveDescription(event),
      icon: "meetup",
      image: resolveImage(event.featuredEventPhoto),
      price: null,
      rating: 0,
      booking_url: event.eventUrl ?? null,
      booking_contact: null,
      venue_name: venue?.name ?? null,
      venue_latitude: venueLatitude,
      venue_longitude: venueLongitude,
      organiser_name: group?.name ?? null,
      organiser_page_url: resolveGroupUrl(group),
    };
  } catch (err) {
    log.warn(`Skipping malformed event "${event.title ?? event.id}": ${String(err)}`);
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

    // Keep earliest start_date
    if (new Date(row.start_date) < new Date(existing.start_date)) {
      existing.start_date = row.start_date;
    }

    // Keep latest end_date
    if (row.end_date && existing.end_date) {
      if (new Date(row.end_date) > new Date(existing.end_date)) {
        existing.end_date = row.end_date;
      }
    } else if (row.end_date && !existing.end_date) {
      existing.end_date = row.end_date;
    }

    // Keep richest description
    if (
      row.description &&
      (!existing.description || row.description.length > existing.description.length)
    ) {
      existing.description = row.description;
    }

    // Keep first non-null image
    if (row.image && !existing.image) existing.image = row.image;

    // Keep first non-null booking URL
    if (row.booking_url && !existing.booking_url) existing.booking_url = row.booking_url;

    // Keep venue coords if missing
    if (existing.venue_latitude == null && row.venue_latitude != null) {
      existing.venue_latitude = row.venue_latitude;
    }
    if (existing.venue_longitude == null && row.venue_longitude != null) {
      existing.venue_longitude = row.venue_longitude;
    }
  }

  return Array.from(map.values());
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

export async function fetchAndProcessAll(config: FetchConfig): Promise<FetchResult> {
  log.info("Fetching events from Meetup GraphQL API...");
  log.info(`Location: Cape Town (${CAPE_TOWN_LAT}, ${CAPE_TOWN_LON}), radius: ${config.radiusKm}km`);

  const allEvents = await fetchAllEvents(config);
  log.info(`Fetched ${allEvents.length} total events from Meetup.`);

  const mapped = allEvents
    .map((e) => mapMeetupEvent(e, config.systemBusinessId, config.systemUserId))
    .filter((r): r is EventRow => r !== null);

  log.info(`Mapped ${mapped.length} valid events.`);

  const consolidated = consolidateEvents(mapped);
  log.info(`Consolidation: ${mapped.length} mapped → ${consolidated.length} unique events.`);

  return {
    fetchedCount: allEvents.length,
    mappedCount: mapped.length,
    consolidatedCount: consolidated.length,
    rows: consolidated,
  };
}
