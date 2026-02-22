import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '../../../lib/supabase/server';
import { isAdmin } from '../../../lib/admin';
import { cleanupOrphanedImages } from '../../../lib/utils/orphanedImagesCleanup';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/cleanup-orphaned-images
 * Admin endpoint to clean up orphaned image records
 * (images in DB that no longer exist in storage)
 *
 * Query params:
 * - businessId: Optional - only check images for a specific business
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase(req);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get('businessId') || undefined;

    const result = await cleanupOrphanedImages(
      supabase,
      businessId,
      10 // batch size
    );

    return NextResponse.json({
      success: true,
      ...result,
      message: `Checked ${result.totalChecked} images. Found ${result.orphanedFound} orphaned, deleted ${result.deleted}.`,
    });
  } catch (error: any) {
    console.error('[API] Error in cleanup orphaned images:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error.message
      },
      { status: 500 }
    );
  }
}
