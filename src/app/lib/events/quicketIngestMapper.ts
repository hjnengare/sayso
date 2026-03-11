import { normalizeQuicketCategory, type QuicketCategorySlug } from "@/app/lib/events/quicketCategory";

export interface QuicketVenue {
  id?: number;
  name?: string;
  addressLine1?: string;
  addressLine2?: string;
  latitude?: number;
  longitude?: number;
}

export interface QuicketLocality {
  levelOne?: string;
  levelTwo?: string;
  levelThree?: string;
}

export interface QuicketOrganiser {
  id?: number;
  name?: string;
  phone?: string;
  mobile?: string;
  facebookUrl?: string;
  twitterHandle?: string;
  hashTag?: string;
  organiserPageUrl?: string;
}

export interface QuicketCategory {
  id?: number;
  name?: string;
}

export interface QuicketTicket {
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

export interface QuicketSchedule {
  id?: number;
  name?: string;
  startDate?: string;
  endDate?: string;
}

export interface QuicketEvent {
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

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function buildDedupeKey(title: string, startDate: string, location: string | null): string {
  return `${normalizeText(title)}|${startDate.slice(0, 10)}|${normalizeText(location)}`;
}

function buildLocation(
  venue?: string | null,
  city?: string | null,
  country?: string | null,
): string | null {
  const parts = [venue, city, country].filter(
    (part): part is string => typeof part === "string" && part.trim().length > 0,
  );
  return parts.length > 0 ? parts.join(" \u2022 ") : null;
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

export function getTicketStats(tickets: QuicketTicket[] | null | undefined): {
  availabilityStatus: "sold_out" | "limited" | null;
  displayPrice: number | null;
  minimumTicketPrice: number | null;
  maximumTicketPrice: number | null;
  ticketsAvailableBoolean: boolean | null;
} {
  const nonDonationTickets = (tickets ?? []).filter((ticket) => ticket?.donation !== true);
  if (nonDonationTickets.length === 0) {
    return {
      availabilityStatus: null,
      displayPrice: null,
      minimumTicketPrice: null,
      maximumTicketPrice: null,
      ticketsAvailableBoolean: null,
    };
  }

  const pricedTickets = nonDonationTickets
    .map((ticket) => ticket.price)
    .filter((price): price is number => isFiniteNumber(price) && price > 0);

  const availableTickets = nonDonationTickets.filter(
    (ticket) => ticket.soldOut !== true && ticket.provisionallySoldOut !== true,
  );

  const availablePricedTickets = availableTickets
    .map((ticket) => ticket.price)
    .filter((price): price is number => isFiniteNumber(price) && price > 0);

  const soldOutCount = nonDonationTickets.filter(
    (ticket) => ticket.soldOut === true || ticket.provisionallySoldOut === true,
  ).length;

  const availabilityStatus: "sold_out" | "limited" | null =
    availableTickets.length === 0 ? "sold_out" : soldOutCount > 0 ? "limited" : null;

  return {
    availabilityStatus,
    displayPrice: availablePricedTickets.length > 0 ? Math.min(...availablePricedTickets) : null,
    minimumTicketPrice: pricedTickets.length > 0 ? Math.min(...pricedTickets) : null,
    maximumTicketPrice: pricedTickets.length > 0 ? Math.max(...pricedTickets) : null,
    ticketsAvailableBoolean: availableTickets.length > 0,
  };
}

export function mapEvent(
  baseEvent: QuicketEvent,
  detailEvent: QuicketEvent | null,
  businessId: string,
  userId: string,
): EventRow | null {
  const merged = mergeEvents(baseEvent, detailEvent);
  const title = merged.name?.trim();
  if (!title) return null;

  const startDate = toIso(merged.startDate);
  if (!startDate) return null;

  const ticketStats = getTicketStats(merged.tickets);
  const category = normalizeQuicketCategory({
    categoryNames: merged.categories?.map((item) => item.name),
    fallbackText: `${merged.name ?? ""} ${merged.description ?? ""}`,
  });

  const venueLatitude = isFiniteNumber(merged.venue?.latitude) ? merged.venue.latitude : null;
  const venueLongitude = isFiniteNumber(merged.venue?.longitude) ? merged.venue.longitude : null;

  return {
    title,
    type: "event",
    business_id: businessId,
    created_by: userId,
    start_date: startDate,
    end_date: toIso(merged.endDate),
    location: buildLocation(merged.venue?.name, merged.locality?.levelThree, merged.locality?.levelOne),
    description: buildDescription(merged),
    icon: "quicket",
    image: normalizeImageUrl(merged.imageUrl),
    price: ticketStats.displayPrice,
    rating: 0,
    booking_url: merged.url || null,
    booking_contact: null,
    availability_status: ticketStats.availabilityStatus,
    quicket_category_slug: category.slug,
    quicket_category_label: category.label,
    quicket_event_id: isFiniteNumber(merged.id) ? merged.id : null,
    event_name: merged.name?.trim() || null,
    event_description: merged.description ?? null,
    event_url: merged.url || null,
    event_image_url: normalizeImageUrl(merged.imageUrl),
    event_start_date: toIso(merged.startDate),
    event_end_date: toIso(merged.endDate),
    event_created_at: toIso(merged.dateCreated),
    event_last_modified: toIso(merged.lastModified),
    venue_id: isFiniteNumber(merged.venue?.id) ? merged.venue.id : null,
    venue_name: merged.venue?.name || null,
    venue_address_line1: merged.venue?.addressLine1 || null,
    venue_address_line2: merged.venue?.addressLine2 || null,
    venue_latitude: venueLatitude,
    venue_longitude: venueLongitude,
    locality_level_one: merged.locality?.levelOne || null,
    locality_level_two: merged.locality?.levelTwo || null,
    locality_level_three: merged.locality?.levelThree || null,
    organiser_id: isFiniteNumber(merged.organiser?.id) ? merged.organiser.id : null,
    organiser_name: merged.organiser?.name || null,
    organiser_phone: merged.organiser?.phone || null,
    organiser_mobile: merged.organiser?.mobile || null,
    organiser_facebook_url: merged.organiser?.facebookUrl || null,
    organiser_twitter_handle: merged.organiser?.twitterHandle || null,
    organiser_hashtag: merged.organiser?.hashTag || null,
    organiser_page_url: merged.organiser?.organiserPageUrl || null,
    quicket_categories_json: normalizeJsonArray(merged.categories),
    tickets_json: normalizeJsonArray(merged.tickets),
    minimum_ticket_price: ticketStats.minimumTicketPrice,
    maximum_ticket_price: ticketStats.maximumTicketPrice,
    tickets_available_boolean: ticketStats.ticketsAvailableBoolean,
    schedules_json: normalizeJsonArray(merged.schedules),
    guestlist_count: 0,
  };
}

export function consolidate(rows: EventRow[]): EventRow[] {
  const deduped = new Map<string, EventRow>();

  for (const row of rows) {
    const key = buildDedupeKey(row.title, row.start_date, row.location);
    const existing = deduped.get(key);

    if (!existing) {
      deduped.set(key, { ...row });
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

  return Array.from(deduped.values());
}
