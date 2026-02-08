import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';

export const dynamic = 'force-dynamic';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * GET /api/events/[id]
 * Fetch a single event by ID.
 * Supports both:
 * - ticketmaster_id (string)
 * - id (uuid primary key)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || id.trim() === '') {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    const supabase = await getServerSupabase();

    const tryByTicketmasterId = async () =>
      supabase.from('ticketmaster_events').select('*').eq('ticketmaster_id', id).single();

    const tryByUuidId = async () =>
      supabase.from('ticketmaster_events').select('*').eq('id', id).single();

    const tryBusinessEventByUuidId = async () =>
      supabase
        .from('events_and_specials')
        .select('*')
        .eq('id', id)
        .eq('type', 'event')
        .single();

    const tryBusinessCardByRepresentativeId = async () =>
      supabase
        .from('v_events_and_specials_cards')
        .select('occurrences, start_dates, start_date, end_date')
        .eq('representative_id', id)
        .single();

    let event: any = null;
    let error: any = null;

    // Most links in the app use `ticketmaster_id`, but sitemap + some routes may use UUID `id`.
    ({ data: event, error } = await tryByTicketmasterId());

    const notFound = error?.code === 'PGRST116';
    if (notFound && UUID_RE.test(id)) {
      ({ data: event, error } = await tryByUuidId());
    }

    // Business-owned events live in events_and_specials (uuid IDs).
    if ((error?.code === 'PGRST116' || !event) && UUID_RE.test(id)) {
      ({ data: event, error } = await tryBusinessEventByUuidId());

      if (!error && event) {
        // Normalize the shape to match the Ticketmaster event fields expected by the UI.
        let card: any = null;
        const { data: cardData, error: cardError } = await tryBusinessCardByRepresentativeId();
        if (!cardError) card = cardData;

        const occurrences =
          Array.isArray(card?.start_dates) && card.start_dates.length > 0
            ? card.start_dates.map((d: string) => ({ startDate: d, endDate: undefined }))
            : undefined;

        event = {
          ...event,
          // aliases used by event detail UI code
          ticketmaster_id: event.id,
          image_url: event.image || null,
          venue_name: event.location || null,
          venue_address: null,
          city: null,
          country: null,
          url: event.booking_url || null,
          ticketmaster_url: event.booking_url || null,
          booking_url: event.booking_url || null,
          booking_contact: event.booking_contact || null,
          business_id: event.business_id,
          source: 'business',
          occurrences,
          occurrences_count: card?.occurrences ?? undefined,
        };
      }
    }

    if (error) {
      console.error('[Event API] Supabase error:', error);
      if (error.code === 'PGRST116') {
        // Not found
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }
      return NextResponse.json(
        { error: 'Failed to fetch event', details: error.message },
        { status: 500 }
      );
    }

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }
       // Transform Ticketmaster event to include booking URL
       const transformedEvent = {
         ...event,
         ticketmaster_url: event.url || event.ticketmaster_url,
         bookingUrl: event.url || event.ticketmaster_url,
       };
    return NextResponse.json({ event: transformedEvent });
  } catch (error: any) {
    console.error('[Events API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error?.message },
      { status: 500 }
    );
  }
}

