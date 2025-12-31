-- Migration: Fix RLS policies to ensure public can read businesses and business_stats
-- This ensures anonymous users can fetch business listings with stats

-- =============================================
-- 1. FIX BUSINESS_STATS RLS POLICY
-- =============================================

-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "Allow authenticated users to read business stats" ON business_stats;
DROP POLICY IF EXISTS "business_stats_select_public" ON business_stats;
DROP POLICY IF EXISTS "Allow public read access to business stats" ON business_stats;

-- Create a public read policy for business_stats
-- This is essential because business queries join with business_stats
-- If anonymous users can't read stats, the entire query fails
CREATE POLICY "business_stats_select_public"
  ON business_stats
  FOR SELECT
  USING (true);  -- Allow anyone to read business stats (they're public data)

-- Add comment
COMMENT ON POLICY "business_stats_select_public" ON business_stats IS 
  'Allows public (including anonymous users) to read business stats. Required for business listing queries that join with business_stats.';

-- =============================================
-- 2. ENSURE BUSINESSES SELECT POLICY IS CORRECT
-- =============================================

-- Drop conflicting policies
DROP POLICY IF EXISTS "businesses_select_active" ON businesses;
DROP POLICY IF EXISTS "Allow public read access to active businesses" ON businesses;

-- Ensure the correct policy exists (from 20250115_ensure_owners_can_select_their_businesses.sql)
-- This policy allows:
-- 1. Public to read active businesses
-- 2. Owners to read their own businesses (regardless of status)
-- 3. Users to read businesses they own via business_owners table
DROP POLICY IF EXISTS "businesses_select_public_and_owners" ON businesses;

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

-- Add comment
COMMENT ON POLICY "businesses_select_public_and_owners" ON businesses IS 
  'Allows public to read active businesses, and owners to read their own businesses. Required for business listing queries.';

-- =============================================
-- 3. VERIFY BUSINESS_OWNERS TABLE HAS PUBLIC READ (if needed for joins)
-- =============================================

-- Check if business_owners table exists and has RLS enabled
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'business_owners'
  ) THEN
    -- Ensure business_owners has a SELECT policy for public reads
    -- This is needed for the EXISTS subquery in the businesses SELECT policy
    DROP POLICY IF EXISTS "business_owners_select_public" ON business_owners;
    
    CREATE POLICY "business_owners_select_public"
      ON business_owners
      FOR SELECT
      USING (true);  -- Allow public to read business_owners (needed for RLS subqueries)
    
    COMMENT ON POLICY "business_owners_select_public" ON business_owners IS 
      'Allows public to read business_owners table. Required for RLS policy subqueries that check ownership.';
  END IF;
END $$;

-- =============================================
-- 4. GRANT NECESSARY PERMISSIONS
-- =============================================

-- Ensure public schema has necessary grants
GRANT SELECT ON business_stats TO anon, authenticated;
GRANT SELECT ON businesses TO anon, authenticated;
GRANT SELECT ON business_owners TO anon, authenticated;

