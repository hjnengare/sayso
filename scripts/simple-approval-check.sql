-- Simplified diagnostic query with explicit type casts
-- Copy and paste this entire query into your Supabase SQL Editor

-- Check recent business approvals and their notification status
SELECT 
  b.id::text as business_id,
  b.name as business_name,
  b.status,
  b.owner_id::text as owner_id,
  b.approved_at,
  b.approved_by::text as approved_by,
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
  AND n.entity_id = b.id::text  -- Critical: Cast UUID to TEXT
)
WHERE b.status = 'active'
  AND b.approved_at IS NOT NULL
  AND b.approved_at > NOW() - INTERVAL '7 days'
GROUP BY b.id, b.name, b.status, b.owner_id, b.approved_at, b.approved_by
ORDER BY b.approved_at DESC
LIMIT 10;
