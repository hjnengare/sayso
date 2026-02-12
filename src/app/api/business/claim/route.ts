import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';
import { EmailService } from '@/app/lib/services/emailService';
import { businessEmailDomainMatchesWebsite } from '@/app/lib/utils/claimVerification';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ============================================================================
// Structured Error Response Helpers
// ============================================================================

type ClaimErrorCode =
  | 'NOT_AUTHENTICATED'
  | 'MISSING_FIELDS'
  | 'INVALID_EMAIL'
  | 'INVALID_PHONE'
  | 'EMAIL_DOMAIN_MISMATCH'
  | 'DUPLICATE_CLAIM'
  | 'ALREADY_OWNER'
  | 'BUSINESS_NOT_FOUND'
  | 'RLS_BLOCKED'
  | 'DB_ERROR'
  | 'SERVER_ERROR';

interface ClaimErrorResponse {
  success: false;
  code: ClaimErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

function errorResponse(
  code: ClaimErrorCode,
  message: string,
  status: number,
  details?: Record<string, unknown>
): NextResponse<ClaimErrorResponse> {
  return NextResponse.json(
    { success: false, code, message, details },
    { status }
  );
}

// Basic email validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Basic phone validation (at least 8 digits)
function isValidPhone(phone: string): boolean {
  const digitsOnly = phone.replace(/\D/g, '');
  return digitsOnly.length >= 8;
}

/** Map claim status + method to UI status label (spec: Pending Verification, Action Required, Under Review, Verified, Rejected). */
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

function toNextStep(status: string, methodAttempted: string | null): string {
  if (status === 'verified') return 'dashboard';
  if (status === 'rejected') return 'rejected';
  if (status === 'under_review') return 'under_review';
  if (status === 'action_required') return 'action_required';
  if (status === 'pending' || status === 'draft') {
    if (methodAttempted === 'cipc') return 'under_review';
    if (methodAttempted === 'email' || methodAttempted === 'phone') return 'action_required';
    return 'pending_verification';
  }
  return 'pending_verification';
}

function mapStartClaimFailure(errorMsg: string): {
  code: ClaimErrorCode;
  message: string;
  status: number;
} | null {
  const normalized = errorMsg.toLowerCase();

  if (normalized.includes('already claimed') || normalized.includes('dispute')) {
    return {
      code: 'ALREADY_OWNER',
      message: 'This business is already claimed. Contact support if ownership should be updated.',
      status: 409,
    };
  }

  if (normalized.includes('no contact information')) {
    return {
      code: 'DB_ERROR',
      message: 'This business does not have enough contact information to start verification yet.',
      status: 400,
    };
  }

  if (normalized.includes('not found') || normalized.includes('inactive')) {
    return {
      code: 'BUSINESS_NOT_FOUND',
      message: "We couldn't find that business. Please try again.",
      status: 404,
    };
  }

  if (normalized.includes('already') || normalized.includes('duplicate') || normalized.includes('existing')) {
    return {
      code: 'DUPLICATE_CLAIM',
      message: 'You already have a claim in progress for this business.',
      status: 409,
    };
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase(req);

    // ========================================================================
    // 1. Authentication Check
    // ========================================================================
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse(
        'NOT_AUTHENTICATED',
        'Please log in to claim this business.',
        401
      );
    }

    // ========================================================================
    // 2. Parse & Validate Request Body
    // ========================================================================
    let body;
    try {
      body = await req.json();
    } catch {
      return errorResponse('MISSING_FIELDS', 'Invalid request data.', 400);
    }

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
      return errorResponse(
        'MISSING_FIELDS',
        'Business ID is required.',
        400
      );
    }

    // Validate email format if provided
    const trimmedEmail = (email || '').toString().trim();
    if (trimmedEmail && !isValidEmail(trimmedEmail)) {
      return errorResponse(
        'INVALID_EMAIL',
        'Please enter a valid email address.',
        400
      );
    }

    // Validate phone format if provided
    const trimmedPhone = (phone || '').toString().trim();
    if (trimmedPhone && !isValidPhone(trimmedPhone)) {
      return errorResponse(
        'INVALID_PHONE',
        'Please enter a valid phone number (at least 8 digits).',
        400
      );
    }

    // Check that at least one contact method is provided
    const hasCipc = cipc_registration_number?.trim() && cipc_company_name?.trim();
    if (!trimmedEmail && !trimmedPhone && !hasCipc) {
      return errorResponse(
        'MISSING_FIELDS',
        'Please provide a business email, phone number, or CIPC details.',
        400
      );
    }

    const roleVal = role && ['owner', 'manager'].includes(role) ? role : 'owner';

    // ========================================================================
    // 3. Check Business Exists
    // ========================================================================
    const { data: businessRow, error: businessError } = await supabase
      .from('businesses')
      .select('id, owner_id')
      .eq('id', business_id)
      .maybeSingle();

