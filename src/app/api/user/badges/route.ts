import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';

/**
 * GET /api/user/badges
 * Get badges for the authenticated user
 * 
 * Query params:
 * - progress: boolean - Include progress for badges not yet earned
 * - stats: boolean - Include badge statistics
 */
export async function GET(req: NextRequest) {
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

    const searchParams = req.nextUrl.searchParams;
    const includeProgress = searchParams.get('progress') === 'true';
    const includeStats = searchParams.get('stats') === 'true';

    // Get user badges
    const { data: badges, error: badgesError } = await supabase
      .rpc('get_user_badges', { p_user_id: user.id });

    if (badgesError) {
      console.error('[GET /api/user/badges] Error fetching badges:', badgesError);
      return NextResponse.json(
        { error: 'Failed to fetch badges' },
        { status: 500 }
      );
    }

    const response: any = {
      badges: badges || [],
    };

    // Include progress if requested
    if (includeProgress) {
      const { data: progress, error: progressError } = await supabase
        .rpc('get_user_badge_progress', { p_user_id: user.id });

      if (!progressError) {
        response.progress = progress || [];
      }
    }

    // Include stats if requested
    if (includeStats) {
      const { data: stats, error: statsError } = await supabase
        .rpc('get_user_badge_stats', { p_user_id: user.id });

      if (!statsError && stats && stats.length > 0) {
        response.stats = stats[0];
      }
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[GET /api/user/badges] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

