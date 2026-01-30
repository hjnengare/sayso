import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';
import { EmailService } from '@/app/lib/services/emailService';
import { businessEmailDomainMatchesWebsite } from '@/app/lib/utils/claimVerification';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Map claim status + method to UI status label (spec: Pending Verification, Action Required, Under Review, Verified, Rejected). */
function toDisplayStatus(status: string, methodAttempted: string | null): string {
  if (status === 'verified') return 'Verified';
  if (status === 'rejected') return 'Rejected';
  if (status === 'pending' || status === 'draft') {
    if (methodAttempted === 'cipc') return 'Under Review';
    if (methodAttempted === 'email' || methodAttempted === 'phone') return 'Action Required';
    return 'Pending Verification';
  }
  return 'Pending Verification';
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      business_id,
      role,
      phone,
      email,
      note,
      cipc_registration_number,
      cipc_company_name,
    } = body;

    if (!business_id) {
      return NextResponse.json({ error: 'business_id is required' }, { status: 400 });
    }

    const roleVal = role && ['owner', 'manager'].includes(role) ? role : 'owner';

    // Already owner (business_owners or businesses.owner_id)
    const { data: existingOwner } = await supabase
      .from('business_owners')
      .select('id')
      .eq('business_id', business_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingOwner) {
      return NextResponse.json({ error: 'You already own this business' }, { status: 400 });
    }

    const { data: businessRow } = await supabase
      .from('businesses')
      .select('id, owner_id')
      .eq('id', business_id)
      .maybeSingle();

    if (businessRow?.owner_id === user.id) {
      return NextResponse.json({ error: 'You already own this business' }, { status: 400 });
    }

    // Start or get existing claim (business_claims + start_business_claim RPC)
    const { data: startResult, error: startError } = await supabase.rpc('start_business_claim', {
      p_business_id: business_id,
      p_claimant_user_id: user.id,
    });

    if (startError) {
      console.error('start_business_claim RPC error:', startError);
      return NextResponse.json(
        { error: (startResult as any)?.error || 'Failed to start claim' },
        { status: 400 }
      );
    }

    const start = startResult as { success?: boolean; error?: string; claim_id?: string; existing?: boolean; status?: string; business?: { id: string; name: string; phone?: string; website?: string; email?: string } };
    if (!start.success || !start.claim_id) {
      return NextResponse.json(
        { error: start.error || 'Failed to start claim' },
        { status: 400 }
      );
    }

    const claimId = start.claim_id;

    // Fetch business contact info for verification detection
    const { data: business } = await supabase
      .from('businesses')
      .select('id, name, category, location, website, email, phone')
      .eq('id', business_id)
      .single();

    const verificationData: Record<string, unknown> = {
      role: roleVal,
      email: email || undefined,
      phone: phone || business?.phone || undefined,
      notes: note || undefined,
      cipc_registration_number: cipc_registration_number || undefined,
      cipc_company_name: cipc_company_name || undefined,
    };

    const businessEmail = (email || business?.email || '').toString().trim();
    const businessWebsite = (business?.website || '').toString().trim();

    // Tier 1: Business email domain matches website → auto-verify
    if (businessEmail && businessWebsite && businessEmailDomainMatchesWebsite(businessEmail, businessWebsite)) {
      const { data: completeResult, error: completeError } = await supabase.rpc('complete_claim_verification', {
        p_claim_id: claimId,
        p_method: 'email',
      });

      if (!completeError && (completeResult as any)?.success) {
        const userEmail = user.email || businessEmail;
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, username')
          .eq('user_id', user.id)
          .maybeSingle();

        if (userEmail && business) {
          EmailService.sendClaimReceivedEmail({
            recipientEmail: userEmail,
            recipientName: (profile?.display_name || profile?.username) as string | undefined,
            businessName: business.name,
            businessCategory: business.category,
            businessLocation: business.location,
          }).catch((err) => console.error('Claim received email failed:', err));
        }

        return NextResponse.json(
          {
            success: true,
            claim_id: claimId,
            status: 'verified',
            display_status: 'Verified',
            next_step: 'dashboard',
            message: 'Business email verified. You can now manage your listing.',
          },
          { status: 201 }
        );
      }
    }

    // Determine verification method for pending claim
    let methodAttempted: 'email' | 'phone' | 'cipc' | 'documents' = 'documents';
    if (cipc_registration_number && cipc_company_name) {
      methodAttempted = 'cipc';
    } else if (verificationData.phone) {
      methodAttempted = 'phone';
    } else if (verificationData.email) {
      methodAttempted = 'email';
    }

    // Update claim: verification_data, status pending, method_attempted, submitted_at
    const { error: updateError } = await supabase
      .from('business_claims')
      .update({
        verification_data: verificationData,
        status: 'pending',
        method_attempted: methodAttempted,
        verification_level: methodAttempted === 'cipc' ? 'level_2' : 'level_1',
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', claimId)
      .eq('claimant_user_id', user.id);

    if (updateError) {
      console.error('Error updating claim:', updateError);
      return NextResponse.json({ error: 'Failed to submit claim' }, { status: 500 });
    }

    const userEmail = user.email || businessEmail;
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, username')
      .eq('user_id', user.id)
      .maybeSingle();

    if (userEmail && business) {
      EmailService.sendClaimReceivedEmail({
        recipientEmail: userEmail,
        recipientName: (profile?.display_name || profile?.username) as string | undefined,
        businessName: business.name,
        businessCategory: business.category,
        businessLocation: business.location,
      }).catch((err) => console.error('Claim received email failed:', err));
    }

    const displayStatus = toDisplayStatus('pending', methodAttempted);
    const nextStep = methodAttempted === 'cipc' ? 'under_review' : methodAttempted === 'phone' || methodAttempted === 'email' ? 'action_required' : 'pending_verification';

    return NextResponse.json(
      {
        success: true,
        claim_id: claimId,
        status: 'pending',
        display_status: displayStatus,
        method_attempted: methodAttempted,
        next_step: nextStep,
        message: methodAttempted === 'cipc'
          ? 'Claim submitted. We’ll review your CIPC details shortly.'
          : 'Claim submitted. Complete the requested verification step.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in business claim API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
