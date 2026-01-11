import { NextResponse } from 'next/server';
import { getServerSupabase } from '../../../lib/supabase/server';
import { performance as nodePerformance } from 'perf_hooks';
import { addNoCacheHeaders } from '../../../lib/utils/responseHeaders';

// Force dynamic rendering and disable caching for onboarding data
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * POST /api/onboarding/deal-breakers
 * Saves dealbreakers to user_dealbreakers table and updates onboarding_step
 */
export async function POST(req: Request) {
  const startTime = nodePerformance.now();
  
  try {
    const supabase = await getServerSupabase(req);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      return addNoCacheHeaders(response);
    }

    const { dealbreakers } = await req.json();

    if (!dealbreakers || !Array.isArray(dealbreakers) || dealbreakers.length === 0) {
      const response = NextResponse.json(
        { error: 'Dealbreakers array is required and must not be empty' },
        { status: 400 }
      );
      return addNoCacheHeaders(response);
    }

    // Validate all dealbreaker IDs are strings
    const validDealbreakers = Array.from(new Set(
      dealbreakers
        .filter((id: any) => typeof id === 'string' && id.trim().length > 0)
        .map((id: string) => id.trim())
    ));

    if (validDealbreakers.length === 0) {
      const response = NextResponse.json(
        { error: 'No valid dealbreakers provided' },
        { status: 400 }
      );
      return addNoCacheHeaders(response);
    }

    const writeStart = nodePerformance.now();

    // ✅ Atomically save dealbreakers AND mark complete using RPC
    // RPC now returns the updated state directly (no separate fetch needed)
    const { data: freshState, error: dealbreakersError } = await supabase.rpc('replace_user_dealbreakers', {
      p_user_id: user.id,
      p_dealbreaker_ids: validDealbreakers
    });

    if (dealbreakersError) {
      console.error('[Deal-breakers API] Error saving dealbreakers:', dealbreakersError);
      // Fallback to manual insert if RPC doesn't exist or is old version
      if (dealbreakersError.message?.includes('function') || dealbreakersError.message?.includes('does not exist')) {
        console.log('[Deal-breakers API] RPC function not found, using fallback method');

        // Delete existing dealbreakers
        const { error: deleteError } = await supabase
          .from('user_dealbreakers')
          .delete()
          .eq('user_id', user.id);

        if (deleteError) {
          console.error('[Deal-breakers API] Error deleting existing dealbreakers:', deleteError);
          throw deleteError;
        }

        // Insert new dealbreakers
        if (validDealbreakers.length > 0) {
          const rows = validDealbreakers.map((dealbreaker_id: string) => ({
            user_id: user.id,
            dealbreaker_id: dealbreaker_id.trim()
          }));

          const { error: insertError } = await supabase
            .from('user_dealbreakers')
            .insert(rows);

          if (insertError) {
            console.error('[Deal-breakers API] Error inserting dealbreakers:', insertError);
            throw insertError;
          }
        }

        // Update step and mark complete manually (fallback)
        const { error: stepError } = await supabase
          .from('profiles')
          .update({
            onboarding_step: 'complete',
            onboarding_complete: true,
            dealbreakers_count: validDealbreakers.length,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (stepError) {
          console.error('[Deal-breakers API] Error updating onboarding_step:', stepError);
          throw stepError;
        }

        // Fetch state after fallback
        const { data: fallbackState } = await supabase
          .from('profiles')
          .select('onboarding_step, onboarding_complete, interests_count, subcategories_count, dealbreakers_count')
          .eq('user_id', user.id)
          .maybeSingle();

        // Use fallback state
        const totalTime = nodePerformance.now() - startTime;
        const writeTime = nodePerformance.now() - writeStart;

        console.log('[Deal-breakers API] Dealbreakers saved successfully (fallback)', {
          userId: user.id,
          dealbreakersCount: validDealbreakers.length,
          writeTime: `${writeTime.toFixed(2)}ms`,
          totalTime: `${totalTime.toFixed(2)}ms`
        });

        const response = NextResponse.json({
          ok: true,
          onboarding_step: fallbackState?.onboarding_step || 'complete',
          onboarding_complete: fallbackState?.onboarding_complete || true,
          interests_count: fallbackState?.interests_count || 0,
          subcategories_count: fallbackState?.subcategories_count || 0,
          dealbreakers_count: fallbackState?.dealbreakers_count || validDealbreakers.length,
          performance: { writeTime, totalTime }
        });
        return addNoCacheHeaders(response);
      } else {
        throw dealbreakersError;
      }
    }

    const writeTime = nodePerformance.now() - writeStart;
    const totalTime = nodePerformance.now() - startTime;

    // ✅ Use state returned directly from RPC (already fresh, no race condition)
    const profile = Array.isArray(freshState) && freshState.length > 0 ? freshState[0] : null;

    console.log('[Deal-breakers API] Dealbreakers saved successfully', {
      userId: user.id,
      dealbreakersCount: validDealbreakers.length,
      writeTime: `${writeTime.toFixed(2)}ms`,
      totalTime: `${totalTime.toFixed(2)}ms`
    });

    const response = NextResponse.json({
      ok: true,
      // Return fresh onboarding state for immediate UI update (no refetch needed)
      onboarding_step: profile?.onboarding_step || 'complete',
      onboarding_complete: profile?.onboarding_complete || false,
      interests_count: profile?.interests_count || 0,
      subcategories_count: profile?.subcategories_count || 0,
      dealbreakers_count: profile?.dealbreakers_count || validDealbreakers.length,
      performance: {
        writeTime: writeTime,
        totalTime: totalTime
      }
    });
    return addNoCacheHeaders(response);

  } catch (error: any) {
    const totalTime = nodePerformance.now() - startTime;
    console.error('[Deal-breakers API] Unexpected error:', error);
    const response = NextResponse.json(
      {
        error: 'Failed to save dealbreakers',
        message: error.message,
        performance: { totalTime }
      },
      { status: 500 }
    );
    return addNoCacheHeaders(response);
  }
}

