import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '../../../../lib/supabase/server';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/saved/businesses/[id]
 * Check if business is saved
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const supabase = await getServerSupabase();
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to check saved status' },
        { status: 401 }
      );
    }

    const { data: saved, error: savedError } = await supabase
      .from('saved_businesses')
      .select('id, user_id, business_id, created_at, updated_at')
      .eq('user_id', user.id)
      .eq('business_id', id)
      .maybeSingle();

    if (savedError) {
      console.error('Error checking saved status:', savedError);
      return NextResponse.json(
        { error: 'Failed to check saved status', details: savedError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      isSaved: !!saved,
      saved: saved || null,
    });
  } catch (error) {
    console.error('Error in GET /api/saved/businesses/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/saved/businesses/[id]
 * Remove business from saved list
 */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const supabase = await getServerSupabase();
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to unsave businesses' },
        { status: 401 }
      );
    }

    // Delete the saved business
    const { error: deleteError } = await supabase
      .from('saved_businesses')
      .delete()
      .eq('user_id', user.id)
      .eq('business_id', id);

    if (deleteError) {
      console.error('Error unsaving business:', deleteError);
      return NextResponse.json(
        { error: 'Failed to unsave business', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Business unsaved successfully',
      isSaved: false,
    });
  } catch (error) {
    console.error('Error in DELETE /api/saved/businesses/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

