import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';
import { getTodayUTC } from '@/app/lib/services/eventLifecycle';

// Cache configuration - 30 seconds for events data
export const revalidate = 30;
export const dynamic = 'force-dynamic';

// In-memory cache with TTL (30 seconds)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

function getCacheKey(searchParams: URLSearchParams): string {
  return Array.from(searchParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
}

function getCachedData(key: string) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCachedData(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() });
  // Clean up old cache entries (keep last 50)
  if (cache.size > 50) {
    const oldestKey = Array.from(cache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0][0];
    cache.delete(oldestKey);
  }
}

/**
 * GET /api/events
 * Fetch events from events_and_specials (icon = 'ticketmaster').
 * ticketmaster_events table is deprecated for reads.
 *
 * Query parameters:
 * - limit: Number of events to return (default: 20, max: 100)
 * - offset: Offset for pagination (default: 0)
 * - city: Filter by city (matched against location field)
 * - upcoming: Only return upcoming events (default: true)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Check cache first
    const cacheKey = getCacheKey(searchParams);
    const cached = getCachedData(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      });
    }

    const supabase = await getServerSupabase(req);

    // Limit max results to prevent performance issues
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const city = searchParams.get('city');
    const search = searchParams.get('search')?.trim();
    const upcoming = searchParams.get('upcoming') !== 'false'; // Default to true

    let query = supabase
      .from('events_and_specials')
      .select('id, title, description, type, start_date, end_date, location, venue_name, image, booking_url, icon, price', { count: 'estimated' })
      .eq('icon', 'ticketmaster')
      .eq('type', 'event')
      .order('start_date', { ascending: true });

    // Filter by city (matched against composite location string)
    if (city) {
      query = query.ilike('location', `%${city}%`);
    }

    // Filter for upcoming events only
    if (upcoming) {
      const todayStart = getTodayUTC().toISOString();
      query = query.or(`end_date.gte.${todayStart},and(end_date.is.null,start_date.gte.${todayStart})`);
    }

    // Search across title, description, venue_name, location
    if (search && search.length > 0) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,venue_name.ilike.%${search}%,location.ilike.%${search}%`);
    }

    // Apply pagination; allow 15s for slow DB
    const queryPromise = query.range(offset, offset + limit - 1);
    const QUERY_TIMEOUT_MS = 15_000;
    let timeoutId: ReturnType<typeof setTimeout>;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Query timeout')), QUERY_TIMEOUT_MS);
    });

    const result = await Promise.race([
      queryPromise.then((r) => {
        clearTimeout(timeoutId!);
        return r;
      }),
      timeoutPromise,
    ]) as Awaited<ReturnType<typeof query.range>>;

    const { data: events, error, count } = result;

    if (error) {
      console.error('[Events API] Error fetching events:', error);
      return NextResponse.json(
        { error: 'Failed to fetch events', details: error.message },
        { status: 500 }
      );
    }

    // Normalize field names to match legacy response shape expected by consumers
    const processedEvents = (events || []).map((evt: any) => ({
      ...evt,
      image_url: evt.image ?? null,
      url: evt.booking_url ?? null,
    }));

    const response = {
      events: processedEvents,
      count: count || 0,
      limit,
      offset,
    };

    // Cache the response
    setCachedData(cacheKey, response);

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (error: any) {
    console.error('[Events API] Unexpected error:', error);
    
    // If timeout, return cached data if available
    if (error.message === 'Query timeout') {
      const cacheKey = getCacheKey(new URL(req.url).searchParams);
      const cached = getCachedData(cacheKey);
      if (cached) {
        return NextResponse.json(cached, {
          headers: {
            'X-Cache': 'stale',
            'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
          },
        });
      }
    }
    
    return NextResponse.json(
      { error: 'Internal server error', message: error?.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events
 * Create a custom event (requires authentication)
 * @deprecated Writes to the legacy ticketmaster_events table. Migrate to
 * events_and_specials (upsert_events_and_specials_consolidated RPC) when
 * custom event creation is reworked.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase(req);
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to create an event.' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const {
      title,
      description,
      type, // 'event' or 'special'
      startDate,
      endDate,
      location,
      city,
      venueName,
      venueAddress,
      imageUrl,
      priceRange,
      classification,
      segment,
      genre,
      subGenre,
    } = body;

    // Validate required fields
    if (!title || !startDate || !location) {
      return NextResponse.json(
        { error: 'Title, start date, and location are required' },
        { status: 400 }
      );
    }

    // Validate date
    const startDateObj = new Date(startDate);
    if (isNaN(startDateObj.getTime())) {
      return NextResponse.json(
        { error: 'Invalid start date format' },
        { status: 400 }
      );
    }

    // Generate unique ID for custom events (ticketmaster_id is required and unique)
    // Format: "custom-{timestamp}-{random}" to distinguish from Ticketmaster events
    const customEventId = `custom-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

    // Create event data
    const eventData: any = {
      ticketmaster_id: customEventId, // Custom events use "custom-{uuid}" format
      title: title.trim(),
      description: description?.trim() || null,
      type: type || 'event',
      start_date: startDate,
      end_date: endDate || null,
      location: location.trim(),
      city: city?.trim() || null,
      country: null, // Can be added if needed
      venue_name: venueName?.trim() || null,
      venue_address: venueAddress?.trim() || null,
      image_url: imageUrl?.trim() || null,
      url: null, // Custom events don't have external URL
      price_range: priceRange || null,
      classification: classification || null,
      segment: segment || null,
      genre: genre || null,
      sub_genre: subGenre || null,
      created_by: user.id, // Track who created the event
    };

    const { data: newEvent, error: insertError } = await supabase
      .from('ticketmaster_events')
      .insert(eventData)
      .select()
      .single();

    if (insertError) {
      console.error('[Events API] Error creating event:', insertError);
      return NextResponse.json(
        { error: 'Failed to create event', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      event: newEvent,
      message: 'Event created successfully!',
    }, { status: 201 });
  } catch (error: any) {
    console.error('[Events API] Error creating event:', error);
    return NextResponse.json(
      { error: 'Failed to create event', details: error.message },
      { status: 500 }
    );
  }
}

