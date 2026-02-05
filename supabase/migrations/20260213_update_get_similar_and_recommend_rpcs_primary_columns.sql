-- Update get_similar_businesses to use primary_* taxonomy columns.
-- recommend_for_you_v2 / rank_candidates / recommend_for_you_v2_seeded and other RPCs
-- that read from businesses should be updated in a follow-up migration to use
-- primary_subcategory_slug, primary_category_slug, primary_subcategory_label.
-- Run after 20260212.

begin;

-- =============================================
-- get_similar_businesses
-- =============================================
drop function if exists public.get_similar_businesses(uuid, integer, decimal);

create or replace function public.get_similar_businesses(
  p_target_business_id uuid,
  p_limit integer default 12,
  p_radius_km decimal default 50.0
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
  similarity_score decimal
)
language plpgsql stable
as $$
declare
  v_target_subcategory text;
  v_target_category text;
  v_target_price_range text;
  v_target_lat decimal;
  v_target_lng decimal;
  v_target_location text;
  v_has_postgis boolean;
begin
  select
    b.primary_subcategory_slug,
    b.primary_category_slug,
    b.price_range,
    b.lat,
    b.lng,
    b.location
  into
    v_target_subcategory,
    v_target_category,
    v_target_price_range,
    v_target_lat,
    v_target_lng,
    v_target_location
  from public.businesses b
  where b.id = p_target_business_id
    and b.status = 'active';

  if v_target_subcategory is null then
    return;
  end if;

  select exists (select 1 from pg_extension where extname = 'postgis') into v_has_postgis;

  return query
  with scored_businesses as (
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
          select bi.url from public.business_images bi
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
      coalesce(bs.average_rating, 0)::numeric as average_rating,
      bs.percentiles,
      (
        (
          case when b.primary_subcategory_slug = v_target_subcategory then 60 else 0 end +
          case when b.primary_subcategory_slug is not null and b.primary_subcategory_slug = v_target_subcategory then 25 else 0 end +
          case when b.primary_category_slug is not null and b.primary_category_slug = v_target_category then 15 else 0 end +
          case when v_target_price_range is not null and b.price_range = v_target_price_range then 5 else 0 end +
          case
            when v_target_lat is not null and v_target_lng is not null and b.lat is not null and b.lng is not null then
              case when v_has_postgis then
                greatest(0, 10 - (st_distance(st_makepoint(v_target_lng, v_target_lat)::geography, st_makepoint(b.lng, b.lat)::geography) / 1000.0) / (p_radius_km / 10.0))
              else
                greatest(0, 10 - (6371 * acos(least(1.0, cos(radians(v_target_lat)) * cos(radians(b.lat)) * cos(radians(b.lng) - radians(v_target_lng)) + sin(radians(v_target_lat)) * sin(radians(b.lat)))) / (p_radius_km / 10.0)))
              end
            else 0
          end +
          case
            when coalesce(bs.average_rating, 0) >= 4.0 and coalesce(bs.total_reviews, 0) >= 5 then 4
            when coalesce(bs.average_rating, 0) >= 3.5 and coalesce(bs.total_reviews, 0) >= 3 then 2
            else 0
          end
        )::numeric
      ) as similarity_score,
      case
        when v_target_lat is not null and v_target_lng is not null and b.lat is not null and b.lng is not null then
          case when v_has_postgis then
            st_distance(st_makepoint(v_target_lng, v_target_lat)::geography, st_makepoint(b.lng, b.lat)::geography) / 1000.0
          else
            6371 * acos(least(1.0, cos(radians(v_target_lat)) * cos(radians(b.lat)) * cos(radians(b.lng) - radians(v_target_lng)) + sin(radians(v_target_lat)) * sin(radians(b.lat))))
          end
        else null
      end as distance_km
    from public.businesses b
    left join public.business_stats bs on b.id = bs.business_id
    where b.id != p_target_business_id
      and b.status = 'active'
      and b.primary_subcategory_slug = v_target_subcategory
      and (
        (v_target_category is not null and b.primary_category_slug = v_target_category)
        or (v_target_lat is not null and v_target_lng is not null and b.lat is not null and b.lng is not null
            and ((v_has_postgis and st_dwithin(st_makepoint(v_target_lng, v_target_lat)::geography, st_makepoint(b.lng, b.lat)::geography, p_radius_km * 1000))
                 or (not v_has_postgis and (6371 * acos(least(1.0, cos(radians(v_target_lat)) * cos(radians(b.lat)) * cos(radians(b.lng) - radians(v_target_lng)) + sin(radians(v_target_lat)) * sin(radians(b.lat))))) <= p_radius_km)))
        or (v_target_price_range is not null and b.price_range = v_target_price_range)
        or (v_target_subcategory is null and v_target_category is null and v_target_lat is null and v_target_price_range is null)
      )
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
    sb.similarity_score
  from scored_businesses sb
  where sb.distance_km is null or sb.distance_km <= p_radius_km
  order by sb.similarity_score desc, sb.average_rating desc, sb.total_reviews desc
  limit p_limit;
end;
$$;

grant execute on function public.get_similar_businesses(uuid, integer, decimal) to authenticated, anon;

commit;
