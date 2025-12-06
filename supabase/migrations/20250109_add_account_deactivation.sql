-- Migration: Add account deactivation support
-- Adds is_active and deactivated_at columns to profiles table
-- Allows users to temporarily deactivate their accounts

-- Add is_active column (defaults to true for existing users)
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE NOT NULL;

-- Add deactivated_at column (nullable, set when account is deactivated)
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;

-- Add index for querying active users
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active) WHERE is_active = TRUE;

-- Add index for querying deactivated users
CREATE INDEX IF NOT EXISTS idx_profiles_deactivated_at ON profiles(deactivated_at) WHERE deactivated_at IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN profiles.is_active IS 'Whether the user account is active. Set to false when deactivated, true when reactivated.';
COMMENT ON COLUMN profiles.deactivated_at IS 'Timestamp when the account was deactivated. NULL if account is active.';

-- Create function to reactivate account on login
CREATE OR REPLACE FUNCTION reactivate_account_on_login()
RETURNS TRIGGER AS $$
BEGIN
  -- If user logs in and account is deactivated, reactivate it
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = NEW.id AND is_active = FALSE
  ) THEN
    UPDATE profiles
    SET 
      is_active = TRUE,
      deactivated_at = NULL,
      updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to reactivate account when user logs in
-- This trigger fires when a new auth session is created
DROP TRIGGER IF EXISTS trigger_reactivate_on_login ON auth.users;

-- Note: We'll handle reactivation in the application layer instead
-- since Supabase auth triggers are limited. The API will check and reactivate on login.

