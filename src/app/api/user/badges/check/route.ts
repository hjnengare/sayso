import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';

/**
 * POST /api/user/badges/check
 * Manually trigger badge check for the authenticated user
 * Useful for backfilling badges or testing
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Trigger badge check
    const { data: awardedBadges, error: checkError } = await supabase
      .rpc('check_user_badges', { p_user_id: user.id });

    if (checkError) {
      console.error('[POST /api/user/badges/check] Error checking badges:', checkError);
      return NextResponse.json(
        { error: 'Failed to check badges' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      awarded_badges: awardedBadges || [],
      message: awardedBadges && awardedBadges.length > 0
        ? `Awarded ${awardedBadges.length} new badge(s)`
        : 'No new badges awarded',
    });
  } catch (error: any) {
    console.error('[POST /api/user/badges/check] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

