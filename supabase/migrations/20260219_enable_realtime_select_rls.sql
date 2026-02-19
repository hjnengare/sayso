-- Migration: Enable RLS and allow SELECT for authenticated users on realtime tables

-- Enable RLS and add SELECT policy for reviews
table_name = 'reviews';
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow SELECT for authenticated users on reviews"
  ON reviews
  FOR SELECT
  TO authenticated
  USING (true);

-- Enable RLS and add SELECT policy for review_helpful_votes
ALTER TABLE review_helpful_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow SELECT for authenticated users on review_helpful_votes"
  ON review_helpful_votes
  FOR SELECT
  TO authenticated
  USING (true);

-- Enable RLS and add SELECT policy for user_badges
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow SELECT for authenticated users on user_badges"
  ON user_badges
  FOR SELECT
  TO authenticated
  USING (true);

-- Enable RLS and add SELECT policy for business_stats
ALTER TABLE business_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow SELECT for authenticated users on business_stats"
  ON business_stats
  FOR SELECT
  TO authenticated
  USING (true);
