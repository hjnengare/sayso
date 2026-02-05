-- Update list_businesses_optimized and get_featured_businesses to use primary_* taxonomy columns.
-- Run after 20260211_recreate_mvs_and_rpcs_primary_columns.sql.

begin;

-- =============================================
-- 1. list_businesses_optimized
-- =============================================
drop function if exists list_businesses_optimized(
  integer, uuid, timestamptz, text, text, boolean, text, text, decimal, text, decimal, decimal, decimal, text, text
);

create or replace function list_businesses_optimized(
  p_limit integer default 20,
  p_cursor_id uuid default null,
  p_cursor_created_at timestamptz default null,
  p_category text default null,
  p_location text default null,
  p_verified boolean default null,
  p_price_range text default null,
  p_badge text default null,
  p_min_rating decimal default null,
  p_search text default null,
  p_latitude decimal default null,
  p_longitude decimal default null,
  p_radius_km decimal default 10,
  p_sort_by text default 'created_at',
  p_sort_order text default 'desc'
)
returns table (
  id uuid,
  name text,
  description text,
  primary_subcategory_slug text,
  primary_category_slug text,
  primary_subcategory_label text,
  location text,
  address text,
  phone text,
  email text,
  website text,
  image_url text,
  uploaded_images text[],
  verified boolean,
  price_range text,
  badge text,
  slug text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz,
  updated_at timestamptz,
  total_reviews integer,
  average_rating decimal,
  percentiles jsonb,
  distance_km double precision,
  cursor_id uuid,
  cursor_created_at timestamptz
)
language plpgsql stable
as $$
declare
  v_has_postgis boolean;
begin
  select exists (select 1 from pg_extension where extname = 'postgis') into v_has_postgis;

  return query
  with filtered_businesses as (
    select
      b.id,
      b.name,
      b.description,
      b.primary_subcategory_slug,
      b.primary_category_slug,
      b.primary_subcategory_label,
      b.location,
      b.address,
      b.phone,
      b.email,
      b.website,
      b.image_url,
      coalesce(
        array(
          select bi.url from business_images bi
          where bi.business_id = b.id
          order by bi.is_primary desc, bi.sort_order asc
        ),
        array[]::text[]
      ) as uploaded_images,
      b.verified,
      b.price_range,
      b.badge,
      b.slug,
      b.lat as latitude,
      b.lng as longitude,
      b.created_at,
      b.updated_at,
      coalesce(bs.total_reviews, 0) as total_reviews,
      coalesce(bs.average_rating, 0) as average_rating,
      bs.percentiles,
      case
        when p_latitude is not null and p_longitude is not null and b.lat is not null and b.lng is not null then
          case when v_has_postgis then
            st_distance(st_makepoint(p_longitude, p_latitude)::geography, st_makepoint(b.lng, b.lat)::geography) / 1000.0
          else
            6371 * acos(least(1.0,
              cos(radians(p_latitude)) * cos(radians(b.lat)) * cos(radians(b.lng) - radians(p_longitude)) +
              sin(radians(p_latitude)) * sin(radians(b.lat))))
          end
        else null
      end as distance_km
    from businesses b
    left join business_stats bs on b.id = bs.business_id
    where b.status = 'active'
      and (p_category is null or b.primary_subcategory_slug ilike p_category)
      and (p_location is null or b.location ilike '%' || p_location || '%')
      and (p_verified is null or b.verified = p_verified)
      and (p_price_range is null or b.price_range = p_price_range)
      and (p_badge is null or b.badge = p_badge)
      and (p_min_rating is null or coalesce(bs.average_rating, 0) >= p_min_rating)
      and (p_search is null or
        b.name ilike '%' || p_search || '%' or
        b.description ilike '%' || p_search || '%' or
        b.primary_subcategory_slug ilike '%' || p_search || '%' or
        b.location ilike '%' || p_search || '%')
      and (
        p_cursor_id is null or
        (p_sort_by = 'created_at' and p_sort_order = 'desc' and (b.created_at < p_cursor_created_at or (b.created_at = p_cursor_created_at and b.id < p_cursor_id))) or
        (p_sort_by = 'created_at' and p_sort_order = 'asc' and (b.created_at > p_cursor_created_at or (b.created_at = p_cursor_created_at and b.id > p_cursor_id))) or
        (p_sort_by != 'created_at' and b.id < p_cursor_id)
      )
  ),
  sorted_businesses as (
    select * from filtered_businesses
    order by
      case when p_sort_by = 'created_at' and p_sort_order = 'desc' then created_at end desc,
      case when p_sort_by = 'created_at' and p_sort_order = 'asc' then created_at end asc,
      case when p_sort_by = 'total_reviews' and p_sort_order = 'desc' then total_reviews end desc,
      case when p_sort_by = 'total_reviews' and p_sort_order = 'asc' then total_reviews end asc,
      case when (p_sort_by = 'average_rating' or p_sort_by = 'total_rating' or p_sort_by = 'rating') and p_sort_order = 'desc' then average_rating end desc,
      case when (p_sort_by = 'average_rating' or p_sort_by = 'total_rating' or p_sort_by = 'rating') and p_sort_order = 'asc' then average_rating end asc,
      case when p_sort_by = 'distance' and p_sort_order = 'asc' then distance_km end asc,
      id desc
    limit p_limit
  )
  select
    sb.id,
    sb.name,
    sb.description,
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
    sb.distance_km,
    sb.id as cursor_id,
    sb.created_at as cursor_created_at
  from sorted_businesses sb;
