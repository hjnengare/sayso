-- Add Foreign Key Relationship from review_replies to profiles
-- This enables PostgREST to understand the relationship for joins
-- Note: review_replies.user_id currently references auth.users(id),
-- but PostgREST needs a foreign key to profiles(user_id) for joins
-- RLS policies will continue to work with auth.uid() regardless of the foreign key

-- Drop the existing foreign key to auth.users (if it exists)
-- Find and drop any existing foreign key constraint on user_id
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

-- Refresh the schema cache so PostgREST recognizes the relationship
NOTIFY pgrst, 'reload schema';

-- Verify the constraint exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'review_replies_user_id_fkey' 
    AND table_name = 'review_replies'
  ) THEN
    RAISE NOTICE 'Foreign key constraint review_replies_user_id_fkey successfully created';
  ELSE
    RAISE EXCEPTION 'Failed to create foreign key constraint review_replies_user_id_fkey';
  END IF;
END $$;

