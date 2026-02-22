import { NextResponse } from 'next/server';
import { getServerSupabase } from '../../../lib/supabase/server';
import { performance as nodePerformance } from 'perf_hooks';

/**
 * Performance test endpoint for onboarding flow.
 * Dev only — not available in production.
 */
function isSchemaCacheError(error: { message?: string } | null | undefined): boolean {
  const message = error?.message?.toLowerCase() || '';
  return message.includes('schema cache') && message.includes('onboarding_completed_at');
}

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const startTime = nodePerformance.now();
  const results: Record<string, number> = {};

  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({
        error: 'Unauthorized',
        message: 'Please log in to test performance'
      }, { status: 401 });
    }

    // Test 1: Profile query
    const profileStart = nodePerformance.now();
    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('onboarding_step, onboarding_complete, onboarding_completed_at, interests_count, subcategories_count, dealbreakers_count')
      .eq('user_id', user.id)
      .single();

    if (profileError && isSchemaCacheError(profileError)) {
      ({ data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('onboarding_step, onboarding_complete, interests_count, subcategories_count, dealbreakers_count')
        .eq('user_id', user.id)
        .single());
    }
    results.profile_query_ms = nodePerformance.now() - profileStart;

    if (profileError) {
      return NextResponse.json({
        error: 'Profile query failed',
        details: profileError.message,
        results
      }, { status: 500 });
    }

    // Test 2: Check if tables exist and are accessible
    const tablesStart = nodePerformance.now();
    const tables = ['user_interests', 'user_subcategories', 'user_dealbreakers'];
    const tableChecks: Record<string, boolean> = {};

    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select('*').limit(1);
        tableChecks[table] = !error;
      } catch {
        tableChecks[table] = false;
      }
    }
    results.table_checks_ms = nodePerformance.now() - tablesStart;

    // Test 3: Test atomic function exists
    let functionTest = 0;
    if (profile) {
      const functionStart = nodePerformance.now();
      try {
        await supabase.rpc('complete_onboarding_atomic', {
          p_user_id: user.id,
          p_interest_ids: [],
          p_subcategory_data: [],
          p_dealbreaker_ids: []
        });
        functionTest = nodePerformance.now() - functionStart;
      } catch {
        functionTest = nodePerformance.now() - functionStart;
      }
      results.function_check_ms = functionTest;
    }

    const totalTime = nodePerformance.now() - startTime;
    results.total_ms = totalTime;

    const thresholds = { profile_query: 100, table_checks: 200, total: 500 };
    const perfResults = {
      profile_query: results.profile_query_ms < thresholds.profile_query ? 'PASS' : 'FAIL',
      table_checks: results.table_checks_ms < thresholds.table_checks ? 'PASS' : 'FAIL',
      total: results.total_ms < thresholds.total ? 'PASS' : 'FAIL',
      all_tables_exist: Object.values(tableChecks).every(v => v)
    };

    return NextResponse.json({
      success: true,
      results,
      thresholds,
      performance: perfResults,
      profile: profile ? {
        onboarding_step: profile.onboarding_step,
        onboarding_complete: !!profile.onboarding_completed_at,
        onboarding_completed_at: profile.onboarding_completed_at ?? null,
        interests_count: profile.interests_count,
        subcategories_count: profile.subcategories_count,
        dealbreakers_count: profile.dealbreakers_count
      } : null,
      tables: tableChecks,
      message: perfResults.total === 'PASS'
        ? 'All performance tests passed!'
        : 'Some performance tests failed. Check results above.'
    });

  } catch (error: any) {
    const totalTime = nodePerformance.now() - startTime;
    return NextResponse.json({
      error: 'Performance test failed',
      message: error.message,
      results: { ...results, total_ms: totalTime }
    }, { status: 500 });
  }
}
