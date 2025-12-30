-- Migration: Cascade Delete Businesses on User Account Deletion
-- This ensures that when a user deletes their account, all their businesses are also deleted
-- along with all related data (business_images, business_stats, etc.)

-- Drop the existing foreign key constraint
ALTER TABLE businesses
DROP CONSTRAINT IF EXISTS businesses_owner_id_fkey;

-- Recreate the foreign key constraint with ON DELETE CASCADE
ALTER TABLE businesses
ADD CONSTRAINT businesses_owner_id_fkey
FOREIGN KEY (owner_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- Add comment to document the change
COMMENT ON CONSTRAINT businesses_owner_id_fkey ON businesses IS 
'Cascades deletion: when a user account is deleted, all their businesses are automatically deleted along with related data (business_images, business_stats, business_owners, etc.)';

