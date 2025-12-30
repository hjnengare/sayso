import { NextResponse } from 'next/server';
import { getServerSupabase } from '../../../lib/supabase/server';
import { performance as nodePerformance } from 'perf_hooks';

/**
 * POST /api/onboarding/subcategories
 * Lightweight endpoint to save subcategories and mark step as done
 */
export async function POST(req: Request) {
  const startTime = nodePerformance.now();
  
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subcategories } = await req.json();

    if (!subcategories || !Array.isArray(subcategories) || subcategories.length === 0) {
      return NextResponse.json(
        { error: 'Subcategories array is required' },
        { status: 400 }
      );
    }

    const writeStart = nodePerformance.now();

    // Map subcategories to expected format
    const subcategoryData = subcategories.map((sub: any) => ({
      subcategory_id: sub.subcategory_id || sub.id,
      interest_id: sub.interest_id
    }));

    // Single atomic operation: save subcategories and update profile
    const { error: subcategoriesError } = await supabase.rpc('replace_user_subcategories', {
      p_user_id: user.id,
      p_subcategory_data: subcategoryData
    });

    if (subcategoriesError) {
      console.error('[Subcategories API] Error saving subcategories:', subcategoriesError);
      return NextResponse.json(
        { error: 'Failed to save subcategories', details: subcategoriesError.message },
        { status: 500 }
      );
    }

    // Update profile to mark subcategories step as done
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        onboarding_step: 'deal-breakers',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (profileError) {
      console.error('[Subcategories API] Error updating profile:', profileError);
      // Don't fail if profile update fails - subcategories are saved
    }

    const writeTime = nodePerformance.now() - writeStart;
    const totalTime = nodePerformance.now() - startTime;

    console.log('[Subcategories API] Save completed', {
      userId: user.id,
      subcategoriesCount: subcategories.length,
      writeTime: `${writeTime.toFixed(2)}ms`,
      totalTime: `${totalTime.toFixed(2)}ms`
    });

    return NextResponse.json({
      ok: true,
      subcategoriesCount: subcategories.length,
      performance: {
        writeTime: writeTime,
        totalTime: totalTime
      }
    });

  } catch (error: any) {
    const totalTime = nodePerformance.now() - startTime;
    console.error('[Subcategories API] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Failed to save subcategories',
        message: error.message,
        performance: { totalTime }
      },
      { status: 500 }
    );
  }
}

