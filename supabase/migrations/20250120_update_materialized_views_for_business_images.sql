-- Migration: Update materialized views to use business_images table instead of uploaded_images column
-- This must run BEFORE dropping the uploaded_images column

-- =============================================
-- STEP 1: Drop existing materialized views and functions (CASCADE)
-- =============================================

DROP MATERIALIZED VIEW IF EXISTS mv_top_rated_businesses CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_trending_businesses CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_new_businesses CASCADE;

-- =============================================
-- STEP 2: Recreate mv_top_rated_businesses using business_images table
-- =============================================

DO $$
DECLARE
  v_has_geo_columns BOOLEAN;
  v_create_view_sql TEXT;
BEGIN
  -- Check if latitude and longitude columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'businesses' 
    AND column_name = 'lat'
  ) INTO v_has_geo_columns;

  -- Build CREATE VIEW statement using business_images table
  IF v_has_geo_columns THEN
    v_create_view_sql := '
      CREATE MATERIALIZED VIEW mv_top_rated_businesses AS
      SELECT 
        b.id,
        b.name,
        b.category,
        b.location,
        b.image_url,
        (
          SELECT bi.url 
          FROM business_images bi 
          WHERE bi.business_id = b.id 
            AND bi.is_primary = true
          LIMIT 1
        ) AS primary_image_url,
        b.verified,
        b.price_range,
        b.badge,
        b.slug,
        b.lat AS latitude,
        b.lng AS longitude,
        bs.total_reviews,
        bs.average_rating,
        bs.percentiles,
        (bs.average_rating * LOG(bs.total_reviews + 1)) as weighted_score,
        b.created_at,
        NOW() as last_refreshed
      FROM businesses b
      INNER JOIN business_stats bs ON b.id = bs.business_id
      WHERE 
        b.status = ''active''
        AND bs.total_reviews >= 3
        AND bs.average_rating >= 3.5
      ORDER BY 
        weighted_score DESC,
        bs.average_rating DESC,
        bs.total_reviews DESC
      LIMIT 100';
  ELSE
    v_create_view_sql := '
      CREATE MATERIALIZED VIEW mv_top_rated_businesses AS
      SELECT 
        b.id,
        b.name,
        b.category,
        b.location,
        b.image_url,
        (
          SELECT bi.url 
          FROM business_images bi 
          WHERE bi.business_id = b.id 
            AND bi.is_primary = true
          LIMIT 1
        ) AS primary_image_url,
        b.verified,
        b.price_range,
        b.badge,
        b.slug,
        NULL::DOUBLE PRECISION as latitude,
        NULL::DOUBLE PRECISION as longitude,
        bs.total_reviews,
        bs.average_rating,
        bs.percentiles,
        (bs.average_rating * LOG(bs.total_reviews + 1)) as weighted_score,
        b.created_at,
        NOW() as last_refreshed
      FROM businesses b
      INNER JOIN business_stats bs ON b.id = bs.business_id
      WHERE 
        b.status = ''active''
        AND bs.total_reviews >= 3
        AND bs.average_rating >= 3.5
      ORDER BY 
        weighted_score DESC,
        bs.average_rating DESC,
        bs.total_reviews DESC
      LIMIT 100';
  END IF;

  EXECUTE v_create_view_sql;
END $$;

-- Recreate indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_top_rated_businesses_id 
  ON mv_top_rated_businesses(id);

CREATE INDEX IF NOT EXISTS idx_mv_top_rated_businesses_category 
  ON mv_top_rated_businesses(category);

CREATE INDEX IF NOT EXISTS idx_mv_top_rated_businesses_score 
  ON mv_top_rated_businesses(weighted_score DESC);

-- Recreate the get_top_rated_businesses function
CREATE OR REPLACE FUNCTION get_top_rated_businesses(
  p_limit INTEGER DEFAULT 20,
  p_category TEXT DEFAULT NULL
)
RETURNS SETOF mv_top_rated_businesses
LANGUAGE sql
STABLE
AS $$
  SELECT * 
  FROM mv_top_rated_businesses
  WHERE p_category IS NULL OR category = p_category
  ORDER BY weighted_score DESC
  LIMIT p_limit;
$$;

-- Grant permissions
GRANT SELECT ON mv_top_rated_businesses TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_top_rated_businesses(INTEGER, TEXT) TO authenticated, anon;

-- =============================================
-- STEP 3: Recreate mv_trending_businesses using business_images table
-- =============================================

DO $$
DECLARE
  v_has_geo_columns BOOLEAN;
  v_create_view_sql TEXT;
