-- Preference-driven cold start for For You feed.
-- No stats required: score by declared preferences only (subcategory +5, category +2, verified +1, badge +1, has image +0.5).
-- Hard-exclude by dealbreaker price ranges. Diversity via interleave (top per category then rotate).
-- Use when V2 returns empty or for new users so "For You" never shows a dead screen.

create or replace function public.recommend_for_you_cold_start(
  p_interest_ids text[] default array[]::text[],
  p_sub_interest_ids text[] default array[]::text[],
  p_price_ranges text[] default null,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_limit integer default 40,
  p_seed text default null
)
returns table (
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
language sql
stable
set search_path = public
as $$
  with filtered as (
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
      b.verified,
      b.price_range,
      b.badge,
      b.slug,
      b.lat,
      b.lng,
      b.created_at,
      b.updated_at
    from public.businesses b
    where b.status = 'active'
      and (p_price_ranges is null or array_length(p_price_ranges, 1) is null or b.price_range = any(p_price_ranges) or b.price_range is null)
  ),
  with_score as (
    select
      f.*,
      (
        case when array_length(p_sub_interest_ids, 1) > 0 and f.primary_subcategory_slug = any(p_sub_interest_ids) then 5.0 else 0 end
        + case when array_length(p_interest_ids, 1) > 0 and f.primary_category_slug = any(p_interest_ids) then 2.0 else 0 end
        + case when coalesce(f.verified, false) then 1.0 else 0 end
        + case when f.badge is not null and f.badge <> '' then 1.0 else 0 end
        + case when f.image_url is not null and f.image_url <> '' then 0.5
               when exists (select 1 from public.business_images bi where bi.business_id = f.id limit 1) then 0.5
               else 0 end
      )::double precision as preference_score
    from filtered f
  ),
  ranked_per_bucket as (
    select
      s.*,
      row_number() over (
        partition by coalesce(s.primary_subcategory_slug, s.primary_category_slug, 'other')
        order by s.preference_score desc, md5(s.id::text || coalesce(p_seed, ''))
      ) as bucket_rank
    from with_score s
  ),
  diversity_ordered as (
    select
      r.*,
      row_number() over (order by r.bucket_rank, coalesce(r.primary_subcategory_slug, 'z'), r.preference_score desc, md5(r.id::text || coalesce(p_seed, ''))) as diversity_rank
    from ranked_per_bucket r
    where r.bucket_rank <= 5
  ),
  with_images as (
    select
      d.id,
      d.name,
      d.description,
      d.primary_subcategory_slug,
      d.primary_category_slug,
      d.location,
      d.address,
      d.phone,
      d.email,
      d.website,
      d.image_url,
      d.verified,
      d.price_range,
      d.badge,
      d.slug,
      d.lat,
      d.lng,
      d.created_at,
      d.updated_at,
      d.preference_score,
      d.diversity_rank,
      coalesce(
        (select array_agg(bi.url order by bi.is_primary desc nulls last, bi.sort_order asc nulls last)
         from public.business_images bi where bi.business_id = d.id),
        array[]::text[]
      ) as uploaded_images
    from diversity_ordered d
    order by d.diversity_rank
    limit p_limit
  )
  select
    w.id,
    w.name,
    w.description,
    w.primary_subcategory_slug::text as category,
    w.primary_category_slug::text as interest_id,
    w.primary_subcategory_slug::text as sub_interest_id,
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
    w.lat as latitude,
    w.lng as longitude,
    w.created_at,
    w.updated_at,
    0::integer as total_reviews,
    0::numeric as average_rating,
    null::jsonb as percentiles,
    w.uploaded_images,
    w.preference_score as personalization_score,
    w.diversity_rank::integer
  from with_images w
  order by w.diversity_rank;
$$;

comment on function public.recommend_for_you_cold_start(text[], text[], text[], double precision, double precision, integer, text) is
'Preference-only cold start For You feed. No stats. Score: subcategory +5, category +2, verified +1, badge +1, image +0.5. Hard-exclude by price_ranges (allowed list). Diversity by interleaving top per category.';

grant execute on function public.recommend_for_you_cold_start(text[], text[], text[], double precision, double precision, integer, text) to authenticated;
grant execute on function public.recommend_for_you_cold_start(text[], text[], text[], double precision, double precision, integer, text) to anon;
