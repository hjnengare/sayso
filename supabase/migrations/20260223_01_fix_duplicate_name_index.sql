-- Fix existing duplicate normalized_name before creating unique index.
-- Run this if 20260223_duplicate_business_name_prevention.sql failed with
-- "Key (normalized_name)=(...) is duplicated".
--
-- For each duplicate (normalized_name, is_chain=false, status!='rejected'),
-- keep the first row and append --{id} to the rest so index creation succeeds.

-- 1. Ensure normalized_name is populated
UPDATE public.businesses
SET normalized_name = LOWER(TRIM(REGEXP_REPLACE(COALESCE(name, ''), '\s+', ' ', 'g')))
WHERE normalized_name IS NULL OR normalized_name = '';

-- 2. Fix duplicates: append --{id} to rows that would violate uniqueness
UPDATE public.businesses b
SET normalized_name = b.normalized_name || '--' || b.id::text
WHERE b.id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY normalized_name
        ORDER BY created_at NULLS LAST, id
      ) AS rn
    FROM public.businesses
    WHERE COALESCE(is_chain, false) = false
      AND (status IS NULL OR status != 'rejected')
      AND normalized_name IS NOT NULL
      AND normalized_name != ''
      AND normalized_name NOT LIKE '%--%'
  ) sub
  WHERE rn > 1
);

-- 3. Create unique index (drop first if partial creation left it)
DROP INDEX IF EXISTS public.unique_non_chain_business_name;

CREATE UNIQUE INDEX unique_non_chain_business_name
  ON public.businesses (normalized_name)
  WHERE is_chain = false
    AND (status IS NULL OR status != 'rejected');
