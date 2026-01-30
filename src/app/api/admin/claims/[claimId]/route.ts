import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/admin';
import { isAdmin } from '@/app/lib/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ claimId: string }> }
) {
  try {
    const supabase = await getServerSupabase(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isUserAdmin = await isAdmin(user.id);
    if (!isUserAdmin) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const claimId = (await params).claimId;
    if (!claimId) {
      return NextResponse.json({ error: 'claimId required' }, { status: 400 });
    }

    const service = getServiceSupabase();

    const { data: claim, error: claimError } = await service
      .from('business_claims')
      .select(
        `
        id,
        business_id,
        claimant_user_id,
        status,
        method_attempted,
        verification_data,
        rejection_reason,
        admin_notes,
        created_at,
        updated_at,
        submitted_at,
        reviewed_at,
        reviewed_by,
        last_notified_at,
        businesses ( id, name, category, location, slug, phone, email, website )
      `
      )
      .eq('id', claimId)
      .single();

    if (claimError || !claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    const { data: events } = await service
      .from('business_claim_events')
      .select('id, event_type, event_data, created_at, created_by')
      .eq('claim_id', claimId)
      .order('created_at', { ascending: true });

    const { data: docs } = await service
      .from('business_claim_documents')
      .select('id, doc_type, status, uploaded_at, delete_after')
      .eq('claim_id', claimId)
      .order('uploaded_at', { ascending: false });

    let claimantEmail: string | null = null;
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      const { data: authUser } = await admin.auth.admin.getUserById(claim.claimant_user_id);
      claimantEmail = authUser?.user?.email ?? null;
    } catch {
      claimantEmail = (claim.verification_data as Record<string, unknown>)?.email as string ?? null;
    }

    const business = Array.isArray(claim.businesses) ? claim.businesses[0] : claim.businesses;

    return NextResponse.json({
      claim: {
        id: claim.id,
        business_id: claim.business_id,
        business_name: business?.name ?? null,
        business_slug: business?.slug ?? null,
        business_phone: business?.phone ?? null,
        business_email: business?.email ?? null,
        business_website: business?.website ?? null,
        claimant_user_id: claim.claimant_user_id,
        claimant_email: claimantEmail,
        status: claim.status,
        method_attempted: claim.method_attempted,
        verification_data: claim.verification_data,
        rejection_reason: claim.rejection_reason,
        admin_notes: claim.admin_notes,
        created_at: claim.created_at,
        updated_at: claim.updated_at,
        submitted_at: claim.submitted_at,
        reviewed_at: claim.reviewed_at,
        reviewed_by: claim.reviewed_by,
        last_notified_at: claim.last_notified_at,
      },
      events: events ?? [],
      documents: (docs ?? []).map((d: { id: string; doc_type: string; status: string; uploaded_at: string; delete_after: string }) => ({
        id: d.id,
        doc_type: d.doc_type,
        status: d.status,
        uploaded_at: d.uploaded_at,
        delete_after: d.delete_after,
      })),
    });
  } catch (err) {
    console.error('Admin claim detail error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