    if (businessError) {
      console.error('[Claim API] Business lookup error:', businessError);
      return errorResponse(
        'DB_ERROR',
        "We couldn't process your claim right now. Please try again.",
        400
      );
    }

    if (!businessRow) {
      return errorResponse(
        'BUSINESS_NOT_FOUND',
        "We couldn't find that business. Please try again.",
        404
      );
    }

    // ========================================================================
    // 4. Check if User Already Owns This Business
    // ========================================================================
    if (businessRow.owner_id === user.id) {
      return errorResponse(
        'ALREADY_OWNER',
        'You already own this business.',
        400
      );
    }

    const { data: existingOwner, error: ownerCheckError } = await supabase
      .from('business_owners')
      .select('id')
      .eq('business_id', business_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (ownerCheckError) {
      console.error('[Claim API] Owner check error:', ownerCheckError);
    }

    if (existingOwner) {
      return errorResponse(
        'ALREADY_OWNER',
        'You already own this business.',
        400
      );
    }

    // ========================================================================
    // 5. Start or Get Existing Claim
    // ========================================================================
    const { data: startResult, error: startError } = await supabase.rpc('start_business_claim', {
      p_business_id: business_id,
      p_claimant_user_id: user.id,
    });

    if (startError) {
      console.error('[Claim API] start_business_claim RPC error:', startError);
      
      // Check for RLS or permission errors
      if (startError.message?.includes('permission') || startError.code === '42501') {
        return errorResponse(
          'RLS_BLOCKED',
          "We couldn't process your claim right now. Please try again.",
          403
        );
      }
      
      return errorResponse(
        'DB_ERROR',
        "We couldn't start your claim. Please try again.",
        400
      );
    }

    const start = startResult as { 
      success?: boolean; 
      error?: string; 
      claim_id?: string; 
      existing?: boolean; 
      status?: string; 
      method_attempted?: string | null;
      business?: { id: string; name: string; phone?: string; website?: string; email?: string } 
    };

    if (!start.success || !start.claim_id) {
      const errorMsg = start.error || '';
      const mappedFailure = mapStartClaimFailure(errorMsg);
      if (mappedFailure) {
        return errorResponse(mappedFailure.code, mappedFailure.message, mappedFailure.status);
      }
      
      console.error('[Claim API] RPC returned failure:', start);
      return errorResponse(
        'DB_ERROR',
        "We couldn't start your claim. Please try again.",
        400
      );
    }

    const claimId = start.claim_id;

    // Existing non-draft claims are already in-progress; avoid re-updating rows blocked by RLS.
    if (start.existing && start.status && start.status !== 'draft') {
      const { data: existingClaim } = await supabase
        .from('business_claims')
        .select('status, method_attempted')
        .eq('id', claimId)
        .eq('claimant_user_id', user.id)
        .maybeSingle();

      const existingStatus = (existingClaim?.status as string | undefined) ?? start.status;
      const existingMethodAttempted =
        (existingClaim?.method_attempted as string | null | undefined) ?? start.method_attempted ?? null;

      return NextResponse.json(
        {
          success: true,
          existing: true,
          claim_id: claimId,
          status: existingStatus,
          display_status: toDisplayStatus(existingStatus, existingMethodAttempted),
          method_attempted: existingMethodAttempted,
          next_step: toNextStep(existingStatus, existingMethodAttempted),
          message: 'You already have a claim in progress for this business.',
        },
        { status: 200 },
      );
    }

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

    const submissionStatus =
      methodAttempted === 'cipc'
        ? 'under_review'
        : methodAttempted === 'phone' || methodAttempted === 'email'
          ? 'action_required'
          : 'pending';

    // Update claim: verification_data, status, method_attempted, submitted_at
    const { error: updateError } = await supabase
      .from('business_claims')
      .update({
        verification_data: verificationData,
        status: submissionStatus,
        method_attempted: methodAttempted,
        verification_level: methodAttempted === 'cipc' ? 'level_2' : 'level_1',
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', claimId)
      .eq('claimant_user_id', user.id);

    if (updateError) {
      console.error('[Claim API] Error updating claim:', updateError);
      return errorResponse(
        'DB_ERROR',
        "We couldn't complete your claim submission. Please try again.",
        500
      );
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

    const displayStatus = toDisplayStatus(submissionStatus, methodAttempted);
    const nextStep = toNextStep(submissionStatus, methodAttempted);

    return NextResponse.json(
      {
        success: true,
        claim_id: claimId,
        status: submissionStatus,
        display_status: displayStatus,
        method_attempted: methodAttempted,
        next_step: nextStep,
        message:
          submissionStatus === 'under_review'
            ? "Claim submitted. We'll review your CIPC details shortly."
            : submissionStatus === 'action_required'
              ? 'Claim submitted. Complete the requested verification step.'
              : 'Claim submitted successfully.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Claim API] Unexpected error:', error);
    return errorResponse(
      'SERVER_ERROR',
      'Something went wrong on our side. Please try again.',
      500
    );
  }
}

