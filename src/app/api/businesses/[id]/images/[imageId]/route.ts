import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '../../../../../lib/supabase/server';
import { extractStoragePath } from '../../../../../../lib/utils/storagePathExtraction';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * DELETE /api/businesses/[id]/images/[imageId]
 * Delete a business image (requires business owner authentication)
 * imageId is the URL of the image to delete (URL-encoded)
 * Deletes from both storage bucket and uploaded_images array
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
      .select('id, owner_id, uploaded_images')
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

    // Decode the imageId (which is the URL)
    const imageUrl = decodeURIComponent(imageId);

    // Check if image exists in uploaded_images array
    const uploadedImages = business.uploaded_images && Array.isArray(business.uploaded_images)
      ? business.uploaded_images
      : [];

    const imageIndex = uploadedImages.indexOf(imageUrl);
    if (imageIndex === -1) {
      return NextResponse.json(
        { error: 'Image not found in business images' },
        { status: 404 }
      );
    }

    const wasPrimary = imageIndex === 0;

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

    // Remove image from uploaded_images array
    const updatedImages = uploadedImages.filter((url: string) => url !== imageUrl);

    // Update business with updated uploaded_images array
    const { error: updateError } = await supabase
      .from('businesses')
      .update({ uploaded_images: updatedImages })
      .eq('id', businessId);

    if (updateError) {
      console.error('[API] Error updating business images:', updateError);
      return NextResponse.json(
        { error: 'Failed to delete image', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      was_primary: wasPrimary,
      message: wasPrimary && updatedImages.length > 0
        ? 'Primary image deleted. Next image is now the primary image.' 
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
