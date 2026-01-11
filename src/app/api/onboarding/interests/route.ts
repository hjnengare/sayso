import { NextResponse } from 'next/server';
import { getServerSupabase } from '../../../lib/supabase/server';
import { performance as nodePerformance } from 'perf_hooks';
import { addNoCacheHeaders } from '../../../lib/utils/responseHeaders';

// Force dynamic rendering and disable caching for onboarding data
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * POST /api/onboarding/interests
 * Saves interests to user_interests table and updates onboarding_step
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

    const { interests } = await req.json();

    if (!interests || !Array.isArray(interests) || interests.length === 0) {
      const response = NextResponse.json(
        { error: 'Interests array is required' },
        { status: 400 }
      );
      return addNoCacheHeaders(response);
    }

    // Validate all interest IDs are strings
    const validInterests = interests.filter((id: any) => 
      typeof id === 'string' && id.trim().length > 0
    );

    if (validInterests.length === 0) {
      const response = NextResponse.json(
        { error: 'No valid interests provided' },
        { status: 400 }
      );
      return addNoCacheHeaders(response);
    }

    const writeStart = nodePerformance.now();

    // ✅ Atomically save interests AND advance step using RPC
    // RPC now returns the updated state directly (no separate fetch needed)
    const { data: freshState, error: interestsError } = await supabase.rpc('replace_user_interests', {
      p_user_id: user.id,
      p_interest_ids: validInterests
    });

    if (interestsError) {
      console.error('[Interests API] Error saving interests:', interestsError);
      // Fallback to manual insert if RPC doesn't exist or is old version
      if (interestsError.message?.includes('function') || interestsError.message?.includes('does not exist')) {
        console.log('[Interests API] RPC function not found, using fallback method');

        // Delete existing interests
        const { error: deleteError } = await supabase
          .from('user_interests')
          .delete()
          .eq('user_id', user.id);

        if (deleteError) {
          console.error('[Interests API] Error deleting existing interests:', deleteError);
          throw deleteError;
        }

        // Insert new interests
        if (validInterests.length > 0) {
          const rows = validInterests.map((interest_id: string) => ({
            user_id: user.id,
            interest_id: interest_id.trim()
          }));

          const { error: insertError } = await supabase
            .from('user_interests')
            .insert(rows);

          if (insertError) {
            console.error('[Interests API] Error inserting interests:', insertError);
            throw insertError;
          }
        }

        // Update step and counts manually (fallback)
        const { error: stepError } = await supabase
          .from('profiles')
          .update({
            onboarding_step: 'subcategories',
            interests_count: validInterests.length,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (stepError) {
          console.error('[Interests API] Error updating onboarding_step:', stepError);
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

        console.log('[Interests API] Interests saved successfully (fallback)', {
          userId: user.id,
          interestsCount: validInterests.length,
          writeTime: `${writeTime.toFixed(2)}ms`,
          totalTime: `${totalTime.toFixed(2)}ms`
        });

        const response = NextResponse.json({
          ok: true,
          onboarding_step: fallbackState?.onboarding_step || 'subcategories',
          onboarding_complete: fallbackState?.onboarding_complete || false,
          interests_count: fallbackState?.interests_count || validInterests.length,
          subcategories_count: fallbackState?.subcategories_count || 0,
          dealbreakers_count: fallbackState?.dealbreakers_count || 0,
          performance: { writeTime, totalTime }
        });
        return addNoCacheHeaders(response);
      } else {
        throw interestsError;
      }
    }

    const writeTime = nodePerformance.now() - writeStart;
    const totalTime = nodePerformance.now() - startTime;

    // ✅ Use state returned directly from RPC (already fresh, no race condition)
    const profile = Array.isArray(freshState) && freshState.length > 0 ? freshState[0] : null;

    console.log('[Interests API] Interests saved successfully', {
      userId: user.id,
      interestsCount: validInterests.length,
      writeTime: `${writeTime.toFixed(2)}ms`,
      totalTime: `${totalTime.toFixed(2)}ms`
    });

    const response = NextResponse.json({
      ok: true,
      // Return fresh onboarding state for immediate UI update (no refetch needed)
      onboarding_step: profile?.onboarding_step || 'subcategories',
      onboarding_complete: profile?.onboarding_complete || false,
      interests_count: profile?.interests_count || validInterests.length,
      subcategories_count: profile?.subcategories_count || 0,
      dealbreakers_count: profile?.dealbreakers_count || 0,
      performance: {
        writeTime: writeTime,
        totalTime: totalTime
      }
    });
    return addNoCacheHeaders(response);

  } catch (error: any) {
    const totalTime = nodePerformance.now() - startTime;
    console.error('[Interests API] Unexpected error:', error);
    const response = NextResponse.json(
      {
        error: 'Failed to save interests',
        message: error.message,
        performance: { totalTime }
      },
      { status: 500 }
    );
    return addNoCacheHeaders(response);
  }
}
