-- Resolve PostgREST function overload ambiguity for get_similar_businesses.
-- Drops all prior overloads and recreates a single version using current taxonomy columns.

begin;

-- Drop any existing overloads
DROP FUNCTION IF EXISTS public.get_similar_businesses(UUID, INTEGER, DECIMAL);
DROP FUNCTION IF EXISTS public.get_similar_businesses(UUID, INTEGER, DOUBLE PRECISION);

CREATE OR REPLACE FUNCTION public.get_similar_businesses(
  p_target_business_id UUID,
  p_limit INTEGER DEFAULT 12,
  p_radius_km DOUBLE PRECISION DEFAULT 50.0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  category TEXT,
  primary_subcategory_slug TEXT,
  primary_category_slug TEXT,
  primary_subcategory_label TEXT,
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
  average_rating DECIMAL,
  percentiles JSONB,
  similarity_score DECIMAL
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_target_subcategory TEXT;
  v_target_category TEXT;
  v_target_price_range TEXT;
  v_target_lat DOUBLE PRECISION;
  v_target_lng DOUBLE PRECISION;
  v_target_location TEXT;
  v_has_postgis BOOLEAN;
BEGIN
  SELECT 
    b.primary_subcategory_slug,
    b.primary_category_slug,
    b.price_range,
    b.lat,
    b.lng,
    b.location
  INTO 
    v_target_subcategory,
    v_target_category,
    v_target_price_range,
    v_target_lat,
    v_target_lng,
    v_target_location
  FROM public.businesses b
  WHERE b.id = p_target_business_id
    AND b.status = 'active';

  IF v_target_subcategory IS NULL THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'postgis'
  ) INTO v_has_postgis;

  RETURN QUERY
  WITH scored_businesses AS (
    SELECT 
      b.id,
      b.name,
      b.description,
      b.primary_subcategory_slug AS category, -- legacy-compatible alias
      b.primary_subcategory_slug,
      b.primary_category_slug,
      b.primary_subcategory_label,
      b.location,
      b.address,
      b.phone,
      b.email,
      b.website,
      b.image_url,
      COALESCE(
        ARRAY(
          SELECT bi.url 
          FROM public.business_images bi 
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
      COALESCE(bs.total_reviews, 0) AS total_reviews,
      COALESCE(bs.average_rating, 0)::numeric AS average_rating,
      bs.percentiles,
      (
        (
          CASE WHEN b.primary_subcategory_slug = v_target_subcategory THEN 70 ELSE 0 END +
          CASE WHEN b.primary_category_slug = v_target_category THEN 20 ELSE 0 END +
          CASE WHEN v_target_price_range IS NOT NULL AND b.price_range = v_target_price_range THEN 5 ELSE 0 END +
          CASE 
            WHEN v_target_lat IS NOT NULL AND v_target_lng IS NOT NULL 
                 AND b.lat IS NOT NULL AND b.lng IS NOT NULL
            THEN
              CASE 
                WHEN v_has_postgis THEN
                  GREATEST(
                    0,
                    10 - (
                      ST_Distance(
                        ST_MakePoint(v_target_lng, v_target_lat)::geography,
                        ST_MakePoint(b.lng, b.lat)::geography
                      ) / 1000.0
                    ) / (p_radius_km / 10.0)
                  )
                ELSE
                  GREATEST(
                    0,
                    10 - (
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
                    ) / (p_radius_km / 10.0)
                  )
              END
            ELSE 0
          END +
          CASE 
            WHEN COALESCE(bs.average_rating, 0) >= 4.0 AND COALESCE(bs.total_reviews, 0) >= 5 THEN 4
            WHEN COALESCE(bs.average_rating, 0) >= 3.5 AND COALESCE(bs.total_reviews, 0) >= 3 THEN 2
            ELSE 0
          END
        )::numeric
      ) AS similarity_score,
      CASE 
        WHEN v_target_lat IS NOT NULL AND v_target_lng IS NOT NULL 
             AND b.lat IS NOT NULL AND b.lng IS NOT NULL
        THEN
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
      AND b.primary_subcategory_slug = v_target_subcategory
  )
  SELECT 
    sb.id,
    sb.name,
    sb.description,
    sb.category,
    sb.primary_subcategory_slug,
    sb.primary_category_slug,
    sb.primary_subcategory_label,
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

GRANT EXECUTE ON FUNCTION public.get_similar_businesses(UUID, INTEGER, DOUBLE PRECISION) TO authenticated, anon;

commit;
