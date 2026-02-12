import { createClient } from '@supabase/supabase-js';
import { getServiceSupabase } from '@/app/lib/admin';
import { createClaimNotification, updateClaimLastNotified } from '@/app/lib/claimNotifications';
import { EmailService } from '@/app/lib/services/emailService';

type PhoneVerificationSource = 'claim_submit' | 'otp_send' | 'otp_verify';

type MovePhoneClaimErrorCode =
  | 'NOT_FOUND'
  | 'INVALID_STATUS'
  | 'DB_ERROR';

export interface MovePhoneClaimToUnderReviewParams {
  claimId: string;
  claimantUserId: string;
  businessId: string;
  source: PhoneVerificationSource;
  autoVerified: boolean;
}

export interface MovePhoneClaimToUnderReviewResult {
  ok: boolean;
  status?: 'under_review' | 'already_under_review';
  code?: MovePhoneClaimErrorCode;
  message?: string;
}

const FINAL_CLAIM_STATUSES = new Set(['verified', 'rejected', 'cancelled', 'disputed']);

async function getClaimantEmail(userId: string): Promise<string | undefined> {
  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { data: authUser } = await admin.auth.admin.getUserById(userId);
    return authUser?.user?.email ?? undefined;
  } catch {
    return undefined;
  }
}

