import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';

/**
 * GET /api/events/business-events
 * Fetch consolidated business-owned event/special cards (public)
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await getServerSupabase(req);

    // Fetch consolidated cards, ordered by earliest start date (ascending to show upcoming first)
    const { data, error } = await supabase
      .from('v_events_and_specials_cards')
      .select('representative_id, business_id, type, title, location, start_date, end_date, occurrences, start_dates, image, icon, description, booking_url, booking_contact')
      .order('start_date', { ascending: true });

    if (error) {
      console.error('[Business Events API] Query error:', error);
      return NextResponse.json({ success: true, data: [] });
    }

    const businessIds = Array.from(
      new Set((data || []).map((row: any) => row.business_id).filter(Boolean))
    ) as string[];

    const { data: businesses, error: businessesError } = await supabase
      .from('businesses')
      .select('id, name')
      .in('id', businessIds);

    if (businessesError) {
      console.warn('[Business Events API] businesses fetch error:', businessesError);
    }

    const businessNameById = new Map<string, string>();
    (businesses || []).forEach((b: { id: string; name: string }) => {
      businessNameById.set(b.id, b.name);
    });

    // Fetch business images for context (business_images uses url, not image_url)
    const { data: businessImages, error: imagesError } = await supabase
      .from('business_images')
      .select('business_id, url');

    if (imagesError) {
      console.warn('[Business Events API] business_images fetch error:', imagesError);
    }

    const imagesByBusiness = new Map<string, string[]>();
    (businessImages || []).forEach((img: { business_id: string; url: string }) => {
      if (!imagesByBusiness.has(img.business_id)) {
        imagesByBusiness.set(img.business_id, []);
      }
      imagesByBusiness.get(img.business_id)!.push(img.url);
    });

    // Transform to frontend format with business context and images
    const events = (data || []).map((e: any) => {
      const startDates = Array.isArray(e.start_dates) ? e.start_dates : [];
      const occurrences = startDates
        .filter(Boolean)
        .map((d: string) => ({ startDate: d, endDate: undefined, bookingUrl: e.booking_url || undefined }));

      return {
        id: e.representative_id,
        title: e.title,
        type: e.type,
        image: e.image,
        alt: `${e.title} event`,
        icon: e.icon,
        location: e.location || 'Location TBD',
        rating: 0,
        startDate: e.start_date,
        endDate: e.end_date,
        startDateISO: e.start_date,
        endDateISO: e.end_date,
        occurrences,
        description: e.description,
        businessId: e.business_id,
        businessName: businessNameById.get(e.business_id) || 'Unknown Business',
        businessImages: imagesByBusiness.get(e.business_id) || [],
        isBusinessOwned: true,
        bookingUrl: e.booking_url,
        bookingContact: e.booking_contact,
      };
    });

    return NextResponse.json({ success: true, data: events });
  } catch (error) {
    console.error('[Business Events API] Error:', error);
    return NextResponse.json({ success: true, data: [] });
  }
}
