-- Quicket event category taxonomy support (events only; specials untouched).

ALTER TABLE public.events_and_specials
  ADD COLUMN IF NOT EXISTS quicket_category_slug text,
  ADD COLUMN IF NOT EXISTS quicket_category_label text;

ALTER TABLE public.events_and_specials
  DROP CONSTRAINT IF EXISTS events_and_specials_quicket_category_slug_check;

ALTER TABLE public.events_and_specials
  ADD CONSTRAINT events_and_specials_quicket_category_slug_check CHECK (
    quicket_category_slug IS NULL OR
    quicket_category_slug IN (
      'music',
      'festivals',
      'tech-business',
      'arts',
      'food-drink',
      'community'
    )
  );

CREATE INDEX IF NOT EXISTS idx_events_and_specials_quicket_category_slug
  ON public.events_and_specials (quicket_category_slug)
  WHERE type = 'event' AND lower(coalesce(icon, '')) = 'quicket';

-- One-time backfill for existing Quicket event rows.
WITH quicket_rows AS (
  SELECT
    id,
    lower(
      trim(
        concat_ws(' ', coalesce(title, ''), coalesce(description, ''))
      )
    ) AS haystack
  FROM public.events_and_specials
  WHERE type = 'event'
    AND lower(coalesce(icon, '')) = 'quicket'
),
classified AS (
  SELECT
    id,
    CASE
      WHEN haystack ~* '(festival|\\mfest\\M|carnival|block party|street party|celebration)' THEN 'festivals'
      WHEN haystack ~* '(music|concert|live show|live music|\\mdj\\M|\\mband\\M|orchestra|gig|jazz|rock|hip[ -]?hop|electronic|house)' THEN 'music'
      WHEN haystack ~* '(tech|technology|business|startup|start-up|entrepreneur|networking|conference|summit|innovation|digital|fintech|\\mai\\M)' THEN 'tech-business'
      WHEN haystack ~* '(\\mart\\M|\\marts\\M|culture|theatre|theater|comedy|film|cinema|dance|poetry|gallery|exhibition|performance)' THEN 'arts'
      WHEN haystack ~* '(food|drink|wine|beer|cocktail|dining|dinner|lunch|brunch|culinary|tasting|restaurant|market)' THEN 'food-drink'
      ELSE 'community'
    END AS category_slug
  FROM quicket_rows
)
UPDATE public.events_and_specials e
SET
  quicket_category_slug = c.category_slug,
  quicket_category_label = CASE c.category_slug
    WHEN 'music' THEN 'Music'
    WHEN 'festivals' THEN 'Festivals'
    WHEN 'tech-business' THEN 'Tech & Business'
    WHEN 'arts' THEN 'Arts'
    WHEN 'food-drink' THEN 'Food & Drink'
    ELSE 'Community'
  END,
  updated_at = now()
FROM classified c
WHERE e.id = c.id
  AND (
    e.quicket_category_slug IS NULL OR
    e.quicket_category_label IS NULL
  );

