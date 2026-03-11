export interface QuicketCategoryItem {
  id?: number;
  name?: string;
}

export interface QuicketTicketItem {
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
  [key: string]: unknown;
}

export interface QuicketScheduleItem {
  id?: number;
  name?: string;
  startDate?: string;
  endDate?: string;
  [key: string]: unknown;
}

export interface QuicketVenueInfo {
  id?: number | null;
  name?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface QuicketLocalityInfo {
  levelOne?: string | null;
  levelTwo?: string | null;
  levelThree?: string | null;
}

export interface QuicketOrganiserInfo {
  id?: number | null;
  name?: string | null;
  phone?: string | null;
  mobile?: string | null;
  facebookUrl?: string | null;
  twitterHandle?: string | null;
  hashTag?: string | null;
  organiserPageUrl?: string | null;
}

export interface QuicketEventMetadata {
  quicketEventId?: number | null;
  eventName?: string | null;
  eventDescription?: string | null;
  eventUrl?: string | null;
  eventImageUrl?: string | null;
  eventStartDate?: string | null;
  eventEndDate?: string | null;
  eventCreatedAt?: string | null;
  eventLastModified?: string | null;
  venue?: QuicketVenueInfo | null;
  locality?: QuicketLocalityInfo | null;
  organiser?: QuicketOrganiserInfo | null;
  categories?: QuicketCategoryItem[];
  tickets?: QuicketTicketItem[];
  schedules?: QuicketScheduleItem[];
  minimumTicketPrice?: number | null;
  maximumTicketPrice?: number | null;
  ticketsAvailableBoolean?: boolean | null;
}

// Event type for use throughout the app
export interface Event {
  id: string;
  title: string;
  type: "event" | "special";
  image?: string | null;
  alt?: string;
  icon?: string;
  location: string;
  rating?: number | null;
  startDate: string;
  endDate?: string;
  price?: string | null;
  description?: string;
  bookingUrl?: string;
  bookingContact?: string;
  ctaSource?: "website" | "whatsapp" | "quicket" | "webtickets" | "other" | null;
  whatsappNumber?: string;
  whatsappPrefillTemplate?: string;
  category?: string | null;
  categoryLabel?: string | null;
  source?: string;
  ticketmasterAttractionId?: string | null;
  ticketmaster_url?: string;
  venueId?: string | null;
  venueName?: string;
  venueAddress?: string;
  city?: string;
  country?: string;
  url?: string;
  purchaseUrl?: string;
  segment?: string;
  genre?: string;
  subGenre?: string;
  href?: string;
  startDateISO?: string;
  endDateISO?: string;
  occurrences?: Array<{ startDate: string; endDate?: string; bookingUrl?: string }>;
  occurrencesCount?: number;
  allDates?: string[];
  canonicalKey?: string;
  businessId?: string;
  businessName?: string;
  isCommunityEvent?: boolean;
  isExternalEvent?: boolean;
  createdBy?: string;
  createdAt?: string;
  isBusinessOwned?: boolean;
  availabilityStatus?: "sold_out" | "limited" | null;
  guestlistCount?: number | null;
  quicketEvent?: QuicketEventMetadata | null;
}
