-- Make username NOT NULL and ensure it's set during sign up
-- This migration will:
-- 1. Set a default username for existing users who don't have one
-- 2. Add NOT NULL constraint to username column
-- 3. Ensure profile creation requires username

-- Step 1: Update existing profiles that have NULL username
-- Generate username from email for existing users
UPDATE profiles
SET username = COALESCE(
  username,
  LOWER(REGEXP_REPLACE(SPLIT_PART(auth.users.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g'))
)
WHERE username IS NULL
AND EXISTS (
  SELECT 1 FROM auth.users WHERE auth.users.id = profiles.user_id
);

-- For any remaining NULL usernames, use a fallback pattern
UPDATE profiles
SET username = 'user_' || SUBSTRING(user_id::text, 1, 8)
WHERE username IS NULL;

-- Step 2: Add NOT NULL constraint to username
ALTER TABLE profiles
ALTER COLUMN username SET NOT NULL;

-- Step 3: Add a check constraint to ensure username meets requirements
ALTER TABLE profiles
ADD CONSTRAINT username_format_check 
CHECK (
  username ~ '^[a-zA-Z0-9_]{3,20}$'
);

-- Step 4: Ensure username is unique (if not already)
-- Note: This will fail if there are duplicates, so handle those first
-- Create unique index if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique 
ON profiles(username) 
WHERE username IS NOT NULL;

-- If there are duplicate usernames, we need to handle them
-- This will append a number to make them unique
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  -- Count duplicates
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT username, COUNT(*) as cnt
    FROM profiles
    GROUP BY username
    HAVING COUNT(*) > 1
  ) duplicates;
  
  -- If duplicates exist, make them unique
  IF duplicate_count > 0 THEN
    UPDATE profiles p1
    SET username = p1.username || '_' || subquery.row_num
    FROM (
      SELECT 
        user_id,
        ROW_NUMBER() OVER (PARTITION BY username ORDER BY created_at) as row_num
      FROM profiles
      WHERE username IN (
        SELECT username
        FROM profiles
        GROUP BY username
        HAVING COUNT(*) > 1
      )
    ) subquery
    WHERE p1.user_id = subquery.user_id
    AND subquery.row_num > 1;
  END IF;
END $$;

-- Now create the unique constraint (will work since we fixed duplicates)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_username_key'
  ) THEN
    ALTER TABLE profiles
    ADD CONSTRAINT profiles_username_key UNIQUE (username);
  END IF;
END $$;

