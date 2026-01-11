import { NextResponse } from 'next/server';
import { getServerSupabase } from '../../../lib/supabase/server';

/**
 * GET /api/badges/user?user_id=xxx
 * Fetches all badges for a user (earned and unearned)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 });
    }

    const supabase = await getServerSupabase(req);

    // Fetch all badges with user's earned status
    const { data: allBadges, error: badgesError } = await supabase
      .from('badges')
      .select('*')
      .order('badge_group', { ascending: true });

    if (badgesError) {
      console.error('[Badge Fetch] Error fetching badges:', badgesError);
      return NextResponse.json({ error: 'Failed to fetch badges' }, { status: 500 });
    }

    // Fetch user's earned badges
    const { data: earnedBadges, error: earnedError } = await supabase
      .from('user_badges')
      .select('badge_id, awarded_at')
      .eq('user_id', userId);

    if (earnedError) {
      console.error('[Badge Fetch] Error fetching earned badges:', earnedError);
      return NextResponse.json({ error: 'Failed to fetch earned badges' }, { status: 500 });
    }

    // Create a set of earned badge IDs for quick lookup
    const earnedBadgeIds = new Set(earnedBadges?.map(b => b.badge_id) || []);
    const earnedBadgeMap = new Map(
      earnedBadges?.map(b => [b.badge_id, b.awarded_at]) || []
    );

    // Combine data
    const badgesWithStatus = allBadges?.map(badge => ({
      ...badge,
      earned: earnedBadgeIds.has(badge.id),
      awarded_at: earnedBadgeMap.get(badge.id) || null
    })) || [];

    // Group by badge_group
    const grouped = {
      explorer: badgesWithStatus.filter(b => b.badge_group === 'explorer'),
      specialist: badgesWithStatus.filter(b => b.badge_group === 'specialist'),
      milestone: badgesWithStatus.filter(b => b.badge_group === 'milestone'),
      community: badgesWithStatus.filter(b => b.badge_group === 'community')
    };

    // Calculate stats
    const stats = {
      total: allBadges?.length || 0,
      earned: earnedBadgeIds.size,
      percentage: allBadges?.length
        ? Math.round((earnedBadgeIds.size / allBadges.length) * 100)
        : 0
    };

    return NextResponse.json({
      ok: true,
      badges: badgesWithStatus,
      grouped,
      stats
    });

  } catch (error: any) {
    console.error('[Badge Fetch] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch user badges',
        message: error.message
      },
      { status: 500 }
    );
  }
}
