import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '../../../../../lib/supabase/server';
import { extractStoragePath } from '../../../../../lib/utils/storagePathExtraction';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * DELETE /api/businesses/[id]/images/[imageId]
 * Delete a business image (requires business owner authentication)
 * imageId is the UUID of the image record in business_images table
 * Deletes from both storage bucket and business_images table
 * Trigger automatically promotes next image if primary was deleted
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const { id: businessId, imageId } = await params;
    const supabase = await getServerSupabase(req);

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user owns this business
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, owner_id')
      .eq('id', businessId)
      .single();

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Check ownership
    const { data: ownerCheck } = await supabase
      .from('business_owners')
      .select('id')
      .eq('business_id', businessId)
      .eq('user_id', user.id)
      .single();

    const isOwner = ownerCheck || business.owner_id === user.id;

    if (!isOwner) {
      return NextResponse.json(
        { error: 'You do not have permission to delete images from this business' },
        { status: 403 }
      );
    }

    // Fetch image record to get URL and check if it's primary
    const { data: imageRecord, error: imageFetchError } = await supabase
      .from('business_images')
      .select('id, url, is_primary')
      .eq('id', imageId)
      .eq('business_id', businessId)
      .single();

    if (imageFetchError || !imageRecord) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    const wasPrimary = imageRecord.is_primary;
    const imageUrl = imageRecord.url;

    // Extract storage path from URL
    const storagePath = extractStoragePath(imageUrl);

    // Delete from storage bucket (if path can be extracted)
    if (storagePath) {
      const { STORAGE_BUCKETS } = await import('@/app/lib/utils/storageBucketConfig');
      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKETS.BUSINESS_IMAGES)
        .remove([storagePath]);

      if (storageError) {
        console.warn('[API] Error deleting image from storage (continuing with DB delete):', storageError);
        // Continue with DB deletion even if storage deletion fails
      } else {
        console.log(`[API] Successfully deleted storage file: ${storagePath}`);
      }
    } else {
      console.warn('[API] Could not extract storage path from URL, skipping storage deletion:', imageUrl);
    }

    // Delete from business_images table
    // The promote_next_primary_image trigger will automatically promote the next image if this was primary
    const { error: deleteError } = await supabase
      .from('business_images')
      .delete()
      .eq('id', imageId)
      .eq('business_id', businessId); // Extra safety check

    if (deleteError) {
      console.error('[API] Error deleting image from business_images table:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete image', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      was_primary: wasPrimary,
      message: wasPrimary
        ? 'Primary image deleted. Next image has been promoted to primary automatically.' 
        : 'Image deleted successfully.'
    });
  } catch (error: any) {
    console.error('[API] Error in DELETE business image:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
