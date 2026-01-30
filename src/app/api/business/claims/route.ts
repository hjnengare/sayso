import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Map claim status + method to UI display status (spec: Pending Verification, Action Required, Under Review, Verified, Rejected). */
function toDisplayStatus(status: string, methodAttempted: string | null): string {
  if (status === 'verified') return 'Verified';
  if (status === 'rejected') return 'Rejected';
  if (status === 'action_required') return 'Action Required';
  if (status === 'under_review') return 'Under Review';
  if (status === 'pending' || status === 'draft') {
    if (methodAttempted === 'cipc') return 'Under Review';
    if (methodAttempted === 'email' || methodAttempted === 'phone') return 'Action Required';
    return 'Pending Verification';
  }
  return 'Pending Verification';
}

/** Short next-step message for the user. */
function getNextStepMessage(status: string, methodAttempted: string | null): string {
  if (status === 'verified') return 'You can manage your listing in My Businesses.';
  if (status === 'rejected') return 'Contact support if you believe this was an error.';
  if (status === 'action_required') return 'Please upload the requested documents or complete the requested step.';
  if (status === 'under_review') return 'We\'re reviewing your claim. We\'ll email you when done.';
  if (status === 'pending' || status === 'draft') {
    if (methodAttempted === 'cipc') return 'We\'re reviewing your CIPC details. We\'ll email you when done.';
    if (methodAttempted === 'phone') return 'Check the business phone for an OTP and enter it when prompted.';
    if (methodAttempted === 'email') return 'Check your business email or complete the next verification step.';
    return 'We\'re checking your details. You may need to complete a verification step.';
  }
  return '';
}

/**
 * GET /api/business/claims
 * Returns the current user's business claims with status and display labels.
 */
export async function GET() {
  try {
    const supabase = await getServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: claims, error } = await supabase
      .from('business_claims')
      .select(`
        id,
        business_id,
        status,
        method_attempted,
        verification_level,
        submitted_at,
        reviewed_at,
        rejection_reason,
        created_at,
        businesses!inner (
          id,
          name,
          category,
          location,
          slug
        )
      `)
      .eq('claimant_user_id', user.id)
      .in('status', ['draft', 'pending', 'action_required', 'under_review', 'verified', 'rejected'])
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching claims:', error);
      return NextResponse.json({ error: 'Failed to fetch claims' }, { status: 500 });
    }

    const list = (claims || []).map((c: any) => {
      const business = Array.isArray(c.businesses) ? c.businesses[0] : c.businesses;
      return {
        id: c.id,
        business_id: c.business_id,
        business_name: business?.name ?? 'Unknown',
        business_slug: business?.slug ?? null,
        category: business?.category ?? null,
        location: business?.location ?? null,
        status: c.status,
        display_status: toDisplayStatus(c.status, c.method_attempted),
        method_attempted: c.method_attempted,
        next_step: getNextStepMessage(c.status, c.method_attempted),
        submitted_at: c.submitted_at,
        reviewed_at: c.reviewed_at,
        rejection_reason: c.rejection_reason ?? null,
        created_at: c.created_at,
      };
    });

    return NextResponse.json({ success: true, claims: list });
  } catch (error) {
    console.error('Error in GET /api/business/claims:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
