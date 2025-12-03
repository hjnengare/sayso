-- ============================================
-- Gamification Notifications Migration
-- ============================================
-- This migration adds:
-- 1. 'gamification' type to notifications
-- 2. Functions to create gamification notifications
-- 3. Triggers for automatic notification creation on milestones
-- ============================================

-- First, update the notifications table to allow 'gamification' type
ALTER TABLE notifications 
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications 
  ADD CONSTRAINT notifications_type_check 
  CHECK (type IN ('review', 'business', 'user', 'highlyRated', 'gamification'));

-- Update the comment
COMMENT ON COLUMN notifications.type IS 'Type of notification: review, business, user, highlyRated, or gamification';

-- ============================================
-- Function: Create gamification notification
-- ============================================
CREATE OR REPLACE FUNCTION create_gamification_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_image TEXT DEFAULT NULL,
  p_image_alt TEXT DEFAULT NULL,
  p_link TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    image,
    image_alt,
    link,
    read
  ) VALUES (
    p_user_id,
    'gamification',
    p_title,
    p_message,
    p_image,
    p_image_alt,
    p_link,
    false
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Function: Check and notify review milestones
-- ============================================
CREATE OR REPLACE FUNCTION check_review_milestones()
RETURNS TRIGGER AS $$
DECLARE
  v_review_count INTEGER;
  v_user_id UUID;
  v_title TEXT;
  v_message TEXT;
  v_image TEXT;
  v_link TEXT;
BEGIN
  -- Get the user_id from the new review
  v_user_id := NEW.user_id;
  
  -- Count total reviews for this user
  SELECT COUNT(*) INTO v_review_count
  FROM reviews
  WHERE user_id = v_user_id;
  
  -- Check for milestones and create notifications
  CASE
    WHEN v_review_count = 1 THEN
      -- First review milestone
      v_title := '🎉 First Review!';
      v_message := 'Congratulations on writing your first review! You''re now part of the sayso community.';
      v_image := '/png/restaurants.png';
      v_image_alt := 'First review achievement';
      v_link := '/profile';
      PERFORM create_gamification_notification(v_user_id, v_title, v_message, v_image, v_image_alt, v_link);
    
    WHEN v_review_count = 5 THEN
      -- 5 reviews milestone
      v_title := '🌟 5 Reviews!';
      v_message := 'You''ve written 5 reviews! Keep sharing your experiences with the community.';
      v_image := '/png/restaurants.png';
      v_image_alt := '5 reviews milestone';
      v_link := '/profile';
      PERFORM create_gamification_notification(v_user_id, v_title, v_message, v_image, v_image_alt, v_link);
    
    WHEN v_review_count = 10 THEN
      -- 10 reviews milestone
      v_title := '⭐ 10 Reviews!';
      v_message := 'Amazing! You''ve reached 10 reviews. You''re becoming a trusted voice in the community.';
      v_image := '/png/restaurants.png';
      v_image_alt := '10 reviews milestone';
      v_link := '/profile';
      PERFORM create_gamification_notification(v_user_id, v_title, v_message, v_image, v_image_alt, v_link);
    
    WHEN v_review_count = 25 THEN
      -- 25 reviews milestone
      v_title := '🏆 25 Reviews!';
      v_message := 'Incredible! 25 reviews and counting. You''re a valuable contributor to sayso.';
      v_image := '/png/restaurants.png';
      v_image_alt := '25 reviews milestone';
      v_link := '/profile';
      PERFORM create_gamification_notification(v_user_id, v_title, v_message, v_image, v_image_alt, v_link);
    
    WHEN v_review_count = 50 THEN
      -- 50 reviews milestone
      v_title := '💎 50 Reviews!';
      v_message := 'Outstanding! You''ve written 50 reviews. You''re a true community champion!';
      v_image := '/png/restaurants.png';
      v_image_alt := '50 reviews milestone';
      v_link := '/profile';
      PERFORM create_gamification_notification(v_user_id, v_title, v_message, v_image, v_image_alt, v_link);
    
    WHEN v_review_count = 100 THEN
      -- 100 reviews milestone
      v_title := '👑 100 Reviews!';
      v_message := 'Legendary! You''ve reached 100 reviews. Thank you for being such an amazing contributor!';
      v_image := '/png/restaurants.png';
      v_image_alt := '100 reviews milestone';
      v_link := '/profile';
      PERFORM create_gamification_notification(v_user_id, v_title, v_message, v_image, v_image_alt, v_link);
    
    WHEN v_review_count = 250 THEN
      -- 250 reviews milestone
      v_title := '🌟 250 Reviews!';
      v_message := 'Incredible dedication! 250 reviews is a remarkable achievement. You''re a sayso superstar!';
      v_image := '/png/restaurants.png';
      v_image_alt := '250 reviews milestone';
      v_link := '/profile';
      PERFORM create_gamification_notification(v_user_id, v_title, v_message, v_image, v_image_alt, v_link);
    
    WHEN v_review_count = 500 THEN
      -- 500 reviews milestone
      v_title := '💫 500 Reviews!';
      v_message := 'Absolutely phenomenal! 500 reviews is an extraordinary achievement. You''re a sayso legend!';
      v_image := '/png/restaurants.png';
      v_image_alt := '500 reviews milestone';
      v_link := '/profile';
      PERFORM create_gamification_notification(v_user_id, v_title, v_message, v_image, v_image_alt, v_link);
    
    ELSE
      -- No milestone reached
      NULL;
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Function: Check and notify helpful votes milestones
-- ============================================
CREATE OR REPLACE FUNCTION check_helpful_votes_milestones()
RETURNS TRIGGER AS $$
DECLARE
  v_total_helpful_votes INTEGER;
  v_user_id UUID;
  v_title TEXT;
  v_message TEXT;
  v_image TEXT;
  v_image_alt TEXT;
  v_link TEXT;
BEGIN
  -- Get the user_id from the review that received the helpful vote
  SELECT user_id INTO v_user_id
  FROM reviews
  WHERE id = NEW.review_id;
  
  -- Count total helpful votes across all user's reviews
  -- Count distinct helpful votes from review_helpful_votes table
  SELECT COUNT(*) INTO v_total_helpful_votes
  FROM review_helpful_votes rhv
  INNER JOIN reviews r ON r.id = rhv.review_id
  WHERE r.user_id = v_user_id;
  
  -- Check for milestones and create notifications
  CASE
    WHEN v_total_helpful_votes = 10 THEN
      v_title := '👍 10 Helpful Votes!';
      v_message := 'Your reviews are helping others! You''ve received 10 helpful votes.';
      v_image := '/png/restaurants.png';
      v_image_alt := '10 helpful votes milestone';
      v_link := '/profile';
      PERFORM create_gamification_notification(v_user_id, v_title, v_message, v_image, v_image_alt, v_link);
    
    WHEN v_total_helpful_votes = 50 THEN
      v_title := '👏 50 Helpful Votes!';
      v_message := 'Amazing! Your reviews have been marked helpful 50 times. Keep up the great work!';
      v_image := '/png/restaurants.png';
      v_image_alt := '50 helpful votes milestone';
      v_link := '/profile';
      PERFORM create_gamification_notification(v_user_id, v_title, v_message, v_image, v_image_alt, v_link);
    
    WHEN v_total_helpful_votes = 100 THEN
      v_title := '🎯 100 Helpful Votes!';
      v_message := 'Outstanding! You''ve reached 100 helpful votes. Your insights are truly valuable!';
      v_image := '/png/restaurants.png';
      v_image_alt := '100 helpful votes milestone';
      v_link := '/profile';
      PERFORM create_gamification_notification(v_user_id, v_title, v_message, v_image, v_image_alt, v_link);
    
    WHEN v_total_helpful_votes = 250 THEN
      v_title := '🏅 250 Helpful Votes!';
      v_message := 'Incredible! 250 helpful votes. You''re a trusted voice in the community!';
      v_image := '/png/restaurants.png';
      v_image_alt := '250 helpful votes milestone';
      v_link := '/profile';
      PERFORM create_gamification_notification(v_user_id, v_title, v_message, v_image, v_image_alt, v_link);
    
    WHEN v_total_helpful_votes = 500 THEN
      v_title := '💎 500 Helpful Votes!';
      v_message := 'Legendary! 500 helpful votes. You''re a sayso community hero!';
      v_image := '/png/restaurants.png';
      v_image_alt := '500 helpful votes milestone';
      v_link := '/profile';
      PERFORM create_gamification_notification(v_user_id, v_title, v_message, v_image, v_image_alt, v_link);
    
    WHEN v_total_helpful_votes = 1000 THEN
      v_title := '👑 1000 Helpful Votes!';
      v_message := 'Phenomenal! 1000 helpful votes is an extraordinary achievement. You''re a sayso legend!';
      v_image := '/png/restaurants.png';
      v_image_alt := '1000 helpful votes milestone';
      v_link := '/profile';
      PERFORM create_gamification_notification(v_user_id, v_title, v_message, v_image, v_image_alt, v_link);
    
    ELSE
      -- No milestone reached
      NULL;
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Create triggers
-- ============================================

-- Trigger: Check review milestones after a review is created
DROP TRIGGER IF EXISTS trigger_check_review_milestones ON reviews;
CREATE TRIGGER trigger_check_review_milestones
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION check_review_milestones();

-- Trigger: Check helpful votes milestones after a helpful vote is added
-- Note: This trigger fires when a new helpful vote is inserted
DROP TRIGGER IF EXISTS trigger_check_helpful_votes_milestones ON review_helpful_votes;
CREATE TRIGGER trigger_check_helpful_votes_milestones
  AFTER INSERT ON review_helpful_votes
  FOR EACH ROW
  EXECUTE FUNCTION check_helpful_votes_milestones();

-- ============================================
-- Comments
-- ============================================
COMMENT ON FUNCTION create_gamification_notification IS 'Creates a gamification notification for a user';
COMMENT ON FUNCTION check_review_milestones IS 'Checks if a user has reached a review milestone and creates a notification';
COMMENT ON FUNCTION check_helpful_votes_milestones IS 'Checks if a user has reached a helpful votes milestone and creates a notification';

