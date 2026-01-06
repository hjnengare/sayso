-- =============================================
-- ADD DEFENSIVE CHECK CONSTRAINT FOR SUBCATEGORIES
-- =============================================
-- This migration adds a CHECK constraint to prevent NULL or empty subcategory_id
-- values from being inserted into user_subcategories table.
-- This provides database-level protection against invalid data even if application
-- validation fails.

-- Drop existing constraint if it exists (to allow re-running migration)
ALTER TABLE public.user_subcategories
DROP CONSTRAINT IF EXISTS subcategory_not_empty;

-- Add CHECK constraint to ensure subcategory_id is not NULL and not empty
ALTER TABLE public.user_subcategories
ADD CONSTRAINT subcategory_not_empty
CHECK (subcategory_id IS NOT NULL AND subcategory_id <> '');

-- Also add a similar constraint for interest_id to be defensive
ALTER TABLE public.user_subcategories
DROP CONSTRAINT IF EXISTS interest_id_not_empty;

ALTER TABLE public.user_subcategories
ADD CONSTRAINT interest_id_not_empty
CHECK (interest_id IS NOT NULL AND interest_id <> '');

-- Note: This constraint will prevent the "null value in column subcategory_id 
-- violates not-null constraint" error by catching it at the database level
-- before the insert operation completes. Combined with application-level
-- validation, this provides defense in depth.

