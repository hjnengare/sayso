-- Migration: Drop the deprecated uploaded_image column
-- This column has been replaced by uploaded_images array (TEXT[])
-- All data has been migrated to uploaded_images in previous migrations

-- Drop the column if it still exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'businesses' 
    AND column_name = 'uploaded_image'
  ) THEN
    ALTER TABLE public.businesses 
    DROP COLUMN uploaded_image;
    
    RAISE NOTICE 'Dropped deprecated uploaded_image column from businesses table';
  ELSE
    RAISE NOTICE 'uploaded_image column does not exist, skipping drop';
  END IF;
END $$;

-- Add comment documenting the change
COMMENT ON COLUMN public.businesses.uploaded_images IS 
'Array of uploaded image URLs from business-images storage bucket. This is the primary source of truth for business images. First image in array (uploaded_images[1]) is the primary/cover image. The deprecated uploaded_image column has been removed.';

