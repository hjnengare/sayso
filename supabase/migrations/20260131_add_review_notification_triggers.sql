-- ============================================
-- Review Notification Triggers
-- ============================================
-- Creates persistent notifications for:
-- 1. New review posted → notify business owner
-- 2. New reply posted → notify review author + business owner
-- ============================================

-- Helper function to insert a review-type notification
CREATE OR REPLACE FUNCTION create_review_notification(
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
    'review',
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
-- 1. New review → notify business owner
-- ============================================
CREATE OR REPLACE FUNCTION notify_owner_on_new_review()
RETURNS TRIGGER AS $$
DECLARE
  v_business RECORD;
  v_reviewer_name TEXT;
  v_stars TEXT;
  v_link TEXT;
BEGIN
  -- Look up the business (need owner_id, name)
  SELECT id, name, owner_id
  INTO v_business
  FROM businesses
  WHERE id = NEW.business_id;

  -- Skip if business not found or has no owner
  IF v_business IS NULL OR v_business.owner_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Skip if the reviewer IS the business owner (self-review)
  IF NEW.user_id = v_business.owner_id THEN
    RETURN NEW;
  END IF;

  -- Get reviewer display name
  SELECT COALESCE(display_name, 'Someone')
  INTO v_reviewer_name
  FROM profiles
  WHERE user_id = NEW.user_id;

  IF v_reviewer_name IS NULL THEN
    v_reviewer_name := 'Someone';
  END IF;

  -- Build star text
  v_stars := NEW.rating::TEXT || '★';

  -- Link to the owner's reviews dashboard
  v_link := '/my-businesses/businesses/' || v_business.id::TEXT || '/reviews';

  -- Create notification for the business owner
  PERFORM create_review_notification(
    v_business.owner_id,
    'New Review',
    v_reviewer_name || ' left a ' || v_stars || ' review on ' || v_business.name,
    NULL,
    NULL,
    v_link
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- 2. New reply → notify review author + owner
-- ============================================
CREATE OR REPLACE FUNCTION notify_on_new_reply()
RETURNS TRIGGER AS $$
DECLARE
  v_review RECORD;
  v_business RECORD;
  v_replier_name TEXT;
  v_author_link TEXT;
  v_owner_link TEXT;
BEGIN
  -- Look up the parent review
  SELECT id, user_id, business_id
  INTO v_review
  FROM reviews
  WHERE id = NEW.review_id;

  IF v_review IS NULL THEN
    RETURN NEW;
  END IF;

  -- Look up the business
  SELECT id, name, slug, owner_id
  INTO v_business
  FROM businesses
  WHERE id = v_review.business_id;

  IF v_business IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get replier display name
  SELECT COALESCE(display_name, 'Someone')
  INTO v_replier_name
  FROM profiles
  WHERE user_id = NEW.user_id;

  IF v_replier_name IS NULL THEN
    v_replier_name := 'Someone';
  END IF;

  -- Build links
  v_author_link := '/business/' || COALESCE(v_business.slug, v_business.id::TEXT);
  v_owner_link  := '/my-businesses/businesses/' || v_business.id::TEXT || '/reviews';

  -- Notify review author (skip if replier IS the author)
  IF NEW.user_id != v_review.user_id THEN
    PERFORM create_review_notification(
      v_review.user_id,
      'New Reply',
      v_replier_name || ' replied to your review on ' || v_business.name,
      NULL,
      NULL,
      v_author_link
    );
  END IF;

  -- Notify business owner (skip if replier IS the owner,
  -- or if owner IS the review author — they already got notified above)
  IF v_business.owner_id IS NOT NULL
     AND NEW.user_id != v_business.owner_id
     AND v_business.owner_id != v_review.user_id
  THEN
    PERFORM create_review_notification(
      v_business.owner_id,
      'Reply on Review',
      v_replier_name || ' replied to a review on ' || v_business.name,
      NULL,
      NULL,
      v_owner_link
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- Register triggers
-- ============================================
DROP TRIGGER IF EXISTS trigger_notify_owner_on_new_review ON reviews;
CREATE TRIGGER trigger_notify_owner_on_new_review
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION notify_owner_on_new_review();

DROP TRIGGER IF EXISTS trigger_notify_on_new_reply ON review_replies;
CREATE TRIGGER trigger_notify_on_new_reply
  AFTER INSERT ON review_replies
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_new_reply();


-- ============================================
-- Documentation
-- ============================================
COMMENT ON FUNCTION create_review_notification IS 'Helper: inserts a review-type notification into the notifications table';
COMMENT ON FUNCTION notify_owner_on_new_review IS 'Trigger: notifies business owner when a new review is posted on their business';
COMMENT ON FUNCTION notify_on_new_reply IS 'Trigger: notifies review author and business owner when a reply is posted on a review';
