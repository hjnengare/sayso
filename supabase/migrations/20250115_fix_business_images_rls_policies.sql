-- Migration: Fix RLS policies for business_images storage bucket
-- Updates policies to use correct bucket name and allow uploads during business creation

-- Drop old policies that might use the wrong bucket name
DROP POLICY IF EXISTS "Public read access to business images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload business images" ON storage.objects;
DROP POLICY IF EXISTS "Business owners can update their images" ON storage.objects;
DROP POLICY IF EXISTS "Business owners can delete their images" ON storage.objects;

-- Policy: Allow public read access to business images
-- This allows anyone to view business images (required for public listings)
CREATE POLICY "Public read access to business images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'business_images');

-- Policy: Allow authenticated users to upload business images
-- IMPORTANT: This allows any authenticated user to upload to business_images bucket
-- Ownership is validated in application code, not at the storage level
-- This is necessary because:
-- 1. During business creation, business_owners record might not exist yet
-- 2. The business might be created by the owner_id, but business_owners table is separate
-- 3. Application code validates ownership before allowing uploads
CREATE POLICY "Authenticated users can upload business images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'business_images');

-- Policy: Allow business owners to update their own business images
-- Users can only update images in their own business folder
CREATE POLICY "Business owners can update their images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'business_images' AND
  (
    -- Allow if user owns the business (check by folder name = business_id)
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM businesses WHERE owner_id = auth.uid()
    )
    OR
    -- Allow if user is in business_owners table for this business
    (storage.foldername(name))[1] IN (
      SELECT business_id::text 
      FROM business_owners 
      WHERE user_id = auth.uid()
    )
  )
)
WITH CHECK (
  bucket_id = 'business_images' AND
  (
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM businesses WHERE owner_id = auth.uid()
    )
    OR
    (storage.foldername(name))[1] IN (
      SELECT business_id::text 
      FROM business_owners 
      WHERE user_id = auth.uid()
    )
  )
);

-- Policy: Allow business owners to delete their own business images
-- Users can only delete images in their own business folder
CREATE POLICY "Business owners can delete their images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'business_images' AND
  (
    -- Allow if user owns the business (check by folder name = business_id)
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM businesses WHERE owner_id = auth.uid()
    )
    OR
    -- Allow if user is in business_owners table for this business
    (storage.foldername(name))[1] IN (
      SELECT business_id::text 
      FROM business_owners 
      WHERE user_id = auth.uid()
    )
  )
);

-- Add comment
COMMENT ON POLICY "Authenticated users can upload business images" ON storage.objects IS 
  'Allows authenticated users to upload images to business_images bucket. Used during business creation before business record exists.';

