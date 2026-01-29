-- Skip user_stats updates for anonymous (guest) reviews.
-- Anonymous reviews have user_id NULL; user_stats.user_id is NOT NULL, so the
-- trigger must not call update_user_stats when user_id is null.

CREATE OR REPLACE FUNCTION trigger_update_user_stats_on_review()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.user_id IS NOT NULL THEN
      PERFORM update_user_stats(NEW.user_id);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.user_id IS NOT NULL THEN
      PERFORM update_user_stats(OLD.user_id);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      IF OLD.user_id IS NOT NULL THEN
        PERFORM update_user_stats(OLD.user_id);
      END IF;
      IF NEW.user_id IS NOT NULL THEN
        PERFORM update_user_stats(NEW.user_id);
      END IF;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION trigger_update_user_stats_on_review IS 'Trigger function to update user stats when reviews change; skips anonymous (user_id NULL) rows.';
