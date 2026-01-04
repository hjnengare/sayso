-- Migration: Add RLS SELECT policy for business_images table
-- This fixes 503 errors when API endpoints join to business_images table
-- Public can read all business images (they're public data for public businesses)

-- Enable RLS if not already enabled (should already be enabled, but safe to run)
ALTER TABLE public.business_images ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists (to allow re-running migration)
DROP POLICY IF EXISTS "Public can read business images" ON public.business_images;

-- Create public SELECT policy for business images
-- Business images are public data (attached to public businesses)
CREATE POLICY "Public can read business images"
  ON public.business_images
  FOR SELECT
  USING (true);

-- Add comment
COMMENT ON POLICY "Public can read business images" ON public.business_images IS 
  'Allows public (including anonymous users) to read business images. Required for API queries that join with business_images table. Business images are public data.';

-- Grant necessary permissions (should already exist, but safe to run)
GRANT SELECT ON public.business_images TO anon, authenticated;

