-- =============================================
-- Badge System Helper Functions
-- =============================================
-- Additional helper functions for badge management
-- =============================================

-- =============================================
-- 1. Function to manually check and award badges for a user
-- =============================================
-- Useful for backfilling badges or manual badge checks
CREATE OR REPLACE FUNCTION public.check_user_badges(p_user_id UUID)
RETURNS TABLE(awarded_badge_id TEXT, badge_name TEXT) AS $$
DECLARE
  v_review_count INTEGER;
  v_photo_count INTEGER;
  v_helpful_votes_received INTEGER;
  v_helpful_votes_total INTEGER;
  v_distinct_categories INTEGER;
  v_badge_record RECORD;
BEGIN
  -- Get comprehensive user stats
  SELECT 
    COUNT(DISTINCT r.id)::INTEGER,
    COUNT(DISTINCT ri.id)::INTEGER,
    COALESCE(SUM(r.helpful_count), 0)::INTEGER,
    COALESCE((SELECT COUNT(*)::INTEGER FROM review_helpful_votes rhv 
              INNER JOIN reviews r2 ON r2.id = rhv.review_id 
              WHERE r2.user_id = p_user_id), 0),
    COUNT(DISTINCT b.interest_id)::INTEGER
  INTO 
    v_review_count,
    v_photo_count,
    v_helpful_votes_received,
    v_helpful_votes_total,
    v_distinct_categories
  FROM reviews r
  LEFT JOIN review_images ri ON ri.review_id = r.id
  LEFT JOIN businesses b ON b.id = r.business_id
  WHERE r.user_id = p_user_id;

  -- Check all milestone and general badges
  FOR v_badge_record IN 
    SELECT * FROM public.badges
    WHERE (
      (rule_type = 'review_count' AND threshold IS NOT NULL AND v_review_count >= threshold)
      OR
      (rule_type = 'photo_count' AND threshold IS NOT NULL AND v_photo_count >= threshold)
      OR
      (rule_type = 'helpful_votes_received' AND threshold IS NOT NULL AND v_helpful_votes_received >= threshold)
      OR
      (rule_type = 'helpful_votes_total' AND threshold IS NOT NULL AND v_helpful_votes_total >= threshold)
      OR
      (rule_type = 'distinct_category_count' AND threshold IS NOT NULL AND v_distinct_categories >= threshold)
    )
  LOOP
    -- Check if user already has this badge
    IF NOT EXISTS (
      SELECT 1 FROM public.user_badges
      WHERE user_id = p_user_id AND badge_id = v_badge_record.id
    ) THEN
      -- Award the badge (using SECURITY DEFINER to bypass RLS)
      INSERT INTO public.user_badges (user_id, badge_id, awarded_at)
      VALUES (p_user_id, v_badge_record.id, NOW())
      ON CONFLICT (user_id, badge_id) DO NOTHING;
      
      -- Return the awarded badge
      RETURN QUERY SELECT v_badge_record.id, v_badge_record.name;
    END IF;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 2. Function to get user badges with details
-- =============================================
CREATE OR REPLACE FUNCTION public.get_user_badges(p_user_id UUID)
RETURNS TABLE(
  badge_id TEXT,
  badge_name TEXT,
  badge_description TEXT,
  badge_group TEXT,
  category_key TEXT,
  icon_name TEXT,
  awarded_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.name,
    b.description,
    b.badge_group,
    b.category_key,
    b.icon_name,
    ub.awarded_at
  FROM public.user_badges ub
  INNER JOIN public.badges b ON b.id = ub.badge_id
  WHERE ub.user_id = p_user_id
  ORDER BY ub.awarded_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 3. Function to get user badge progress
-- =============================================
CREATE OR REPLACE FUNCTION public.get_user_badge_progress(p_user_id UUID)
RETURNS TABLE(
  badge_id TEXT,
  badge_name TEXT,
  badge_description TEXT,
  badge_group TEXT,
  progress INTEGER,
  target INTEGER,
  percentage_complete NUMERIC,
  is_earned BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.name,
    b.description,
    b.badge_group,
    COALESCE(ubp.progress, 0)::INTEGER,
    COALESCE(ubp.target, b.threshold, 0)::INTEGER,
    CASE 
      WHEN COALESCE(ubp.target, b.threshold, 0) > 0 THEN
        ROUND((COALESCE(ubp.progress, 0)::NUMERIC / COALESCE(ubp.target, b.threshold, 1)::NUMERIC) * 100, 2)
      ELSE 0
    END AS percentage_complete,
    EXISTS (
      SELECT 1 FROM public.user_badges ub
      WHERE ub.user_id = p_user_id AND ub.badge_id = b.id
    ) AS is_earned
  FROM public.badges b
  LEFT JOIN public.user_badge_progress ubp ON ubp.badge_id = b.id AND ubp.user_id = p_user_id
  WHERE b.threshold IS NOT NULL
  ORDER BY b.badge_group, b.threshold;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 4. Function to get badge statistics for a user
-- =============================================
CREATE OR REPLACE FUNCTION public.get_user_badge_stats(p_user_id UUID)
RETURNS TABLE(
  total_badges INTEGER,
  badges_by_group JSONB,
  recent_badges JSONB
) AS $$
DECLARE
  v_total INTEGER;
  v_by_group JSONB;
  v_recent JSONB;
BEGIN
  -- Total badges
  SELECT COUNT(*)::INTEGER INTO v_total
  FROM public.user_badges
  WHERE user_id = p_user_id;

  -- Badges by group
  SELECT jsonb_object_agg(badge_group, count) INTO v_by_group
  FROM (
    SELECT b.badge_group, COUNT(*)::INTEGER as count
    FROM public.user_badges ub
    INNER JOIN public.badges b ON b.id = ub.badge_id
    WHERE ub.user_id = p_user_id
    GROUP BY b.badge_group
  ) subq;

  -- Recent badges (last 5)
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', b.id,
      'name', b.name,
      'description', b.description,
      'badge_group', b.badge_group,
      'awarded_at', ub.awarded_at
    ) ORDER BY ub.awarded_at DESC
  ) INTO v_recent
  FROM (
    SELECT ub.badge_id, ub.awarded_at
    FROM public.user_badges ub
    WHERE ub.user_id = p_user_id
    ORDER BY ub.awarded_at DESC
    LIMIT 5
  ) recent_ub
  INNER JOIN public.badges b ON b.id = recent_ub.badge_id;

  RETURN QUERY SELECT 
    COALESCE(v_total, 0)::INTEGER,
    COALESCE(v_by_group, '{}'::jsonb),
    COALESCE(v_recent, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 5. Grant execute permissions
-- =============================================
GRANT EXECUTE ON FUNCTION public.check_user_badges(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_badges(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_badge_progress(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_badge_stats(UUID) TO authenticated;

-- =============================================
-- 6. Comments
-- =============================================
COMMENT ON FUNCTION public.check_user_badges IS 'Manually check and award badges for a user. Useful for backfilling or manual badge checks.';
COMMENT ON FUNCTION public.get_user_badges IS 'Get all badges earned by a user with full badge details.';
COMMENT ON FUNCTION public.get_user_badge_progress IS 'Get progress for all badges (earned and in-progress) for a user.';
COMMENT ON FUNCTION public.get_user_badge_stats IS 'Get badge statistics for a user including total count, breakdown by group, and recent badges.';

