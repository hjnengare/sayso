import { NextResponse } from 'next/server';
import { getServerSupabase } from '../../../lib/supabase/server';
import { addNoCacheHeaders } from '../../../lib/utils/responseHeaders';

// Force dynamic rendering and disable caching
export const dynamic = "force-dynamic";
export const revalidate = 0;

function isSchemaCacheError(error: { message?: string } | null | undefined): boolean {
  const message = error?.message?.toLowerCase() || '';
  return message.includes('schema cache') && message.includes('onboarding_completed_at');
}

/**
 * POST /api/onboarding/deal-breakers
 * Saves dealbreakers and marks onboarding complete
 */
export async function POST(req: Request) {
  try {
    const supabase = await getServerSupabase(req);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      return addNoCacheHeaders(response);
    }

    const body = await req.json();
    const dealbreakers = body?.dealbreakers ?? body?.dealbreaker_ids;

    if (!dealbreakers || !Array.isArray(dealbreakers)) {
      const response = NextResponse.json(
        { error: 'Dealbreakers must be an array' },
        { status: 400 }
      );
      return addNoCacheHeaders(response);
    }

    const rawDealbreakers = dealbreakers.map((id: unknown) => (typeof id === 'string' ? id.trim() : ''));
    const invalidDealbreakers = rawDealbreakers.filter((id) => id.length === 0);

    if (invalidDealbreakers.length > 0) {
      const response = NextResponse.json(
        { error: 'All dealbreaker IDs must be non-empty strings' },
        { status: 400 }
      );
      return addNoCacheHeaders(response);
    }

    const normalizedDealbreakers = Array.from(new Set(rawDealbreakers));

    if (normalizedDealbreakers.length < 1) {
      const response = NextResponse.json(
        { error: 'Please select at least 1 dealbreaker' },
        { status: 400 }
      );
      return addNoCacheHeaders(response);
    }

    if (normalizedDealbreakers.length > 3) {
      const response = NextResponse.json(
        { error: 'Maximum 3 dealbreakers allowed' },
        { status: 400 }
      );
      return addNoCacheHeaders(response);
    }

    const { data: interestsData, error: interestsError } = await supabase
      .from('user_interests')
      .select('interest_id')
      .eq('user_id', user.id)
      .limit(1);

    if (interestsError) {
      console.error('[Dealbreakers API] Error loading interests:', interestsError);
      return addNoCacheHeaders(
        NextResponse.json({ error: 'Failed to verify interests' }, { status: 500 })
      );
    }

    if (!interestsData || interestsData.length === 0) {
      return addNoCacheHeaders(
        NextResponse.json({ error: 'Complete interests first' }, { status: 400 })
      );
    }

    const { data: subcategoriesData, error: subcategoriesError } = await supabase
      .from('user_subcategories')
      .select('subcategory_id')
      .eq('user_id', user.id)
      .limit(1);

    if (subcategoriesError) {
      console.error('[Dealbreakers API] Error loading subcategories:', subcategoriesError);
      return addNoCacheHeaders(
        NextResponse.json({ error: 'Failed to verify subcategories' }, { status: 500 })
      );
    }

    if (!subcategoriesData || subcategoriesData.length === 0) {
      return addNoCacheHeaders(
        NextResponse.json({ error: 'Complete subcategories first' }, { status: 400 })
      );
    }

    const { error: dealbreakersError } = await supabase.rpc('replace_user_dealbreakers', {
      p_user_id: user.id,
      p_dealbreaker_ids: normalizedDealbreakers
    });

    if (dealbreakersError) {
      console.warn('[Dealbreakers API] RPC failed, falling back to direct writes:', dealbreakersError);

      const { error: deleteError } = await supabase
        .from('user_dealbreakers')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('[Dealbreakers API] Error clearing dealbreakers:', deleteError);
        throw deleteError;
      }

      const rows = normalizedDealbreakers.map((dealbreakerId: string) => ({
        user_id: user.id,
        dealbreaker_id: dealbreakerId
      }));

      const { error: insertError } = await supabase
        .from('user_dealbreakers')
        .insert(rows);

      if (insertError) {
        console.error('[Dealbreakers API] Error inserting dealbreakers:', insertError);
        throw insertError;
      }
    }

    let { error: updateError } = await supabase
      .from('profiles')
      .update({
        onboarding_step: 'complete',
        onboarding_complete: true,
        onboarding_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (updateError && isSchemaCacheError(updateError)) {
      ({ error: updateError } = await supabase
        .from('profiles')
        .update({
          onboarding_step: 'complete',
          onboarding_complete: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id));
    }

    if (updateError) {
      console.error('[Dealbreakers API] Error updating profile:', updateError);
      throw updateError;
    }

    const response = NextResponse.json({
      ok: true,
      onboarding_complete: true
    });
    return addNoCacheHeaders(response);

  } catch (error: any) {
    console.error('[Dealbreakers API] Unexpected error:', error);
    const response = NextResponse.json(
      {
        error: 'Failed to save dealbreakers',
        message: error.message
      },
      { status: 500 }
    );
    return addNoCacheHeaders(response);
  }
}
