-- Check if saved_businesses table exists and has data
-- Run this in your Supabase SQL editor

-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'saved_businesses'
) AS table_exists;

-- Check table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'saved_businesses'
ORDER BY ordinal_position;

-- Check RLS policies
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'saved_businesses';

-- Check if there's any data (if you have permission)
SELECT COUNT(*) as total_saved FROM saved_businesses;

-- Check recent saves (if you have permission)
SELECT 
  id,
  user_id,
  business_id,
  created_at
FROM saved_businesses
ORDER BY created_at DESC
LIMIT 10;

