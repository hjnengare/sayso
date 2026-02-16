-- Fix percentile calculations to match both old and new tag formats.
--
-- The deal-breakers API previously returned labels like "Punctuality",
-- "Friendliness", "Trustworthiness", "Value for Money" which got saved
-- as review tags. But the RPC only matched "On Time", "Friendly",
-- "Trustworthy", "Good Value". This migration updates the RPC to accept
-- both formats, and also fixes the category comparison to use the new
-- primary_category_slug column instead of the deprecated category column.

CREATE OR REPLACE FUNCTION public.update_business_stats(p_business_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_reviews INTEGER;
  average_rating DECIMAL(3,2);
  rating_dist JSONB;
  percentiles JSONB;
  business_category TEXT;

  -- Tag-based metrics
  punctuality_score DECIMAL := 50.0;
  friendliness_score DECIMAL := 50.0;
  trustworthiness_score DECIMAL := 50.0;
  cost_effectiveness_score DECIMAL := 50.0;

  -- Category comparison metrics
  category_avg_rating DECIMAL;
  category_business_count INTEGER;
  category_percentile_rank DECIMAL := 50.0;

  -- Category-specific tag percentile rankings
  category_punctuality_percentile DECIMAL := 50.0;
  category_friendliness_percentile DECIMAL := 50.0;
  category_trustworthiness_percentile DECIMAL := 50.0;
  category_cost_effectiveness_percentile DECIMAL := 50.0;

  -- Final percentile calculations
  punctuality_percentile DECIMAL;
  friendliness_percentile DECIMAL;
  trustworthiness_percentile DECIMAL;
  cost_effectiveness_percentile DECIMAL;
BEGIN
  -- Get business category for category-specific comparisons
  -- Prefer primary_category_slug (new schema), fall back to category (legacy)
  SELECT COALESCE(primary_category_slug, category) INTO business_category
  FROM businesses
  WHERE id = p_business_id;

  -- Aggregate review data
  SELECT
    COUNT(*)::INTEGER,
    COALESCE(ROUND(AVG(rating)::numeric, 2), 0)
  INTO
    total_reviews,
    average_rating
  FROM reviews
  WHERE business_id = p_business_id;

  SELECT jsonb_build_object(
    '1', COUNT(*) FILTER (WHERE rating = 1),
    '2', COUNT(*) FILTER (WHERE rating = 2),
    '3', COUNT(*) FILTER (WHERE rating = 3),
    '4', COUNT(*) FILTER (WHERE rating = 4),
    '5', COUNT(*) FILTER (WHERE rating = 5)
  )
  INTO rating_dist
  FROM reviews
  WHERE business_id = p_business_id;

  -- Default distribution when no reviews exist
  rating_dist := COALESCE(
    rating_dist,
    jsonb_build_object('1', 0, '2', 0, '3', 0, '4', 0, '5', 0)
  );

  -- If no reviews exist, set defaults and skip percentile calculations
  IF total_reviews = 0 THEN
    average_rating := 0;
    percentiles := jsonb_build_object(
      'punctuality', 0,
      'friendliness', 0,
      'trustworthiness', 0,
      'cost-effectiveness', 0
    );
  ELSE
    -- ============================================
    -- TAG-BASED PERCENTILE CALCULATIONS
    -- ============================================
    -- Match both old labels (Punctuality, Friendliness, etc.) and
    -- new labels (On Time, Friendly, etc.) for backwards compatibility.

  -- Punctuality: "On Time" (new) or "Punctuality" (old)
  SELECT
    CASE
      WHEN COUNT(*) = 0 THEN 50.0
      ELSE GREATEST(0, LEAST(100,
        ROUND((COUNT(*) FILTER (WHERE 'On Time' = ANY(tags) OR 'Punctuality' = ANY(tags))::DECIMAL / COUNT(*)::DECIMAL) * 100, 0)
      ))
    END
  INTO punctuality_score
  FROM reviews
  WHERE business_id = p_business_id;

  -- Friendliness: "Friendly" (new) or "Friendliness" (old)
  SELECT
    CASE
      WHEN COUNT(*) = 0 THEN 50.0
      ELSE GREATEST(0, LEAST(100,
        ROUND((COUNT(*) FILTER (WHERE 'Friendly' = ANY(tags) OR 'Friendliness' = ANY(tags))::DECIMAL / COUNT(*)::DECIMAL) * 100, 0)
      ))
    END
  INTO friendliness_score
  FROM reviews
  WHERE business_id = p_business_id;

  -- Trustworthiness: "Trustworthy" (new) or "Trustworthiness" (old)
  SELECT
    CASE
      WHEN COUNT(*) = 0 THEN 50.0
      ELSE GREATEST(0, LEAST(100,
        ROUND((COUNT(*) FILTER (WHERE 'Trustworthy' = ANY(tags) OR 'Trustworthiness' = ANY(tags))::DECIMAL / COUNT(*)::DECIMAL) * 100, 0)
      ))
    END
  INTO trustworthiness_score
  FROM reviews
  WHERE business_id = p_business_id;

  -- Cost Effectiveness: "Good Value" (new) or "Value for Money" (old)
  SELECT
    CASE
      WHEN COUNT(*) = 0 THEN 50.0
      ELSE GREATEST(0, LEAST(100,
        ROUND((COUNT(*) FILTER (WHERE 'Good Value' = ANY(tags) OR 'Value for Money' = ANY(tags))::DECIMAL / COUNT(*)::DECIMAL) * 100, 0)
      ))
    END
  INTO cost_effectiveness_score
  FROM reviews
  WHERE business_id = p_business_id;

  -- ============================================
  -- TRUE PERCENTILE RANKING (vs Category)
  -- ============================================
  -- Use COALESCE(primary_category_slug, category) for category matching

  IF business_category IS NOT NULL AND total_reviews > 0 THEN
    SELECT
      COALESCE(ROUND(AVG(bs.average_rating)::numeric, 2), 0),
      COUNT(DISTINCT b.id)::INTEGER
    INTO category_avg_rating, category_business_count
    FROM businesses b
    LEFT JOIN business_stats bs ON b.id = bs.business_id
    WHERE COALESCE(b.primary_category_slug, b.category) = business_category
      AND b.status = 'active'
      AND bs.total_reviews > 0;

    SELECT
      CASE
        WHEN category_business_count <= 1 THEN 50.0
        ELSE GREATEST(0, LEAST(100,
          ROUND(
            ((
              SELECT COUNT(*)::DECIMAL
              FROM businesses b2
              LEFT JOIN business_stats bs2 ON b2.id = bs2.business_id
              WHERE COALESCE(b2.primary_category_slug, b2.category) = business_category
                AND b2.status = 'active'
                AND b2.id != p_business_id
                AND bs2.total_reviews > 0
                AND bs2.average_rating < average_rating
            ) / GREATEST(category_business_count - 1, 1)::DECIMAL) * 100,
            0
          )
        ))
      END
    INTO category_percentile_rank;

    IF category_percentile_rank IS NULL THEN
      category_percentile_rank := 50.0;
    END IF;
  ELSE
    category_percentile_rank := 50.0;
  END IF;

  -- ============================================
  -- CATEGORY-SPECIFIC TAG PERCENTILE RANKINGS
  -- ============================================

  IF business_category IS NOT NULL AND category_business_count > 1 THEN
    -- Punctuality percentile
    WITH category_tag_scores AS (
      SELECT
        b.id as business_id,
        CASE
          WHEN COUNT(r.id) = 0 THEN 0
          ELSE (COUNT(*) FILTER (WHERE 'On Time' = ANY(r.tags) OR 'Punctuality' = ANY(r.tags))::DECIMAL / COUNT(r.id)::DECIMAL) * 100
        END as punctuality_tag_score
      FROM businesses b
      LEFT JOIN reviews r ON r.business_id = b.id
      LEFT JOIN business_stats bs ON b.id = bs.business_id
      WHERE COALESCE(b.primary_category_slug, b.category) = business_category
        AND b.status = 'active'
        AND b.id != p_business_id
        AND bs.total_reviews > 0
      GROUP BY b.id
    )
    SELECT
      GREATEST(0, LEAST(100,
        ROUND(
          ((SELECT COUNT(*)::DECIMAL
            FROM category_tag_scores
            WHERE punctuality_tag_score < punctuality_score
          ) / GREATEST(category_business_count - 1, 1)::DECIMAL) * 100,
          0
        )
      ))
    INTO category_punctuality_percentile;

    -- Friendliness percentile
    WITH category_tag_scores AS (
      SELECT
        b.id as business_id,
        CASE
          WHEN COUNT(r.id) = 0 THEN 0
          ELSE (COUNT(*) FILTER (WHERE 'Friendly' = ANY(r.tags) OR 'Friendliness' = ANY(r.tags))::DECIMAL / COUNT(r.id)::DECIMAL) * 100
        END as friendliness_tag_score
      FROM businesses b
      LEFT JOIN reviews r ON r.business_id = b.id
      LEFT JOIN business_stats bs ON b.id = bs.business_id
      WHERE COALESCE(b.primary_category_slug, b.category) = business_category
        AND b.status = 'active'
        AND b.id != p_business_id
        AND bs.total_reviews > 0
      GROUP BY b.id
    )
    SELECT
      GREATEST(0, LEAST(100,
        ROUND(
          ((SELECT COUNT(*)::DECIMAL
            FROM category_tag_scores
            WHERE friendliness_tag_score < friendliness_score
          ) / GREATEST(category_business_count - 1, 1)::DECIMAL) * 100,
          0
        )
      ))
    INTO category_friendliness_percentile;

    -- Trustworthiness percentile
    WITH category_tag_scores AS (
      SELECT
        b.id as business_id,
        CASE
          WHEN COUNT(r.id) = 0 THEN 0
          ELSE (COUNT(*) FILTER (WHERE 'Trustworthy' = ANY(r.tags) OR 'Trustworthiness' = ANY(r.tags))::DECIMAL / COUNT(r.id)::DECIMAL) * 100
        END as trustworthiness_tag_score
      FROM businesses b
      LEFT JOIN reviews r ON r.business_id = b.id
      LEFT JOIN business_stats bs ON b.id = bs.business_id
      WHERE COALESCE(b.primary_category_slug, b.category) = business_category
        AND b.status = 'active'
        AND b.id != p_business_id
        AND bs.total_reviews > 0
      GROUP BY b.id
    )
    SELECT
      GREATEST(0, LEAST(100,
        ROUND(
          ((SELECT COUNT(*)::DECIMAL
            FROM category_tag_scores
            WHERE trustworthiness_tag_score < trustworthiness_score
          ) / GREATEST(category_business_count - 1, 1)::DECIMAL) * 100,
          0
        )
      ))
    INTO category_trustworthiness_percentile;

    -- Cost Effectiveness percentile
    WITH category_tag_scores AS (
      SELECT
        b.id as business_id,
        CASE
          WHEN COUNT(r.id) = 0 THEN 0
          ELSE (COUNT(*) FILTER (WHERE 'Good Value' = ANY(r.tags) OR 'Value for Money' = ANY(r.tags))::DECIMAL / COUNT(r.id)::DECIMAL) * 100
        END as cost_effectiveness_tag_score
      FROM businesses b
      LEFT JOIN reviews r ON r.business_id = b.id
      LEFT JOIN business_stats bs ON b.id = bs.business_id
      WHERE COALESCE(b.primary_category_slug, b.category) = business_category
        AND b.status = 'active'
        AND b.id != p_business_id
        AND bs.total_reviews > 0
      GROUP BY b.id
    )
    SELECT
      GREATEST(0, LEAST(100,
        ROUND(
          ((SELECT COUNT(*)::DECIMAL
            FROM category_tag_scores
            WHERE cost_effectiveness_tag_score < cost_effectiveness_score
          ) / GREATEST(category_business_count - 1, 1)::DECIMAL) * 100,
          0
        )
      ))
    INTO category_cost_effectiveness_percentile;

    -- Use null coalescing for defaults
    category_punctuality_percentile := COALESCE(category_punctuality_percentile, 50.0);
    category_friendliness_percentile := COALESCE(category_friendliness_percentile, 50.0);
    category_trustworthiness_percentile := COALESCE(category_trustworthiness_percentile, 50.0);
    category_cost_effectiveness_percentile := COALESCE(category_cost_effectiveness_percentile, 50.0);
  END IF;

  -- ============================================
  -- FINAL PERCENTILE CALCULATION
  -- ============================================
  -- 60% tag score + 40% category tag percentile

  punctuality_percentile := GREATEST(0, LEAST(100,
    ROUND((punctuality_score * 0.6 + category_punctuality_percentile * 0.4), 0)
  ));

  friendliness_percentile := GREATEST(0, LEAST(100,
    ROUND((friendliness_score * 0.6 + category_friendliness_percentile * 0.4), 0)
  ));

  trustworthiness_percentile := GREATEST(0, LEAST(100,
    ROUND((trustworthiness_score * 0.6 + category_trustworthiness_percentile * 0.4), 0)
  ));

  cost_effectiveness_percentile := GREATEST(0, LEAST(100,
    ROUND((cost_effectiveness_score * 0.6 + category_cost_effectiveness_percentile * 0.4), 0)
  ));

  percentiles := jsonb_build_object(
    'punctuality', punctuality_percentile,
    'friendliness', friendliness_percentile,
    'trustworthiness', trustworthiness_percentile,
    'cost-effectiveness', cost_effectiveness_percentile
  );

  END IF; -- End of IF total_reviews > 0 block

  INSERT INTO business_stats (
    business_id,
    total_reviews,
    average_rating,
    rating_distribution,
    percentiles,
    updated_at
  )
  VALUES (
    p_business_id,
    total_reviews,
    average_rating,
    rating_dist,
    percentiles,
    NOW()
  )
  ON CONFLICT (business_id) DO UPDATE
  SET
    total_reviews = EXCLUDED.total_reviews,
    average_rating = EXCLUDED.average_rating,
    rating_distribution = EXCLUDED.rating_distribution,
    percentiles = EXCLUDED.percentiles,
    updated_at = NOW();
END;
$$;

-- Allow authenticated and service roles to execute the function
GRANT EXECUTE ON FUNCTION public.update_business_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_business_stats(UUID) TO service_role;

-- Refresh schema cache so PostgREST sees the function
NOTIFY pgrst, 'reload schema';
