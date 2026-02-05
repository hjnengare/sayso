-- =============================================
-- Recreate all business materialized views with category_label and sub_interest_id
-- so featured/trending APIs return correct categories and placeholders.
-- Requires: 20260205_add_category_label_to_businesses (businesses.category_label).
-- Also: single refresh_business_views() + pg_cron automation for all MVs.
-- =============================================

-- 1. Drop dependent functions so we can drop MVs cleanly (CASCADE would drop them anyway)
DROP FUNCTION IF EXISTS get_trending_businesses(INTEGER, TEXT);
DROP FUNCTION IF EXISTS get_top_rated_businesses(INTEGER, TEXT);
DROP FUNCTION IF EXISTS get_new_businesses(INTEGER, TEXT);
DROP FUNCTION IF EXISTS get_quality_fallback_businesses(INTEGER);

-- 2. Drop all business MVs (order can matter for CASCADE)
DROP MATERIALIZED VIEW IF EXISTS mv_trending_businesses CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_top_rated_businesses CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_new_businesses CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_quality_fallback_businesses CASCADE;

-- 3. Ensure trending score function exists (from 20250121)
CREATE OR REPLACE FUNCTION calculate_trending_score_24h(
  p_business_id UUID,
  p_now TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  reviews_24h INTEGER,
  avg_rating_24h DECIMAL,
  trending_score DECIMAL
) AS $$
DECLARE
  v_reviews_24h INTEGER;
  v_avg_rating_24h DECIMAL;
  v_score DECIMAL;
BEGIN
  SELECT COUNT(*), COALESCE(ROUND(AVG(rating)::numeric, 2), 0)
  INTO v_reviews_24h, v_avg_rating_24h
  FROM public.reviews
  WHERE business_id = p_business_id
    AND created_at >= p_now - INTERVAL '24 hours'
    AND created_at <= p_now;
  v_score := (v_reviews_24h::numeric * 100) + (v_avg_rating_24h * 10);
  RETURN QUERY SELECT v_reviews_24h, v_avg_rating_24h, v_score;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================
