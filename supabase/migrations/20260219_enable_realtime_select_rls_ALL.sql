-- Migration: Enable RLS and allow SELECT for authenticated users on all realtime tables

-- Enable RLS and add SELECT policy for reviews
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

-- Enable RLS and add SELECT policy for user_badges_progress
ALTER TABLE user_badges_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow SELECT for authenticated users on user_badges_progress"
  ON user_badges_progress
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

-- Enable RLS and add SELECT policy for review_images
ALTER TABLE review_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow SELECT for authenticated users on review_images"
  ON review_images
  FOR SELECT
  TO authenticated
  USING (true);

-- Enable RLS and add SELECT policy for replies
ALTER TABLE replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow SELECT for authenticated users on replies"
  ON replies
  FOR SELECT
  TO authenticated
  USING (true);

-- Enable RLS and add SELECT policy for user_stats
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow SELECT for authenticated users on user_stats"
  ON user_stats
  FOR SELECT
  TO authenticated
  USING (true);

-- Enable RLS and add SELECT policy for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow SELECT for authenticated users on notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (true);

-- Enable RLS and add SELECT policy for event_reviews
ALTER TABLE event_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow SELECT for authenticated users on event_reviews"
  ON event_reviews
  FOR SELECT
  TO authenticated
  USING (true);
