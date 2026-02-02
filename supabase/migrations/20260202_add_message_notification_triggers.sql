-- ============================================
-- Message Notification Triggers
-- ============================================
-- Creates a persistent notification when a new message is received:
-- - Determines recipient (the conversation participant who is NOT the sender)
-- - Uses business name when sender is the business owner
-- ============================================

-- Update the type CHECK constraint to include 'message'
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'review', 'business', 'user', 'highlyRated', 'gamification',
    'otp_sent', 'otp_verified', 'claim_status_changed', 'docs_requested', 'docs_received',
    'message'
  ));


-- Helper function to insert a message-type notification
CREATE OR REPLACE FUNCTION create_message_notification(
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
    'message',
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


-- Trigger function: notify recipient when a new message is sent
CREATE OR REPLACE FUNCTION notify_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation RECORD;
  v_business RECORD;
  v_sender_name TEXT;
  v_recipient_id UUID;
  v_link TEXT;
  v_preview TEXT;
BEGIN
  -- Look up the conversation
  SELECT id, user_id, owner_id, business_id
  INTO v_conversation
  FROM conversations
  WHERE id = NEW.conversation_id;

  IF v_conversation IS NULL THEN
    RETURN NEW;
  END IF;

  -- Determine recipient (the other participant)
  IF NEW.sender_id = v_conversation.user_id THEN
    v_recipient_id := v_conversation.owner_id;
  ELSIF NEW.sender_id = v_conversation.owner_id THEN
    v_recipient_id := v_conversation.user_id;
  ELSE
    -- Sender not part of conversation (shouldn't happen with RLS)
    RETURN NEW;
  END IF;

  -- Look up business info if linked
  IF v_conversation.business_id IS NOT NULL THEN
    SELECT id, name, image_url
    INTO v_business
    FROM businesses
    WHERE id = v_conversation.business_id;
  END IF;

  -- Determine sender display name:
  -- If sender is the owner and business exists, use business name
  -- Otherwise use profile display_name
  IF NEW.sender_id = v_conversation.owner_id AND v_business IS NOT NULL THEN
    v_sender_name := v_business.name;
  ELSE
    SELECT COALESCE(display_name, 'Someone')
    INTO v_sender_name
    FROM profiles
    WHERE user_id = NEW.sender_id;

    IF v_sender_name IS NULL THEN
      v_sender_name := 'Someone';
    END IF;
  END IF;

  -- Build link to conversation
  v_link := '/dm?conversation=' || v_conversation.id::TEXT;

  -- Truncate message preview to 80 chars
  v_preview := LEFT(NEW.content, 80);
  IF LENGTH(NEW.content) > 80 THEN
    v_preview := v_preview || '...';
  END IF;

  -- Create notification for the recipient
  PERFORM create_message_notification(
    v_recipient_id,
    'New Message',
    v_sender_name || ': ' || v_preview,
    CASE WHEN v_business IS NOT NULL THEN v_business.image_url ELSE NULL END,
    CASE WHEN v_business IS NOT NULL THEN v_business.name ELSE NULL END,
    v_link
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Register trigger
DROP TRIGGER IF EXISTS trigger_notify_on_new_message ON messages;
CREATE TRIGGER trigger_notify_on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_new_message();


-- Documentation
COMMENT ON FUNCTION create_message_notification IS 'Helper: inserts a message-type notification into the notifications table';
COMMENT ON FUNCTION notify_on_new_message IS 'Trigger: notifies the recipient when a new message is sent in a conversation';