-- 4. mv_top_rated_businesses (with category, sub_interest_id, category_label)
-- =============================================
CREATE MATERIALIZED VIEW mv_top_rated_businesses AS
SELECT
  b.id,
  b.name,
  b.category,
  b.interest_id,
  b.sub_interest_id,
  b.category_label,
  b.location,
  b.image_url,
  (
    SELECT bi.url FROM public.business_images bi
    WHERE bi.business_id = b.id AND bi.is_primary = true
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
  (bs.average_rating * LOG(bs.total_reviews + 1)) AS weighted_score,
  b.created_at,
  NOW() AS last_refreshed
FROM public.businesses b
INNER JOIN public.business_stats bs ON bs.business_id = b.id
WHERE b.status = 'active'
  AND bs.total_reviews >= 3
  AND bs.average_rating >= 3.5
ORDER BY weighted_score DESC, bs.average_rating DESC, bs.total_reviews DESC
LIMIT 100;

CREATE UNIQUE INDEX idx_mv_top_rated_businesses_id ON mv_top_rated_businesses(id);
CREATE INDEX idx_mv_top_rated_businesses_category ON mv_top_rated_businesses(category);
CREATE INDEX idx_mv_top_rated_businesses_score ON mv_top_rated_businesses(weighted_score DESC);

-- =============================================
-- 5. mv_trending_businesses (24h logic + category_label)
-- =============================================
CREATE MATERIALIZED VIEW mv_trending_businesses AS
SELECT
  b.id,
  b.name,
  b.category,
  b.interest_id,
  b.sub_interest_id,
  b.category_label,
  b.location,
  b.address,
  b.image_url,
  COALESCE(
    ARRAY(
      SELECT bi.url FROM public.business_images bi
      WHERE bi.business_id = b.id
      ORDER BY bi.is_primary DESC, bi.sort_order ASC
    ),
    ARRAY[]::TEXT[]
  ) AS uploaded_images,
  b.verified,
  b.price_range,
  b.badge,
  b.slug,
  b.lat AS latitude,
  b.lng AS longitude,
  b.created_at,
  b.updated_at,
  bs.total_reviews,
  bs.average_rating,
  bs.percentiles,
  (cs.reviews_24h)::INTEGER AS recent_reviews_24h,
  (cs.avg_rating_24h)::DECIMAL AS recent_avg_rating_24h,
  (cs.trending_score)::DECIMAL AS trending_score,
  MAX(r.created_at) FILTER (WHERE r.created_at >= NOW() - INTERVAL '24 hours') AS last_review_24h,
  NOW() AS last_refreshed
FROM public.businesses b
INNER JOIN public.business_stats bs ON bs.business_id = b.id
LEFT JOIN public.reviews r ON r.business_id = b.id
CROSS JOIN LATERAL calculate_trending_score_24h(b.id, NOW()) cs
WHERE b.status = 'active'
  AND cs.reviews_24h >= 1
  AND COALESCE(bs.average_rating, 0) >= 3.0
  AND b.created_at <= NOW() - INTERVAL '2 days'
GROUP BY
  b.id, b.name, b.category, b.interest_id, b.sub_interest_id, b.category_label,
  b.location, b.address, b.image_url, b.verified, b.price_range, b.badge,
  b.slug, b.lat, b.lng, b.created_at, b.updated_at,
  bs.total_reviews, bs.average_rating, bs.percentiles,
  cs.reviews_24h, cs.avg_rating_24h, cs.trending_score
ORDER BY trending_score DESC, recent_avg_rating_24h DESC, recent_reviews_24h DESC
LIMIT 100;

CREATE UNIQUE INDEX idx_mv_trending_businesses_id ON mv_trending_businesses(id);
CREATE INDEX idx_mv_trending_businesses_category ON mv_trending_businesses(category);
CREATE INDEX idx_mv_trending_businesses_score ON mv_trending_businesses(trending_score DESC, recent_avg_rating_24h DESC);
CREATE INDEX idx_mv_trending_businesses_reviews_24h ON mv_trending_businesses(recent_reviews_24h DESC);

-- =============================================
-- 6. mv_new_businesses (with category, sub_interest_id, category_label)
-- =============================================
CREATE MATERIALIZED VIEW mv_new_businesses AS
SELECT
  b.id,
  b.name,
  b.category,
  b.interest_id,
  b.sub_interest_id,
  b.category_label,
  b.location,
  b.image_url,
  (
    SELECT bi.url FROM public.business_images bi
    WHERE bi.business_id = b.id AND bi.is_primary = true
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
  NOW() AS last_refreshed
FROM public.businesses b
LEFT JOIN public.business_stats bs ON bs.business_id = b.id
WHERE b.status = 'active'
  AND b.created_at >= NOW() - INTERVAL '90 days'
ORDER BY b.created_at DESC
LIMIT 100;

CREATE UNIQUE INDEX idx_mv_new_businesses_id ON mv_new_businesses(id);
CREATE INDEX idx_mv_new_businesses_category ON mv_new_businesses(category);
CREATE INDEX idx_mv_new_businesses_created_at ON mv_new_businesses(created_at DESC);

-- =============================================
-- 7. mv_quality_fallback_businesses (with sub_interest_id, category_label)
-- =============================================
CREATE MATERIALIZED VIEW mv_quality_fallback_businesses AS
SELECT
  b.id,
  b.name,
  b.category,
  b.interest_id,
  b.sub_interest_id,
  b.category_label,
  b.location,
  b.image_url,
  b.verified,
  b.price_range,
  b.badge,
  b.slug,
  b.lat AS latitude,
  b.lng AS longitude,
  COALESCE(bs.total_reviews, 0) AS total_reviews,
  COALESCE(bs.average_rating, 0) AS average_rating,
  bs.percentiles,
  b.created_at,
  b.updated_at,
  NOW() AS last_refreshed,
  (
    (CASE WHEN b.verified THEN 2 ELSE 0 END) +
    (CASE WHEN COALESCE(b.description, '') <> '' THEN 1 ELSE 0 END) +
    (CASE WHEN COALESCE(b.image_url, '') <> '' THEN 1 ELSE 0 END) +
    LOG(1 + COALESCE(bs.total_reviews, 0)) +
    (COALESCE(bs.average_rating, 0) * 0.5)
  ) AS quality_score
FROM public.businesses b
LEFT JOIN public.business_stats bs ON bs.business_id = b.id
WHERE b.status = 'active'
ORDER BY quality_score DESC, b.created_at DESC
LIMIT 200;

CREATE UNIQUE INDEX idx_mv_quality_fallback_id ON mv_quality_fallback_businesses(id);

-- =============================================
-- 8. Recreate get_* functions
-- =============================================
CREATE OR REPLACE FUNCTION get_top_rated_businesses(
  p_limit INTEGER DEFAULT 20,
  p_category TEXT DEFAULT NULL
)
RETURNS SETOF mv_top_rated_businesses
LANGUAGE sql STABLE
AS $$
  SELECT * FROM mv_top_rated_businesses
  WHERE p_category IS NULL OR category = p_category
  ORDER BY weighted_score DESC
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION get_trending_businesses(
  p_limit INTEGER DEFAULT 20,
  p_category TEXT DEFAULT NULL
)
RETURNS SETOF mv_trending_businesses
LANGUAGE sql STABLE
AS $$
  SELECT * FROM mv_trending_businesses
  WHERE p_category IS NULL OR category = p_category
  ORDER BY trending_score DESC, recent_avg_rating_24h DESC, recent_reviews_24h DESC
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION get_new_businesses(
  p_limit INTEGER DEFAULT 20,
  p_category TEXT DEFAULT NULL
)
RETURNS SETOF mv_new_businesses
LANGUAGE sql STABLE
AS $$
  SELECT * FROM mv_new_businesses
  WHERE p_category IS NULL OR category = p_category
  ORDER BY created_at DESC
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION get_quality_fallback_businesses(p_limit INT DEFAULT 20)
RETURNS SETOF mv_quality_fallback_businesses
LANGUAGE sql STABLE
AS $$
  SELECT * FROM mv_quality_fallback_businesses
  ORDER BY quality_score DESC
  LIMIT p_limit;
$$;

-- =============================================
-- 9. Single refresh function for all business MVs
-- =============================================
CREATE OR REPLACE FUNCTION refresh_business_views()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_top_rated_businesses;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_trending_businesses;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_new_businesses;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_quality_fallback_businesses;
  RAISE NOTICE 'Business materialized views refreshed at %', NOW();
END;
$$;

-- Replace refresh_mv_trending_businesses so callers still work (delegate to refresh_business_views)
CREATE OR REPLACE FUNCTION refresh_mv_trending_businesses()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM refresh_business_views();
END;
$$;

-- =============================================
-- 10. Grants
-- =============================================
GRANT SELECT ON mv_top_rated_businesses TO authenticated, anon;
GRANT SELECT ON mv_trending_businesses TO authenticated, anon;
GRANT SELECT ON mv_new_businesses TO authenticated, anon;
GRANT SELECT ON mv_quality_fallback_businesses TO authenticated, anon;

GRANT EXECUTE ON FUNCTION get_top_rated_businesses(INTEGER, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_trending_businesses(INTEGER, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_new_businesses(INTEGER, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_quality_fallback_businesses(INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION refresh_business_views() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION refresh_mv_trending_businesses() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION calculate_trending_score_24h(UUID, TIMESTAMPTZ) TO authenticated, anon;

-- =============================================
-- 11. Automation: pg_cron every 15 minutes
-- =============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('refresh-business-views');
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    BEGIN
      PERFORM cron.unschedule('refresh-trending-businesses');
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'refresh-business-views',
      '*/15 * * * *',
      'SELECT refresh_business_views();'
    );
    RAISE NOTICE 'Scheduled pg_cron: refresh-business-views every 15 minutes';
  ELSE
    RAISE NOTICE 'pg_cron not available. Manual refresh: SELECT refresh_business_views();';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not schedule cron: %', SQLERRM;
END;
$$;

-- =============================================
-- 12. Comments
-- =============================================
COMMENT ON MATERIALIZED VIEW mv_top_rated_businesses IS
  'Top rated businesses (weighted score). Includes category, sub_interest_id, category_label. Refreshed every 15 min.';
COMMENT ON MATERIALIZED VIEW mv_trending_businesses IS
  'Trending businesses (24h rolling window). Includes category, sub_interest_id, category_label. Refreshed every 15 min.';
COMMENT ON MATERIALIZED VIEW mv_new_businesses IS
  'New businesses (last 90 days). Includes category, sub_interest_id, category_label. Refreshed every 15 min.';
COMMENT ON MATERIALIZED VIEW mv_quality_fallback_businesses IS
  'Quality-scored fallback for featured/trending. Includes category, sub_interest_id, category_label. Refreshed every 15 min.';
COMMENT ON FUNCTION refresh_business_views IS
  'Refreshes all four business MVs. Run manually or via pg_cron every 15 minutes.';

-- =============================================
-- 13. Initial refresh (populate MVs)
-- =============================================
SELECT refresh_business_views();
