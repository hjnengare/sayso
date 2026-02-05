-- Fix: list_businesses_optimized ORDER BY "created_at" ambiguity in PL/pgSQL
-- Context: unqualified column names inside plpgsql can be ambiguous with OUT parameters.

begin;

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
    select * from filtered_businesses fb
    order by
      case when p_sort_by = 'created_at' and p_sort_order = 'desc' then fb.created_at end desc,
      case when p_sort_by = 'created_at' and p_sort_order = 'asc' then fb.created_at end asc,
      case when p_sort_by = 'total_reviews' and p_sort_order = 'desc' then fb.total_reviews end desc,
      case when p_sort_by = 'total_reviews' and p_sort_order = 'asc' then fb.total_reviews end asc,
      case when (p_sort_by = 'average_rating' or p_sort_by = 'total_rating' or p_sort_by = 'rating') and p_sort_order = 'desc' then fb.average_rating end desc,
      case when (p_sort_by = 'average_rating' or p_sort_by = 'total_rating' or p_sort_by = 'rating') and p_sort_order = 'asc' then fb.average_rating end asc,
      case when p_sort_by = 'distance' and p_sort_order = 'asc' then fb.distance_km end asc,
      fb.id desc
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

commit;

