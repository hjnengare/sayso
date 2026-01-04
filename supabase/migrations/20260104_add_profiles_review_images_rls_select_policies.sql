-- Migration: Add RLS SELECT policies for profiles and review_images tables
-- This fixes 500 errors when reviews API joins to profiles table
-- Public can read active profiles and all review images (they're public data)

-- =============================================
-- 1. ADD SELECT POLICY FOR PROFILES TABLE
-- =============================================

-- Enable RLS if not already enabled (should already be enabled, but safe to run)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists (to allow re-running migration)
DROP POLICY IF EXISTS "Public can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public can read active profiles" ON public.profiles;

-- Create public SELECT policy for active profiles only
-- This allows public (including anonymous users) to read profile data
-- for reviews, but only for active users
CREATE POLICY "Public can read profiles"
  ON public.profiles
  FOR SELECT
  USING (is_active = true);

-- Add comment
COMMENT ON POLICY "Public can read profiles" ON public.profiles IS 
  'Allows public (including anonymous users) to read active profiles. Required for reviews API queries that join with profiles table. Only exposes active user profiles.';

-- =============================================
-- 2. VERIFY REVIEW_IMAGES SELECT POLICY EXISTS
-- =============================================

-- Review_images should already have a SELECT policy from the reviews schema migration
-- But let's ensure it exists and is correct (idempotent)

-- Enable RLS if not already enabled (should already be enabled)
ALTER TABLE public.review_images ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists (to allow re-running migration)
DROP POLICY IF EXISTS "Public can read review images" ON public.review_images;
DROP POLICY IF EXISTS "Allow public read access to review images" ON public.review_images;

-- Create public SELECT policy for review images
-- Review images are public data (attached to public reviews)
CREATE POLICY "Public can read review images"
  ON public.review_images
  FOR SELECT
  USING (true);

-- Add comment
COMMENT ON POLICY "Public can read review images" ON public.review_images IS 
  'Allows public (including anonymous users) to read review images. Required for reviews API queries that join with review_images table. Review images are public data.';

-- =============================================
-- 3. GRANT NECESSARY PERMISSIONS
-- =============================================

-- Ensure public schema has necessary grants (should already exist, but safe to run)
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT SELECT ON public.review_images TO anon, authenticated;

