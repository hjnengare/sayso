-- Quick diagnostic query to check business approval notification setup
-- Run this in your Supabase SQL Editor

-- 1. Check if the function exists
DO $$
DECLARE
  func_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'create_business_approved_notification'
  ) INTO func_exists;
  
  IF func_exists THEN
    RAISE NOTICE '✅ Function create_business_approved_notification EXISTS';
  ELSE
    RAISE NOTICE '❌ Function create_business_approved_notification DOES NOT EXIST - You need to run the migration!';
  END IF;
END $$;

-- 2. Check if business_approved notification type is valid
DO $$
DECLARE
  type_valid boolean;
  constraint_def text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO constraint_def
  FROM pg_constraint 
  WHERE conrelid = 'notifications'::regclass 
    AND conname LIKE '%type%check%'
  LIMIT 1;
  
  IF constraint_def IS NOT NULL AND constraint_def LIKE '%business_approved%' THEN
    RAISE NOTICE '✅ Notification type "business_approved" is VALID';
  ELSE
    RAISE NOTICE '⚠️  Could not verify notification type constraint. Current constraint: %', COALESCE(constraint_def, 'NOT FOUND');
  END IF;
END $$;

-- 3. Check recent business approvals and their notification status
SELECT 
  b.id as business_id,
  b.name as business_name,
  b.status,
  b.owner_id,
  b.approved_at,
  b.approved_by,
  COUNT(n.id) as notification_count,
  MAX(n.created_at) as last_notification_at,
  CASE 
    WHEN b.owner_id IS NULL THEN '❌ No owner assigned'
    WHEN COUNT(n.id) = 0 THEN '⚠️  No notification created'
    ELSE '✅ Notification exists'
  END as status_check
FROM businesses b
LEFT JOIN notifications n ON (
  n.user_id = b.owner_id 
  AND n.type = 'business_approved' 
  AND n.entity_id = b.id::text
)
WHERE b.status = 'active'
  AND b.approved_at IS NOT NULL
  AND b.approved_at > NOW() - INTERVAL '7 days'
GROUP BY b.id, b.name, b.status, b.owner_id, b.approved_at, b.approved_by
ORDER BY b.approved_at DESC
LIMIT 10;

-- 4. Summary of recent business_approved notifications
SELECT 
  'Recent business_approved notifications' as summary,
  COUNT(*) as total_count,
  COUNT(DISTINCT user_id) as unique_users,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM notifications
WHERE type = 'business_approved'
  AND created_at > NOW() - INTERVAL '30 days';
