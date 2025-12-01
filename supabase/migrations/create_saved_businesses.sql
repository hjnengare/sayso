-- Create saved_businesses table (matches existing schema)
-- Note: This migration is for reference. The table already exists with this structure.
CREATE TABLE IF NOT EXISTS saved_businesses (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  business_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT saved_businesses_pkey PRIMARY KEY (id),
  CONSTRAINT saved_businesses_user_id_business_id_key UNIQUE (user_id, business_id),
  CONSTRAINT saved_businesses_business_id_fkey FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  CONSTRAINT saved_businesses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_saved_businesses_user_id ON saved_businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_businesses_business_id ON saved_businesses(business_id);
CREATE INDEX IF NOT EXISTS idx_saved_businesses_created_at ON saved_businesses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_businesses_user_created ON saved_businesses(user_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE saved_businesses ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see and manage their own saved businesses
-- Drop existing policies if they exist, then create new ones
DROP POLICY IF EXISTS "Users can view their own saved businesses" ON saved_businesses;
DROP POLICY IF EXISTS "Users can insert their own saved businesses" ON saved_businesses;
DROP POLICY IF EXISTS "Users can delete their own saved businesses" ON saved_businesses;
DROP POLICY IF EXISTS "Users can update their own saved businesses" ON saved_businesses;

CREATE POLICY "Users can view their own saved businesses"
  ON saved_businesses
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved businesses"
  ON saved_businesses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved businesses"
  ON saved_businesses
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved businesses"
  ON saved_businesses
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

