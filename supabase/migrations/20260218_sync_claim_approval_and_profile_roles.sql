-- Ensure:
-- 1) New profiles inherit role/account_role from auth metadata on signup.
-- 2) Claim approval RPCs always promote profile role to business_owner.

-- ============================================================
-- 1) Profile creation trigger: derive role from auth metadata
-- ============================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username TEXT;
  v_requested_role TEXT;
  v_profile_role TEXT;
  v_account_role TEXT;
BEGIN
  -- Read role from metadata (snake_case first, then camelCase legacy fallback).
  v_requested_role := COALESCE(
    LOWER(NULLIF(TRIM(NEW.raw_user_meta_data->>'account_type'), '')),
    LOWER(NULLIF(TRIM(NEW.raw_user_meta_data->>'accountType'), '')),
    LOWER(NULLIF(TRIM(NEW.raw_user_meta_data->>'role'), '')),
    'user'
  );

  IF v_requested_role IN ('business', 'business_owner', 'owner') THEN
    v_profile_role := 'business_owner';
    v_account_role := 'business_owner';
  ELSIF v_requested_role = 'admin' THEN
    v_profile_role := 'admin';
    v_account_role := 'admin';
  ELSE
    v_profile_role := 'user';
    v_account_role := 'user';
  END IF;

  -- Extract or generate username.
  v_username := NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), '');

  IF v_username IS NULL THEN
    v_username := LOWER(REGEXP_REPLACE(SPLIT_PART(COALESCE(NEW.email, ''), '@', 1), '[^a-zA-Z0-9_]', '', 'g'));
    IF LENGTH(v_username) < 3 THEN
      v_username := 'user_' || SUBSTRING(NEW.id::text, 1, 8);
    END IF;
    IF LENGTH(v_username) > 20 THEN
      v_username := SUBSTRING(v_username, 1, 20);
    END IF;
  END IF;

  -- Ensure username is unique.
  WHILE EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE username = v_username
      AND user_id <> NEW.id
  ) LOOP
    v_username := v_username || '_' || FLOOR(RANDOM() * 1000)::TEXT;
    IF LENGTH(v_username) > 20 THEN
      v_username := SUBSTRING(v_username, 1, 17) || '_' || FLOOR(RANDOM() * 100)::TEXT;
    END IF;
  END LOOP;

  INSERT INTO public.profiles (
    user_id,
    email,
    username,
    role,
    account_role,
    onboarding_step,
    onboarding_complete,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    LOWER(TRIM(COALESCE(NEW.email, ''))),
    v_username,
    v_profile_role,
    v_account_role,
    'interests',
    FALSE,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    email = EXCLUDED.email,
    username = COALESCE(public.profiles.username, EXCLUDED.username),
    role = EXCLUDED.role,
    account_role = EXCLUDED.account_role,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2) Claim approval RPCs: promote profile role to business_owner
-- ============================================================
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

  UPDATE public.profiles
  SET
    role = 'business_owner',
    account_role = 'business_owner',
    onboarding_step = 'business_setup',
    updated_at = NOW()
  WHERE user_id = v_claim.claimant_user_id;

  INSERT INTO public.business_claim_events (claim_id, event_type, event_data, created_by)
  VALUES (p_claim_id, 'verification_success',
          jsonb_build_object('method', p_method, 'auto_verified', true),
          v_claim.claimant_user_id);

  RETURN jsonb_build_object('success', true, 'status', 'verified');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

    UPDATE public.profiles
    SET
      role = 'business_owner',
      account_role = 'business_owner',
      onboarding_step = 'business_setup',
      updated_at = NOW()
    WHERE user_id = v_claim.claimant_user_id;

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
