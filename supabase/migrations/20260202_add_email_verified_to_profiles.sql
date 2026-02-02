-- Add email_verified and email_verified_at to profiles table
-- This mirrors Supabase auth.users.email_confirmed_at into our profiles table
-- so verification status is account-based and queryable without joining auth.users.

-- Add columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- Index for querying unverified users
CREATE INDEX IF NOT EXISTS idx_profiles_email_verified ON public.profiles(email_verified);

-- Backfill: sync existing profiles from auth.users.email_confirmed_at
UPDATE public.profiles
SET
  email_verified = TRUE,
  email_verified_at = auth.users.email_confirmed_at
FROM auth.users
WHERE profiles.user_id = auth.users.id
  AND auth.users.email_confirmed_at IS NOT NULL
  AND profiles.email_verified IS NOT TRUE;

-- Update the handle_new_user trigger to:
-- 1. Set email_verified = false on new profiles
-- 2. Fix account_type key (was reading 'accountType' but app stores 'account_type')
-- 3. Preserve username extraction from metadata
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_role TEXT;
  v_username TEXT;
  existing_profile RECORD;
BEGIN
  -- Extract account type from auth metadata
  -- App stores as 'account_type' (snake_case); fall back to 'accountType' (camelCase) for legacy
  v_account_role := COALESCE(
    NEW.raw_user_meta_data->>'account_type',
    NEW.raw_user_meta_data->>'accountType',
    'user'
  );

  -- Ensure role is valid
  IF v_account_role NOT IN ('user', 'business_owner') THEN
    v_account_role := 'user';
  END IF;

  -- Extract username from metadata
  v_username := NEW.raw_user_meta_data->>'username';

  -- Validate username
  IF v_username IS NULL OR v_username = '' THEN
    v_username := LOWER(REGEXP_REPLACE(SPLIT_PART(NEW.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g'));
    IF LENGTH(v_username) < 3 THEN
      v_username := 'user_' || SUBSTRING(NEW.id::text, 1, 8);
    END IF;
    IF LENGTH(v_username) > 20 THEN
      v_username := SUBSTRING(v_username, 1, 20);
    END IF;
  END IF;

  -- Ensure username is unique
  WHILE EXISTS (SELECT 1 FROM profiles WHERE username = v_username) LOOP
    v_username := v_username || '_' || FLOOR(RANDOM() * 1000)::TEXT;
    IF LENGTH(v_username) > 20 THEN
      v_username := SUBSTRING(v_username, 1, 17) || '_' || FLOOR(RANDOM() * 100)::TEXT;
    END IF;
  END LOOP;

  -- Check if profile exists for this email
  SELECT * INTO existing_profile
  FROM public.profiles
  WHERE email = NEW.email
  LIMIT 1;

  IF existing_profile IS NOT NULL THEN
    -- Profile exists - update role to 'both' if adding different account type
    IF existing_profile."role" = 'user' AND v_account_role = 'business_owner' THEN
      UPDATE public.profiles
      SET "role" = 'both', updated_at = NOW()
      WHERE user_id = existing_profile.user_id;
    ELSIF existing_profile."role" = 'business_owner' AND v_account_role = 'user' THEN
      UPDATE public.profiles
      SET "role" = 'both', updated_at = NOW()
      WHERE user_id = existing_profile.user_id;
    END IF;
  ELSE
    -- Create new profile with email_verified = false
    INSERT INTO public.profiles (
      user_id,
      email,
      username,
      "role",
      "account_role",
      email_verified,
      email_verified_at,
      onboarding_step,
      onboarding_complete,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      NEW.email,
      v_username,
      v_account_role,
      v_account_role,
      FALSE,
      NULL,
      'interests',
      FALSE,
      NOW(),
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON COLUMN public.profiles.email_verified IS 'Whether the user email has been verified. Mirrors auth.users.email_confirmed_at for queryability.';
COMMENT ON COLUMN public.profiles.email_verified_at IS 'Timestamp of email verification. Set by /auth/callback on successful verification.';
