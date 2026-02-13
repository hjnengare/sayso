-- Fix search_businesses RPC function to exclude system businesses
-- This prevents "Sayso System" businesses from appearing in search results

CREATE OR REPLACE FUNCTION public.search_businesses(
  q TEXT,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0,
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
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  -- Stats
  total_reviews INTEGER,
  average_rating DECIMAL(3,2),
  -- Search relevance
  search_rank REAL,
  alias_boost REAL,
  fuzzy_similarity REAL,
  final_score REAL,
  matched_alias TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_query TEXT;
  v_tsquery TSQUERY;
  v_best_alias RECORD;
  v_has_fts_results BOOLEAN := FALSE;
BEGIN
  -- ========================================
  -- Step 1: Clean and normalize the query
  -- ========================================
  v_clean_query := LOWER(TRIM(COALESCE(q, '')));

  -- Return empty if no query
  IF v_clean_query = '' THEN
    RETURN;
  END IF;

  -- ========================================
  -- Step 2: Find best matching alias
  -- ========================================
  SELECT
    sa.phrase,
    sa.category_match,
    sa.weight,
    SIMILARITY(sa.phrase, v_clean_query) AS sim
  INTO v_best_alias
  FROM search_aliases sa
  WHERE
    -- Exact match
    sa.phrase = v_clean_query
    -- Or phrase contains the query
    OR sa.phrase ILIKE '%' || v_clean_query || '%'
    -- Or fuzzy match (for typos)
    OR SIMILARITY(sa.phrase, v_clean_query) > 0.3
  ORDER BY
    -- Exact match first
    CASE WHEN sa.phrase = v_clean_query THEN 0 ELSE 1 END,
    -- Then weight
    sa.weight DESC,
    -- Then similarity
    SIMILARITY(sa.phrase, v_clean_query) DESC
  LIMIT 1;

  -- ========================================
  -- Step 3: Build full-text search query
  -- ========================================
  BEGIN
    -- Try websearch format first (handles phrases naturally)
    v_tsquery := websearch_to_tsquery('english', v_clean_query);
  EXCEPTION WHEN OTHERS THEN
    -- Fallback to plainto_tsquery for simple queries
    BEGIN
      v_tsquery := plainto_tsquery('english', v_clean_query);
    EXCEPTION WHEN OTHERS THEN
      -- Last resort: just return based on alias match
      v_tsquery := NULL;
    END;
  END;

  -- ========================================
  -- Step 4: Execute search with ranking
  -- ========================================
  RETURN QUERY
  WITH ranked_businesses AS (
    SELECT
      b.id,
      b.name,
      b.description,
      b.primary_subcategory_slug AS category,
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
      b.primary_category_slug AS interest_id,
      b.primary_subcategory_slug AS sub_interest_id,
      b.lat,
      b.lng,
      b.created_at,
      b.updated_at,
      -- Stats
      COALESCE(bs.total_reviews, 0) AS total_reviews,
      COALESCE(bs.average_rating, 0) AS average_rating,
      -- Search relevance scores
      CASE
        WHEN v_tsquery IS NOT NULL AND b.search_vector @@ v_tsquery THEN
          ts_rank(b.search_vector, v_tsquery)
        ELSE 0.0
      END AS search_rank,
      -- Alias boost
      CASE
        WHEN v_best_alias.category_match IS NOT NULL AND
             (b.primary_subcategory_slug ILIKE '%' || v_best_alias.category_match || '%' OR
              v_best_alias.category_match ILIKE '%' || b.primary_subcategory_slug || '%') THEN
          v_best_alias.weight
        ELSE 0.0
      END AS alias_boost,
      -- Fuzzy similarity
      GREATEST(
        SIMILARITY(b.name, v_clean_query),
        SIMILARITY(b.primary_subcategory_slug, v_clean_query)
      ) AS fuzzy_similarity,
      v_best_alias.category_match AS matched_alias,
      -- Verified boost
      CASE WHEN b.verified THEN 5.0 ELSE 0.0 END AS verified_boost
    FROM businesses b
    LEFT JOIN business_stats bs ON bs.business_id = b.id
    WHERE
      -- Only active businesses
      b.status = 'active'
      -- Exclude system businesses (FIXED: was missing this filter)
      AND COALESCE(b.is_system, false) = false
      -- Full-text search OR fuzzy match OR category alias match
      AND (
        -- Full-text search match
        b.search_vector @@ v_tsquery
        -- OR fuzzy name match (typo tolerance)
        OR SIMILARITY(b.name, v_clean_query) > 0.2
        -- OR fuzzy category match
        OR SIMILARITY(b.primary_subcategory_slug, v_clean_query) > 0.2
        -- OR alias category match
        OR (v_best_alias.category_match IS NOT NULL AND
            (b.primary_subcategory_slug ILIKE '%' || v_best_alias.category_match || '%' OR
             v_best_alias.category_match ILIKE '%' || b.primary_subcategory_slug || '%'))
      )
      -- Verified filter (optional)
      AND (NOT p_verified_only OR b.verified = true)
      -- Location filter (optional)
      AND (p_location IS NULL OR b.location ILIKE '%' || p_location || '%')
      -- Radius filter (optional, requires lat/lng)
      AND (
        p_radius_km IS NULL OR p_lat IS NULL OR p_lng IS NULL OR
        b.lat IS NULL OR b.lng IS NULL OR
        earth_distance(
          ll_to_earth(p_lat, p_lng),
          ll_to_earth(b.lat, b.lng)
        ) <= (p_radius_km * 1000)
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
    -- Final composite score
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
    -- Primary: final composite score
    (
      (rb.search_rank * 30) +
      rb.alias_boost +
      (rb.fuzzy_similarity * 15) +
      rb.verified_boost +
      (rb.average_rating * 2)
    ) DESC,
    -- Tiebreaker: created_at desc (newer first)
    rb.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION search_businesses IS 'Main search RPC: combines alias lookup, full-text search, fuzzy matching, and ranking. Now excludes system businesses.';

-- Also fix the trending cold start function to exclude system businesses
CREATE OR REPLACE FUNCTION get_trending_cold_start_candidates(
  p_pool_size integer default 1500,
  p_city text default null
)
RETURNS TABLE (
  id uuid,
  cold_start_score double precision,
  primary_category_slug text,
  primary_subcategory_slug text,
  primary_subcategory_label text
)
LANGUAGE sql STABLE
AS $$
  WITH candidates AS (
    SELECT
      b.id,
      b.primary_subcategory_slug,
      b.primary_category_slug,
      b.primary_subcategory_label,
      -- Deterministic score: newer = higher. last_activity_at dominates, then updated_at, then created_at.
      (
        coalesce(extract(epoch from b.last_activity_at), 0) * 1e9
        + coalesce(extract(epoch from b.updated_at), 0) * 1e6
        + coalesce(extract(epoch from b.created_at), 0) * 1e3
        + (case when b.verified then 1000 else 0 end)
        + (case when b.badge is not null and b.badge <> '' then 500 else 0 end)
      )::double precision as cold_start_score
    FROM public.businesses b
    WHERE b.status = 'active'
      AND COALESCE(b.is_system, false) = false  -- Exclude system businesses
      AND b.primary_subcategory_slug is not null
      AND (p_city is null or b.location = p_city or b.location ilike '%' || p_city || '%')
  )
  SELECT
    c.id,
    c.cold_start_score,
    c.primary_category_slug,
    c.primary_subcategory_slug,
    c.primary_subcategory_label
  FROM candidates c
  ORDER BY c.cold_start_score desc, c.id asc
  LIMIT least(greatest(p_pool_size, 100), 2000);
$$;

COMMENT ON FUNCTION get_trending_cold_start_candidates(integer, text) IS 'Cold-start trending: candidates from businesses with metadata-only score (no stats). Diversity applied in API. Now excludes system businesses.';

-- Fix all the recommendation functions to exclude system businesses
-- These are used by the For You page and are critical for hiding Sayso System businesses

-- 1. Fix generate_candidates_personalized
CREATE OR REPLACE FUNCTION generate_candidates_personalized(
  p_user_id UUID,
  p_interest_ids TEXT[],
  p_sub_interest_ids TEXT[],
  p_excluded_ids UUID[],
  p_limit INTEGER DEFAULT 150
)
RETURNS TABLE (
  business_id UUID,
  source TEXT,
  interest_match_score NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    b.id AS business_id,
    'personalized' AS source,
    CASE
      WHEN array_length(p_sub_interest_ids, 1) > 0 AND b.primary_subcategory_slug = ANY(p_sub_interest_ids) THEN 1.0
      WHEN array_length(p_interest_ids, 1) > 0 AND b.primary_category_slug = ANY(p_interest_ids) THEN 0.6
      ELSE 0.2
    END AS interest_match_score
  FROM businesses b
  WHERE b.status = 'active'
    AND COALESCE(b.is_system, false) = false  -- Exclude system businesses
    AND (p_excluded_ids IS NULL OR b.id <> ALL(p_excluded_ids))
    AND (
      -- Match by sub-interest (most specific)
      (array_length(p_sub_interest_ids, 1) > 0 AND b.primary_subcategory_slug = ANY(p_sub_interest_ids))
      OR
      -- Match by interest (broader)
      (array_length(p_interest_ids, 1) > 0 AND b.primary_category_slug = ANY(p_interest_ids))
    )
  ORDER BY
    interest_match_score DESC,
    COALESCE(b.last_activity_at, b.updated_at, b.created_at) DESC
  LIMIT p_limit;
$$;

-- 2. Fix generate_candidates_top_rated
CREATE OR REPLACE FUNCTION generate_candidates_top_rated(
  p_excluded_ids UUID[],
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  business_id UUID,
  source TEXT,
  quality_score NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    b.id AS business_id,
    'top_rated' AS source,
    (
      COALESCE(bs.average_rating, 0) * 0.6 +
      LN(1 + COALESCE(bs.total_reviews, 0)) * 0.4
    ) AS quality_score
  FROM businesses b
  LEFT JOIN business_stats bs ON bs.business_id = b.id
  WHERE b.status = 'active'
    AND COALESCE(b.is_system, false) = false  -- Exclude system businesses
    AND (p_excluded_ids IS NULL OR b.id <> ALL(p_excluded_ids))
    AND COALESCE(bs.average_rating, 0) >= 3.5
    AND COALESCE(bs.total_reviews, 0) >= 2
  ORDER BY quality_score DESC
  LIMIT p_limit;
$$;

-- 3. Fix generate_candidates_fresh
CREATE OR REPLACE FUNCTION generate_candidates_fresh(
  p_excluded_ids UUID[],
  p_limit INTEGER DEFAULT 80
)
RETURNS TABLE (
  business_id UUID,
  source TEXT,
  freshness_score NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    b.id AS business_id,
    'fresh' AS source,
    -- Exponential decay: half-life of 30 days
    EXP(-0.693 * EXTRACT(DAYS FROM NOW() - COALESCE(b.last_activity_at, b.updated_at, b.created_at)) / 30.0) AS freshness_score
  FROM businesses b
  WHERE b.status = 'active'
    AND COALESCE(b.is_system, false) = false  -- Exclude system businesses
    AND (p_excluded_ids IS NULL OR b.id <> ALL(p_excluded_ids))
    AND COALESCE(b.last_activity_at, b.updated_at, b.created_at) > NOW() - INTERVAL '90 days'
  ORDER BY freshness_score DESC
  LIMIT p_limit;
$$;

-- 4. Fix generate_candidates_explore
CREATE OR REPLACE FUNCTION generate_candidates_explore(
  p_excluded_ids UUID[],
  p_seen_sub_interests TEXT[],
  p_limit INTEGER DEFAULT 70
)
RETURNS TABLE (
  business_id UUID,
  source TEXT,
  diversity_score NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    b.id AS business_id,
    'explore' AS source,
    -- Boost businesses from unseen subcategories
    CASE
      WHEN p_seen_sub_interests IS NULL OR array_length(p_seen_sub_interests, 1) = 0 THEN 1.0
      WHEN b.primary_subcategory_slug IS NULL THEN 0.5
      WHEN b.primary_subcategory_slug = ANY(p_seen_sub_interests) THEN 0.3
      ELSE 1.0  -- Unseen subcategory
    END +
    -- Add some randomness for discovery
    random() * 0.2 AS diversity_score
  FROM businesses b
  LEFT JOIN business_stats bs ON bs.business_id = b.id
  WHERE b.status = 'active'
    AND COALESCE(b.is_system, false) = false  -- Exclude system businesses
    AND (p_excluded_ids IS NULL OR b.id <> ALL(p_excluded_ids))
    AND COALESCE(bs.average_rating, 0) >= 3.0
  ORDER BY diversity_score DESC, random()
  LIMIT p_limit;
$$;

COMMENT ON FUNCTION generate_candidates_personalized IS 'Generate personalized business candidates based on user interests. Now excludes system businesses.';
COMMENT ON FUNCTION generate_candidates_top_rated IS 'Generate top-rated business candidates. Now excludes system businesses.';  
COMMENT ON FUNCTION generate_candidates_fresh IS 'Generate recently active business candidates. Now excludes system businesses.';
COMMENT ON FUNCTION generate_candidates_explore IS 'Generate diverse business candidates for exploration. Now excludes system businesses.';

-- 5. Fix recommend_for_you_cold_start function  
CREATE OR REPLACE FUNCTION public.recommend_for_you_cold_start(
  p_interest_ids text[] default array[]::text[],
  p_sub_interest_ids text[] default array[]::text[],
  p_price_ranges text[] default null,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_limit integer default 40,
  p_seed text default null
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  category text,
  interest_id text,
  sub_interest_id text,
  location text,
  address text,
  phone text,
  email text,
  website text,
  image_url text,
  verified boolean,
  price_range text,
  badge text,
  slug text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz,
  updated_at timestamptz,
  total_reviews integer,
  average_rating numeric,
  percentiles jsonb,
  uploaded_images text[],
  personalization_score double precision,
  diversity_rank integer
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH filtered AS (
    SELECT
      b.id,
      b.name,
      b.description,
      b.primary_subcategory_slug as category,
      b.primary_category_slug as interest_id,
      b.primary_subcategory_slug as sub_interest_id,
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
      b.lat as latitude,
      b.lng as longitude,
      b.created_at,
      b.updated_at
    FROM public.businesses b
    WHERE b.status = 'active'
      AND COALESCE(b.is_system, false) = false  -- Exclude system businesses
      AND (p_price_ranges is null or array_length(p_price_ranges, 1) is null or b.price_range = any(p_price_ranges) or b.price_range is null)
  ),
  with_score AS (
    SELECT
      f.*,
      -- Preference scoring: subcategory match +5, category match +2, verified +1, badge +1
      (
        case 
          when array_length(p_sub_interest_ids, 1) > 0 and f.sub_interest_id = any(p_sub_interest_ids) then 5
          when array_length(p_interest_ids, 1) > 0 and f.interest_id = any(p_interest_ids) then 2
          else 0
        end +
        case when f.verified then 1 else 0 end +
        case when f.badge is not null and f.badge <> '' then 1 else 0 end +
        case when f.image_url is not null then 0.5 else 0 end
      ) as personalization_score
    FROM filtered f
  ),
  ranked AS (
    SELECT
      ws.*,
      row_number() over (
        partition by ws.interest_id
        order by ws.personalization_score desc, ws.created_at desc
      ) as category_rank,
      row_number() over (
        order by ws.personalization_score desc, ws.created_at desc
      ) as global_rank
    FROM with_score ws
  ),
  interleaved AS (
    -- Interleave top businesses from each category
    SELECT
      r.*,
      row_number() over (order by r.category_rank, r.global_rank) as diversity_rank
    FROM ranked r
    WHERE r.category_rank <= 10  -- Top 10 per category
    
    UNION ALL
    
    -- Fill remaining slots with highest scoring overall
    SELECT
      r.*,
      1000 + r.global_rank as diversity_rank
    FROM ranked r
    WHERE r.global_rank <= p_limit
      AND r.id not in (
        select r2.id from ranked r2 where r2.category_rank <= 10
      )
  ),
  with_stats AS (
    SELECT
      i.*,
      coalesce(bs.total_reviews, 0) as total_reviews,
      coalesce(bs.average_rating, 0) as average_rating,
      bs.percentiles
    FROM interleaved i
    LEFT JOIN business_stats bs ON bs.business_id = i.id
  ),
  with_images AS (
    SELECT
      ws.*,
      coalesce(
        (
          select array_agg(bi.url order by bi.is_primary desc nulls last, bi.created_at desc)
          from business_images bi
          where bi.business_id = ws.id
        ),
        array[]::text[]
      ) as uploaded_images
    FROM with_stats ws
  )
  SELECT
    wi.id,
    wi.name,
    wi.description,
    wi.category,
    wi.interest_id,
    wi.sub_interest_id,
    wi.location,
    wi.address,
    wi.phone,
    wi.email,
    wi.website,
    wi.image_url,
    wi.verified,
    wi.price_range,
    wi.badge,
    wi.slug,
    wi.latitude,
    wi.longitude,
    wi.created_at,
    wi.updated_at,
    wi.total_reviews,
    wi.average_rating,
    wi.percentiles,
    wi.uploaded_images,
    wi.personalization_score,
    wi.diversity_rank
  FROM with_images wi
  ORDER BY wi.diversity_rank
  LIMIT p_limit;
$$;

COMMENT ON FUNCTION public.recommend_for_you_cold_start IS 'Preference-driven cold start for For You feed. No stats required. Now excludes system businesses.';