-- Migration: Drop uploaded_images column from businesses table
-- This column is no longer needed since we're using the business_images table
--
-- IMPORTANT: This migration must run AFTER (in this exact order):
-- 1. 20250120_cleanup_duplicate_rls_policies.sql (fixes RLS policies)
-- 2. 20250120_migrate_to_business_images_table.sql (creates table and migrates data)
-- 3. 20250120_update_materialized_views_for_business_images.sql (updates materialized views)
--
-- NOTE: The following RPC functions also reference uploaded_images and should be updated separately:
-- - recommend_personalized_businesses (see 20250118_fix_recommend_personalized_businesses_uploaded_image.sql)
-- - list_businesses_optimized (see 20250117_fix_list_businesses_optimized_uploaded_image.sql)
-- These can be updated after dropping the column, but will fail until updated.

-- =============================================
-- STEP 1: Verify all data has been migrated
-- =============================================

-- Check if there are any businesses with uploaded_images that haven't been migrated
DO $$
DECLARE
  unmigrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unmigrated_count
  FROM public.businesses b
  WHERE b.uploaded_images IS NOT NULL 
    AND array_length(b.uploaded_images, 1) > 0
    AND NOT EXISTS (
      SELECT 1 FROM public.business_images bi 
      WHERE bi.business_id = b.id
    );
  
  IF unmigrated_count > 0 THEN
    RAISE WARNING 'Found % businesses with uploaded_images that have not been migrated to business_images table. Migration will continue but data may be lost.', unmigrated_count;
  ELSE
    RAISE NOTICE 'All uploaded_images data has been migrated to business_images table. Safe to drop column.';
  END IF;
END $$;

-- =============================================
-- STEP 2: Drop the column
-- =============================================

-- Drop the uploaded_images column from businesses table
ALTER TABLE public.businesses 
DROP COLUMN IF EXISTS uploaded_images;

-- =============================================
-- STEP 3: Drop the append_business_images function (no longer needed)
-- =============================================

-- This function was used to append to uploaded_images array
-- Since we're using business_images table now, this function is obsolete
DROP FUNCTION IF EXISTS public.append_business_images(UUID, TEXT[]);

-- =============================================
-- STEP 4: Note about other references
-- =============================================

-- IMPORTANT: The following also reference uploaded_images and need to be updated:
-- 
-- 1. Materialized views (mv_top_rated_businesses, mv_trending_businesses, mv_new_businesses)
--    - These use uploaded_images[1] to get the first image
--    - Should be updated to query business_images table instead
--    - See: 20250116_fix_materialized_view_uploaded_image.sql
--    - See: 20250117_remove_uploaded_image_from_materialized_views.sql
--
-- 2. RPC function: recommend_personalized_businesses
--    - Uses uploaded_images array
--    - Should be updated to query business_images table
--    - See: 20250118_fix_recommend_personalized_businesses_uploaded_image.sql
--
-- 3. RPC function: list_businesses_optimized
--    - Uses uploaded_images array
--    - Should be updated to query business_images table
--    - See: 20250117_fix_list_businesses_optimized_uploaded_image.sql
--
-- These will need separate migrations to update them to use business_images table.

-- =============================================
-- VERIFICATION
-- =============================================

-- Verify the column has been dropped
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'businesses' 
    AND column_name = 'uploaded_images'
  ) THEN
    RAISE EXCEPTION 'Column uploaded_images still exists after drop attempt!';
  ELSE
    RAISE NOTICE 'Column uploaded_images successfully dropped from businesses table.';
  END IF;
END $$;

-- Add comment to document the change
COMMENT ON TABLE public.businesses IS 
  'Businesses table. Images are stored in the business_images table, not in this table.';

