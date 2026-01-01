-- Migration: Update recommend_personalized_businesses RPC function to use business_images table
-- This replaces uploaded_images array column with business_images table query

-- Drop and recreate the function to use business_images table
DROP FUNCTION IF EXISTS recommend_personalized_businesses(
  TEXT[], TEXT[], INTEGER, DOUBLE PRECISION, DOUBLE PRECISION, TEXT[], UUID[], NUMERIC
);

CREATE OR REPLACE FUNCTION recommend_personalized_businesses(
  p_user_sub_interest_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_user_interest_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_limit INTEGER DEFAULT 40,
  p_latitude DOUBLE PRECISION DEFAULT NULL,
  p_longitude DOUBLE PRECISION DEFAULT NULL,
  p_price_ranges TEXT[] DEFAULT NULL,
  p_excluded_business_ids UUID[] DEFAULT ARRAY[]::UUID[],
  p_min_rating NUMERIC DEFAULT NULL
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
  uploaded_images TEXT[], -- Array of image URLs from business_images table (for backward compatibility)
  verified BOOLEAN,
  price_range TEXT,
  badge TEXT,
  slug TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  total_reviews INTEGER,
  average_rating NUMERIC,
  percentiles JSONB,
  personalization_score DOUBLE PRECISION,
  diversity_rank INTEGER
)
LANGUAGE sql
STABLE
AS $$
WITH candidate_businesses AS (
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
    -- Get images from business_images table as array (for backward compatibility)
    COALESCE(
      ARRAY(
        SELECT bi.url 
        FROM business_images bi 
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
    COALESCE(bs.total_reviews, 0)          AS total_reviews,
    COALESCE(bs.average_rating, 0)         AS average_rating,
    bs.percentiles,
    CASE
      WHEN array_length(p_user_sub_interest_ids, 1) > 0 AND b.sub_interest_id = ANY(p_user_sub_interest_ids) THEN 1.0
      WHEN array_length(p_user_interest_ids, 1) > 0 AND b.interest_id = ANY(p_user_interest_ids) THEN 0.6
      ELSE 0.2
    END AS interest_score,
    (
      0.5 * COALESCE(bs.average_rating, 0) +
      0.3 * LOG(1 + COALESCE(bs.total_reviews, 0))
    ) AS quality_score,
    (
      GREATEST(0, 1 - (EXTRACT(EPOCH FROM (NOW() - b.created_at)) / 86400.0) / 45)
    ) * 0.35 AS freshness_score,
    CASE
      WHEN p_latitude IS NOT NULL AND p_longitude IS NOT NULL
           AND b.lat IS NOT NULL AND b.lng IS NOT NULL THEN
        GREATEST(
          0,
          1 - (
            6371 * acos(
              cos(radians(p_latitude)) *
              cos(radians(b.lat)) *
              cos(radians(b.lng) - radians(p_longitude)) +
              sin(radians(p_latitude)) *
              sin(radians(b.lat))
            ) / 15.0
          )
        ) * 0.2
      ELSE 0
    END AS distance_score,
    (random() * 0.05) AS randomness
  FROM businesses b
  LEFT JOIN business_stats bs ON bs.business_id = b.id
  WHERE b.status = 'active'
    AND (p_price_ranges IS NULL OR b.price_range = ANY(p_price_ranges))
    AND (p_excluded_business_ids IS NULL OR b.id <> ALL(p_excluded_business_ids))
    AND (p_min_rating IS NULL OR COALESCE(bs.average_rating, 0) >= p_min_rating)
),
scored AS (
  SELECT
    cb.*,
    (
      (cb.interest_score * 2.0) +
      cb.quality_score +
      cb.freshness_score +
      cb.distance_score +
      cb.randomness
    ) AS personalization_score
  FROM candidate_businesses cb
),
ranked AS (
  SELECT
    s.*,
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(s.sub_interest_id, s.category, 'uncategorized')
      ORDER BY s.personalization_score DESC
    ) AS diversity_rank
  FROM scored s
)
SELECT
  id,
  name,
  description,
  category,
  interest_id,
  sub_interest_id,
  location,
  address,
  phone,
  email,
  website,
  image_url,
  uploaded_images,
  verified,
  price_range,
  badge,
  slug,
  latitude,
  longitude,
  created_at,
  updated_at,
  total_reviews,
  average_rating,
  percentiles,
  personalization_score,
  diversity_rank
FROM ranked
WHERE diversity_rank <= 4
ORDER BY personalization_score DESC
LIMIT p_limit;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION recommend_personalized_businesses(
  TEXT[], TEXT[], INTEGER, DOUBLE PRECISION, DOUBLE PRECISION, TEXT[], UUID[], NUMERIC
) TO authenticated, anon;

-- Add comment
COMMENT ON FUNCTION recommend_personalized_businesses(
  TEXT[], TEXT[], INTEGER, DOUBLE PRECISION, DOUBLE PRECISION, TEXT[], UUID[], NUMERIC
) IS 
  'Scores businesses for personalized feeds using interest alignment, rating quality, freshness, and distance. Enforces per-sub-interest diversity to keep the feed varied. Uses business_images table to get image URLs as array for backward compatibility.';