BEGIN
  -- Check if latitude and longitude columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'businesses' 
    AND column_name = 'lat'
  ) INTO v_has_geo_columns;

  -- Build CREATE VIEW statement using business_images table
  IF v_has_geo_columns THEN
    v_create_view_sql := '
      CREATE MATERIALIZED VIEW mv_trending_businesses AS
      SELECT 
        b.id,
        b.name,
        b.category,
        b.location,
        b.image_url,
        (
          SELECT bi.url 
          FROM business_images bi 
          WHERE bi.business_id = b.id 
            AND bi.is_primary = true
          LIMIT 1
        ) AS primary_image_url,
        b.verified,
        b.price_range,
        b.badge,
        b.slug,
        b.lat AS latitude,
        b.lng AS longitude,
        bs.total_reviews,
        bs.average_rating,
        bs.percentiles,
        COUNT(DISTINCT r.id) FILTER (WHERE r.created_at >= NOW() - INTERVAL ''30 days'') as recent_reviews_30d,
        COUNT(DISTINCT r.id) FILTER (WHERE r.created_at >= NOW() - INTERVAL ''7 days'') as recent_reviews_7d,
        AVG(r.rating) FILTER (WHERE r.created_at >= NOW() - INTERVAL ''30 days'') as recent_avg_rating,
        (
          COUNT(DISTINCT r.id) FILTER (WHERE r.created_at >= NOW() - INTERVAL ''7 days'') * 3 +
          COUNT(DISTINCT r.id) FILTER (WHERE r.created_at >= NOW() - INTERVAL ''30 days'') * 1 +
          COALESCE(AVG(r.rating) FILTER (WHERE r.created_at >= NOW() - INTERVAL ''30 days''), 0) * 5
        ) as trending_score,
        MAX(r.created_at) as last_review_date,
        NOW() as last_refreshed
      FROM businesses b
      INNER JOIN business_stats bs ON b.id = bs.business_id
      LEFT JOIN reviews r ON b.id = r.business_id
      WHERE 
        b.status = ''active''
        AND r.created_at >= NOW() - INTERVAL ''30 days''
      GROUP BY 
        b.id, b.name, b.category, b.location, b.image_url, b.verified, 
        b.price_range, b.badge, b.slug, b.lat, b.lng, 
        bs.total_reviews, bs.average_rating, bs.percentiles
      HAVING 
        COUNT(DISTINCT r.id) >= 2
      ORDER BY 
        trending_score DESC,
        recent_reviews_7d DESC,
        bs.average_rating DESC
      LIMIT 100';
  ELSE
    v_create_view_sql := '
      CREATE MATERIALIZED VIEW mv_trending_businesses AS
      SELECT 
        b.id,
        b.name,
        b.category,
        b.location,
        b.image_url,
        (
          SELECT bi.url 
          FROM business_images bi 
          WHERE bi.business_id = b.id 
            AND bi.is_primary = true
          LIMIT 1
        ) AS primary_image_url,
        b.verified,
        b.price_range,
        b.badge,
        b.slug,
        NULL::DOUBLE PRECISION as latitude,
        NULL::DOUBLE PRECISION as longitude,
        bs.total_reviews,
        bs.average_rating,
        bs.percentiles,
        COUNT(DISTINCT r.id) FILTER (WHERE r.created_at >= NOW() - INTERVAL ''30 days'') as recent_reviews_30d,
        COUNT(DISTINCT r.id) FILTER (WHERE r.created_at >= NOW() - INTERVAL ''7 days'') as recent_reviews_7d,
        AVG(r.rating) FILTER (WHERE r.created_at >= NOW() - INTERVAL ''30 days'') as recent_avg_rating,
        (
          COUNT(DISTINCT r.id) FILTER (WHERE r.created_at >= NOW() - INTERVAL ''7 days'') * 3 +
          COUNT(DISTINCT r.id) FILTER (WHERE r.created_at >= NOW() - INTERVAL ''30 days'') * 1 +
          COALESCE(AVG(r.rating) FILTER (WHERE r.created_at >= NOW() - INTERVAL ''30 days''), 0) * 5
        ) as trending_score,
        MAX(r.created_at) as last_review_date,
        NOW() as last_refreshed
      FROM businesses b
      INNER JOIN business_stats bs ON b.id = bs.business_id
      LEFT JOIN reviews r ON b.id = r.business_id
      WHERE 
        b.status = ''active''
        AND r.created_at >= NOW() - INTERVAL ''30 days''
      GROUP BY 
        b.id, b.name, b.category, b.location, b.image_url, b.verified, 
        b.price_range, b.badge, b.slug, 
        bs.total_reviews, bs.average_rating, bs.percentiles
      HAVING 
        COUNT(DISTINCT r.id) >= 2
      ORDER BY 
        trending_score DESC,
        recent_reviews_7d DESC,
        bs.average_rating DESC
      LIMIT 100';
  END IF;

  EXECUTE v_create_view_sql;
END $$;

-- Recreate indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_trending_businesses_id 
  ON mv_trending_businesses(id);

CREATE INDEX IF NOT EXISTS idx_mv_trending_businesses_category 
  ON mv_trending_businesses(category);

CREATE INDEX IF NOT EXISTS idx_mv_trending_businesses_score 
  ON mv_trending_businesses(trending_score DESC);

