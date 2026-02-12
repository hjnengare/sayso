import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/admin';
import { isPhoneOtpAutoMode } from '@/app/lib/services/phoneOtpMode';
import { movePhoneClaimToUnderReview } from '@/app/lib/services/phoneOtpFlow';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_ATTEMPTS = 5;

function hashOtp(code: string): string {
  const pepper = process.env.OTP_PEPPER || 'dev-pepper-do-not-use-in-production';
  return crypto.createHash('sha256').update(pepper + code).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const autoMode = isPhoneOtpAutoMode();
    const body = await req.json().catch(() => ({}));
    const claimId = body.claimId ?? body.claim_id;
    const code = body.code?.toString().trim();

    if (!claimId) {
      return NextResponse.json({ error: 'claimId is required' }, { status: 400 });
    }

    if (!autoMode) {
      if (!code) {
        return NextResponse.json({ error: 'claimId and code are required' }, { status: 400 });
      }
      if (!/^\d{6}$/.test(code)) {
        return NextResponse.json({ error: 'Code must be 6 digits' }, { status: 400 });
      }
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
    const claimRow = claim as { claimant_user_id: string; status: string; business_id: string };
    if (claimRow.claimant_user_id !== user.id) {
      return NextResponse.json({ error: 'You can only verify OTP for your own claim' }, { status: 403 });
    }

    if (autoMode) {
      const autoResult = await movePhoneClaimToUnderReview({
        claimId,
        claimantUserId: claimRow.claimant_user_id,
        businessId: claimRow.business_id,
        source: 'otp_verify',
        autoVerified: true,
      });

      if (!autoResult.ok) {
        const status =
          autoResult.code === 'NOT_FOUND'
            ? 404
            : autoResult.code === 'INVALID_STATUS'
              ? 409
              : 500;
        return NextResponse.json(
          { error: autoResult.message ?? 'Failed to auto-verify phone OTP.' },
          { status }
        );
      }

      return NextResponse.json({
        ok: true,
        autoVerified: true,
        status: 'under_review',
        message: 'Phone verification completed automatically. Your claim is under review.',
      });
    }

    const { data: otpData, error: otpError } = await service
      .from('business_claim_otp')
      .select('*')
      .eq('claim_id', claimId)
      .is('verified_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('last_sent_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpError || !otpData) {
      return NextResponse.json({ error: 'No valid verification code. Please request a new one.' }, { status: 400 });
    }
    const otpRow = otpData as { id: string; attempts: number; code_hash: string };

    const currentAttempts = otpRow.attempts ?? 0;
    if (currentAttempts >= MAX_ATTEMPTS) {
      return NextResponse.json({ error: 'Too many attempts. Please request a new code.' }, { status: 429 });
    }
    const newAttempts = currentAttempts + 1;

    await (service as any)
      .from('business_claim_otp')
      .update({ attempts: newAttempts })
      .eq('id', otpRow.id);

    const codeHash = hashOtp(code as string);
    if (otpRow.code_hash !== codeHash) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    await (service as any)
      .from('business_claim_otp')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', otpRow.id);

    const moveResult = await movePhoneClaimToUnderReview({
      claimId,
      claimantUserId: claimRow.claimant_user_id,
      businessId: claimRow.business_id,
      source: 'otp_verify',
      autoVerified: false,
    });

    if (!moveResult.ok) {
      const status =
        moveResult.code === 'NOT_FOUND'
          ? 404
          : moveResult.code === 'INVALID_STATUS'
            ? 409
            : 500;
      return NextResponse.json(
        { error: moveResult.message ?? 'Failed to complete phone verification.' },
        { status }
      );
    }

    return NextResponse.json({ ok: true, status: 'under_review' });
  } catch (err) {
    console.error('OTP verify error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
