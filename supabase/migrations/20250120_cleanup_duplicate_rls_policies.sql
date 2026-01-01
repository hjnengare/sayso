-- Migration: Clean up duplicate RLS policies on businesses table
-- This fixes the issue where multiple UPDATE policies cause silent failures

-- =============================================
-- STEP 1: Remove duplicate UPDATE policies
-- =============================================

-- Drop the old/duplicate UPDATE policy
DROP POLICY IF EXISTS "owners can update their businesses" ON public.businesses;
DROP POLICY IF EXISTS "Allow owners to update their businesses" ON public.businesses;

-- Drop the current one to recreate it cleanly
DROP POLICY IF EXISTS "businesses_update_owner" ON public.businesses;

-- Create a single, simple UPDATE policy
CREATE POLICY "businesses_update_owner"
  ON public.businesses
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = owner_id
  )
  WITH CHECK (
    auth.uid() = owner_id
  );

COMMENT ON POLICY "businesses_update_owner" ON public.businesses IS 
  'Allows business owners to update their businesses. Simple policy with no joins or EXISTS clauses to prevent silent failures.';

-- =============================================
-- STEP 2: Remove duplicate INSERT policies
-- =============================================

-- Drop the old/duplicate INSERT policy
DROP POLICY IF EXISTS "Allow authenticated users to insert businesses" ON public.businesses;

-- Drop the current one to recreate it cleanly
DROP POLICY IF EXISTS "businesses_insert_authenticated" ON public.businesses;

-- Create a single INSERT policy that ensures owner_id is set
CREATE POLICY "businesses_insert_authenticated"
  ON public.businesses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

COMMENT ON POLICY "businesses_insert_authenticated" ON public.businesses IS 
  'Allows authenticated users to insert businesses. Ensures creator is set as owner.';

-- =============================================
-- STEP 3: Remove duplicate SELECT policies
-- =============================================

-- Drop the old/duplicate SELECT policy
DROP POLICY IF EXISTS "owners can select their businesses" ON public.businesses;
DROP POLICY IF EXISTS "Allow public read access to active businesses" ON public.businesses;
DROP POLICY IF EXISTS "businesses_select_active" ON public.businesses;

-- Drop the current one to recreate it cleanly
DROP POLICY IF EXISTS "businesses_select_public_and_owners" ON public.businesses;

-- Create a single SELECT policy
CREATE POLICY "businesses_select_public_and_owners"
  ON public.businesses
  FOR SELECT
  USING (
    status = 'active'
    OR auth.uid() = owner_id
  );

COMMENT ON POLICY "businesses_select_public_and_owners" ON public.businesses IS 
  'Allows public to read active businesses, and owners to read their own businesses regardless of status.';

-- =============================================
-- STEP 4: Ensure DELETE policy is correct (should already exist)
-- =============================================

-- Drop and recreate DELETE policy to ensure it's simple
DROP POLICY IF EXISTS "businesses_delete_owner" ON public.businesses;
DROP POLICY IF EXISTS "Allow owners to delete their businesses" ON public.businesses;

CREATE POLICY "businesses_delete_owner"
  ON public.businesses
  FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

COMMENT ON POLICY "businesses_delete_owner" ON public.businesses IS 
  'Allows business owners to delete their own businesses.';

-- =============================================
-- VERIFICATION: List all policies to confirm cleanup
-- =============================================

-- This query will show all remaining policies (run manually to verify)
-- SELECT 
--   schemaname, 
--   tablename, 
--   policyname, 
--   cmd, 
--   qual, 
--   with_check
-- FROM pg_policies 
-- WHERE tablename = 'businesses'
-- ORDER BY cmd, policyname;

