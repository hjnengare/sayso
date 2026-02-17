-- Test script to verify business approval notification function exists and works
-- Run this in your Supabase SQL editor

-- 1. Check if the function exists
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'create_business_approved_notification';

-- 2. Check the function's parameters
SELECT 
  parameter_name,
  data_type,
  parameter_mode
FROM information_schema.parameters
WHERE specific_schema = 'public'
  AND specific_name LIKE '%create_business_approved_notification%'
ORDER BY ordinal_position;

-- 3. Test the function with dummy data (replace with actual user_id and business_id)
-- IMPORTANT: Replace 'YOUR_USER_ID' and 'YOUR_BUSINESS_ID' with real values from your database
/*
SELECT create_business_approved_notification(
  'YOUR_USER_ID'::UUID,  -- Replace with actual owner UUID
  'YOUR_BUSINESS_ID',    -- Replace with actual business ID
  'Test Business Name'
);
*/

-- 4. Check recent notifications to see if any business_approved notifications exist
SELECT 
  id,
  user_id,
  type,
  title,
  message,
  created_at,
  read
FROM notifications
WHERE type = 'business_approved'
ORDER BY created_at DESC
LIMIT 10;

-- 5. Check if the notification type is in the enum/constraint
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'notifications'
  AND column_name = 'type';