-- Extend consolidated upsert function to persist Quicket category metadata.
CREATE OR REPLACE FUNCTION public.upsert_events_and_specials_consolidated(p_rows jsonb)
RETURNS TABLE(inserted integer, updated integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count integer := 0;
  updated_count integer := 0;
BEGIN
  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RETURN QUERY SELECT 0::integer, 0::integer;
    RETURN;
  END IF;

  WITH rows AS (
    SELECT
      nullif(btrim(r->>'title'), '')::text AS title,
      nullif(btrim(r->>'type'), '')::text AS type,
      nullif(btrim(r->>'business_id'), '')::uuid AS business_id,
      nullif(btrim(r->>'created_by'), '')::uuid AS created_by,
      nullif(btrim(r->>'start_date'), '')::timestamptz AS start_date,
      nullif(btrim(r->>'end_date'), '')::timestamptz AS end_date,
      nullif(btrim(r->>'location'), '')::text AS location,
      nullif(btrim(r->>'description'), '')::text AS description,
      nullif(btrim(r->>'icon'), '')::text AS icon,
      nullif(btrim(r->>'image'), '')::text AS image,
      nullif(btrim(r->>'booking_url'), '')::text AS booking_url,
      nullif(btrim(r->>'booking_contact'), '')::text AS booking_contact,
      CASE
        WHEN nullif(btrim(r->>'price'), '') IS NULL THEN NULL::numeric
        ELSE (r->>'price')::numeric
      END AS price,
      CASE
        WHEN nullif(btrim(r->>'rating'), '') IS NULL THEN 0::numeric
        ELSE (r->>'rating')::numeric
      END AS rating,
      CASE
        WHEN nullif(btrim(r->>'quicket_category_slug'), '') IN (
          'music',
          'festivals',
          'tech-business',
          'arts',
          'food-drink',
          'community'
        )
        THEN nullif(btrim(r->>'quicket_category_slug'), '')::text
        ELSE NULL::text
      END AS quicket_category_slug,
      nullif(btrim(r->>'quicket_category_label'), '')::text AS quicket_category_label
    FROM jsonb_array_elements(p_rows) AS r
  ),
  filtered AS (
    SELECT *
    FROM rows
    WHERE title IS NOT NULL
      AND type IN ('event', 'special')
      AND business_id IS NOT NULL
      AND created_by IS NOT NULL
      AND start_date IS NOT NULL
  ),
  upserted AS (
    INSERT INTO public.events_and_specials (
      title,
      type,
      business_id,
      start_date,
      end_date,
      location,
      description,
      icon,
      image,
      price,
      rating,
      booking_url,
      booking_contact,
      created_by,
      quicket_category_slug,
      quicket_category_label
    )
    SELECT
      f.title,
      f.type,
      f.business_id,
      f.start_date,
      f.end_date,
      f.location,
      f.description,
      f.icon,
      f.image,
      f.price,
      f.rating,
      f.booking_url,
      f.booking_contact,
      f.created_by,
      f.quicket_category_slug,
      coalesce(
        f.quicket_category_label,
        CASE f.quicket_category_slug
          WHEN 'music' THEN 'Music'
          WHEN 'festivals' THEN 'Festivals'
          WHEN 'tech-business' THEN 'Tech & Business'
          WHEN 'arts' THEN 'Arts'
          WHEN 'food-drink' THEN 'Food & Drink'
          WHEN 'community' THEN 'Community'
          ELSE NULL
        END
      )
    FROM filtered f
    ON CONFLICT (
      (lower(btrim(title))),
      (public.utc_date(start_date)),
      (lower(btrim(COALESCE(location, ''))))
    )
    DO UPDATE SET
      start_date = LEAST(events_and_specials.start_date, EXCLUDED.start_date),
      end_date = CASE
        WHEN events_and_specials.end_date IS NULL THEN EXCLUDED.end_date
        WHEN EXCLUDED.end_date IS NULL THEN events_and_specials.end_date
        ELSE GREATEST(events_and_specials.end_date, EXCLUDED.end_date)
      END,
      description = CASE
        WHEN EXCLUDED.description IS NOT NULL
         AND (events_and_specials.description IS NULL
              OR length(EXCLUDED.description) > length(events_and_specials.description))
        THEN EXCLUDED.description
        ELSE events_and_specials.description
      END,
      image = COALESCE(EXCLUDED.image, events_and_specials.image),
      booking_url = COALESCE(EXCLUDED.booking_url, events_and_specials.booking_url),
      quicket_category_slug = COALESCE(EXCLUDED.quicket_category_slug, events_and_specials.quicket_category_slug),
      quicket_category_label = COALESCE(EXCLUDED.quicket_category_label, events_and_specials.quicket_category_label),
      updated_at = now()
    WHERE events_and_specials.business_id = EXCLUDED.business_id
    RETURNING (xmax = 0) AS inserted_flag
  )
  SELECT
    COALESCE(COUNT(*) FILTER (WHERE inserted_flag), 0)::integer,
    COALESCE(COUNT(*) FILTER (WHERE NOT inserted_flag), 0)::integer
  INTO inserted_count, updated_count
  FROM upserted;

  RETURN QUERY SELECT inserted_count, updated_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.upsert_events_and_specials_consolidated(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_events_and_specials_consolidated(jsonb) TO service_role;