-- Recreate the get_trending_businesses function
CREATE OR REPLACE FUNCTION get_trending_businesses(
  p_limit INTEGER DEFAULT 20,
  p_category TEXT DEFAULT NULL
)
RETURNS SETOF mv_trending_businesses
LANGUAGE sql
STABLE
AS $$
  SELECT * 
  FROM mv_trending_businesses
  WHERE p_category IS NULL OR category = p_category
  ORDER BY trending_score DESC
  LIMIT p_limit;
$$;

-- Grant permissions
GRANT SELECT ON mv_trending_businesses TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_trending_businesses(INTEGER, TEXT) TO authenticated, anon;

-- =============================================
-- STEP 4: Recreate mv_new_businesses using business_images table
-- =============================================

DO $$
DECLARE
  v_has_geo_columns BOOLEAN;
  v_create_view_sql TEXT;
BEGIN
  -- Check if latitude and longitude columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'businesses' 
    AND column_name = 'lat'
  ) INTO v_has_geo_columns;

  -- Build CREATE VIEW statement using business_images table
  IF v_has_geo_columns THEN
    v_create_view_sql := '
      CREATE MATERIALIZED VIEW mv_new_businesses AS
      SELECT 
        b.id,
        b.name,
        b.category,
        b.location,
        b.image_url,
        (
          SELECT bi.url 
          FROM business_images bi 
          WHERE bi.business_id = b.id 
            AND bi.is_primary = true
          LIMIT 1
        ) AS primary_image_url,
        b.verified,
        b.price_range,
        b.badge,
        b.slug,
        b.lat AS latitude,
        b.lng AS longitude,
        bs.total_reviews,
        bs.average_rating,
        bs.percentiles,
        b.created_at,
        NOW() as last_refreshed
      FROM businesses b
      LEFT JOIN business_stats bs ON b.id = bs.business_id
      WHERE 
        b.status = ''active''
        AND b.created_at >= NOW() - INTERVAL ''90 days''
      ORDER BY 
        b.created_at DESC
      LIMIT 100';
  ELSE
    v_create_view_sql := '
      CREATE MATERIALIZED VIEW mv_new_businesses AS
      SELECT 
        b.id,
        b.name,
        b.category,
        b.location,
        b.image_url,
        (
          SELECT bi.url 
          FROM business_images bi 
          WHERE bi.business_id = b.id 
            AND bi.is_primary = true
          LIMIT 1
        ) AS primary_image_url,
        b.verified,
        b.price_range,
        b.badge,
        b.slug,
        NULL::DOUBLE PRECISION as latitude,
        NULL::DOUBLE PRECISION as longitude,
        bs.total_reviews,
        bs.average_rating,
        bs.percentiles,
        b.created_at,
        NOW() as last_refreshed
      FROM businesses b
      LEFT JOIN business_stats bs ON b.id = bs.business_id
      WHERE 
        b.status = ''active''
        AND b.created_at >= NOW() - INTERVAL ''90 days''
      ORDER BY 
        b.created_at DESC
      LIMIT 100';
  END IF;

  EXECUTE v_create_view_sql;
END $$;

-- Recreate indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_new_businesses_id 
  ON mv_new_businesses(id);

CREATE INDEX IF NOT EXISTS idx_mv_new_businesses_category 
  ON mv_new_businesses(category);

CREATE INDEX IF NOT EXISTS idx_mv_new_businesses_created_at 
  ON mv_new_businesses(created_at DESC);

-- Recreate the get_new_businesses function
CREATE OR REPLACE FUNCTION get_new_businesses(
  p_limit INTEGER DEFAULT 20,
  p_category TEXT DEFAULT NULL
)
RETURNS SETOF mv_new_businesses
LANGUAGE sql
STABLE
AS $$
  SELECT * 
  FROM mv_new_businesses
  WHERE p_category IS NULL OR category = p_category
  ORDER BY created_at DESC
  LIMIT p_limit;
$$;

-- Grant permissions
GRANT SELECT ON mv_new_businesses TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_new_businesses(INTEGER, TEXT) TO authenticated, anon;

-- =============================================
-- STEP 5: Refresh materialized views
-- =============================================

-- Refresh views to populate with data
REFRESH MATERIALIZED VIEW mv_top_rated_businesses;
REFRESH MATERIALIZED VIEW mv_trending_businesses;
REFRESH MATERIALIZED VIEW mv_new_businesses;

-- =============================================
-- STEP 6: Add comments
-- =============================================

COMMENT ON MATERIALIZED VIEW mv_top_rated_businesses IS 
  'Pre-computed top rated businesses with weighted scores. Uses business_images table to get primary image. Refreshed every 15 minutes via pg_cron.';

COMMENT ON MATERIALIZED VIEW mv_trending_businesses IS 
  'Pre-computed trending businesses based on recent review activity. Uses business_images table to get primary image. Refreshed every 15 minutes via pg_cron.';

COMMENT ON MATERIALIZED VIEW mv_new_businesses IS 
  'Pre-computed new businesses (last 90 days). Uses business_images table to get primary image. Refreshed every 15 minutes via pg_cron.';

