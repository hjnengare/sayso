import { NextResponse } from 'next/server';
import { getServerSupabase } from '../../../lib/supabase/server';

/**
 * GET /api/user/saved-events
 * Check if an event is saved for the current user
 */
export async function GET(req: Request) {
  try {
    const supabase = await getServerSupabase();
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { isSaved: false, error: 'You must be logged in to check saved events' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const event_id = searchParams.get('event_id');

    if (!event_id) {
      return NextResponse.json(
        { isSaved: false, error: 'Event ID is required' },
        { status: 400 }
      );
    }

    // Check if event is saved
    const { data: saved, error: checkError } = await supabase
      .from('saved_events')
      .select('id')
      .eq('user_id', user.id)
      .eq('event_id', event_id)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      // If table doesn't exist, return false (graceful degradation)
      if (checkError.code === '42P01' || checkError.message?.includes('does not exist')) {
        return NextResponse.json({ isSaved: false });
      }
      console.error('Error checking saved event:', checkError);
      return NextResponse.json(
        { isSaved: false, error: 'Failed to check saved status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      isSaved: !!saved,
    });
  } catch (error) {
    console.error('Error in check saved event API:', error);
    return NextResponse.json(
      { isSaved: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/saved-events
 * Save an event for the current user
 */
export async function POST(req: Request) {
  try {
    const supabase = await getServerSupabase();
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to save events' },
        { status: 401 }
      );
    }

    const { event_id } = await req.json();

    if (!event_id) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    // Check if event exists in events table
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title')
      .eq('id', event_id)
      .maybeSingle();

    // If event doesn't exist in database, we can still save it as a reference
    // This allows saving events from external sources (like Ticketmaster)
    if (eventError && eventError.code !== 'PGRST116') {
      console.warn('Event not found in database, but saving reference:', event_id);
    }

    // Check if already saved
    const { data: existing, error: existingError } = await supabase
      .from('saved_events')
      .select('id')
      .eq('user_id', user.id)
      .eq('event_id', event_id)
      .maybeSingle();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking existing saved event:', {
        message: existingError.message,
        code: existingError.code,
        userId: user.id,
        eventId: event_id
      });
    }

    if (existing) {
      return NextResponse.json(
        { 
          success: true,
          message: 'Event already saved',
          isSaved: true
        },
        { status: 200 }
      );
    }

    // Save the event
    const { data: saved, error: saveError } = await supabase
      .from('saved_events')
      .insert({
        user_id: user.id,
        event_id: event_id,
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving event - Full error details:', {
        code: saveError.code,
        message: saveError.message,
        details: saveError.details,
        hint: saveError.hint,
        userId: user.id,
        eventId: event_id
      });

      // If it's a unique constraint violation, event is already saved
      if (saveError.code === '23505') {
        return NextResponse.json(
          { 
            success: true,
            message: 'Event already saved',
            isSaved: true
          },
          { status: 200 }
        );
      }

      // Check if table doesn't exist - create it on the fly or return graceful error
      const isTableError = saveError.code === '42P01' || // relation does not exist
                          saveError.code === '42501' || // insufficient privilege
                          saveError.message?.includes('relation') ||
                          saveError.message?.includes('does not exist');

      if (isTableError) {
        console.warn('saved_events table may not exist:', {
          code: saveError.code,
          message: saveError.message,
          hint: saveError.hint
        });
        return NextResponse.json(
          { 
            error: 'Saved events feature is not available. The table may not exist.',
            details: saveError.message,
            code: saveError.code
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { 
          error: 'Failed to save event', 
          details: saveError.message,
          code: saveError.code
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Event saved successfully',
      saved: saved,
      isSaved: true,
    });
  } catch (error) {
    console.error('Error in save event API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/saved-events
 * Unsave an event for the current user
 */
export async function DELETE(req: Request) {
  try {
    const supabase = await getServerSupabase();
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to unsave events' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const event_id = searchParams.get('event_id');

    if (!event_id) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    // Delete the saved event
    const { error: deleteError } = await supabase
      .from('saved_events')
      .delete()
      .eq('user_id', user.id)
      .eq('event_id', event_id);

    if (deleteError) {
      console.error('Error unsaving event:', deleteError);
      return NextResponse.json(
        { error: 'Failed to unsave event', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Event unsaved successfully',
      isSaved: false,
    });
  } catch (error) {
    console.error('Error in unsave event API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

