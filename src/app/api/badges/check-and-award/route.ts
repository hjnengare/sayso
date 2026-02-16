import { NextResponse } from 'next/server';
import { getServerSupabase } from '../../../lib/supabase/server';

/**
 * POST /api/badges/check-and-award
 * Checks user's eligibility for badges and awards any newly earned badges
 *
 * This should be called after:
 * - Review created/updated
 * - Photo uploaded
 * - Helpful vote received
 * - Daily cron (for streaks)
 */
export async function POST(req: Request) {
  try {
    const supabase = await getServerSupabase(req);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get badge IDs the user has already earned (authoritative list for NOT IN)
    const { data: earnedRows, error: earnedError } = await supabase
      .from('user_badges')
      .select('badge_id')
      .eq('user_id', user.id);

    if (earnedError) {
      console.error('[Badge Check] Error fetching earned badges:', earnedError);
      return NextResponse.json({ error: 'Failed to fetch user badges' }, { status: 500 });
    }

    const earnedBadgeIds = (earnedRows ?? []).map((r) => r.badge_id).filter(Boolean);
    const { data: unearnedBadges, error: badgesError } = await supabase
      .from('badges')
      .select('*');

    if (badgesError) {
      console.error('[Badge Check] Error fetching badges:', badgesError);
      return NextResponse.json({ error: 'Failed to fetch badges' }, { status: 500 });
    }

    const unearned =
      earnedBadgeIds.length > 0 && Array.isArray(unearnedBadges)
        ? unearnedBadges.filter((b) => !earnedBadgeIds.includes(b.id))
        : unearnedBadges ?? [];

    if (!unearned || unearned.length === 0) {
      return NextResponse.json({
        ok: true,
        message: 'All badges already earned',
        newBadges: []
      });
    }

    // Check each unearned badge
    const newlyEarnedBadges = [];

    for (const badge of unearned) {
      const { data: earned, error: checkError } = await supabase.rpc(
        'check_badge_earned',
        {
          p_user_id: user.id,
          p_badge_id: badge.id
        }
      );

      if (checkError) {
        console.error(`[Badge Check] Error checking badge ${badge.id}:`, checkError);
        continue;
      }

      if (earned) {
        // Award the badge
        const { error: awardError } = await supabase
          .from('user_badges')
          .insert({
            user_id: user.id,
            badge_id: badge.id
          });

        if (awardError) {
          // Ignore duplicate key errors (race condition - badge already awarded)
          if (!awardError.message?.includes('duplicate')) {
            console.error(`[Badge Check] Error awarding badge ${badge.id}:`, awardError);
          }
        } else {
          newlyEarnedBadges.push({
            id: badge.id,
            name: badge.name,
            description: badge.description,
            icon_path: badge.icon_path,
            badge_group: badge.badge_group
          });
        }
      }
    }

    console.log(`[Badge Check] User ${user.id} earned ${newlyEarnedBadges.length} new badges:`,
      newlyEarnedBadges.map(b => b.name));

    return NextResponse.json({
      ok: true,
      newBadges: newlyEarnedBadges,
      message: newlyEarnedBadges.length > 0
        ? `Congratulations! You earned ${newlyEarnedBadges.length} new badge(s)!`
        : 'No new badges earned'
    });

  } catch (error: any) {
    console.error('[Badge Check] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Failed to check badges',
        message: error.message
      },
      { status: 500 }
    );
  }
}
