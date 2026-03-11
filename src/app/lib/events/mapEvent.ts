import type { Event } from "../types/Event";
import { QUICKET_CATEGORY_LABEL_BY_SLUG, type QuicketCategorySlug } from "./quicketCategory";

const EN_DASH = "–";

const formatIsoToCardDate = (iso: string | null | undefined) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const asArray = <T>(value: T[] | null | undefined): T[] => (Array.isArray(value) ? value : []);

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export const formatDateRangeLabel = (startIso?: string | null, endIso?: string | null) => {
  if (!startIso || !endIso) return null;
  const s = new Date(startIso);
  const e = new Date(endIso);
  if (!Number.isFinite(s.getTime()) || !Number.isFinite(e.getTime())) return null;

  const sameMonth = s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth();
  const dayFmt = new Intl.DateTimeFormat("en-US", { day: "numeric" });
  const monFmt = new Intl.DateTimeFormat("en-US", { month: "short" });

  if (sameMonth) {
    return `${dayFmt.format(s)}${EN_DASH}${dayFmt.format(e)} ${monFmt.format(s)}`;
  }
  return `${dayFmt.format(s)} ${monFmt.format(s)}${EN_DASH}${dayFmt.format(e)} ${monFmt.format(e)}`;
};

export type EventsAndSpecialsRow = {
  id: string;
  title: string;
  type: "event" | "special";
  business_id: string | null;
  start_date: string;
  end_date: string | null;
  location: string | null;
  description: string | null;
  icon: string | null;
  image: string | null;
  price: number | null;
  rating: number | null;
  booking_url?: string | null;
  booking_contact?: string | null;
  cta_source?: "website" | "whatsapp" | "quicket" | "webtickets" | "other" | null;
  whatsapp_number?: string | null;
  whatsapp_prefill_template?: string | null;
  availability_status?: "sold_out" | "limited" | null;
  quicket_category_slug?: QuicketCategorySlug | null;
  quicket_category_label?: string | null;
  quicket_event_id?: number | null;
  event_name?: string | null;
  event_description?: string | null;
  event_url?: string | null;
  event_image_url?: string | null;
  event_start_date?: string | null;
  event_end_date?: string | null;
  event_created_at?: string | null;
  event_last_modified?: string | null;
  venue_id?: number | null;
  venue_name?: string | null;
  venue_address_line1?: string | null;
  venue_address_line2?: string | null;
  venue_latitude?: number | null;
  venue_longitude?: number | null;
  locality_level_one?: string | null;
  locality_level_two?: string | null;
  locality_level_three?: string | null;
  organiser_id?: number | null;
  organiser_name?: string | null;
  organiser_phone?: string | null;
  organiser_mobile?: string | null;
  organiser_facebook_url?: string | null;
  organiser_twitter_handle?: string | null;
  organiser_hashtag?: string | null;
  organiser_page_url?: string | null;
  quicket_categories_json?: Array<{ id?: number; name?: string }> | null;
  tickets_json?: Array<Record<string, unknown>> | null;
  minimum_ticket_price?: number | null;
  maximum_ticket_price?: number | null;
  tickets_available_boolean?: boolean | null;
  schedules_json?: Array<Record<string, unknown>> | null;
  guestlist_count?: number | null;
};

