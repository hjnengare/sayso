-- Hero Images Storage Bucket Setup
-- This migration documents the required Supabase Storage bucket setup
-- Note: Bucket creation must be done via Supabase Dashboard or Management API

-- ============================================================================
-- STEP 1: Create Storage Bucket (via Supabase Dashboard)
-- ============================================================================
--
-- Go to Supabase Dashboard > Storage > Create Bucket
--
-- Bucket Name: hero_images (note: uses underscore, not hyphen)
-- Public: Yes (required for public landing pages)
-- File Size Limit: 5MB (or as needed)
-- Allowed MIME Types: image/jpeg, image/png, image/webp, image/gif, image/avif
--
-- ============================================================================
-- STEP 2: Storage Bucket RLS Policies (Run this SQL)
-- ============================================================================

-- Drop existing policies if they exist (to allow re-running this migration)
DROP POLICY IF EXISTS "Public read access to hero images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload hero images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update hero images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete hero images" ON storage.objects;

-- Policy: Allow public read access to hero images
CREATE POLICY "Public read access to hero images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'hero_images');

-- Policy: Allow authenticated users to upload hero images
CREATE POLICY "Authenticated users can upload hero images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'hero_images');

-- Policy: Allow authenticated users to update hero images
CREATE POLICY "Authenticated users can update hero images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'hero_images')
WITH CHECK (bucket_id = 'hero_images');

-- Policy: Allow authenticated users to delete hero images
CREATE POLICY "Authenticated users can delete hero images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'hero_images');

-- ============================================================================
-- STEP 3: Verify Bucket Setup
-- ============================================================================
--
-- After creating the bucket and running the policies above, verify:
--
-- 1. Bucket exists: SELECT * FROM storage.buckets WHERE id = 'hero_images';
-- 2. Policies are active: SELECT * FROM storage.policies WHERE bucket_id = 'hero_images';
-- 3. Test public access: Check if uploaded image URL is accessible without auth
--
-- ============================================================================
-- Storage Path Structure
-- ============================================================================
--
-- Images are stored with the following structure (flat, root level):
-- hero_images/{filename}
--
-- Example:
-- hero_images/summer-market-01.jpg
--
-- ============================================================================
-- Notes
-- ============================================================================
--
-- 1. Keep file names unique to avoid overwriting
-- 2. If you want folders, update the HeroCarousel list path accordingly
-- 3. Consider adding image optimization before upload
--
