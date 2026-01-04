-- Migration: Add INSERT permissions for review_images table
-- This ensures authenticated users can insert review image records after uploading to storage

-- Grant INSERT permission to authenticated users
GRANT INSERT ON public.review_images TO authenticated;

-- Note: The RLS policy "Allow authenticated users to create review images" already exists
-- This grant allows the INSERT operation, and the RLS policy enforces that users can only
-- insert images for reviews they own.

