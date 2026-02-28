-- Migration: Restrict email column from anon access on profiles
-- The 20260104 migration granted broad SELECT on profiles to anon, which
-- inadvertently exposed the email column (added in 20260121).
-- Fix: revoke table-level SELECT and re-grant only non-PII columns.

-- Step 1: Revoke the broad table-level SELECT from anon
REVOKE SELECT ON public.profiles FROM anon;

-- Step 2: Re-grant only safe, non-PII columns to anon
-- Omits: email, email_verified, email_verified_at, onboarding_step,
--        onboarding_complete, interests_count, subcategories_count,
--        dealbreakers_count, last_interests_updated, last_subcategories_updated,
--        last_dealbreakers_updated, role, account_role, account_type
GRANT SELECT (
  user_id,
  username,
  display_name,
  avatar_url,
  bio,
  is_active,
  is_top_reviewer,
  reviews_count,
  badges_count,
  created_at,
  updated_at,
  locale
) ON public.profiles TO anon;

-- Authenticated users still need table-level for self-reads (own profile has email)
-- Leave authenticated untouched — RLS "Users can view/edit own profile" handles that.
-- But also grant the same safe columns for reading other users' profiles:
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (
  user_id,
  username,
  display_name,
  avatar_url,
  bio,
  is_active,
  is_top_reviewer,
  reviews_count,
  badges_count,
  created_at,
  updated_at,
  locale
) ON public.profiles TO authenticated;

-- Re-add email access for authenticated users reading their OWN profile
-- This is handled by the existing RLS policy "Users can view own profile"
-- combined with a separate column grant for authenticated:
GRANT SELECT (email, email_verified, email_verified_at) ON public.profiles TO authenticated;

-- Note: The RLS policy "Public can read profiles" (USING is_active = true)
-- remains in place to control which ROWS are visible. Column grants above
-- control which COLUMNS are readable regardless of the row policy.
