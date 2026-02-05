-- Featured cold-start: candidate pool from public.businesses with trust + mild recency + completeness.
-- No stats required. Pool A (trusted) first, then Pool B. Used by /api/featured for diversity-first selection.
-- Trust = verified OR owner_verified OR badge. Score is less time-sensitive than trending.

create or replace function get_featured_cold_start_candidates(
  p_pool_size integer default 1500,
  p_city text default null
)
returns table (
  id uuid,
  featured_score double precision,
  primary_category_slug text,
  primary_subcategory_slug text,
  primary_subcategory_label text,
  is_trusted boolean
)
language sql stable
as $$
  with candidates as (
    select
      b.id,
      b.primary_subcategory_slug,
      b.primary_category_slug,
      b.primary_subcategory_label,
      (
        coalesce(b.verified, false)
        or coalesce(b.owner_verified, false)
        or (b.badge is not null and b.badge <> '')
      ) as is_trusted,
      -- Trust dominates; then mild recency (softer than trending); then completeness.
      (
        (case when coalesce(b.verified, false) or coalesce(b.owner_verified, false) or (b.badge is not null and b.badge <> '') then 1e9 else 0 end)
        + coalesce(extract(epoch from b.updated_at), extract(epoch from b.created_at), 0) * 0.001
        + (case when b.website is not null and b.website <> '' then 100 else 0 end)
        + (case when b.phone is not null and b.phone <> '' then 100 else 0 end)
        + (case when b.address is not null and b.address <> '' then 100 else 0 end)
        + (case when b.lat is not null and b.lng is not null then 100 else 0 end)
      )::double precision as featured_score
    from public.businesses b
    where b.status = 'active'
      and b.primary_subcategory_slug is not null
      and (p_city is null or b.location = p_city or b.location ilike '%' || p_city || '%')
  )
  select
    c.id,
    c.featured_score,
    c.primary_category_slug,
    c.primary_subcategory_slug,
    c.primary_subcategory_label,
    c.is_trusted
  from candidates c
  order by c.is_trusted desc, c.featured_score desc, c.id asc
  limit least(greatest(p_pool_size, 100), 2000);
$$;

comment on function get_featured_cold_start_candidates(integer, text) is
  'Featured cold-start: candidates with trust + mild recency + completeness. Pool A (trusted) first. Diversity applied in API.';

grant execute on function get_featured_cold_start_candidates(integer, text) to authenticated, anon;
