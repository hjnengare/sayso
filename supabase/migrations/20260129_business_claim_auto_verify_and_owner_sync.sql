-- Auto-verify completion RPC (call after API confirms domain match) and ensure verify_business_claim inserts into business_owners.

-- 1. RPC: Complete claim verification (used after API confirms Tier 1 domain match or other auto-verify).
-- Updates claim + business + inserts business_owners so my-businesses list works.
CREATE OR REPLACE FUNCTION public.complete_claim_verification(
  p_claim_id UUID,
  p_method TEXT DEFAULT 'email'
)
RETURNS JSONB AS $$
DECLARE
  v_claim RECORD;
  v_role TEXT;
BEGIN
  SELECT * INTO v_claim
  FROM public.business_claims
  WHERE id = p_claim_id AND status IN ('draft', 'pending');

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Claim not found or already processed');
  END IF;

  v_role := COALESCE(v_claim.verification_data->>'role', 'owner');
  IF v_role NOT IN ('owner', 'manager') THEN
    v_role := 'owner';
  END IF;

  UPDATE public.business_claims
  SET
    status = 'verified',
    method_attempted = p_method,
    verification_level = 'level_1',
    submitted_at = NOW(),
    updated_at = NOW()
  WHERE id = p_claim_id;

  UPDATE public.businesses
  SET
    owner_id = v_claim.claimant_user_id,
    owner_verified = true,
    owner_verification_method = p_method,
    owner_verified_at = NOW()
  WHERE id = v_claim.business_id;

  INSERT INTO public.business_owners (business_id, user_id, role, verified_at, verified_by)
  VALUES (v_claim.business_id, v_claim.claimant_user_id, v_role, NOW(), v_claim.claimant_user_id)
  ON CONFLICT (business_id, user_id) DO UPDATE SET
    role = EXCLUDED.role,
    verified_at = EXCLUDED.verified_at,
    verified_by = EXCLUDED.verified_by;

  INSERT INTO public.business_claim_events (claim_id, event_type, event_data, created_by)
  VALUES (p_claim_id, 'verification_success',
          jsonb_build_object('method', p_method, 'auto_verified', true),
          v_claim.claimant_user_id);

  RETURN jsonb_build_object('success', true, 'status', 'verified');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.complete_claim_verification IS 'Completes claim verification (e.g. after Tier 1 domain match). Updates claim, business, and business_owners.';

-- 2. Update verify_business_claim to also insert into business_owners when approving (so admin-approved claims show in my-businesses).
CREATE OR REPLACE FUNCTION public.verify_business_claim(
  p_claim_id UUID,
  p_admin_user_id UUID,
  p_approved BOOLEAN,
  p_rejection_reason TEXT DEFAULT NULL,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_claim RECORD;
  v_business_id UUID;
  v_role TEXT;
BEGIN
  SELECT * INTO v_claim
  FROM public.business_claims
  WHERE id = p_claim_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Claim not found');
  END IF;

  v_business_id := v_claim.business_id;
  v_role := COALESCE(v_claim.verification_data->>'role', 'owner');
  IF v_role NOT IN ('owner', 'manager') THEN
    v_role := 'owner';
  END IF;

  IF p_approved THEN
    UPDATE public.business_claims
    SET
      status = 'verified',
      reviewed_by = p_admin_user_id,
      reviewed_at = NOW(),
      admin_notes = p_admin_notes,
      updated_at = NOW()
    WHERE id = p_claim_id;

    UPDATE public.businesses
    SET
      owner_id = v_claim.claimant_user_id,
      owner_verified = true,
      owner_verification_method = v_claim.method_attempted,
      owner_verified_at = NOW()
    WHERE id = v_business_id;

    INSERT INTO public.business_owners (business_id, user_id, role, verified_at, verified_by)
    VALUES (v_business_id, v_claim.claimant_user_id, v_role, NOW(), p_admin_user_id)
    ON CONFLICT (business_id, user_id) DO UPDATE SET
      role = EXCLUDED.role,
      verified_at = EXCLUDED.verified_at,
      verified_by = EXCLUDED.verified_by;

    INSERT INTO public.business_claim_events (claim_id, event_type, event_data, created_by)
    VALUES (p_claim_id, 'verification_success',
            jsonb_build_object('admin_id', p_admin_user_id, 'method', v_claim.method_attempted),
            p_admin_user_id);

    RETURN jsonb_build_object('success', true, 'status', 'verified');
  ELSE
    UPDATE public.business_claims
    SET
      status = 'rejected',
      reviewed_by = p_admin_user_id,
      reviewed_at = NOW(),
      rejection_reason = p_rejection_reason,
      admin_notes = p_admin_notes,
      updated_at = NOW()
    WHERE id = p_claim_id;

    INSERT INTO public.business_claim_events (claim_id, event_type, event_data, created_by)
    VALUES (p_claim_id, 'verification_rejected',
            jsonb_build_object('admin_id', p_admin_user_id, 'reason', p_rejection_reason),
            p_admin_user_id);

    RETURN jsonb_build_object('success', true, 'status', 'rejected', 'reason', p_rejection_reason);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
