-- Recreate business MVs and get_* RPCs to use primary_subcategory_slug, primary_subcategory_label, primary_category_slug.
-- Prerequisite: run 20260210_rename_business_taxonomy_columns.sql first (renames category -> primary_subcategory_slug, etc.).

begin;

-- Prerequisite: ensure rename migration has been applied
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'businesses' and column_name = 'primary_subcategory_slug'
  ) then
    raise exception 'Missing column public.businesses.primary_subcategory_slug. Run migration 20260210_rename_business_taxonomy_columns.sql first.';
  end if;
end $$;

-- 1. Drop dependent functions
drop function if exists get_trending_businesses(integer, text);
drop function if exists get_top_rated_businesses(integer, text);
drop function if exists get_new_businesses(integer, text);
drop function if exists get_quality_fallback_businesses(integer);

-- 2. Drop MVs
drop materialized view if exists mv_trending_businesses cascade;
drop materialized view if exists mv_top_rated_businesses cascade;
drop materialized view if exists mv_new_businesses cascade;
drop materialized view if exists mv_quality_fallback_businesses cascade;

-- 3. mv_top_rated_businesses (primary_* columns)
create materialized view mv_top_rated_businesses as
select
  b.id,
  b.name,
  b.primary_subcategory_slug,
  b.primary_category_slug,
  b.primary_subcategory_label,
  b.location,
  b.image_url,
  ( select bi.url from public.business_images bi
    where bi.business_id = b.id and bi.is_primary = true
    limit 1
  ) as primary_image_url,
  b.verified,
  b.price_range,
  b.badge,
  b.slug,
  b.lat as latitude,
  b.lng as longitude,
  bs.total_reviews,
  bs.average_rating,
  bs.percentiles,
  (bs.average_rating * log(bs.total_reviews + 1)) as weighted_score,
  b.created_at,
  now() as last_refreshed
from public.businesses b
inner join public.business_stats bs on bs.business_id = b.id
where b.status = 'active'
  and bs.total_reviews >= 3
  and bs.average_rating >= 3.5
order by weighted_score desc, bs.average_rating desc, bs.total_reviews desc
limit 100;

create unique index idx_mv_top_rated_businesses_id on mv_top_rated_businesses(id);
create index idx_mv_top_rated_businesses_primary_subcategory on mv_top_rated_businesses(primary_subcategory_slug);
create index idx_mv_top_rated_businesses_score on mv_top_rated_businesses(weighted_score desc);

-- 4. mv_trending_businesses
create materialized view mv_trending_businesses as
select
  b.id,
  b.name,
  b.primary_subcategory_slug,
  b.primary_category_slug,
  b.primary_subcategory_label,
  b.location,
  b.address,
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
  bs.total_reviews,
  bs.average_rating,
  bs.percentiles,
  (cs.reviews_24h)::integer as recent_reviews_24h,
  (cs.avg_rating_24h)::decimal as recent_avg_rating_24h,
  (cs.trending_score)::decimal as trending_score,
  max(r.created_at) filter (where r.created_at >= now() - interval '24 hours') as last_review_24h,
  now() as last_refreshed
from public.businesses b
inner join public.business_stats bs on bs.business_id = b.id
left join public.reviews r on r.business_id = b.id
cross join lateral calculate_trending_score_24h(b.id, now()) cs
where b.status = 'active'
  and cs.reviews_24h >= 1
  and coalesce(bs.average_rating, 0) >= 3.0
  and b.created_at <= now() - interval '2 days'
group by
  b.id, b.name, b.primary_subcategory_slug, b.primary_category_slug, b.primary_subcategory_label,
  b.location, b.address, b.image_url, b.verified, b.price_range, b.badge,
  b.slug, b.lat, b.lng, b.created_at, b.updated_at,
  bs.total_reviews, bs.average_rating, bs.percentiles,
  cs.reviews_24h, cs.avg_rating_24h, cs.trending_score
order by trending_score desc, recent_avg_rating_24h desc, recent_reviews_24h desc
limit 100;

create unique index idx_mv_trending_businesses_id on mv_trending_businesses(id);
create index idx_mv_trending_businesses_primary_subcategory on mv_trending_businesses(primary_subcategory_slug);
create index idx_mv_trending_businesses_score on mv_trending_businesses(trending_score desc, recent_avg_rating_24h desc);
create index idx_mv_trending_businesses_reviews_24h on mv_trending_businesses(recent_reviews_24h desc);

