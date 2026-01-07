import { NextResponse } from 'next/server';
import { getServerSupabase } from '../../../lib/supabase/server';
import { performance as nodePerformance } from 'perf_hooks';

/**
 * POST /api/onboarding/complete
 * Saves all onboarding data (interests, subcategories, dealbreakers) and marks onboarding as complete
 * This is the ONLY place where data is saved to the database in the new URL-param flow
 */
export async function POST(req: Request) {
  const startTime = nodePerformance.now();
  
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { interests, subcategories, dealbreakers } = await req.json();

    // Validate inputs
    if (!interests || !Array.isArray(interests) || interests.length === 0) {
      return NextResponse.json(
        { error: 'Interests array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (!subcategories || !Array.isArray(subcategories)) {
      return NextResponse.json(
        { error: 'Subcategories array is required' },
        { status: 400 }
      );
    }

    if (!dealbreakers || !Array.isArray(dealbreakers) || dealbreakers.length === 0) {
      return NextResponse.json(
        { error: 'Dealbreakers array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Clean and validate interests
    const validInterests = Array.from(new Set(
      interests
        .filter((id: any) => typeof id === 'string' && id.trim().length > 0)
        .map((id: string) => id.trim())
    ));

    if (validInterests.length === 0) {
      return NextResponse.json(
        { error: 'No valid interests provided' },
        { status: 400 }
      );
    }

    // Valid interest IDs for validation
    const VALID_INTEREST_IDS = [
      'food-drink',
      'beauty-wellness',
      'professional-services',
      'outdoors-adventure',
      'experiences-entertainment',
      'arts-culture',
      'family-pets',
      'shopping-lifestyle'
    ];

    // Clean and validate subcategories
    // Expected: array of subcategory IDs (strings)
    // We need to map them to {subcategory_id, interest_id} format
    const cleanedSubcategories = Array.from(new Set(
      subcategories
        .filter((id: any) => typeof id === 'string' && id.trim().length > 0)
        .map((id: string) => id.trim())
        .filter((id: string) => !VALID_INTEREST_IDS.includes(id)) // Filter out interest IDs
    ));

    // Clean and validate dealbreakers
    const validDealbreakers = Array.from(new Set(
      dealbreakers
        .filter((id: any) => typeof id === 'string' && id.trim().length > 0)
        .map((id: string) => id.trim())
    ));

    if (validDealbreakers.length === 0) {
      return NextResponse.json(
        { error: 'No valid dealbreakers provided' },
        { status: 400 }
      );
    }

    const writeStart = nodePerformance.now();

    // First, fetch subcategory data to get interest_id for each subcategory
    let subcategoryData: Array<{ subcategory_id: string; interest_id: string }> = [];
    if (cleanedSubcategories.length > 0) {
      const { data: subcategoriesFromDB, error: subcatFetchError } = await supabase
        .from('subcategories')
        .select('id, interest_id')
        .in('id', cleanedSubcategories);

      if (subcatFetchError) {
        console.error('[Complete API] Error fetching subcategory data:', subcatFetchError);
        return NextResponse.json(
          { error: 'Failed to validate subcategories' },
          { status: 400 }
        );
      }

      if (subcategoriesFromDB) {
        subcategoryData = subcategoriesFromDB.map((sub: { id: string; interest_id: string }) => ({
          subcategory_id: sub.id,
          interest_id: sub.interest_id
        }));
      }
    }

    // Use atomic function to save all data at once
    // This ensures data consistency and updates profile in a single transaction
    const { error: completeError } = await supabase.rpc('complete_onboarding_atomic', {
      p_user_id: user.id,
      p_interest_ids: validInterests,
      p_subcategory_data: subcategoryData,
      p_dealbreaker_ids: validDealbreakers
    });

    // If atomic function doesn't exist or fails, fall back to individual saves
    if (completeError) {
      console.warn('[Complete API] Atomic function failed, using fallback method:', completeError);
      
      // Fallback: Save individually
      // 1. Save interests
      const { error: interestsError } = await supabase.rpc('replace_user_interests', {
        p_user_id: user.id,
        p_interest_ids: validInterests
      });

      if (interestsError) {
        console.error('[Complete API] Error saving interests:', interestsError);
        // Fallback to manual insert
        await supabase.from('user_interests').delete().eq('user_id', user.id);
        if (validInterests.length > 0) {
          const interestRows = validInterests.map((interest_id: string) => ({
            user_id: user.id,
            interest_id
          }));
          await supabase.from('user_interests').insert(interestRows);
        }
      }

      // 2. Save subcategories (need to fetch subcategory data to get interest_id)
      // For now, we'll need to query subcategories table to get interest_id for each
      if (cleanedSubcategories.length > 0) {
        const { data: subcategoryData } = await supabase
          .from('subcategories')
          .select('id, interest_id')
          .in('id', cleanedSubcategories);

        if (subcategoryData && subcategoryData.length > 0) {
          const subcategoryRows = subcategoryData.map((sub: { id: string; interest_id: string }) => ({
            user_id: user.id,
            subcategory_id: sub.id,
            interest_id: sub.interest_id
          }));

          await supabase.from('user_subcategories').delete().eq('user_id', user.id);
          await supabase.from('user_subcategories').insert(subcategoryRows);
        }
      }

      // 3. Save dealbreakers
      const { error: dealbreakersError } = await supabase.rpc('replace_user_dealbreakers', {
        p_user_id: user.id,
        p_dealbreaker_ids: validDealbreakers
      });

      if (dealbreakersError) {
        console.error('[Complete API] Error saving dealbreakers:', dealbreakersError);
        // Fallback to manual insert
        await supabase.from('user_dealbreakers').delete().eq('user_id', user.id);
        if (validDealbreakers.length > 0) {
          const dealbreakerRows = validDealbreakers.map((dealbreaker_id: string) => ({
            user_id: user.id,
            dealbreaker_id
          }));
          await supabase.from('user_dealbreakers').insert(dealbreakerRows);
        }
      }

      // 4. Update profile
      await supabase
        .from('profiles')
        .update({
          onboarding_step: 'complete',
          onboarding_complete: true,
          interests_count: validInterests.length,
          subcategories_count: cleanedSubcategories.length,
          dealbreakers_count: validDealbreakers.length,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
    }

    const writeTime = nodePerformance.now() - writeStart;
    const totalTime = nodePerformance.now() - startTime;

    console.log('[Complete API] Onboarding completed successfully', {
      userId: user.id,
      interestsCount: validInterests.length,
      subcategoriesCount: cleanedSubcategories.length,
      dealbreakersCount: validDealbreakers.length,
      writeTime: `${writeTime.toFixed(2)}ms`,
      totalTime: `${totalTime.toFixed(2)}ms`
    });

    return NextResponse.json({
      success: true,
      interestsCount: validInterests.length,
      subcategoriesCount: cleanedSubcategories.length,
      dealbreakersCount: validDealbreakers.length,
      performance: {
        writeTime: writeTime,
        totalTime: totalTime
      }
    });

  } catch (error: any) {
    const totalTime = nodePerformance.now() - startTime;
    console.error('[Complete API] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Failed to complete onboarding',
        message: error.message,
        performance: { totalTime }
      },
      { status: 500 }
    );
  }
}

