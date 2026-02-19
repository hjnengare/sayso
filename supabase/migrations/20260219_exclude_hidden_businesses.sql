-- =============================================
-- Migration: Exclude hidden and system businesses from all RPC functions
-- =============================================
-- Businesses with is_hidden=true or is_system=true must never appear in user-facing UI.
-- Events linked to hidden/system businesses should still appear (handled in application layer).

-- =============================================
-- 1. Update search_businesses to exclude hidden/system businesses
-- =============================================

CREATE OR REPLACE FUNCTION search_businesses(
  q TEXT,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_verified_only BOOLEAN DEFAULT FALSE,
  p_location TEXT DEFAULT NULL,
  p_lat DOUBLE PRECISION DEFAULT NULL,
  p_lng DOUBLE PRECISION DEFAULT NULL,
  p_radius_km DOUBLE PRECISION DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  category TEXT,
  location TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  image_url TEXT,
  verified BOOLEAN,
  price_range TEXT,
  status TEXT,
  badge TEXT,
  owner_id UUID,
  slug TEXT,
  interest_id TEXT,
  sub_interest_id TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  total_reviews INTEGER,
  average_rating DECIMAL(3,2),
  search_rank REAL,
  alias_boost REAL,
  fuzzy_similarity REAL,
  final_score REAL,
  matched_alias TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_query TEXT;
  v_tsquery TSQUERY;
  v_best_alias RECORD;
BEGIN
  -- Clean and prepare query
  v_clean_query := TRIM(LOWER(q));
  
  -- Create full-text search query with prefix matching
  BEGIN
    v_tsquery := websearch_to_tsquery('english', q);
  EXCEPTION WHEN OTHERS THEN
    v_tsquery := plainto_tsquery('english', q);
  END;

  -- Find best matching category alias
  SELECT
    ca.category_slug as category_match,
    ca.alias_weight as weight
  INTO v_best_alias
  FROM category_aliases ca
  WHERE v_clean_query ILIKE '%' || ca.alias || '%'
     OR ca.alias ILIKE '%' || v_clean_query || '%'
  ORDER BY ca.alias_weight DESC, LENGTH(ca.alias) DESC
  LIMIT 1;

  RETURN QUERY
  WITH ranked_businesses AS (
    SELECT
      b.id,
      b.name,
      b.description,
      b.category,
      b.location,
      b.address,
      b.phone,
      b.email,
      b.website,
      b.image_url,
      b.verified,
      b.price_range,
      b.status,
      b.badge,
      b.owner_id,
      b.slug,
      b.interest_id,
      b.sub_interest_id,
      b.lat,
      b.lng,
      b.created_at,
      b.updated_at,
      COALESCE(bs.total_reviews, 0) as total_reviews,
      COALESCE(bs.average_rating, 0) as average_rating,
      TS_RANK_CD(b.search_vector, v_tsquery, 32) AS search_rank,
      CASE WHEN v_best_alias.category_match IS NOT NULL
           AND LOWER(b.category) = LOWER(v_best_alias.category_match)
           THEN COALESCE(v_best_alias.weight, 20.0)
           ELSE 0.0 END AS alias_boost,
      GREATEST(
        SIMILARITY(b.name, v_clean_query),
        SIMILARITY(b.category, v_clean_query)
      )::REAL AS fuzzy_similarity,
      v_best_alias.category_match AS matched_alias,
      CASE WHEN b.verified THEN 5.0 ELSE 0.0 END AS verified_boost
    FROM businesses b
    LEFT JOIN business_stats bs ON bs.business_id = b.id
    WHERE
      -- Only active businesses
      b.status = 'active'
      -- HIDDEN/SYSTEM BUSINESS EXCLUSION
      AND COALESCE(b.is_hidden, false) = false
      AND COALESCE(b.is_system, false) = false
      AND b.name IS DISTINCT FROM 'Sayso System'
      -- Full-text search OR fuzzy match OR category alias match
      AND (
        b.search_vector @@ v_tsquery
        OR SIMILARITY(b.name, v_clean_query) > 0.2
        OR SIMILARITY(b.category, v_clean_query) > 0.3
        OR (v_best_alias.category_match IS NOT NULL
            AND LOWER(b.category) = LOWER(v_best_alias.category_match))
        OR b.name ILIKE '%' || v_clean_query || '%'
        OR b.description ILIKE '%' || v_clean_query || '%'
      )
      -- Optional filters
      AND (p_verified_only = FALSE OR b.verified = TRUE)
      AND (p_location IS NULL OR b.location ILIKE '%' || p_location || '%')
      -- Geographic filter
      AND (
        p_lat IS NULL OR p_lng IS NULL OR p_radius_km IS NULL
        OR (
          b.lat IS NOT NULL AND b.lng IS NOT NULL
          AND (
            6371 * ACOS(
              LEAST(1, GREATEST(-1,
                COS(RADIANS(p_lat)) * COS(RADIANS(b.lat)) *
                COS(RADIANS(b.lng) - RADIANS(p_lng)) +
                SIN(RADIANS(p_lat)) * SIN(RADIANS(b.lat))
              ))
            ) <= p_radius_km
          )
        )
      )
  )
  SELECT
    rb.id,
    rb.name,
    rb.description,
    rb.category,
    rb.location,
    rb.address,
    rb.phone,
    rb.email,
    rb.website,
    rb.image_url,
    rb.verified,
    rb.price_range,
    rb.status,
    rb.badge,
    rb.owner_id,
    rb.slug,
    rb.interest_id,
    rb.sub_interest_id,
    rb.lat,
    rb.lng,
    rb.created_at,
    rb.updated_at,
    rb.total_reviews,
    rb.average_rating,
    rb.search_rank,
    rb.alias_boost,
    rb.fuzzy_similarity,
    (
      (rb.search_rank * 30) +
      rb.alias_boost +
      (rb.fuzzy_similarity * 15) +
      rb.verified_boost +
      (rb.average_rating * 2)
    )::REAL AS final_score,
    rb.matched_alias
  FROM ranked_businesses rb
  ORDER BY
    (
      (rb.search_rank * 30) +
      rb.alias_boost +
      (rb.fuzzy_similarity * 15) +
      rb.verified_boost +
      (rb.average_rating * 2)
    ) DESC,
    rb.total_reviews DESC,
    rb.name ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION search_businesses IS 
'Search businesses with fuzzy matching, category aliases, and geographic filtering. Excludes hidden and system businesses.';

-- =============================================
-- 2. Update get_featured_businesses to exclude hidden/system businesses
-- =============================================

-- Drop both function signatures to avoid ambiguity
DROP FUNCTION IF EXISTS get_featured_businesses(TEXT, INTEGER);
DROP FUNCTION IF EXISTS get_featured_businesses(TEXT, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION get_featured_businesses(
  p_region TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 12,
  p_seed TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  image_url TEXT,
  category TEXT,
  category_label TEXT,
  sub_interest_id TEXT,
  description TEXT,
  location TEXT,
  average_rating DECIMAL(3,2),
  total_reviews INTEGER,
  verified BOOLEAN,
  slug TEXT,
  last_activity_at TIMESTAMPTZ,
  recent_reviews_30d INTEGER,
  recent_reviews_7d INTEGER,
  bayesian_rating DECIMAL(4,2),
  featured_score DECIMAL(10,6),
  bucket TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_min_rating DECIMAL(3,2) := 4.0;
  v_min_reviews INTEGER := 5;
  v_prior_rating DECIMAL(3,2) := 4.0;
  v_prior_reviews INTEGER := 5;
  v_top_per_bucket INTEGER := 2;
BEGIN
  RETURN QUERY
  WITH recent_review_counts AS (
    SELECT
      r.business_id,
      COUNT(*) FILTER (WHERE r.created_at >= NOW() - INTERVAL '30 days')::INTEGER AS recent_reviews_30d,
      COUNT(*) FILTER (WHERE r.created_at >= NOW() - INTERVAL '7 days')::INTEGER AS recent_reviews_7d
    FROM reviews r
    GROUP BY r.business_id
  ),
  qualified_businesses AS (
    SELECT
      b.id,
      b.name,
      COALESCE(b.image_url::TEXT, '') AS image_url,
      b.category::TEXT,
      b.category_label::TEXT AS category_label,
      b.sub_interest_id::TEXT,
      b.description::TEXT,
      COALESCE(b.location::TEXT, '') AS location,
      (COALESCE(bs.average_rating, 0)::DECIMAL(3,2)) AS average_rating,
      (COALESCE(bs.total_reviews, 0)::INTEGER) AS total_reviews,
      COALESCE(b.verified, false) AS verified,
      b.slug::TEXT,
      COALESCE(b.last_activity_at, b.updated_at, b.created_at) AS last_activity_at,
      COALESCE(rr.recent_reviews_30d, 0)::INTEGER AS recent_reviews_30d,
      COALESCE(rr.recent_reviews_7d, 0)::INTEGER AS recent_reviews_7d,
      (
        (COALESCE(bs.average_rating, 0) * COALESCE(bs.total_reviews, 0) + v_prior_rating * v_prior_reviews)
        / (COALESCE(bs.total_reviews, 0) + v_prior_reviews)
      )::DECIMAL(4,2) AS bayesian_rating,
      (
        (
          (COALESCE(bs.average_rating, 0) * COALESCE(bs.total_reviews, 0) + v_prior_rating * v_prior_reviews)
          / (COALESCE(bs.total_reviews, 0) + v_prior_reviews)
        ) * 0.60
        + LN(1 + COALESCE(bs.total_reviews, 0)) * 0.20
        + LN(1 + COALESCE(rr.recent_reviews_30d, 0)) * 0.20
      )::DECIMAL(10,6) AS featured_score,
      COALESCE(b.sub_interest_id::TEXT, b.category::TEXT, '') AS bucket,
      CASE WHEN p_region IS NOT NULL AND b.location IS NOT NULL AND LOWER(b.location::TEXT) LIKE '%' || LOWER(p_region) || '%'
           THEN TRUE ELSE FALSE END AS is_local,
      md5(COALESCE(p_seed, '') || b.id::text) AS seed_hash
    FROM businesses b
    LEFT JOIN business_stats bs ON bs.business_id = b.id
    LEFT JOIN recent_review_counts rr ON rr.business_id = b.id
    WHERE b.status = 'active'
      -- HIDDEN/SYSTEM BUSINESS EXCLUSION
      AND COALESCE(b.is_hidden, false) = false
      AND COALESCE(b.is_system, false) = false
      AND b.name IS DISTINCT FROM 'Sayso System'
      -- Quality thresholds
      AND COALESCE(bs.average_rating, 0) >= v_min_rating
      AND COALESCE(bs.total_reviews, 0) >= v_min_reviews
      AND COALESCE(b.last_activity_at, b.updated_at, b.created_at) > NOW() - INTERVAL '180 days'
  ),
  ranked_per_bucket AS (
    SELECT
      qb.*,
      ROW_NUMBER() OVER (
        PARTITION BY qb.bucket
        ORDER BY
          qb.is_local DESC,
          qb.featured_score DESC,
          qb.total_reviews DESC,
          qb.last_activity_at DESC,
          qb.seed_hash ASC,
          qb.id ASC
      ) AS bucket_rank
    FROM qualified_businesses qb
  ),
  bucket_winners AS (
    SELECT
      rpb.id,
      rpb.name,
      rpb.image_url,
      rpb.category,
      rpb.category_label,
      rpb.sub_interest_id,
      rpb.description,
      rpb.location,
      rpb.average_rating,
      rpb.total_reviews,
      rpb.verified,
      rpb.slug,
      rpb.last_activity_at,
      rpb.recent_reviews_30d,
      rpb.recent_reviews_7d,
      rpb.bayesian_rating,
      rpb.featured_score,
      rpb.bucket
    FROM ranked_per_bucket rpb
    WHERE rpb.bucket_rank <= v_top_per_bucket
  )
  SELECT
    bw.id,
    bw.name,
    bw.image_url,
    bw.category,
    bw.category_label,
    bw.sub_interest_id,
    bw.description,
    bw.location,
    bw.average_rating,
    bw.total_reviews,
    bw.verified,
    bw.slug,
    bw.last_activity_at,
    bw.recent_reviews_30d,
    bw.recent_reviews_7d,
    bw.bayesian_rating,
    bw.featured_score,
    bw.bucket
  FROM bucket_winners bw
  ORDER BY
    bw.bucket,
    bw.featured_score DESC,
    bw.total_reviews DESC,
    bw.last_activity_at DESC,
    bw.id ASC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_featured_businesses IS
'Returns featured businesses with quality thresholds and balanced scoring. Excludes hidden and system businesses.';

-- =============================================
-- 3. Update get_similar_businesses to exclude hidden/system businesses
-- =============================================

-- Drop existing function signatures to avoid ambiguity
DROP FUNCTION IF EXISTS get_similar_businesses(UUID, INTEGER, DECIMAL);
DROP FUNCTION IF EXISTS get_similar_businesses(UUID, INTEGER, DOUBLE PRECISION);

CREATE OR REPLACE FUNCTION get_similar_businesses(
  p_target_business_id UUID,
  p_limit INTEGER DEFAULT 6,
  p_radius_km DOUBLE PRECISION DEFAULT 25.0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  category TEXT,
  interest_id TEXT,
  sub_interest_id TEXT,
  location TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  image_url TEXT,
  uploaded_images TEXT[],
  verified BOOLEAN,
  price_range TEXT,
  badge TEXT,
  slug TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  total_reviews INTEGER,
  average_rating DECIMAL(3,2),
  percentiles JSONB,
  similarity_score DOUBLE PRECISION
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_category TEXT;
  v_target_interest_id TEXT;
  v_target_sub_interest_id TEXT;
  v_target_lat DOUBLE PRECISION;
  v_target_lng DOUBLE PRECISION;
  v_target_price_range TEXT;
  v_has_postgis BOOLEAN;
BEGIN
  -- Check if PostGIS is available
  SELECT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'postgis'
  ) INTO v_has_postgis;

  -- Get target business details
  SELECT 
    b.category,
    b.interest_id,
    b.sub_interest_id,
    b.lat,
    b.lng,
    b.price_range
  INTO 
    v_target_category,
    v_target_interest_id,
    v_target_sub_interest_id,
    v_target_lat,
    v_target_lng,
    v_target_price_range
  FROM businesses b
  WHERE b.id = p_target_business_id;

  -- Return empty if target not found
  IF v_target_category IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH scored_businesses AS (
    SELECT
      b.id,
      b.name,
      b.description,
      b.category,
      b.interest_id,
      b.sub_interest_id,
      b.location,
      b.address,
      b.phone,
      b.email,
      b.website,
      b.image_url,
      COALESCE(
        (SELECT array_agg(bi.url ORDER BY bi.is_primary DESC NULLS LAST, bi.sort_order ASC NULLS LAST)
         FROM business_images bi WHERE bi.business_id = b.id),
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
      COALESCE(bs.total_reviews, 0) AS total_reviews,
      COALESCE(bs.average_rating, 0)::DECIMAL(3,2) AS average_rating,
      bs.percentiles,
      -- Similarity scoring
      (
        CASE WHEN b.sub_interest_id = v_target_sub_interest_id THEN 40.0 ELSE 0.0 END +
        CASE WHEN b.interest_id = v_target_interest_id THEN 20.0 ELSE 0.0 END +
        CASE WHEN b.price_range = v_target_price_range THEN 15.0 ELSE 0.0 END +
        CASE WHEN b.verified THEN 10.0 ELSE 0.0 END +
        LEAST(COALESCE(bs.average_rating, 0) * 3, 15.0)
      ) AS similarity_score,
      -- Distance calculation
      CASE
        WHEN v_target_lat IS NOT NULL AND v_target_lng IS NOT NULL 
             AND b.lat IS NOT NULL AND b.lng IS NOT NULL THEN
          CASE
            WHEN v_has_postgis THEN
              ST_Distance(
                ST_MakePoint(v_target_lng, v_target_lat)::geography,
                ST_MakePoint(b.lng, b.lat)::geography
              ) / 1000.0
            ELSE
              6371 * acos(
                LEAST(
                  1.0, 
                  cos(radians(v_target_lat)) * 
                  cos(radians(b.lat)) * 
                  cos(radians(b.lng) - radians(v_target_lng)) + 
                  sin(radians(v_target_lat)) * 
                  sin(radians(b.lat))
                )
              )
          END
        ELSE NULL
      END AS distance_km
    FROM public.businesses b
    LEFT JOIN public.business_stats bs ON b.id = bs.business_id
    WHERE b.id != p_target_business_id
      AND b.status = 'active'
      -- HIDDEN/SYSTEM BUSINESS EXCLUSION
      AND COALESCE(b.is_hidden, false) = false
      AND COALESCE(b.is_system, false) = false
      AND b.name IS DISTINCT FROM 'Sayso System'
      -- Category matching
      AND b.category = v_target_category
      AND (
        (v_target_sub_interest_id IS NOT NULL AND b.sub_interest_id = v_target_sub_interest_id)
        OR (v_target_interest_id IS NOT NULL AND b.interest_id = v_target_interest_id)
        OR (
          v_target_lat IS NOT NULL AND v_target_lng IS NOT NULL 
          AND b.lat IS NOT NULL AND b.lng IS NOT NULL
          AND (
            (v_has_postgis AND ST_DWithin(
              ST_MakePoint(v_target_lng, v_target_lat)::geography,
              ST_MakePoint(b.lng, b.lat)::geography,
              p_radius_km * 1000
            ))
            OR
            (NOT v_has_postgis AND (
              6371 * acos(
                LEAST(
                  1.0, 
                  cos(radians(v_target_lat)) * 
                  cos(radians(b.lat)) * 
                  cos(radians(b.lng) - radians(v_target_lng)) + 
                  sin(radians(v_target_lat)) * 
                  sin(radians(b.lat))
                )
              )
            ) <= p_radius_km)
          )
        )
        OR (v_target_price_range IS NOT NULL AND b.price_range = v_target_price_range)
        OR (
          v_target_sub_interest_id IS NULL AND v_target_interest_id IS NULL AND v_target_lat IS NULL AND v_target_price_range IS NULL
        )
      )
  )
  SELECT 
    sb.id,
    sb.name,
    sb.description,
    sb.category,
    sb.interest_id,
    sb.sub_interest_id,
    sb.location,
    sb.address,
    sb.phone,
    sb.email,
    sb.website,
    sb.image_url,
    sb.uploaded_images,
    sb.verified,
    sb.price_range,
    sb.badge,
    sb.slug,
    sb.latitude,
    sb.longitude,
    sb.created_at,
    sb.updated_at,
    sb.total_reviews,
    sb.average_rating,
    sb.percentiles,
    sb.similarity_score
  FROM scored_businesses sb
  WHERE sb.distance_km IS NULL OR sb.distance_km <= p_radius_km
  ORDER BY sb.similarity_score DESC, sb.average_rating DESC, sb.total_reviews DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_similar_businesses IS
'Returns similar businesses based on category, location, and attributes. Excludes hidden and system businesses.';

-- =============================================
-- Grant permissions
-- =============================================

GRANT EXECUTE ON FUNCTION search_businesses(TEXT, INTEGER, INTEGER, BOOLEAN, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;
GRANT EXECUTE ON FUNCTION search_businesses(TEXT, INTEGER, INTEGER, BOOLEAN, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO anon;
GRANT EXECUTE ON FUNCTION get_featured_businesses(TEXT, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_featured_businesses(TEXT, INTEGER, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_similar_businesses(UUID, INTEGER, DOUBLE PRECISION) TO authenticated;
GRANT EXECUTE ON FUNCTION get_similar_businesses(UUID, INTEGER, DOUBLE PRECISION) TO anon;
