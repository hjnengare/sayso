-- ============================================
-- Update Businesses with "school" in name
-- ============================================
-- This script updates businesses with "school" in the name
-- to have the category "Education & Learning" which maps to
-- the "professional-services" interest category

-- STEP 1: Preview what will be updated
SELECT 
  id,
  name,
  category as current_category,
  location,
  updated_at
FROM businesses
WHERE LOWER(name) LIKE '%school%'
ORDER BY name;

-- STEP 2: Update the category (uncomment to execute)
/*
UPDATE businesses
SET 
  category = 'Education & Learning',
  updated_at = NOW()
WHERE LOWER(name) LIKE '%school%'
  AND (category IS NULL OR category != 'Education & Learning');
*/

-- STEP 3: Verify the update
/*
SELECT 
  id,
  name,
  category,
  updated_at
FROM businesses
WHERE LOWER(name) LIKE '%school%'
ORDER BY name;
*/

-- ============================================
-- BONUS: Extended version for other education-related terms
-- ============================================
-- If you want to also update academies, colleges, universities, etc.
/*
UPDATE businesses
SET 
  category = 'Education & Learning',
  updated_at = NOW()
WHERE (
  LOWER(name) LIKE '%school%' OR
  LOWER(name) LIKE '%academy%' OR
  LOWER(name) LIKE '%college%' OR
  LOWER(name) LIKE '%university%' OR
  LOWER(name) LIKE '%institute%' OR
  LOWER(name) LIKE '%learning center%' OR
  LOWER(name) LIKE '%learning centre%' OR
  LOWER(name) LIKE '%training%'
)
AND (category IS NULL OR category != 'Education & Learning');
*/

