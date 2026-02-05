-- Cold-start trending: candidate pool from public.businesses with metadata-only score.
-- No stats (business_stats) required. Used by /api/trending for diversity-first selection.
-- Scoring: last_activity_at (strongest) > updated_at > created_at; small boost for verified/badge.

create or replace function get_trending_cold_start_candidates(
  p_pool_size integer default 1500,
  p_city text default null
)
returns table (
  id uuid,
  cold_start_score double precision,
  primary_category_slug text,
  primary_subcategory_slug text,
  primary_subcategory_label text
)
language sql stable
as $$
  with candidates as (
    select
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
    from public.businesses b
    where b.status = 'active'
      and b.primary_subcategory_slug is not null
      and (p_city is null or b.location = p_city or b.location ilike '%' || p_city || '%')
  )
  select
    c.id,
    c.cold_start_score,
    c.primary_category_slug,
    c.primary_subcategory_slug,
    c.primary_subcategory_label
  from candidates c
  order by c.cold_start_score desc, c.id asc
  limit least(greatest(p_pool_size, 100), 2000);
$$;

comment on function get_trending_cold_start_candidates(integer, text) is
  'Cold-start trending: candidates from businesses with metadata-only score (no stats). Diversity applied in API.';

grant execute on function get_trending_cold_start_candidates(integer, text) to authenticated, anon;