-- 5. mv_new_businesses
create materialized view mv_new_businesses as
select
  b.id,
  b.name,
  b.primary_subcategory_slug,
  b.primary_category_slug,
  b.primary_subcategory_label,
  b.location,
  b.image_url,
  ( select bi.url from public.business_images bi
    where bi.business_id = b.id and bi.is_primary = true
    limit 1
  ) as primary_image_url,
  b.verified,
  b.price_range,
  b.badge,
  b.slug,
  b.lat as latitude,
  b.lng as longitude,
  bs.total_reviews,
  bs.average_rating,
  bs.percentiles,
  b.created_at,
  now() as last_refreshed
from public.businesses b
left join public.business_stats bs on bs.business_id = b.id
where b.status = 'active'
  and b.created_at >= now() - interval '90 days'
order by b.created_at desc
limit 100;

create unique index idx_mv_new_businesses_id on mv_new_businesses(id);
create index idx_mv_new_businesses_primary_subcategory on mv_new_businesses(primary_subcategory_slug);
create index idx_mv_new_businesses_created_at on mv_new_businesses(created_at desc);

-- 6. mv_quality_fallback_businesses
create materialized view mv_quality_fallback_businesses as
select
  b.id,
  b.name,
  b.primary_subcategory_slug,
  b.primary_category_slug,
  b.primary_subcategory_label,
  b.location,
  b.image_url,
  b.verified,
  b.price_range,
  b.badge,
  b.slug,
  b.lat as latitude,
  b.lng as longitude,
  coalesce(bs.total_reviews, 0) as total_reviews,
  coalesce(bs.average_rating, 0) as average_rating,
  bs.percentiles,
  b.created_at,
  b.updated_at,
  now() as last_refreshed,
  (
    (case when b.verified then 2 else 0 end) +
    (case when coalesce(b.description, '') <> '' then 1 else 0 end) +
    (case when coalesce(b.image_url, '') <> '' then 1 else 0 end) +
    log(1 + coalesce(bs.total_reviews, 0)) +
    (coalesce(bs.average_rating, 0) * 0.5)
  ) as quality_score
from public.businesses b
left join public.business_stats bs on bs.business_id = b.id
where b.status = 'active'
order by quality_score desc, b.created_at desc
limit 200;

create unique index idx_mv_quality_fallback_id on mv_quality_fallback_businesses(id);

-- 7. get_* functions (filter by primary_subcategory_slug)
create or replace function get_top_rated_businesses(
  p_limit integer default 20,
  p_category text default null
)
returns setof mv_top_rated_businesses
language sql stable
as $$
  select * from mv_top_rated_businesses
  where p_category is null or primary_subcategory_slug = p_category
  order by weighted_score desc
  limit p_limit;
$$;

create or replace function get_trending_businesses(
  p_limit integer default 20,
  p_category text default null
)
returns setof mv_trending_businesses
language sql stable
as $$
  select * from mv_trending_businesses
  where p_category is null or primary_subcategory_slug = p_category
  order by trending_score desc, recent_avg_rating_24h desc, recent_reviews_24h desc
  limit p_limit;
$$;

create or replace function get_new_businesses(
  p_limit integer default 20,
  p_category text default null
)
returns setof mv_new_businesses
language sql stable
as $$
  select * from mv_new_businesses
  where p_category is null or primary_subcategory_slug = p_category
  order by created_at desc
  limit p_limit;
$$;

create or replace function get_quality_fallback_businesses(p_limit int default 20)
returns setof mv_quality_fallback_businesses
language sql stable
as $$
  select * from mv_quality_fallback_businesses
  order by quality_score desc
  limit p_limit;
$$;

-- 8. Grants
grant select on mv_top_rated_businesses to authenticated, anon;
grant select on mv_trending_businesses to authenticated, anon;
grant select on mv_new_businesses to authenticated, anon;
grant select on mv_quality_fallback_businesses to authenticated, anon;
grant execute on function get_top_rated_businesses(integer, text) to authenticated, anon;
grant execute on function get_trending_businesses(integer, text) to authenticated, anon;
grant execute on function get_new_businesses(integer, text) to authenticated, anon;
grant execute on function get_quality_fallback_businesses(integer) to authenticated, anon;

-- 9. Initial refresh (refresh_business_views created in 20260207)
select refresh_business_views();

commit;
