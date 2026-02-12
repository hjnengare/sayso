-- Harden start_business_claim to align with current claim workflow statuses
-- and prevent duplicate active claims.

CREATE OR REPLACE FUNCTION public.start_business_claim(
  p_business_id UUID,
  p_claimant_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business RECORD;
  v_existing_claim RECORD;
  v_claim_id UUID;
BEGIN
  -- Business must exist and be active.
  SELECT id, name, phone, website, email, status, owner_id, owner_verified
  INTO v_business
  FROM public.businesses
  WHERE id = p_business_id;

  IF NOT FOUND OR COALESCE(v_business.status, 'inactive') <> 'active' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Business not found or inactive'
    );
  END IF;

  -- Business must have at least one contact path for verification.
  IF
    COALESCE(NULLIF(TRIM(v_business.phone), ''), NULL) IS NULL
    AND COALESCE(NULLIF(TRIM(v_business.website), ''), NULL) IS NULL
    AND COALESCE(NULLIF(TRIM(v_business.email), ''), NULL) IS NULL
  THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Business has no contact information. Please contact support.'
    );
  END IF;

  -- Treat existing owner assignment as already claimed.
  IF
    v_business.owner_verified IS TRUE
    OR v_business.owner_id IS NOT NULL
    OR EXISTS (
      SELECT 1
      FROM public.business_owners bo
      WHERE bo.business_id = p_business_id
    )
  THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'This listing is already claimed. Request dispute.',
      'dispute', true,
      'owner_id', v_business.owner_id
    );
  END IF;

  -- Reuse any active in-progress claim for this user + business.
  SELECT id, status, method_attempted
  INTO v_existing_claim
  FROM public.business_claims
  WHERE business_id = p_business_id
    AND claimant_user_id = p_claimant_user_id
    AND status IN ('draft', 'pending', 'action_required', 'under_review')
  ORDER BY updated_at DESC NULLS LAST, created_at DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'claim_id', v_existing_claim.id,
      'status', v_existing_claim.status,
      'method_attempted', v_existing_claim.method_attempted,
      'existing', true
    );
  END IF;

  -- Create a new draft claim.
  INSERT INTO public.business_claims (
    business_id,
    claimant_user_id,
    status,
    verification_data
  ) VALUES (
    p_business_id,
    p_claimant_user_id,
    'draft',
    jsonb_build_object('started_at', NOW())
  )
  RETURNING id INTO v_claim_id;

  -- Best-effort event logging.
  IF to_regclass('public.business_claim_events') IS NOT NULL THEN
    INSERT INTO public.business_claim_events (
      claim_id,
      event_type,
      event_data,
      created_by
    ) VALUES (
      v_claim_id,
      'claim_started',
      jsonb_build_object('business_id', p_business_id),
      p_claimant_user_id
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'claim_id', v_claim_id,
    'status', 'draft',
    'business', jsonb_build_object(
      'id', v_business.id,
      'name', v_business.name,
      'phone', v_business.phone,
      'website', v_business.website,
      'email', v_business.email
    )
  );

EXCEPTION
  WHEN unique_violation THEN
    -- Race-safe fallback: return any active claim if one was created concurrently.
    SELECT id, status, method_attempted
    INTO v_existing_claim
    FROM public.business_claims
    WHERE business_id = p_business_id
      AND claimant_user_id = p_claimant_user_id
      AND status IN ('draft', 'pending', 'action_required', 'under_review')
    ORDER BY updated_at DESC NULLS LAST, created_at DESC
    LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', true,
        'claim_id', v_existing_claim.id,
        'status', v_existing_claim.status,
        'method_attempted', v_existing_claim.method_attempted,
        'existing', true
      );
    END IF;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'Duplicate claim in progress.'
    );
END;
$$;

COMMENT ON FUNCTION public.start_business_claim IS
'Entry point for new claim with active-claim reuse across draft/pending/action_required/under_review and race-safe duplicate handling.';

