import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServiceSupabase } from "@/app/lib/admin";
import type { Database } from "@/app/types/supabase";
import { mapEventsAndSpecialsRowToEventCard, type EventsAndSpecialsRow } from "@/app/lib/events/mapEvent";
import {
  isQuicketEvent,
  normalizeQuicketCategory,
  normalizeQuicketCategoryParam,
  QUICKET_CATEGORY_LABEL_BY_SLUG,
} from "@/app/lib/events/quicketCategory";

export const dynamic = "force-dynamic";

const normalize = (value: string | null | undefined) => (value ?? "").toString().trim().toLowerCase();

async function getReadableSupabase() {
  try {
    return getServiceSupabase();
  } catch {
    return createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  }
}

const buildSeriesKey = (row: Pick<EventsAndSpecialsRow, "title" | "business_id" | "location">) =>
  `${normalize(row.title)}|${normalize(row.business_id)}|${normalize(row.location)}`;

const isNil = (value: unknown) => value === null || value === undefined;

function pickLongerText(current: string | null | undefined, candidate: string | null | undefined): string | null | undefined {
  if (!candidate) return current;
  if (!current) return candidate;
  return candidate.length > current.length ? candidate : current;
}

function pickMinDate(current: string | null | undefined, candidate: string | null | undefined): string | null | undefined {
  if (!candidate) return current;
  if (!current) return candidate;
  return new Date(candidate).getTime() < new Date(current).getTime() ? candidate : current;
}

function pickMaxDate(current: string | null | undefined, candidate: string | null | undefined): string | null | undefined {
  if (!candidate) return current;
  if (!current) return candidate;
  return new Date(candidate).getTime() > new Date(current).getTime() ? candidate : current;
}

function isNonEmptyArray(value: unknown): value is unknown[] {
  return Array.isArray(value) && value.length > 0;
}

function mergeRepresentativeFromOccurrences(
  representative: EventsAndSpecialsRow,
  occurrences: EventsAndSpecialsRow[],
): EventsAndSpecialsRow {
  const merged = { ...representative } as EventsAndSpecialsRow;

  for (const row of occurrences) {
    merged.description = pickLongerText(merged.description, row.description) ?? null;
    merged.event_description = pickLongerText(merged.event_description, row.event_description) ?? null;

    const coalesceFields: Array<keyof EventsAndSpecialsRow> = [
      "icon",
      "image",
      "booking_url",
      "booking_contact",
      "cta_source",
      "whatsapp_number",
      "whatsapp_prefill_template",
      "availability_status",
      "quicket_category_slug",
      "quicket_category_label",
      "quicket_event_id",
      "event_name",
      "event_url",
      "event_image_url",
      "venue_id",
      "venue_name",
      "venue_address_line1",
      "venue_address_line2",
      "venue_latitude",
      "venue_longitude",
      "locality_level_one",
      "locality_level_two",
      "locality_level_three",
      "organiser_id",
      "organiser_name",
      "organiser_phone",
      "organiser_mobile",
      "organiser_facebook_url",
      "organiser_twitter_handle",
      "organiser_hashtag",
      "organiser_page_url",
    ];

    for (const field of coalesceFields) {
      if (isNil((merged as any)[field]) && !isNil((row as any)[field])) {
        (merged as any)[field] = (row as any)[field];
      }
    }

    merged.event_start_date = pickMinDate(merged.event_start_date, row.event_start_date) ?? null;
    merged.event_end_date = pickMaxDate(merged.event_end_date, row.event_end_date) ?? null;
    merged.event_created_at = pickMinDate(merged.event_created_at, row.event_created_at) ?? null;
    merged.event_last_modified = pickMaxDate(merged.event_last_modified, row.event_last_modified) ?? null;

    if (isNonEmptyArray(row.quicket_categories_json) && !isNonEmptyArray(merged.quicket_categories_json)) {
      merged.quicket_categories_json = row.quicket_categories_json as any;
    }
    if (isNonEmptyArray(row.tickets_json) && !isNonEmptyArray(merged.tickets_json)) {
      merged.tickets_json = row.tickets_json as any;
    }
    if (isNonEmptyArray(row.schedules_json) && !isNonEmptyArray(merged.schedules_json)) {
      merged.schedules_json = row.schedules_json as any;
    }

    if (row.minimum_ticket_price != null) {
      merged.minimum_ticket_price =
        merged.minimum_ticket_price == null
          ? row.minimum_ticket_price
          : Math.min(merged.minimum_ticket_price, row.minimum_ticket_price);
    }
    if (row.maximum_ticket_price != null) {
      merged.maximum_ticket_price =
        merged.maximum_ticket_price == null
          ? row.maximum_ticket_price
          : Math.max(merged.maximum_ticket_price, row.maximum_ticket_price);
    }

    if (merged.tickets_available_boolean == null) {
      merged.tickets_available_boolean = row.tickets_available_boolean ?? null;
    } else if (row.tickets_available_boolean === true) {
      merged.tickets_available_boolean = true;
    }
  }

  return merged;
}

