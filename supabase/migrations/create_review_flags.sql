-- Review flags table
-- Allows users to flag inappropriate reviews
CREATE TABLE IF NOT EXISTS review_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  flagged_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'inappropriate', 'harassment', 'off_topic', 'other')),
  details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(review_id, flagged_by)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_review_flags_review_id ON review_flags(review_id);
CREATE INDEX IF NOT EXISTS idx_review_flags_status ON review_flags(status);
CREATE INDEX IF NOT EXISTS idx_review_flags_flagged_by ON review_flags(flagged_by);
CREATE INDEX IF NOT EXISTS idx_review_flags_created_at ON review_flags(created_at);

-- Enable RLS
ALTER TABLE review_flags ENABLE ROW LEVEL SECURITY;

-- Users can insert their own flags
CREATE POLICY "Users can insert their own flags"
  ON review_flags
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = flagged_by);

-- Users can read their own flags
CREATE POLICY "Users can read their own flags"
  ON review_flags
  FOR SELECT
  TO authenticated
  USING (auth.uid() = flagged_by);

-- Users can delete their own flags (to remove flag if they change their mind)
CREATE POLICY "Users can delete their own flags"
  ON review_flags
  FOR DELETE
  TO authenticated
  USING (auth.uid() = flagged_by);

-- Admins can read all flags
CREATE POLICY "Admins can read all flags"
  ON review_flags
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can update flags (for reviewing/dismissing)
CREATE POLICY "Admins can update flags"
  ON review_flags
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_review_flags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_review_flags_updated_at
  BEFORE UPDATE ON review_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_review_flags_updated_at();

