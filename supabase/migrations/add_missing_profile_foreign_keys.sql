-- =============================================
-- Add Missing Foreign Key Relationships to Profiles
-- =============================================
-- This migration adds foreign key relationships from review-related tables
-- to the profiles table, enabling PostgREST to understand relationships for joins.
-- 
-- Note: RLS policies use auth.uid() which works independently of foreign keys,
-- so changing the foreign key from auth.users to profiles won't break RLS.
-- =============================================

-- =============================================
-- 1. Review Replies Foreign Key
-- =============================================

-- Drop the existing foreign key to auth.users (if it exists)
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  -- Find the constraint name
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'review_replies'::regclass
    AND confrelid = 'auth.users'::regclass
    AND contype = 'f'
    AND array_length(conkey, 1) = 1
    AND conkey[1] = (
      SELECT attnum 
      FROM pg_attribute 
      WHERE attrelid = 'review_replies'::regclass 
      AND attname = 'user_id'
    )
  LIMIT 1;

  -- Drop the constraint if found
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE review_replies DROP CONSTRAINT IF EXISTS %I', constraint_name);
    RAISE NOTICE 'Dropped existing foreign key constraint: %', constraint_name;
  END IF;
END $$;

-- Add foreign key constraint from review_replies.user_id to profiles.user_id
-- Check if constraint already exists before adding
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'review_replies_user_id_fkey' 
    AND table_name = 'review_replies'
  ) THEN
    ALTER TABLE review_replies 
    ADD CONSTRAINT review_replies_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES profiles(user_id) 
    ON DELETE CASCADE;
    RAISE NOTICE 'Added foreign key constraint: review_replies_user_id_fkey';
  ELSE
    RAISE NOTICE 'Foreign key constraint review_replies_user_id_fkey already exists';
  END IF;
END $$;

-- =============================================
-- 2. Review Helpful Votes Foreign Key (Optional)
-- =============================================

-- Drop the existing foreign key to auth.users (if it exists)
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  -- Find the constraint name
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'review_helpful_votes'::regclass
    AND confrelid = 'auth.users'::regclass
    AND contype = 'f'
    AND array_length(conkey, 1) = 1
    AND conkey[1] = (
      SELECT attnum 
      FROM pg_attribute 
      WHERE attrelid = 'review_helpful_votes'::regclass 
      AND attname = 'user_id'
    )
  LIMIT 1;

  -- Drop the constraint if found
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE review_helpful_votes DROP CONSTRAINT IF EXISTS %I', constraint_name);
    RAISE NOTICE 'Dropped existing foreign key constraint: %', constraint_name;
  END IF;
END $$;

-- Add foreign key constraint from review_helpful_votes.user_id to profiles.user_id
-- Check if constraint already exists before adding
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'review_helpful_votes_user_id_fkey' 
    AND table_name = 'review_helpful_votes'
  ) THEN
    ALTER TABLE review_helpful_votes 
    ADD CONSTRAINT review_helpful_votes_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES profiles(user_id) 
    ON DELETE CASCADE;
    RAISE NOTICE 'Added foreign key constraint: review_helpful_votes_user_id_fkey';
  ELSE
    RAISE NOTICE 'Foreign key constraint review_helpful_votes_user_id_fkey already exists';
  END IF;
END $$;

-- =============================================
-- 3. Refresh PostgREST Schema Cache
-- =============================================

-- Refresh the schema cache so PostgREST recognizes the relationships
NOTIFY pgrst, 'reload schema';

-- =============================================
-- 4. Verify Constraints
-- =============================================

DO $$
BEGIN
  -- Verify review_replies constraint
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'review_replies_user_id_fkey' 
    AND table_name = 'review_replies'
  ) THEN
    RAISE NOTICE '✓ Foreign key constraint review_replies_user_id_fkey successfully created';
  ELSE
    RAISE WARNING '✗ Failed to create foreign key constraint review_replies_user_id_fkey';
  END IF;

  -- Verify review_helpful_votes constraint
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'review_helpful_votes_user_id_fkey' 
    AND table_name = 'review_helpful_votes'
  ) THEN
    RAISE NOTICE '✓ Foreign key constraint review_helpful_votes_user_id_fkey successfully created';
  ELSE
    RAISE WARNING '✗ Failed to create foreign key constraint review_helpful_votes_user_id_fkey';
  END IF;
END $$;