export function mapEventsAndSpecialsRowToEventCard(
  row: EventsAndSpecialsRow,
  opts?: { occurrencesCount?: number; dateRangeLabel?: string | null; startDates?: string[]; isExternalEvent?: boolean },
): Event & { occurrencesCount?: number; date_range_label?: string | null; isExternalEvent?: boolean } {
  const startIso = row.start_date;
  const endIso = row.end_date;

  const occurrencesCount = opts?.occurrencesCount;
  const computedRange =
    occurrencesCount && occurrencesCount > 1
      ? opts?.dateRangeLabel ?? formatDateRangeLabel(startIso, endIso || startIso)
      : null;

  const bookingUrl = row.booking_url ?? null;
  const occurrencesArray =
    Array.isArray(opts?.startDates) && opts!.startDates!.length > 0
      ? opts!.startDates!.map((d) => ({ startDate: d, endDate: undefined, bookingUrl: bookingUrl || undefined }))
      : [{ startDate: startIso, endDate: endIso || undefined, bookingUrl: bookingUrl || undefined }];

  // Parse composite location "venue • city • country" into separate fields.
  let parsedVenueName: string | undefined;
  let parsedCity: string | undefined;
  let parsedCountry: string | undefined;
  const locationStr = row.location ?? "";
  if (locationStr.includes(" \u2022 ")) {
    const parts = locationStr.split(" \u2022 ").map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      parsedVenueName = parts[0];
      parsedCity = parts[1];
      if (parts.length >= 3) parsedCountry = parts[2];
    }
  }

  const venueAddress = [row.venue_address_line1, row.venue_address_line2].filter(Boolean).join(", ") || undefined;
  const venueName = row.venue_name ?? parsedVenueName;
  const city = row.locality_level_three ?? parsedCity;
  const country = row.locality_level_one ?? parsedCountry;

  // Fix protocol-relative URLs from legacy DB entries.
  const fixedImage = row.image
    ? row.image.startsWith("//")
      ? `https:${row.image}`
      : row.image
    : null;

  const quicketCategories = asArray(row.quicket_categories_json);
  const quicketTickets = asArray(row.tickets_json);
  const quicketSchedules = asArray(row.schedules_json);

  const hasQuicketMetadata = Boolean(
    row.quicket_event_id != null
      || row.event_name
      || row.event_url
      || row.event_start_date
      || row.organiser_name
      || row.venue_id != null
      || quicketCategories.length > 0
      || quicketTickets.length > 0
      || quicketSchedules.length > 0,
  );

  return {
    id: row.id,
    title: row.title,
    type: row.type,
    image: fixedImage,
    alt: `${row.title} ${row.type}`,
    icon: row.icon ?? undefined,
    location: row.location ?? "Location TBD",
    rating: row.rating ?? 0,
    startDate: formatIsoToCardDate(startIso) || "",
    endDate: endIso ? formatIsoToCardDate(endIso) : undefined,
    startDateISO: startIso,
    endDateISO: endIso ?? undefined,
    price: row.price != null ? `R${row.price}` : null,
    description: row.description ?? undefined,
    bookingUrl: bookingUrl || undefined,
    bookingContact: (row.booking_contact ?? undefined) as any,
    ctaSource: row.cta_source ?? null,
    whatsappNumber: row.whatsapp_number ?? undefined,
    whatsappPrefillTemplate: row.whatsapp_prefill_template ?? undefined,
    category: row.quicket_category_slug ?? null,
    categoryLabel: row.quicket_category_slug
      ? (row.quicket_category_label ?? QUICKET_CATEGORY_LABEL_BY_SLUG[row.quicket_category_slug])
      : null,
    businessId: opts?.isExternalEvent ? undefined : (row.business_id ?? undefined),
    isCommunityEvent: row.type === "event" ? (row.business_id == null || opts?.isExternalEvent) : false,
    isExternalEvent: opts?.isExternalEvent || false,
    venueId: row.venue_id != null ? String(row.venue_id) : undefined,
    venueName,
    venueAddress,
    city,
    country,
    url: row.event_url ?? undefined,
    purchaseUrl: row.event_url ?? bookingUrl ?? undefined,
    guestlistCount: toNumber(row.guestlist_count) ?? 0,
    quicketEvent: hasQuicketMetadata
      ? {
          quicketEventId: row.quicket_event_id ?? null,
          eventName: row.event_name ?? row.title,
          eventDescription: row.event_description ?? row.description ?? null,
          eventUrl: row.event_url ?? row.booking_url ?? null,
          eventImageUrl: row.event_image_url ?? fixedImage,
          eventStartDate: row.event_start_date ?? row.start_date,
          eventEndDate: row.event_end_date ?? row.end_date ?? null,
          eventCreatedAt: row.event_created_at ?? null,
          eventLastModified: row.event_last_modified ?? null,
          venue: {
            id: row.venue_id ?? null,
            name: row.venue_name ?? venueName ?? null,
            addressLine1: row.venue_address_line1 ?? null,
            addressLine2: row.venue_address_line2 ?? null,
            latitude: toNumber(row.venue_latitude),
            longitude: toNumber(row.venue_longitude),
          },
          locality: {
            levelOne: row.locality_level_one ?? country ?? null,
            levelTwo: row.locality_level_two ?? null,
            levelThree: row.locality_level_three ?? city ?? null,
          },
          organiser: {
            id: row.organiser_id ?? null,
            name: row.organiser_name ?? null,
            phone: row.organiser_phone ?? null,
            mobile: row.organiser_mobile ?? null,
            facebookUrl: row.organiser_facebook_url ?? null,
            twitterHandle: row.organiser_twitter_handle ?? null,
            hashTag: row.organiser_hashtag ?? null,
            organiserPageUrl: row.organiser_page_url ?? null,
          },
          categories: quicketCategories,
          tickets: quicketTickets,
          schedules: quicketSchedules,
          minimumTicketPrice: row.minimum_ticket_price ?? null,
          maximumTicketPrice: row.maximum_ticket_price ?? null,
          ticketsAvailableBoolean: row.tickets_available_boolean ?? null,
        }
      : null,
    occurrences: occurrencesArray,
    ...(occurrencesCount != null ? { occurrencesCount } : null),
    ...(computedRange ? { date_range_label: computedRange } : null),
    href: row.type === "event" ? `/event/${row.id}` : `/special/${row.id}`,
    source: "business",
    availabilityStatus: row.availability_status ?? null,
  };
}
