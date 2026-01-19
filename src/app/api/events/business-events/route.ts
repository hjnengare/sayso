import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';

/**
 * GET /api/events/business-events
 * Fetch all business-owned events from all businesses (public)
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = getServerSupabase();

    // Fetch all business events, ordered by start date (ascending to show upcoming first)
    const { data, error } = await supabase
      .from('events_and_specials')
      .select('*, businesses:business_id(id, name)')
      .order('start_date', { ascending: true });

    if (error) {
      console.error('[Business Events API] Query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch business images for context
    const { data: businessImages } = await supabase
      .from('business_images')
      .select('business_id, image_url');

    const imagesByBusiness = new Map<string, string[]>();
    (businessImages || []).forEach((img: any) => {
      if (!imagesByBusiness.has(img.business_id)) {
        imagesByBusiness.set(img.business_id, []);
      }
      imagesByBusiness.get(img.business_id)!.push(img.image_url);
    });

    // Transform to frontend format with business context and images
    const events = (data || []).map((e: any) => ({
      id: e.id,
      title: e.title,
      type: e.type,
      image: e.image,
      alt: `${e.title} event`,
      icon: e.icon,
      location: e.location,
      rating: e.rating || 0,
      startDate: e.start_date,
      endDate: e.end_date,
      price: e.price,
      description: e.description,
      businessId: e.business_id,
      businessName: e.businesses?.name || 'Unknown Business',
      businessImages: imagesByBusiness.get(e.business_id) || [],
      createdBy: e.created_by,
      createdAt: e.created_at,
      isBusinessOwned: true,
    }));

    return NextResponse.json({ success: true, data: events });
  } catch (error) {
    console.error('[Business Events API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch business events' }, { status: 500 });
  }
}
