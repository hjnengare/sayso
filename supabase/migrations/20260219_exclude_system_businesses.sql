-- =============================================
-- Migration: Exclude system/placeholder businesses from all user-facing queries
-- =============================================
-- The "Sayso System" business is used only for ingesting Quicket API events.
-- It must never appear in user-facing UI: feeds, search, trending, etc.
--
-- Filter criteria (any of these marks a business as system):
--   is_system = true
--   name = 'Sayso System' (fallback guard)
--
-- Events linked to system businesses should still appear,
-- but without business attribution (handled in application layer).

-- =============================================
-- 1. Update recommend_for_you_unified to exclude system businesses
-- =============================================

CREATE OR REPLACE FUNCTION public.recommend_for_you_unified(
  p_interest_ids      text[]            DEFAULT array[]::text[],
  p_sub_interest_ids  text[]            DEFAULT array[]::text[],
  p_dealbreaker_ids   text[]            DEFAULT array[]::text[],
  p_price_ranges      text[]            DEFAULT NULL,
  p_latitude          double precision  DEFAULT NULL,
  p_longitude         double precision  DEFAULT NULL,
  p_limit             integer           DEFAULT 40,
  p_seed              text              DEFAULT NULL
)
RETURNS TABLE (
  id                    uuid,
  name                  text,
  description           text,
  category              text,
  interest_id           text,
  sub_interest_id       text,
  location              text,
  address               text,
  phone                 text,
  email                 text,
  website               text,
  image_url             text,
  verified              boolean,
  price_range           text,
  badge                 text,
  slug                  text,
  latitude              double precision,
  longitude             double precision,
  created_at            timestamptz,
  updated_at            timestamptz,
  total_reviews         integer,
  average_rating        numeric,
  percentiles           jsonb,
  uploaded_images       text[],
  personalization_score double precision,
  diversity_rank        integer,
  source                text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH

-- 1. Hard filters: active, not hidden, NOT SYSTEM, optional price-range allow-list,
--    and data-safe dealbreakers (NULL-safe so no-stats businesses pass through).
eligible AS (
  SELECT
    b.id,
    b.name,
    b.description,
    b.primary_subcategory_slug,
    b.primary_category_slug,
    b.location,
    b.address,
    b.phone,
    b.email,
    b.website,
    b.image_url,
    b.verified,
    b.price_range,
    b.badge,
    b.slug,
    b.lat,
    b.lng,
    b.created_at,
    b.updated_at,
    COALESCE(bs.total_reviews, 0)::integer  AS total_reviews,
    COALESCE(bs.average_rating, 0)::numeric AS average_rating,
    bs.percentiles
  FROM public.businesses b
  LEFT JOIN public.business_stats bs ON bs.business_id = b.id
  WHERE b.status = 'active'
    AND COALESCE(b.is_hidden, false) = false
    -- SYSTEM BUSINESS EXCLUSION: Never show placeholder/system businesses
    AND COALESCE(b.is_system, false) = false
    AND b.name IS DISTINCT FROM 'Sayso System'
    -- price-range allow-list (null b.price_range always passes)
    AND (
      p_price_ranges IS NULL
      OR array_length(p_price_ranges, 1) IS NULL
      OR b.price_range IS NULL
      OR b.price_range = ANY(p_price_ranges)
    )
    -- dealbreaker: trustworthiness - only exclude if NOT new (<30 d) and NOT verified
    AND (
      NOT ('trustworthiness' = ANY(p_dealbreaker_ids))
      OR b.verified = true
      OR b.created_at > now() - interval '30 days'
    )
    -- dealbreaker: value-for-money - price_range null passes (no data yet)
    AND (
      NOT ('value-for-money' = ANY(p_dealbreaker_ids))
      OR b.price_range IS NULL
      OR b.price_range IN ('$', '$$')
    )
    -- dealbreaker: expensive - price_range null passes (no data yet)
    AND (
      NOT ('expensive' = ANY(p_dealbreaker_ids))
      OR b.price_range IS NULL
      OR b.price_range NOT IN ('$$$', '$$$$')
    )
),

-- 2. Unified scoring - same formula for all businesses.
scored AS (
  SELECT
    e.*,

    -- Preference affinity (0 / 15 / 25)
    CASE
      WHEN array_length(p_sub_interest_ids, 1) > 0
        AND e.primary_subcategory_slug = ANY(p_sub_interest_ids) THEN 25.0
      WHEN array_length(p_interest_ids, 1) > 0
        AND e.primary_category_slug    = ANY(p_interest_ids)    THEN 15.0
      ELSE 0.0
    END AS preference_score,

    -- Bayesian quality (0–20)
    (COALESCE(e.average_rating, 0) * COALESCE(e.total_reviews, 0) + 3.5 * 5.0)
      / (COALESCE(e.total_reviews, 0) + 5.0) * 3.0
    + least(ln(1.0 + COALESCE(e.total_reviews, 0)) * 1.5, 5.0)
    AS quality_score,

    -- Freshness: 45-day exponential half-life (0–10); never zero
    exp(-0.693 * extract(days FROM now() - COALESCE(e.updated_at, e.created_at)) / 45.0) * 10.0
    AS freshness_score,

    -- New-business recency boost
    CASE
      WHEN e.created_at > now() - interval '30 days'  THEN 8.0
      WHEN e.created_at > now() - interval '90 days'  THEN 4.0
      ELSE 0.0
    END AS recency_boost,

    -- Quality signals
    CASE WHEN COALESCE(e.verified, false) THEN 3.0 ELSE 0.0 END AS verified_bonus,
    CASE WHEN e.image_url IS NOT NULL AND e.image_url <> '' THEN 2.0 ELSE 0.0 END AS image_bonus,

    -- Seeded pseudo-randomness for feed diversity
    (('x' || substr(md5(e.id::text || COALESCE(p_seed, '')), 1, 8))::bit(32)::bigint::float8
       / 4294967296.0) * 2.0
    AS rand_score

  FROM eligible e
),

-- 3. Derive total score and classify each business into a bucket.
final_scored AS (
  SELECT
    s.*,
    s.preference_score + s.quality_score + s.freshness_score
      + s.recency_boost + s.verified_bonus + s.image_bonus + s.rand_score
    AS final_score,

    CASE
      WHEN s.preference_score > 0                        THEN 'preference_match'
      WHEN s.created_at > now() - interval '30 days'     THEN 'new_business'
      ELSE                                                     'cold_start'
    END AS source

  FROM scored s
),

-- 4. Diversity cap: max rows per subcategory within each bucket.
diversity_ranked AS (
  SELECT
    fs.*,
    row_number() OVER (
      PARTITION BY COALESCE(fs.primary_subcategory_slug, fs.primary_category_slug, 'other')
                 , fs.source
      ORDER BY fs.final_score DESC
    ) AS subcategory_rank
  FROM final_scored fs
),

-- 5. Per-bucket position for interleaving.
preference_bucket AS (
  SELECT *, row_number() OVER (ORDER BY final_score DESC) AS bucket_pos
  FROM diversity_ranked
  WHERE source = 'preference_match' AND subcategory_rank <= 5
),
new_biz_bucket AS (
  SELECT *, row_number() OVER (ORDER BY final_score DESC) AS bucket_pos
  FROM diversity_ranked
  WHERE source = 'new_business' AND subcategory_rank <= 3
),
cold_bucket AS (
  SELECT *, row_number() OVER (ORDER BY final_score DESC) AS bucket_pos
  FROM diversity_ranked
  WHERE source = 'cold_start' AND subcategory_rank <= 3
),

-- 6. Interleave: every 5 slots -> 3 preferred + 1 new + 1 cold.
interleaved AS (
  SELECT *, (bucket_pos - 1) * 5 + 0 AS slot
  FROM preference_bucket
  WHERE bucket_pos <= greatest(1, ceil(p_limit * 0.65))

  UNION ALL

  SELECT *, (bucket_pos - 1) * 5 + 3 AS slot
  FROM new_biz_bucket
  WHERE bucket_pos <= greatest(1, ceil(p_limit * 0.20))

  UNION ALL

  SELECT *, (bucket_pos - 1) * 5 + 4 AS slot
  FROM cold_bucket
  WHERE bucket_pos <= greatest(1, ceil(p_limit * 0.15))
),

-- 7. Attach uploaded images and assign final rank.
with_images AS (
  SELECT
    i.*,
    COALESCE(
      (SELECT array_agg(bi.url ORDER BY bi.is_primary DESC NULLS LAST, bi.sort_order ASC NULLS LAST)
       FROM public.business_images bi
       WHERE bi.business_id = i.id),
      array[]::text[]
    ) AS uploaded_images_agg,
    row_number() OVER (ORDER BY i.slot) AS final_rank
  FROM interleaved i
  ORDER BY i.slot
  LIMIT p_limit
)

SELECT
  w.id,
  w.name,
  w.description,
  w.primary_subcategory_slug::text                AS category,
  w.primary_category_slug::text                   AS interest_id,
  w.primary_subcategory_slug::text                AS sub_interest_id,
  w.location,
  w.address,
  w.phone,
  w.email,
  w.website,
  w.image_url,
  w.verified,
  w.price_range,
  w.badge,
  w.slug,
  w.lat                                           AS latitude,
  w.lng                                           AS longitude,
  w.created_at,
  w.updated_at,
  w.total_reviews,
  w.average_rating,
  w.percentiles,
  w.uploaded_images_agg                           AS uploaded_images,
  w.final_score                                   AS personalization_score,
  w.final_rank::integer                           AS diversity_rank,
  w.source
FROM with_images w
ORDER BY w.final_rank;
$$;

COMMENT ON FUNCTION public.recommend_for_you_unified(text[], text[], text[], text[], double precision, double precision, integer, text) IS
'Unified For You recommender. Excludes system/placeholder businesses (is_system=true or name="Sayso System"). Scores: preference affinity + Bayesian quality + freshness + new-business boost + verified + image + seeded rand. Bucket interleaving: 65% preference, 20% new, 15% cold-start.';

-- =============================================
-- 2. Update list_businesses_optimized to exclude system businesses
-- =============================================

CREATE OR REPLACE FUNCTION list_businesses_optimized(
  p_limit INTEGER DEFAULT 20,
  p_cursor_id UUID DEFAULT NULL,
  p_cursor_created_at TIMESTAMPTZ DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_verified BOOLEAN DEFAULT NULL,
  p_price_range TEXT DEFAULT NULL,
  p_badge TEXT DEFAULT NULL,
  p_min_rating DECIMAL DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_latitude DECIMAL DEFAULT NULL,
  p_longitude DECIMAL DEFAULT NULL,
  p_radius_km DECIMAL DEFAULT 10,
  p_sort_by TEXT DEFAULT 'created_at',
  p_sort_order TEXT DEFAULT 'desc'
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
  uploaded_image TEXT,
  verified BOOLEAN,
  price_range TEXT,
  badge TEXT,
  slug TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  total_reviews INTEGER,
  average_rating DECIMAL,
  percentiles JSONB,
  distance_km DOUBLE PRECISION,
  cursor_id UUID,
  cursor_created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_has_postgis BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'postgis'
  ) INTO v_has_postgis;

  RETURN QUERY
  WITH filtered_businesses AS (
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
      b.uploaded_image,
      b.verified,
      b.price_range,
      b.badge,
      b.slug,
      b.lat AS latitude,
      b.lng AS longitude,
      b.created_at,
      b.updated_at,
      COALESCE(bs.total_reviews, 0) as total_reviews,
      COALESCE(bs.average_rating, 0) as average_rating,
      bs.percentiles,
      CASE 
        WHEN p_latitude IS NOT NULL AND p_longitude IS NOT NULL 
             AND b.lat IS NOT NULL AND b.lng IS NOT NULL THEN
          6371 * acos(
            cos(radians(p_latitude)) * 
            cos(radians(b.lat)) * 
            cos(radians(b.lng) - radians(p_longitude)) + 
            sin(radians(p_latitude)) * 
            sin(radians(b.lat))
          )
        ELSE NULL
      END as distance_km
    FROM businesses b
    LEFT JOIN business_stats bs ON b.id = bs.business_id
    WHERE 
      b.status = 'active'
      
      -- HIDDEN BUSINESS EXCLUSION: Never show hidden businesses
      AND COALESCE(b.is_hidden, false) = false
      
      -- SYSTEM BUSINESS EXCLUSION: Never show placeholder/system businesses
      AND COALESCE(b.is_system, false) = false
      AND b.name IS DISTINCT FROM 'Sayso System'
      
      -- Keyset pagination
      AND (
        p_cursor_id IS NULL 
        OR (p_sort_order = 'desc' AND b.created_at < p_cursor_created_at)
        OR (p_sort_order = 'asc' AND b.created_at > p_cursor_created_at)
        OR (b.created_at = p_cursor_created_at AND b.id > p_cursor_id)
      )
      
      AND (p_category IS NULL OR b.category = p_category)
      AND (p_location IS NULL OR b.location ILIKE '%' || p_location || '%')
      AND (p_verified IS NULL OR b.verified = p_verified)
      AND (p_price_range IS NULL OR b.price_range = p_price_range)
      AND (p_badge IS NULL OR b.badge = p_badge)
      AND (p_min_rating IS NULL OR COALESCE(bs.average_rating, 0) >= p_min_rating)
      AND (p_search IS NULL OR b.search_vector @@ websearch_to_tsquery('english', p_search))
      AND (
        p_latitude IS NULL 
        OR p_longitude IS NULL
        OR b.lat IS NULL 
        OR b.lng IS NULL
        OR (
          6371 * acos(
            cos(radians(p_latitude)) * 
            cos(radians(b.lat)) * 
            cos(radians(b.lng) - radians(p_longitude)) + 
            sin(radians(p_latitude)) * 
            sin(radians(b.lat))
          ) <= p_radius_km
        )
      )
  ),
  sorted_businesses AS (
    SELECT fb.*
    FROM filtered_businesses fb
    ORDER BY
      CASE WHEN p_sort_by = 'rating' AND p_sort_order = 'desc' THEN fb.average_rating END DESC NULLS LAST,
      CASE WHEN p_sort_by = 'rating' AND p_sort_order = 'asc' THEN fb.average_rating END ASC NULLS LAST,
      CASE WHEN p_sort_by = 'reviews' AND p_sort_order = 'desc' THEN fb.total_reviews END DESC NULLS LAST,
      CASE WHEN p_sort_by = 'reviews' AND p_sort_order = 'asc' THEN fb.total_reviews END ASC NULLS LAST,
      CASE WHEN p_sort_by = 'distance' AND p_sort_order = 'asc' THEN fb.distance_km END ASC NULLS LAST,
      CASE WHEN p_sort_by = 'distance' AND p_sort_order = 'desc' THEN fb.distance_km END DESC NULLS LAST,
      CASE WHEN p_sort_by = 'name' AND p_sort_order = 'asc' THEN fb.name END ASC,
      CASE WHEN p_sort_by = 'name' AND p_sort_order = 'desc' THEN fb.name END DESC,
      CASE WHEN p_sort_order = 'desc' THEN fb.created_at END DESC NULLS LAST,
      CASE WHEN p_sort_order = 'asc' THEN fb.created_at END ASC NULLS LAST,
      fb.id
    LIMIT p_limit
  )
  SELECT 
    sb.*,
    sb.id as cursor_id,
    sb.created_at as cursor_created_at
  FROM sorted_businesses sb;
END;
$$;

COMMENT ON FUNCTION list_businesses_optimized IS 
'Optimized business listing. Excludes hidden businesses (is_hidden=true) and system/placeholder businesses (is_system=true or name="Sayso System"). Includes filtering, sorting, keyset pagination, and distance calculations.';

-- =============================================
-- 3. Grant permissions
-- =============================================

GRANT EXECUTE ON FUNCTION public.recommend_for_you_unified(text[], text[], text[], text[], double precision, double precision, integer, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.recommend_for_you_unified(text[], text[], text[], text[], double precision, double precision, integer, text)
  TO anon;

GRANT EXECUTE ON FUNCTION list_businesses_optimized TO authenticated;
GRANT EXECUTE ON FUNCTION list_businesses_optimized TO anon;
