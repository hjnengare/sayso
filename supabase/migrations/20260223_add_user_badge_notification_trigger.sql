-- Badge-earned notification trigger for user_badges
-- Ensures notifications are created immediately when a badge row is inserted.
-- Uses existing create_badge_notification (dedup + SECURITY DEFINER).

-- Helper trigger function
CREATE OR REPLACE FUNCTION public.notify_badge_earned()
RETURNS TRIGGER AS $$
DECLARE
  v_badge RECORD;
BEGIN
  -- Look up badge metadata (name + icon)
  SELECT id, name, icon_path
  INTO v_badge
  FROM public.badges
  WHERE id = NEW.badge_id
  LIMIT 1;

  -- If badge definition missing, skip gracefully
  IF v_badge IS NULL THEN
    RAISE NOTICE '[notify_badge_earned] badge not found for %', NEW.badge_id;
    RETURN NEW;
  END IF;

  -- Create notification (function itself prevents duplicates per user/badge)
  PERFORM public.create_badge_notification(
    NEW.user_id,
    NEW.badge_id,
    v_badge.name,
    COALESCE(v_badge.icon_path, '/badges/default-badge.png')
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger registration
DROP TRIGGER IF EXISTS trigger_notify_badge_earned ON public.user_badges;
CREATE TRIGGER trigger_notify_badge_earned
  AFTER INSERT ON public.user_badges
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_badge_earned();

COMMENT ON TRIGGER trigger_notify_badge_earned ON public.user_badges IS
  'Creates badge_earned notifications immediately after badge award';