end;
$$;

grant execute on function list_businesses_optimized(integer, uuid, timestamptz, text, text, boolean, text, text, decimal, text, decimal, decimal, decimal, text, text) to authenticated, anon;

-- =============================================
-- 2. get_featured_businesses
-- =============================================
drop function if exists get_featured_businesses(text, integer, text);

create or replace function get_featured_businesses(
  p_region text default null,
  p_limit integer default 12,
  p_seed text default null
)
returns table (
  id uuid,
  name text,
  image_url text,
  primary_subcategory_slug text,
  primary_subcategory_label text,
  primary_category_slug text,
  description text,
  location text,
  average_rating decimal(3,2),
  total_reviews integer,
  verified boolean,
  slug text,
  last_activity_at timestamptz,
  recent_reviews_30d integer,
  recent_reviews_7d integer,
  bayesian_rating decimal(4,2),
  featured_score decimal(10,6),
  bucket text
)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_min_rating decimal(3,2) := 4.0;
  v_min_reviews integer := 5;
  v_prior_rating decimal(3,2) := 4.0;
  v_prior_reviews integer := 5;
  v_top_per_bucket integer := 2;
begin
  return query
  with recent_review_counts as (
    select
      r.business_id,
      count(*) filter (where r.created_at >= now() - interval '30 days')::integer as recent_reviews_30d,
      count(*) filter (where r.created_at >= now() - interval '7 days')::integer as recent_reviews_7d
    from reviews r
    group by r.business_id
  ),
  qualified_businesses as (
    select
      b.id,
      b.name,
      coalesce(b.image_url::text, '') as image_url,
      b.primary_subcategory_slug::text,
      b.primary_subcategory_label::text as primary_subcategory_label,
      b.primary_category_slug::text as primary_category_slug,
      b.description::text,
      coalesce(b.location::text, '') as location,
      (coalesce(bs.average_rating, 0)::decimal(3,2)) as average_rating,
      (coalesce(bs.total_reviews, 0)::integer) as total_reviews,
      coalesce(b.verified, false) as verified,
      b.slug::text,
      coalesce(b.last_activity_at, b.updated_at, b.created_at) as last_activity_at,
      coalesce(rr.recent_reviews_30d, 0)::integer as recent_reviews_30d,
      coalesce(rr.recent_reviews_7d, 0)::integer as recent_reviews_7d,
      (
        (coalesce(bs.average_rating, 0) * coalesce(bs.total_reviews, 0) + v_prior_rating * v_prior_reviews)
        / (coalesce(bs.total_reviews, 0) + v_prior_reviews)
      )::decimal(4,2) as bayesian_rating,
      (
        (
          (coalesce(bs.average_rating, 0) * coalesce(bs.total_reviews, 0) + v_prior_rating * v_prior_reviews)
          / (coalesce(bs.total_reviews, 0) + v_prior_reviews)
        ) * 0.60
        + ln(1 + coalesce(bs.total_reviews, 0)) * 0.20
        + ln(1 + coalesce(rr.recent_reviews_30d, 0)) * 0.20
      )::decimal(10,6) as featured_score,
      coalesce(b.primary_subcategory_slug::text, '') as bucket,
      case when p_region is not null and b.location is not null and lower(b.location::text) like '%' || lower(p_region) || '%' then true else false end as is_local,
      md5(coalesce(p_seed, '') || b.id::text) as seed_hash
    from businesses b
    left join business_stats bs on bs.business_id = b.id
    left join recent_review_counts rr on rr.business_id = b.id
    where b.status = 'active'
      and coalesce(bs.average_rating, 0) >= v_min_rating
      and coalesce(bs.total_reviews, 0) >= v_min_reviews
      and coalesce(b.last_activity_at, b.updated_at, b.created_at) > now() - interval '180 days'
  ),
  ranked_per_bucket as (
    select
      qb.*,
      row_number() over (
        partition by qb.bucket
        order by qb.is_local desc, qb.featured_score desc, qb.total_reviews desc, qb.last_activity_at desc, qb.seed_hash asc, qb.id asc
      ) as bucket_rank
    from qualified_businesses qb
  ),
  bucket_winners as (
    select
      rpb.id,
      rpb.name,
      rpb.image_url,
      rpb.primary_subcategory_slug,
      rpb.primary_subcategory_label,
      rpb.primary_category_slug,
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
    from ranked_per_bucket rpb
    where rpb.bucket_rank <= v_top_per_bucket
  )
  select
    bw.id,
    bw.name,
    bw.image_url,
    bw.primary_subcategory_slug,
    bw.primary_subcategory_label,
    bw.primary_category_slug,
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
  from bucket_winners bw
  order by bw.bucket, bw.featured_score desc, bw.total_reviews desc, bw.last_activity_at desc, bw.id asc
  limit p_limit;
end;
$$;

grant execute on function get_featured_businesses(text, integer, text) to authenticated, anon;

commit;
