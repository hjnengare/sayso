-- Rename business taxonomy columns to crystal-clear names and drop legacy columns.
-- Prerequisite: public.canonical_subcategory_slugs(slug) must exist for the FK in step 4.
-- After this migration, app code must use: primary_subcategory_slug, primary_subcategory_label, primary_category_slug.

begin;

-- ----------------------------
-- 0) Drop legacy-dependent indexes
-- ----------------------------
drop index if exists public.idx_businesses_status_category;
drop index if exists public.idx_businesses_status_category_verified;
drop index if exists public.idx_businesses_status_category_price;

-- ----------------------------
-- 1) Drop trigger(s) that reference legacy columns
-- ----------------------------
drop trigger if exists businesses_search_vector_trigger on public.businesses;
drop trigger if exists businesses_search_vector_update on public.businesses;
drop trigger if exists businesses_search_vector_update_trigger on public.businesses;

-- ----------------------------
-- 1b) Drop MVs and functions that depend on businesses columns we are renaming/dropping
--     (20260211 will recreate them using primary_* columns)
-- ----------------------------
drop function if exists get_trending_businesses(integer, text);
drop function if exists get_top_rated_businesses(integer, text);
drop function if exists get_new_businesses(integer, text);
drop function if exists get_quality_fallback_businesses(integer);
drop materialized view if exists mv_trending_businesses cascade;
drop materialized view if exists mv_top_rated_businesses cascade;
drop materialized view if exists mv_new_businesses cascade;
drop materialized view if exists mv_quality_fallback_businesses cascade;

-- ----------------------------
-- 2) Rename taxonomy columns to crystal-clear names
-- ----------------------------
-- category (subcategory slug) -> primary_subcategory_slug
alter table public.businesses
  rename column category to primary_subcategory_slug;

-- category_label -> primary_subcategory_label
alter table public.businesses
  rename column category_label to primary_subcategory_label;

-- interest_id (parent category slug) -> primary_category_slug
alter table public.businesses
  rename column interest_id to primary_category_slug;

-- ----------------------------
-- 3) Drop legacy taxonomy columns
-- ----------------------------
alter table public.businesses
  drop column if exists category_legacy,
  drop column if exists sub_interest_id;

-- ----------------------------
-- 4) Fix FK constraint: point to renamed column and canonical_subcategory_slugs
-- ----------------------------
alter table public.businesses
  drop constraint if exists businesses_category_slug_fk;

-- Only add FK if canonical_subcategory_slugs exists (create that table in another migration if needed)
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'canonical_subcategory_slugs'
  ) then
    alter table public.businesses
      add constraint businesses_primary_subcategory_slug_fk
      foreign key (primary_subcategory_slug)
      references public.canonical_subcategory_slugs (slug);
  end if;
end $$;

-- ----------------------------
-- 5) Recreate indexes using the new column names
-- ----------------------------
create index if not exists idx_businesses_status_primary_subcategory
  on public.businesses using btree (status, primary_subcategory_slug)
  where (status = 'active');

create index if not exists idx_businesses_status_primary_category
  on public.businesses using btree (status, primary_category_slug)
  where (status = 'active');

create index if not exists idx_businesses_primary_category
  on public.businesses using btree (primary_category_slug)
  where (primary_category_slug is not null);

create index if not exists idx_businesses_primary_subcategory
  on public.businesses using btree (primary_subcategory_slug);

-- ----------------------------
-- 6) Recreate search vector function and trigger (use new column name)
-- ----------------------------
create or replace function public.businesses_search_vector_update() returns trigger as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.primary_subcategory_slug, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.location, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(new.description, '')), 'C');
  return new;
end;
$$ language plpgsql;

create trigger businesses_search_vector_trigger
  before insert or update of name, location, description, primary_subcategory_slug
  on public.businesses
  for each row
  execute function public.businesses_search_vector_update();

-- Backfill search_vector for existing rows
update public.businesses
set search_vector =
  setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(primary_subcategory_slug, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(location, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'C')
where search_vector is null or search_vector = ''::tsvector;

commit;
