-- =============================================
-- BADGE STATS RPC FUNCTION
-- =============================================
-- Provides aggregate stats needed for badge rule evaluation

CREATE OR REPLACE FUNCTION public.get_user_badge_stats(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stats JSONB;
BEGIN
  -- Aggregate all badge-relevant stats in one query
  WITH review_stats AS (
    SELECT
      COUNT(DISTINCT r.id) as total_reviews,
      COUNT(DISTINCT r.business_id) as total_businesses,
      COUNT(DISTINCT b.category) as categories_reviewed,
      COUNT(DISTINCT CASE WHEN rp.photo_url IS NOT NULL THEN rp.id END) as total_photos,
      COALESCE(SUM(r.helpful_count), 0) as total_helpful_votes,
      -- Category coverage (reviews per category)
      jsonb_object_agg(
        COALESCE(b.category, 'unknown'),
        COUNT(DISTINCT r.id)
      ) FILTER (WHERE b.category IS NOT NULL) as category_counts,
      -- Check for same business reviewed twice
      BOOL_OR(business_review_count > 1) as has_repeat_business,
      -- First review check (per business)
      COUNT(DISTINCT CASE WHEN r.is_first_review THEN r.business_id END) as first_review_count,
      -- Underrated businesses (< 3 reviews)
      COUNT(DISTINCT CASE
        WHEN b.total_reviews < 3 THEN r.business_id
      END) as underrated_business_count,
      -- Photos with helpful votes
      COUNT(DISTINCT CASE
        WHEN rp.photo_url IS NOT NULL AND r.helpful_count >= 3
        THEN r.id
      END) as photos_with_helpful_votes
    FROM reviews r
    LEFT JOIN businesses b ON r.business_id = b.id
    LEFT JOIN review_photos rp ON r.id = rp.review_id
    LEFT JOIN LATERAL (
      SELECT COUNT(*) as business_review_count
      FROM reviews r2
      WHERE r2.business_id = r.business_id
        AND r2.user_id = p_user_id
    ) repeat_check ON true
    WHERE r.user_id = p_user_id
      AND r.deleted_at IS NULL
  ),
  subcategory_stats AS (
    SELECT
      jsonb_object_agg(
        COALESCE(bs.subcategory_key, 'unknown'),
        COUNT(DISTINCT r.id)
      ) FILTER (WHERE bs.subcategory_key IS NOT NULL) as subcategory_counts
    FROM reviews r
    LEFT JOIN businesses b ON r.business_id = b.id
    LEFT JOIN business_subcategories bs ON b.id = bs.business_id
    WHERE r.user_id = p_user_id
      AND r.deleted_at IS NULL
  ),
  suburb_stats AS (
    SELECT
      jsonb_object_agg(
        COALESCE(b.suburb, 'unknown'),
        COUNT(DISTINCT r.id)
      ) FILTER (WHERE b.suburb IS NOT NULL) as suburb_counts,
      MAX(COUNT(DISTINCT r.id)) as max_suburb_reviews
    FROM reviews r
    LEFT JOIN businesses b ON r.business_id = b.id
    WHERE r.user_id = p_user_id
      AND r.deleted_at IS NULL
    GROUP BY b.suburb
  ),
  streak_stats AS (
    -- Calculate current streak
    SELECT
      COALESCE(MAX(streak_length), 0) as current_streak,
      -- Check if posted weekly for a month (4 weeks)
      CASE
        WHEN COUNT(DISTINCT DATE_TRUNC('week', r.created_at)) >= 4
          AND MAX(r.created_at) >= NOW() - INTERVAL '30 days'
        THEN true
        ELSE false
      END as has_monthly_weekly_streak
    FROM reviews r
    WHERE r.user_id = p_user_id
      AND r.deleted_at IS NULL
      AND r.created_at >= NOW() - INTERVAL '30 days'
    LEFT JOIN LATERAL (
      -- Calculate streak length
      WITH RECURSIVE daily_reviews AS (
        SELECT
          DATE(created_at) as review_date,
          ROW_NUMBER() OVER (ORDER BY DATE(created_at) DESC) as rn
        FROM reviews
        WHERE user_id = p_user_id
          AND deleted_at IS NULL
        GROUP BY DATE(created_at)
      ),
      streak_calc AS (
        SELECT
          review_date,
          review_date - rn * INTERVAL '1 day' as streak_group,
          rn
        FROM daily_reviews
      )
      SELECT COUNT(*) as streak_length
      FROM streak_calc
      WHERE streak_group = (
        SELECT streak_group
        FROM streak_calc
        ORDER BY review_date DESC
        LIMIT 1
      )
    ) streak_calc ON true
  )
  SELECT jsonb_build_object(
    'total_reviews', rs.total_reviews,
    'total_businesses', rs.total_businesses,
    'categories_reviewed', rs.categories_reviewed,
    'total_photos', rs.total_photos,
    'total_helpful_votes', rs.total_helpful_votes,
    'category_counts', COALESCE(rs.category_counts, '{}'::jsonb),
    'subcategory_counts', COALESCE(ss.subcategory_counts, '{}'::jsonb),
    'suburb_counts', COALESCE(subs.suburb_counts, '{}'::jsonb),
    'max_suburb_reviews', COALESCE(subs.max_suburb_reviews, 0),
    'has_repeat_business', rs.has_repeat_business,
    'first_review_count', rs.first_review_count,
    'underrated_business_count', rs.underrated_business_count,
    'photos_with_helpful_votes', rs.photos_with_helpful_votes,
    'current_streak', COALESCE(strk.current_streak, 0),
    'has_monthly_weekly_streak', COALESCE(strk.has_monthly_weekly_streak, false)
  ) INTO v_stats
  FROM review_stats rs
  CROSS JOIN subcategory_stats ss
  CROSS JOIN suburb_stats subs
  CROSS JOIN streak_stats strk;

  RETURN v_stats;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_badge_stats(UUID) TO authenticated;

-- =============================================
-- BADGE EVALUATION HELPER FUNCTION
-- =============================================
-- Checks if a user qualifies for a specific badge

CREATE OR REPLACE FUNCTION public.check_badge_earned(
  p_user_id UUID,
  p_badge_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_badge RECORD;
  v_stats JSONB;
  v_earned BOOLEAN := false;
  v_category_count INTEGER;
  v_subcategory_count INTEGER;
BEGIN
  -- Get badge definition
  SELECT * INTO v_badge
  FROM public.badges
  WHERE id = p_badge_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Get user stats
  v_stats := public.get_user_badge_stats(p_user_id);

  -- Evaluate based on rule type
  CASE v_badge.rule_type
    WHEN 'review_count' THEN
      -- Check if specific category/subcategory or overall
      IF v_badge.category_key IS NOT NULL THEN
        v_category_count := COALESCE((v_stats->'category_counts'->>v_badge.category_key)::INTEGER, 0);

        IF v_badge.subcategory_key IS NOT NULL THEN
          v_subcategory_count := COALESCE((v_stats->'subcategory_counts'->>v_badge.subcategory_key)::INTEGER, 0);
          v_earned := v_subcategory_count >= v_badge.threshold;
        ELSE
          v_earned := v_category_count >= v_badge.threshold;
        END IF;
      ELSE
        v_earned := (v_stats->>'total_reviews')::INTEGER >= v_badge.threshold;
      END IF;

    WHEN 'category_count' THEN
      v_earned := (v_stats->>'categories_reviewed')::INTEGER >= v_badge.threshold;

    WHEN 'category_coverage' THEN
      -- Check if user has reviewed businesses in X different categories with threshold reviews
      v_earned := (v_stats->>'categories_reviewed')::INTEGER >= v_badge.threshold;

      -- For World Wanderer and Full Spectrum, check if multiple reviews per category
      IF v_badge.id = 'explorer_world_wanderer' THEN
        -- All categories must have > 1 review
        v_earned := (
          SELECT COUNT(*) = v_badge.threshold
          FROM jsonb_each_text(v_stats->'category_counts')
          WHERE value::INTEGER > 1
        );
      ELSIF v_badge.id = 'explorer_full_spectrum' THEN
        -- 50+ reviews across 8+ categories
        v_earned := (
          (v_stats->>'total_reviews')::INTEGER >= 50
          AND (v_stats->>'categories_reviewed')::INTEGER >= 8
        );
      END IF;

    WHEN 'photo_count' THEN
      v_earned := (v_stats->>'total_photos')::INTEGER >= v_badge.threshold;

    WHEN 'helpful_votes' THEN
      v_earned := (v_stats->>'total_helpful_votes')::INTEGER >= v_badge.threshold;

    WHEN 'streak' THEN
      v_earned := (v_stats->>'current_streak')::INTEGER >= v_badge.threshold;

    WHEN 'first_review' THEN
      v_earned := (v_stats->>'first_review_count')::INTEGER >= v_badge.threshold;

    WHEN 'same_business_twice' THEN
      v_earned := (v_stats->>'has_repeat_business')::BOOLEAN;

    WHEN 'suburb_count' THEN
      v_earned := (v_stats->>'max_suburb_reviews')::INTEGER >= v_badge.threshold;

    WHEN 'underrated_count' THEN
      v_earned := (v_stats->>'underrated_business_count')::INTEGER >= v_badge.threshold;

    WHEN 'photo_with_votes' THEN
      v_earned := (v_stats->>'photos_with_helpful_votes')::INTEGER >= v_badge.threshold;

    WHEN 'weekly_for_month' THEN
      v_earned := (v_stats->>'has_monthly_weekly_streak')::BOOLEAN;

    ELSE
      v_earned := false;
  END CASE;

  RETURN v_earned;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_badge_earned(UUID, TEXT) TO authenticated;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================
