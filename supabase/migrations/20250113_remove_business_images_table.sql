-- Migration: Remove business_images table and use businesses.uploaded_images array
-- This simplifies the image storage to use only the businesses table

-- Step 1: Add uploaded_images array column to businesses table (if it doesn't exist)
-- First, migrate any existing data from business_images table to uploaded_images
DO $$
DECLARE
  business_record RECORD;
  image_urls TEXT[];
BEGIN
  -- For each business that has images in business_images table,
  -- collect all URLs and store them in uploaded_images array
  FOR business_record IN 
    SELECT DISTINCT business_id
    FROM public.business_images
  LOOP
    -- Collect all image URLs for this business, ordered by is_primary DESC, sort_order ASC
    SELECT ARRAY_AGG(url ORDER BY is_primary DESC, sort_order ASC)
    INTO image_urls
    FROM public.business_images
    WHERE business_id = business_record.business_id;
    
    -- Update the business with the array of URLs
    UPDATE public.businesses
    SET uploaded_images = image_urls
    WHERE id = business_record.business_id;
  END LOOP;
  
  -- Also migrate any single uploaded_image values to uploaded_images array
  UPDATE public.businesses
  SET uploaded_images = ARRAY[uploaded_image]
  WHERE uploaded_image IS NOT NULL 
    AND uploaded_image != ''
    AND (uploaded_images IS NULL OR array_length(uploaded_images, 1) IS NULL);
END $$;

-- Step 2: Drop the business_images table and all related objects
DROP TRIGGER IF EXISTS promote_next_primary_image_trigger ON public.business_images;
DROP TRIGGER IF EXISTS ensure_single_primary_image_trigger ON public.business_images;
DROP TRIGGER IF EXISTS update_business_images_updated_at_trigger ON public.business_images;

DROP FUNCTION IF EXISTS promote_next_primary_image();
DROP FUNCTION IF EXISTS ensure_single_primary_image();
DROP FUNCTION IF EXISTS update_business_images_updated_at();

DROP INDEX IF EXISTS business_images_sort_order_idx;
DROP INDEX IF EXISTS business_images_primary_idx;
DROP INDEX IF EXISTS business_images_business_id_idx;
DROP INDEX IF EXISTS business_images_single_primary;

DROP TABLE IF EXISTS public.business_images CASCADE;

-- Step 3: Ensure uploaded_images column exists as TEXT[] array
-- If the column doesn't exist, add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'businesses' 
    AND column_name = 'uploaded_images'
  ) THEN
    ALTER TABLE public.businesses 
    ADD COLUMN uploaded_images TEXT[] DEFAULT NULL;
  END IF;
END $$;

-- Step 4: uploaded_images (array) is now the primary source of truth
-- Note: The uploaded_image column has been removed in a later migration
-- Add comment to document the change
COMMENT ON COLUMN public.businesses.uploaded_images IS 
'Array of uploaded image URLs from business-images storage bucket. This is the primary source of truth for business images. First image in array is the primary/cover image.';