export async function movePhoneClaimToUnderReview(
  params: MovePhoneClaimToUnderReviewParams
): Promise<MovePhoneClaimToUnderReviewResult> {
  const service = getServiceSupabase() as any;
  const nowIso = new Date().toISOString();
  const logPrefix = params.autoVerified ? '[PHONE OTP][AUTO]' : '[PHONE OTP]';

  const { data: claim, error: claimError } = await service
    .from('business_claims')
    .select('id, status, business_id, method_attempted')
    .eq('id', params.claimId)
    .eq('claimant_user_id', params.claimantUserId)
    .maybeSingle();

  if (claimError) {
    console.error(`${logPrefix} Claim lookup failed`, {
      claim_id: params.claimId,
      user_id: params.claimantUserId,
      source: params.source,
      error: claimError,
    });
    return {
      ok: false,
      code: 'DB_ERROR',
      message: 'Failed to load claim for phone verification.',
    };
  }

  const claimRow = claim as { status?: string; business_id?: string; method_attempted?: string | null } | null;
  if (!claimRow || String(claimRow.business_id ?? '') !== params.businessId) {
    return {
      ok: false,
      code: 'NOT_FOUND',
      message: 'Claim not found for this user and business.',
    };
  }

  const claimMethod = String(claimRow.method_attempted ?? '');
  if (claimMethod && claimMethod !== 'phone') {
    return {
      ok: false,
      code: 'INVALID_STATUS',
      message: `Claim method "${claimMethod}" cannot use phone OTP verification.`,
    };
  }

  let claimStatus = String(claimRow.status ?? '');
  if (FINAL_CLAIM_STATUSES.has(claimStatus)) {
    return {
      ok: false,
      code: 'INVALID_STATUS',
      message: `Claim status "${claimStatus}" cannot be moved to under review.`,
    };
  }

  if (claimStatus === 'draft') {
    const { error: pendingError } = await service
      .from('business_claims')
      .update({
        status: 'pending',
        method_attempted: 'phone',
        verification_level: 'level_1',
        submitted_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', params.claimId)
      .eq('claimant_user_id', params.claimantUserId)
      .eq('status', 'draft');

    if (pendingError) {
      console.error(`${logPrefix} Failed draft->pending transition`, {
        claim_id: params.claimId,
        user_id: params.claimantUserId,
        source: params.source,
        error: pendingError,
      });
      return {
        ok: false,
        code: 'DB_ERROR',
        message: 'Failed to move claim to pending.',
      };
    }

    claimStatus = 'pending';
  }

  if (claimStatus === 'under_review') {
    return { ok: true, status: 'already_under_review' };
  }

  const { data: updatedClaim, error: updateError } = await service
    .from('business_claims')
    .update({
      status: 'under_review',
      method_attempted: 'phone',
      verification_level: 'level_1',
      updated_at: nowIso,
    })
    .eq('id', params.claimId)
    .eq('claimant_user_id', params.claimantUserId)
    .in('status', ['pending', 'action_required', 'draft'])
    .select('status')
    .maybeSingle();

  if (updateError) {
    console.error(`${logPrefix} Failed pending->under_review transition`, {
      claim_id: params.claimId,
      user_id: params.claimantUserId,
      source: params.source,
      error: updateError,
    });
    return {
      ok: false,
      code: 'DB_ERROR',
      message: 'Failed to move claim to under review.',
    };
  }

  const updatedClaimRow = updatedClaim as { status?: string } | null;
  if (!updatedClaimRow) {
    const { data: latestClaim } = await service
      .from('business_claims')
      .select('status')
      .eq('id', params.claimId)
      .eq('claimant_user_id', params.claimantUserId)
      .maybeSingle();

    const latestClaimRow = latestClaim as { status?: string } | null;
    if (latestClaimRow?.status === 'under_review') {
      return { ok: true, status: 'already_under_review' };
    }

    return {
      ok: false,
      code: 'INVALID_STATUS',
      message: `Claim status "${latestClaimRow?.status ?? 'unknown'}" cannot be moved to under review.`,
    };
  }

  const { data: business } = await service
    .from('businesses')
    .select('name')
    .eq('id', params.businessId)
    .maybeSingle();
  const businessRow = business as { name?: string } | null;
  const businessName = String(businessRow?.name ?? 'your business');

  console.info(`${logPrefix} Phone verification completed`, {
    claim_id: params.claimId,
    user_id: params.claimantUserId,
    source: params.source,
    mode: params.autoVerified ? 'auto' : 'twilio',
    transition: 'pending->under_review',
  });

  try {
    await (service as any).from('business_claim_events').insert({
      claim_id: params.claimId,
      event_type: 'phone_verified',
      event_data: {
        auto_verified: params.autoVerified,
        mode: params.autoVerified ? 'auto' : 'twilio',
        source: params.source,
      },
      created_by: params.claimantUserId,
    });
  } catch (eventError) {
    console.warn(`${logPrefix} Failed to write business_claim_events entry`, {
      claim_id: params.claimId,
      source: params.source,
      error: eventError,
    });
  }

  try {
    await createClaimNotification({
      userId: params.claimantUserId,
      claimId: params.claimId,
      type: 'otp_verified',
      title: 'Phone verified',
      message: `Your phone has been verified for ${businessName}. We'll review your claim shortly.`,
      link: '/claim-business',
    });
    await createClaimNotification({
      userId: params.claimantUserId,
      claimId: params.claimId,
      type: 'claim_status_changed',
      title: 'Claim under review',
      message: `Your claim for ${businessName} is now under review.`,
      link: '/claim-business',
    });
    updateClaimLastNotified(params.claimId).catch(() => {});
  } catch (notificationError) {
    console.warn(`${logPrefix} Failed to create claim notifications`, {
      claim_id: params.claimId,
      source: params.source,
      error: notificationError,
    });
  }

  const recipientEmail = await getClaimantEmail(params.claimantUserId);
  if (recipientEmail) {
    const { data: profile } = await service
      .from('profiles')
      .select('display_name, username')
      .eq('user_id', params.claimantUserId)
      .maybeSingle();

    const profileRow = profile as { display_name?: string; username?: string } | null;
    const recipientName = profileRow?.display_name
      ?? profileRow?.username
      ?? undefined;

    EmailService.sendOtpVerifiedEmail({
      recipientEmail,
      recipientName,
      businessName,
    }).catch((err) => console.error(`${logPrefix} OTP verified email failed:`, err));
  }

  return { ok: true, status: 'under_review' };
}
