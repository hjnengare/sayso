import { NextResponse } from 'next/server';
import { getServerSupabase } from '../../../../lib/supabase/server';
import { FlagRateLimiter } from '../../../../lib/utils/flagRateLimiter';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const FLAG_REASONS = ['spam', 'inappropriate', 'harassment', 'off_topic', 'other'] as const;
const AUTO_HIDE_THRESHOLD = 5; // Auto-hide review if flagged by 5+ users

/**
 * POST /api/reviews/[id]/flag
 * Flag an inappropriate review
 */
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await getServerSupabase();

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to flag a review' },
        { status: 401 }
      );
    }

    // Check if review exists
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('id, user_id, business_id')
      .eq('id', id)
      .single();

    if (reviewError || !review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    // Prevent users from flagging their own reviews
    if (review.user_id === user.id) {
      return NextResponse.json(
        { error: 'You cannot flag your own review' },
        { status: 400 }
      );
    }

    // Check if user has already flagged this review
    const { data: existingFlag } = await supabase
      .from('review_flags')
      .select('id')
      .eq('review_id', id)
      .eq('flagged_by', user.id)
      .maybeSingle();

    if (existingFlag) {
      return NextResponse.json(
        { error: 'You have already flagged this review' },
        { status: 400 }
      );
    }

    // Rate limiting check
    const rateLimitResult = await FlagRateLimiter.checkRateLimit(user.id);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: rateLimitResult.error || 'Rate limit exceeded',
          rateLimit: {
            remainingAttempts: rateLimitResult.remainingAttempts,
            resetAt: rateLimitResult.resetAt.toISOString(),
          },
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': rateLimitResult.remainingAttempts.toString(),
            'X-RateLimit-Reset': Math.floor(rateLimitResult.resetAt.getTime() / 1000).toString(),
          },
        }
      );
    }

    // Parse request body
    const body = await req.json();
    const { reason, details } = body;

    // Validate reason
    if (!reason || !FLAG_REASONS.includes(reason as typeof FLAG_REASONS[number])) {
      return NextResponse.json(
        {
          error: 'Invalid flag reason',
          validReasons: FLAG_REASONS,
        },
        { status: 400 }
      );
    }

    // Require details for 'other' reason
    if (reason === 'other' && (!details || details.trim().length === 0)) {
      return NextResponse.json(
        { error: 'Details are required when reason is "other"' },
        { status: 400 }
      );
    }

    // Create flag
    const { data: flag, error: flagError } = await supabase
      .from('review_flags')
      .insert({
        review_id: id,
        flagged_by: user.id,
        reason,
        details: details?.trim() || null,
        status: 'pending',
      })
      .select()
      .single();

    if (flagError) {
      console.error('Error creating flag:', flagError);
      return NextResponse.json(
        { error: 'Failed to flag review', details: flagError.message },
        { status: 500 }
      );
    }

    // Check if review should be auto-hidden (threshold reached)
    const { count: flagCount, error: countError } = await supabase
      .from('review_flags')
      .select('*', { count: 'exact', head: true })
      .eq('review_id', id)
      .eq('status', 'pending');

    if (countError) {
      console.error('Error counting flags:', countError);
    }

    let autoHidden = false;
    if (flagCount && flagCount >= AUTO_HIDE_THRESHOLD) {
      // Auto-hide logic: When threshold is reached, mark review for moderation
      // Note: This requires a 'moderation_status' column in reviews table
      // For now, we log it for admin review
      // TODO: Add migration to add moderation_status column to reviews table
      // Example migration:
      // ALTER TABLE reviews ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'visible' 
      //   CHECK (moderation_status IN ('visible', 'hidden', 'pending_review'));
      
      console.warn(`⚠️ Review ${id} has been flagged ${flagCount} times (threshold: ${AUTO_HIDE_THRESHOLD}). Review should be auto-hidden.`);
      
      // Log for admin review - in production, you would:
      // 1. Add moderation_status column to reviews table
      // 2. Update the review to set moderation_status = 'hidden'
      // 3. Filter hidden reviews in your queries
      // For now, we just log it so admins can manually review
      autoHidden = true; // Mark as detected, even if we can't actually hide it yet
    }

    return NextResponse.json({
      success: true,
      message: 'Review flagged successfully',
      flag,
      autoHidden: flagCount && flagCount >= AUTO_HIDE_THRESHOLD,
    });

  } catch (error) {
    console.error('Error in flag review API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/reviews/[id]/flag/status
 * Check if current user has flagged this review
 */
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await getServerSupabase();

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      // If not authenticated, return not flagged
      return NextResponse.json({
        flagged: false,
        flag: null,
      });
    }

    // Check if user has flagged this review
    const { data: flag, error: flagError } = await supabase
      .from('review_flags')
      .select('id, reason, details, status, created_at')
      .eq('review_id', id)
      .eq('flagged_by', user.id)
      .maybeSingle();

    if (flagError) {
      console.error('Error checking flag status:', flagError);
      return NextResponse.json(
        { error: 'Failed to check flag status', details: flagError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      flagged: !!flag,
      flag: flag || null,
    });

  } catch (error) {
    console.error('Error in get flag status API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reviews/[id]/flag
 * Remove flag (if user changes their mind)
 */
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await getServerSupabase();

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to remove a flag' },
        { status: 401 }
      );
    }

    // Check if flag exists
    const { data: flag, error: flagError } = await supabase
      .from('review_flags')
      .select('id, status')
      .eq('review_id', id)
      .eq('flagged_by', user.id)
      .maybeSingle();

    if (flagError) {
      console.error('Error checking flag:', flagError);
      return NextResponse.json(
        { error: 'Failed to check flag', details: flagError.message },
        { status: 500 }
      );
    }

    if (!flag) {
      return NextResponse.json(
        { error: 'Flag not found' },
        { status: 404 }
      );
    }

    // Only allow deletion of pending flags (not reviewed ones)
    if (flag.status !== 'pending') {
      return NextResponse.json(
        { error: 'Cannot remove a flag that has already been reviewed' },
        { status: 400 }
      );
    }

    // Delete the flag
    const { error: deleteError } = await supabase
      .from('review_flags')
      .delete()
      .eq('id', flag.id);

    if (deleteError) {
      console.error('Error deleting flag:', deleteError);
      return NextResponse.json(
        { error: 'Failed to remove flag', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Flag removed successfully',
    });

  } catch (error) {
    console.error('Error in remove flag API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

