import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';
import {
  getCurrentUserId,
  getUserStats,
  updateLastActive,
} from '@/app/lib/services/userService';
import type { ApiResponse, UserStats } from '@/app/lib/types/user';

export const dynamic = 'force-dynamic';

/**
 * GET /api/user/stats
 * Get user statistics
 */
export async function GET(req: Request) {
  try {
    const supabase = await getServerSupabase(req);
    const userId = await getCurrentUserId(supabase);

    if (!userId) {
      return NextResponse.json<ApiResponse<UserStats>>(
        {
          data: null,
          error: {
            message: 'Unauthorized',
            code: 'UNAUTHORIZED',
          },
        },
        { status: 401 }
      );
    }

    // Update last active
    await updateLastActive(supabase, userId);

    const stats = await getUserStats(supabase, userId);

    // If stats is null, return default stats (user might not have any activity yet)
    if (!stats) {
      console.warn('[Stats API] getUserStats returned null, returning default stats');
      const defaultStats: UserStats = {
        totalReviewsWritten: 0,
        totalHelpfulVotesGiven: 0,
        totalBusinessesSaved: 0,
        accountCreationDate: new Date().toISOString(),
        lastActiveDate: new Date().toISOString(),
        helpfulVotesReceived: 0,
      };
      return NextResponse.json<ApiResponse<UserStats>>({
        data: defaultStats,
        error: null,
      });
    }

    return NextResponse.json<ApiResponse<UserStats>>({
      data: stats,
      error: null,
    });
  } catch (error: any) {
    console.error('[Stats API] Error:', error);
    return NextResponse.json<ApiResponse<UserStats>>(
      {
        data: null,
        error: {
          message: error.message || 'Internal server error',
          code: 'INTERNAL_ERROR',
        },
      },
      { status: 500 }
    );
  }
}

