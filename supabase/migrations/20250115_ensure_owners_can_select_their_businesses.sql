-- Migration: Ensure business owners can SELECT their own businesses
-- This fixes the issue where owners can't immediately read their newly created business
-- due to RLS policies that only allow SELECT for active businesses

-- Drop existing SELECT policy if it exists
DROP POLICY IF EXISTS "businesses_select_active" ON businesses;
DROP POLICY IF EXISTS "Allow public read access to active businesses" ON businesses;

-- Create a more permissive SELECT policy that:
-- 1. Allows public to read active businesses
-- 2. Allows owners to read their own businesses (regardless of status)
CREATE POLICY "businesses_select_public_and_owners"
  ON businesses
  FOR SELECT
  USING (
    -- Public can read active businesses
    status = 'active'
    OR
    -- Owners can always read their own businesses (even if not active yet)
    auth.uid() = owner_id
    OR
    -- Users can read businesses they own via business_owners table
    EXISTS (
      SELECT 1 FROM business_owners
      WHERE business_owners.business_id = businesses.id
      AND business_owners.user_id = auth.uid()
    )
  );

-- Ensure UPDATE policy allows owners to update (should already exist, but verify)
-- The existing policy should work, but let's make sure it's correct
DROP POLICY IF EXISTS "businesses_update_owner" ON businesses;
DROP POLICY IF EXISTS "Allow owners to update their businesses" ON businesses;

CREATE POLICY "businesses_update_owner"
  ON businesses
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = owner_id 
    OR 
    EXISTS (
      SELECT 1 FROM business_owners
      WHERE business_owners.business_id = businesses.id
      AND business_owners.user_id = auth.uid()
    )
    OR
    -- Allow admins to update any business
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() = owner_id 
    OR 
    EXISTS (
      SELECT 1 FROM business_owners
      WHERE business_owners.business_id = businesses.id
      AND business_owners.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

