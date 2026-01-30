import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/admin';
import { isAdmin } from '@/app/lib/admin';
import { EmailService } from '@/app/lib/services/emailService';
import { createClaimNotification, updateClaimLastNotified } from '@/app/lib/claimNotifications';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
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
      .select('id, claimant_user_id, business_id, status')
      .eq('id', claimId)
      .single();

    if (claimError || !claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    await service
      .from('business_claims')
      .update({
        status: 'action_required',
        method_attempted: 'document',
        updated_at: new Date().toISOString(),
      })
      .eq('id', claimId);

    const { data: business } = await service.from('businesses').select('name').eq('id', claim.business_id).single();
    const claimantId = claim.claimant_user_id;
    const { data: profile } = await service.from('profiles').select('display_name, username').eq('user_id', claimantId).maybeSingle();
    let recipientEmail: string | undefined;
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      const { data: authUser } = await admin.auth.admin.getUserById(claimantId);
      recipientEmail = authUser?.user?.email ?? undefined;
    } catch {
      // ignore
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const claimBusinessUrl = `${baseUrl}/claim-business`;

    await createClaimNotification({
      userId: claimantId,
      claimId,
      type: 'docs_requested',
      title: 'Documents required',
      message: `We need additional documents to verify your claim for ${business?.name ?? 'your business'}. Please upload them in your claim page.`,
      link: '/claim-business',
    });
    updateClaimLastNotified(claimId).catch(() => {});

    if (recipientEmail) {
      EmailService.sendDocsRequestedEmail({
        recipientEmail,
        recipientName: (profile?.display_name || profile?.username) as string | undefined,
        businessName: business?.name ?? 'Your business',
        claimBusinessUrl,
      }).catch((err) => console.error('Docs requested email failed:', err));
    }

    return NextResponse.json({ success: true, message: 'Documents requested; claimant notified.' });
  } catch (err) {
    console.error('Request docs error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
