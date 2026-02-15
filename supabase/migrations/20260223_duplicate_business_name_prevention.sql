-- Prevent duplicate business names (except chains)
-- Non-chain businesses: unique on normalized name (case-insensitive, trimmed, single spaces).
-- Chains (is_chain = true) are exempt.
-- Rejected businesses are excluded from the uniqueness check (can resubmit with same name).

-- 1. Add is_chain column (default false for new and existing)
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS is_chain BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.businesses.is_chain IS 'When true, business is part of a chain/franchise; duplicate names allowed.';

-- 2. Add normalized_name: LOWER(TRIM(REGEXP_REPLACE(name, '\s+', ' ', 'g')))
-- Use a regular column + trigger for compatibility (generated columns need PG 12+)
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS normalized_name TEXT;

-- Backfill and keep in sync via trigger
CREATE OR REPLACE FUNCTION public.businesses_normalized_name_update() RETURNS trigger AS $$
BEGIN
  NEW.normalized_name := LOWER(TRIM(REGEXP_REPLACE(COALESCE(NEW.name, ''), '\s+', ' ', 'g')));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS businesses_normalized_name_trigger ON public.businesses;
CREATE TRIGGER businesses_normalized_name_trigger
  BEFORE INSERT OR UPDATE OF name
  ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.businesses_normalized_name_update();

-- Backfill existing rows
UPDATE public.businesses
SET normalized_name = LOWER(TRIM(REGEXP_REPLACE(COALESCE(name, ''), '\s+', ' ', 'g')))
WHERE normalized_name IS NULL OR normalized_name = '';

-- 2b. Fix existing duplicates before creating unique index
-- For duplicate (normalized_name, is_chain=false, status!='rejected'), keep first by created_at
-- and append --{id} to the rest so index creation succeeds.
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
  ) sub
  WHERE rn > 1
);

-- 3. Partial unique index: unique on normalized_name only where is_chain = false and status != 'rejected'
CREATE UNIQUE INDEX IF NOT EXISTS unique_non_chain_business_name
  ON public.businesses (normalized_name)
  WHERE is_chain = false
    AND (status IS NULL OR status != 'rejected');

COMMENT ON INDEX unique_non_chain_business_name IS 'Prevent duplicate business names for non-chain businesses; chains and rejected entries are excluded.';