/**
 * GET /api/events-and-specials/[id]
 * Fetch representative row + occurrences list using the same series-key grouping.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id || !id.trim()) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const supabase = await getReadableSupabase();

    // 1) Representative row by id
    const baseSelect =
      "id,title,type,business_id,start_date,end_date,location,description,icon,image,price,rating,availability_status,created_by,created_at,updated_at";
    const categorySelect = ",quicket_category_slug,quicket_category_label";
    const quicketDetailSelect = [
      "quicket_event_id",
      "event_name",
      "event_description",
      "event_url",
      "event_image_url",
      "event_start_date",
      "event_end_date",
      "event_created_at",
      "event_last_modified",
      "venue_id",
      "venue_name",
      "venue_address_line1",
      "venue_address_line2",
      "venue_latitude",
      "venue_longitude",
      "locality_level_one",
      "locality_level_two",
      "locality_level_three",
      "organiser_id",
      "organiser_name",
      "organiser_phone",
      "organiser_mobile",
      "organiser_facebook_url",
      "organiser_twitter_handle",
      "organiser_hashtag",
      "organiser_page_url",
      "quicket_categories_json",
      "tickets_json",
      "minimum_ticket_price",
      "maximum_ticket_price",
      "tickets_available_boolean",
      "schedules_json",
      "guestlist_count",
    ].join(",");

    let representative: any = null;
    let repError: any = null;

    ({ data: representative, error: repError } = await supabase
      .from("events_and_specials")
      .select(
        `${baseSelect}${categorySelect},${quicketDetailSelect},booking_url,booking_contact,cta_source,whatsapp_number,whatsapp_prefill_template`,
      )
      .eq("id", id)
      .single());

    const repErrorMessage = String(repError?.message ?? "");
    const isMissingOptionalColumn =
      repError &&
      /does not exist/i.test(repErrorMessage) &&
      /(events_and_specials\.)?(booking_url|cta_source|whatsapp_number|whatsapp_prefill_template|quicket_category_slug|quicket_category_label|quicket_event_id|event_name|event_description|event_url|event_image_url|event_start_date|event_end_date|event_created_at|event_last_modified|venue_id|venue_name|venue_address_line1|venue_address_line2|venue_latitude|venue_longitude|locality_level_one|locality_level_two|locality_level_three|organiser_id|organiser_name|organiser_phone|organiser_mobile|organiser_facebook_url|organiser_twitter_handle|organiser_hashtag|organiser_page_url|quicket_categories_json|tickets_json|minimum_ticket_price|maximum_ticket_price|tickets_available_boolean|schedules_json|guestlist_count)/i.test(repErrorMessage);

    if (isMissingOptionalColumn) {
      console.warn("[events-and-specials/[id]] optional columns missing; retrying without optional fields.");
      ({ data: representative, error: repError } = await supabase
        .from("events_and_specials")
        .select(baseSelect)
        .eq("id", id)
        .single());
    }

    if (repError) {
      if (repError.code === "PGRST116") {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }
      console.error("[events-and-specials/[id]] rep error:", repError);
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const repRow = representative as unknown as EventsAndSpecialsRow;

    if (isQuicketEvent(repRow)) {
      const storedSlug = normalizeQuicketCategoryParam(repRow.quicket_category_slug ?? null);
      if (storedSlug) {
        repRow.quicket_category_slug = storedSlug;
        repRow.quicket_category_label =
          repRow.quicket_category_label ?? QUICKET_CATEGORY_LABEL_BY_SLUG[storedSlug];
      }

      const categoryNames =
        repRow.quicket_category_label && repRow.quicket_category_label.trim().toLowerCase() !== "community"
          ? [repRow.quicket_category_label]
          : [];

      if (!storedSlug) {
        const derived = normalizeQuicketCategory({ categoryNames });
        repRow.quicket_category_slug = derived.slug;
        repRow.quicket_category_label = derived.label;
      }
    }

    const seriesKey = buildSeriesKey(repRow);

    // Optional business enrichment (used by the special detail page)
    if (repRow.business_id) {
      const { data: business, error: businessError } = await supabase
        .from("businesses")
        .select("id,name,slug,image_url,address,phone,website,email")
        .eq("id", repRow.business_id)
        .maybeSingle();

      if (businessError) {
        console.warn("[events-and-specials/[id]] businesses fetch error:", businessError);
      } else if (business) {
        (repRow as any).businessName = business.name ?? undefined;
        (repRow as any).businessSlug = business.slug ?? undefined;
        (repRow as any).businessLogo = (business as any).image_url ?? undefined;
        (repRow as any).businessAddress = (business as any).address ?? undefined;
        (repRow as any).businessPhone = (business as any).phone ?? undefined;
        (repRow as any).businessWebsite = (business as any).website ?? undefined;
        (repRow as any).businessEmail = (business as any).email ?? undefined;
      }
    }

    // 2) Fetch all occurrences for this series (narrow by business_id + type first, then normalize filter in JS)
    let occQuery = supabase
      .from("events_and_specials")
      .select(
        "id,title,type,business_id,start_date,end_date,location,description,icon,image,price,rating,availability_status,booking_url,booking_contact,cta_source,whatsapp_number,whatsapp_prefill_template,quicket_category_slug,quicket_category_label,quicket_event_id,event_name,event_description,event_url,event_image_url,event_start_date,event_end_date,event_created_at,event_last_modified,venue_id,venue_name,venue_address_line1,venue_address_line2,venue_latitude,venue_longitude,locality_level_one,locality_level_two,locality_level_three,organiser_id,organiser_name,organiser_phone,organiser_mobile,organiser_facebook_url,organiser_twitter_handle,organiser_hashtag,organiser_page_url,quicket_categories_json,tickets_json,minimum_ticket_price,maximum_ticket_price,tickets_available_boolean,schedules_json,guestlist_count"
      )
      .eq("type", repRow.type)
      .order("start_date", { ascending: true })
      .limit(2000);

    if (repRow.business_id) {
      occQuery = occQuery.eq("business_id", repRow.business_id);
    } else {
      occQuery = occQuery.is("business_id", null);
    }

    // Use ilike to avoid missing occurrences due to casing differences; final match is via normalized key.
    occQuery = occQuery.ilike("title", repRow.title);
    if (repRow.location) {
      occQuery = occQuery.ilike("location", repRow.location);
    }

    let occCandidates: any[] | null = null;
    let occError: any = null;

    ({ data: occCandidates, error: occError } = await occQuery);

    const occErrorMessage = String(occError?.message ?? "");
    const occMissingOptionalColumns =
      occError &&
      /does not exist/i.test(occErrorMessage) &&
      /(events_and_specials\.)?(booking_url|cta_source|whatsapp_number|whatsapp_prefill_template|quicket_category_slug|quicket_category_label|quicket_event_id|event_name|event_description|event_url|event_image_url|event_start_date|event_end_date|event_created_at|event_last_modified|venue_id|venue_name|venue_address_line1|venue_address_line2|venue_latitude|venue_longitude|locality_level_one|locality_level_two|locality_level_three|organiser_id|organiser_name|organiser_phone|organiser_mobile|organiser_facebook_url|organiser_twitter_handle|organiser_hashtag|organiser_page_url|quicket_categories_json|tickets_json|minimum_ticket_price|maximum_ticket_price|tickets_available_boolean|schedules_json|guestlist_count)/i.test(occErrorMessage);

    if (occMissingOptionalColumns) {
      console.warn("[events-and-specials/[id]] optional columns missing; retrying occurrences with base fields.");

      let occRetry = supabase
        .from("events_and_specials")
        .select("id,title,type,business_id,start_date,end_date,location")
        .eq("type", repRow.type)
        .order("start_date", { ascending: true })
        .limit(2000);

      if (repRow.business_id) {
        occRetry = occRetry.eq("business_id", repRow.business_id);
      } else {
        occRetry = occRetry.is("business_id", null);
      }

      occRetry = occRetry.ilike("title", repRow.title);
      if (repRow.location) {
        occRetry = occRetry.ilike("location", repRow.location);
      }

      ({ data: occCandidates, error: occError } = await occRetry);
    }

    if (occError) {
      console.error("[events-and-specials/[id]] occurrences error:", occError);
    }

    const occurrencesRows = ((occCandidates || []) as unknown as EventsAndSpecialsRow[])
      .filter((r) => buildSeriesKey(r) === seriesKey)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

    const mergedRepRow = mergeRepresentativeFromOccurrences(repRow, occurrencesRows);

    try {
      const { count: liveRsvpCount } = await (supabase as any)
        .from("event_rsvps")
        .select("id", { count: "exact", head: true })
        .eq("event_id", id);

      if (typeof liveRsvpCount === "number") {
        mergedRepRow.guestlist_count = liveRsvpCount;
      }
    } catch (rsvpCountError) {
      console.warn("[events-and-specials/[id]] live RSVP count unavailable:", rsvpCountError);
    }

    const occurrences_list = occurrencesRows.map((r) => ({
      id: r.id,
      start_date: r.start_date,
      end_date: r.end_date ?? null,
      booking_url: (r as any).booking_url ?? null,
      booking_contact: (r as any).booking_contact ?? null,
      location: r.location ?? null,
    }));

    const startDates = occurrencesRows.map((r) => r.start_date);
    const earliest = startDates[0] ?? repRow.start_date;
    const latest =
      occurrencesRows.length > 0
        ? occurrencesRows
            .map((r) => r.end_date ?? r.start_date)
            .sort()
            .slice(-1)[0]
        : (repRow.end_date ?? repRow.start_date);

    const event = mapEventsAndSpecialsRowToEventCard(
      {
        ...mergedRepRow,
        start_date: earliest,
        end_date: latest === earliest ? null : latest,
      },
      {
        occurrencesCount: occurrencesRows.length || 1,
        startDates: startDates.slice().sort(),
      },
    );

    // Pass through optional business metadata if present
    const businessMeta = {
      businessName: (repRow as any).businessName as string | undefined,
      businessSlug: (repRow as any).businessSlug as string | undefined,
      businessLogo: (repRow as any).businessLogo as string | undefined,
      businessAddress: (repRow as any).businessAddress as string | undefined,
      businessPhone: (repRow as any).businessPhone as string | undefined,
      businessWebsite: (repRow as any).businessWebsite as string | undefined,
      businessEmail: (repRow as any).businessEmail as string | undefined,
    };
    Object.entries(businessMeta).forEach(([k, v]) => {
      if (v) (event as any)[k] = v;
    });

    return NextResponse.json({
      event,
      occurrences_list,
      occurrences: occurrencesRows.length || 1,
    });
  } catch (err) {
    console.error("[events-and-specials/[id]] error:", err);
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
}
