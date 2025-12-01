-- Update the profile creation trigger to extract and set username from user metadata
-- This ensures username is set when the profile is created during signup

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create updated function that extracts username from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_username TEXT;
BEGIN
  -- Extract username from user metadata (raw_user_meta_data)
  user_username := NEW.raw_user_meta_data->>'username';
  
  -- Validate username format (should already be validated in application, but double-check)
  IF user_username IS NULL OR user_username = '' THEN
    -- If no username in metadata, generate one from email
    user_username := LOWER(REGEXP_REPLACE(SPLIT_PART(NEW.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g'));
    
    -- Ensure it meets minimum length
    IF LENGTH(user_username) < 3 THEN
      user_username := 'user_' || SUBSTRING(NEW.id::text, 1, 8);
    END IF;
    
    -- Ensure it meets maximum length
    IF LENGTH(user_username) > 20 THEN
      user_username := SUBSTRING(user_username, 1, 20);
    END IF;
  END IF;
  
  -- Ensure username is unique by appending a number if needed
  WHILE EXISTS (SELECT 1 FROM profiles WHERE username = user_username) LOOP
    user_username := user_username || '_' || FLOOR(RANDOM() * 1000)::TEXT;
    -- Prevent infinite loop by limiting length
    IF LENGTH(user_username) > 20 THEN
      user_username := SUBSTRING(user_username, 1, 17) || '_' || FLOOR(RANDOM() * 100)::TEXT;
    END IF;
  END LOOP;

  -- Insert profile with username
  INSERT INTO public.profiles (
    user_id,
    username,
    onboarding_step,
    onboarding_complete,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    user_username,
    'interests',
    FALSE,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

