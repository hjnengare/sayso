import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '../../../../lib/supabase/server';

/**
 * GET /api/saved/businesses/count
 * Get count of saved businesses
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to view saved count' },
        { status: 401 }
      );
    }

    const { count, error: countError } = await supabase
      .from('saved_businesses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (countError) {
      console.error('Error fetching saved count:', countError);
      return NextResponse.json(
        { error: 'Failed to fetch saved count', details: countError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: count || 0,
    });
  } catch (error) {
    console.error('Error in GET /api/saved/businesses/count:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

