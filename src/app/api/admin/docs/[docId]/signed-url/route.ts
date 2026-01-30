import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/app/lib/admin';
import { isAdmin } from '@/app/lib/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BUCKET = 'business-verification';
const SIGNED_URL_EXPIRY_SECONDS = 600; // 10 min

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  try {
    const supabase = await import('@/app/lib/supabase/server').then((m) => m.getServerSupabase(req));
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isUserAdmin = await isAdmin(user.id);
    if (!isUserAdmin) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const docId = (await params).docId;
    if (!docId) {
      return NextResponse.json({ error: 'docId required' }, { status: 400 });
    }

    const service = getServiceSupabase();
    const { data: doc, error: docError } = await service
      .from('business_claim_documents')
      .select('id, storage_path')
      .eq('id', docId)
      .single();

    if (docError || !doc?.storage_path) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const { data: signed, error: signError } = await service.storage
      .from(BUCKET)
      .createSignedUrl(doc.storage_path, SIGNED_URL_EXPIRY_SECONDS);

    if (signError || !signed?.signedUrl) {
      console.error('Signed URL error:', signError);
      return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 });
    }

    return NextResponse.json({ url: signed.signedUrl, expiresIn: SIGNED_URL_EXPIRY_SECONDS });
  } catch (err) {
    console.error('Signed URL error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
