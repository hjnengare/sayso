import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '../../../../lib/supabase/server';
import {
  applyAnonymousCookie,
  resolveAnonymousId,
} from '../../../../lib/utils/anonymousReviews';

export const dynamic = 'force-dynamic';

const isMissingGuestViewsTableError = (error: { code?: string } | null) =>
  Boolean(error && error.code === 'PGRST205');

/**
 * POST /api/businesses/[id]/views
 * Record a profile view (deduplicated per day, skips owner)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: businessId } = await params;

    if (!businessId || businessId.trim() === '') {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    const supabase = await getServerSupabase();

    // Look up owner first so we can skip owner self-views.
    const { data: business } = await supabase
      .from('businesses')
      .select('owner_id')
      .eq('id', businessId)
      .single();

    // If business lookup fails, do not fail page load.
    if (!business) {
      return NextResponse.json({ recorded: false }, { status: 200 });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // Authenticated viewer path.
    if (!authError && user) {
      if (business.owner_id === user.id) {
        return NextResponse.json({ recorded: false }, { status: 200 });
      }

      const { error: insertError } = await supabase
        .from('business_profile_views')
        .insert({
          business_id: businessId,
          viewer_id: user.id,
        });

      // 23505 = unique_violation (already viewed today) - not an error.
      if (insertError && insertError.code !== '23505') {
        console.error('Error recording authenticated profile view:', insertError);
        return NextResponse.json({ recorded: false }, { status: 200 });
      }

      return NextResponse.json(
        { recorded: !insertError },
        { status: 200 }
      );
    }

    // Guest viewer path (deduped by anonymous_id + day).
    const { anonymousId, setCookie } = resolveAnonymousId(req);
    const { error: guestInsertError } = await supabase
      .from('business_profile_guest_views')
      .insert({
        business_id: businessId,
        anonymous_id: anonymousId,
      });

    if (guestInsertError && guestInsertError.code !== '23505') {
      if (isMissingGuestViewsTableError(guestInsertError)) {
        console.warn(
          'Guest profile views table is missing; skipping guest profile view recording.'
        );
        const errorResponse = NextResponse.json({ recorded: false }, { status: 200 });
        if (setCookie) {
          applyAnonymousCookie(errorResponse, anonymousId);
        }
        return errorResponse;
      }

      console.error('Error recording guest profile view:', guestInsertError);
      const errorResponse = NextResponse.json({ recorded: false }, { status: 200 });
      if (setCookie) {
        applyAnonymousCookie(errorResponse, anonymousId);
      }
      return errorResponse;
    }

    const response = NextResponse.json(
      { recorded: !guestInsertError },
      { status: 200 }
    );
    if (setCookie) {
      applyAnonymousCookie(response, anonymousId);
    }
    return response;
  } catch (error) {
    // Fire-and-forget: never fail the page load.
    console.error('Error in record view API:', error);
    return NextResponse.json({ recorded: false }, { status: 200 });
  }
}

/**
 * GET /api/businesses/[id]/views
 * Get profile view count for the last N days (default 30)
 * Only accessible by the business owner
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: businessId } = await params;

    if (!businessId || businessId.trim() === '') {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    const supabase = await getServerSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify caller owns the business.
    const { data: business } = await supabase
      .from('businesses')
      .select('owner_id')
      .eq('id', businessId)
      .single();

    if (!business || business.owner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse days param (default 30).
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '30', 10);
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);
    const since = sinceDate.toISOString().split('T')[0];

    const [authViewsResult, guestViewsResult] = await Promise.all([
      supabase
        .from('business_profile_views')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .gte('viewed_at', since),
      supabase
        .from('business_profile_guest_views')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .gte('viewed_at', since),
    ]);

    if (authViewsResult.error) {
      console.error('Error fetching authenticated view count:', authViewsResult.error);
      return NextResponse.json({ error: 'Failed to fetch view count' }, { status: 500 });
    }

    if (guestViewsResult.error) {
      if (isMissingGuestViewsTableError(guestViewsResult.error)) {
        console.warn(
          'Guest profile views table is missing; returning authenticated view count only.'
        );
        return NextResponse.json({ count: authViewsResult.count || 0 });
      }

      console.error('Error fetching guest view count:', guestViewsResult.error);
      return NextResponse.json({ error: 'Failed to fetch view count' }, { status: 500 });
    }

    const totalCount = (authViewsResult.count || 0) + (guestViewsResult.count || 0);
    return NextResponse.json({ count: totalCount });
  } catch (error) {
    console.error('Error in get views API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
