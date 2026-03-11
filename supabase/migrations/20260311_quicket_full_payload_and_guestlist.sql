-- Quicket full-payload persistence + guestlist count support.
-- Keeps existing specials/manual event behavior intact.

ALTER TABLE public.events_and_specials
  ADD COLUMN IF NOT EXISTS is_community_event boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS external_url text,
  ADD COLUMN IF NOT EXISTS cta_source text,
  ADD COLUMN IF NOT EXISTS whatsapp_number text,
  ADD COLUMN IF NOT EXISTS whatsapp_prefill_template text,
  ADD COLUMN IF NOT EXISTS availability_status text,
  ADD COLUMN IF NOT EXISTS quicket_event_id bigint,
  ADD COLUMN IF NOT EXISTS event_name text,
  ADD COLUMN IF NOT EXISTS event_description text,
  ADD COLUMN IF NOT EXISTS event_url text,
  ADD COLUMN IF NOT EXISTS event_image_url text,
  ADD COLUMN IF NOT EXISTS event_start_date timestamptz,
  ADD COLUMN IF NOT EXISTS event_end_date timestamptz,
  ADD COLUMN IF NOT EXISTS event_created_at timestamptz,
  ADD COLUMN IF NOT EXISTS event_last_modified timestamptz,
  ADD COLUMN IF NOT EXISTS venue_id bigint,
  ADD COLUMN IF NOT EXISTS venue_name text,
  ADD COLUMN IF NOT EXISTS venue_address_line1 text,
  ADD COLUMN IF NOT EXISTS venue_address_line2 text,
  ADD COLUMN IF NOT EXISTS venue_latitude double precision,
  ADD COLUMN IF NOT EXISTS venue_longitude double precision,
  ADD COLUMN IF NOT EXISTS locality_level_one text,
  ADD COLUMN IF NOT EXISTS locality_level_two text,
  ADD COLUMN IF NOT EXISTS locality_level_three text,
  ADD COLUMN IF NOT EXISTS organiser_id bigint,
  ADD COLUMN IF NOT EXISTS organiser_name text,
  ADD COLUMN IF NOT EXISTS organiser_phone text,
  ADD COLUMN IF NOT EXISTS organiser_mobile text,
  ADD COLUMN IF NOT EXISTS organiser_facebook_url text,
  ADD COLUMN IF NOT EXISTS organiser_twitter_handle text,
  ADD COLUMN IF NOT EXISTS organiser_hashtag text,
  ADD COLUMN IF NOT EXISTS organiser_page_url text,
  ADD COLUMN IF NOT EXISTS quicket_categories_json jsonb,
  ADD COLUMN IF NOT EXISTS tickets_json jsonb,
  ADD COLUMN IF NOT EXISTS minimum_ticket_price numeric,
  ADD COLUMN IF NOT EXISTS maximum_ticket_price numeric,
  ADD COLUMN IF NOT EXISTS tickets_available_boolean boolean,
  ADD COLUMN IF NOT EXISTS schedules_json jsonb,
  ADD COLUMN IF NOT EXISTS guestlist_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_events_and_specials_quicket_event_id
  ON public.events_and_specials (quicket_event_id)
  WHERE type = 'event' AND lower(coalesce(icon, '')) = 'quicket';

-- Backfill event_* fields for existing Quicket rows where possible.
UPDATE public.events_and_specials
SET
  event_name = COALESCE(event_name, title),
  event_description = COALESCE(event_description, description),
  event_url = COALESCE(event_url, booking_url),
  event_image_url = COALESCE(event_image_url, image),
  event_start_date = COALESCE(event_start_date, start_date),
  event_end_date = COALESCE(event_end_date, end_date)
WHERE type = 'event'
  AND lower(coalesce(icon, '')) = 'quicket';

-- Keep guestlist_count synced with event_rsvps.
CREATE OR REPLACE FUNCTION public.refresh_events_and_specials_guestlist_count(p_event_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_event_id IS NULL OR btrim(p_event_id) = '' THEN
    RETURN;
  END IF;

  UPDATE public.events_and_specials e
  SET
    guestlist_count = COALESCE(src.cnt, 0),
    updated_at = now()
  FROM (
    SELECT COUNT(*)::integer AS cnt
    FROM public.event_rsvps r
    WHERE r.event_id = p_event_id
  ) src
  WHERE e.id::text = p_event_id;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.event_rsvps') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_event_rsvps_guestlist_sync_ins ON public.event_rsvps;
    DROP TRIGGER IF EXISTS trg_event_rsvps_guestlist_sync_del ON public.event_rsvps;
    DROP TRIGGER IF EXISTS trg_event_rsvps_guestlist_sync_upd ON public.event_rsvps;

    CREATE OR REPLACE FUNCTION public.trg_event_rsvps_guestlist_sync()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $fn$
    BEGIN
      IF TG_OP = 'INSERT' THEN
        PERFORM public.refresh_events_and_specials_guestlist_count(NEW.event_id);
        RETURN NEW;
      ELSIF TG_OP = 'DELETE' THEN
        PERFORM public.refresh_events_and_specials_guestlist_count(OLD.event_id);
        RETURN OLD;
      ELSE
        IF NEW.event_id IS DISTINCT FROM OLD.event_id THEN
          PERFORM public.refresh_events_and_specials_guestlist_count(OLD.event_id);
        END IF;
        PERFORM public.refresh_events_and_specials_guestlist_count(NEW.event_id);
        RETURN NEW;
      END IF;
    END;
    $fn$;

    CREATE TRIGGER trg_event_rsvps_guestlist_sync_ins
      AFTER INSERT ON public.event_rsvps
      FOR EACH ROW
      EXECUTE FUNCTION public.trg_event_rsvps_guestlist_sync();

    CREATE TRIGGER trg_event_rsvps_guestlist_sync_del
      AFTER DELETE ON public.event_rsvps
      FOR EACH ROW
      EXECUTE FUNCTION public.trg_event_rsvps_guestlist_sync();

    CREATE TRIGGER trg_event_rsvps_guestlist_sync_upd
      AFTER UPDATE OF event_id ON public.event_rsvps
      FOR EACH ROW
      EXECUTE FUNCTION public.trg_event_rsvps_guestlist_sync();
  END IF;
END;
$$;

-- Backfill guestlist_count from existing RSVP rows.
DO $$
BEGIN
  IF to_regclass('public.event_rsvps') IS NOT NULL THEN
    UPDATE public.events_and_specials e
    SET guestlist_count = COALESCE(src.cnt, 0)
    FROM (
      SELECT event_id, COUNT(*)::integer AS cnt
      FROM public.event_rsvps
      GROUP BY event_id
    ) src
    WHERE e.id::text = src.event_id;
  END IF;
END;
$$;

-- Replace consolidated upsert helper to support full Quicket payload fields.
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
        WHEN nullif(btrim(r->>'is_community_event'), '') IS NULL THEN false
        ELSE (r->>'is_community_event')::boolean
      END AS is_community_event,
      nullif(btrim(r->>'external_url'), '')::text AS external_url,
      CASE
        WHEN nullif(btrim(r->>'cta_source'), '') IN ('website', 'whatsapp', 'quicket', 'webtickets', 'other')
        THEN nullif(btrim(r->>'cta_source'), '')::text
        ELSE NULL::text
      END AS cta_source,
      nullif(btrim(r->>'whatsapp_number'), '')::text AS whatsapp_number,
      nullif(btrim(r->>'whatsapp_prefill_template'), '')::text AS whatsapp_prefill_template,
      CASE
        WHEN nullif(btrim(r->>'availability_status'), '') IN ('sold_out', 'limited')
        THEN nullif(btrim(r->>'availability_status'), '')::text
        ELSE NULL::text
      END AS availability_status,
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
      nullif(btrim(r->>'quicket_category_label'), '')::text AS quicket_category_label,
      CASE
        WHEN nullif(btrim(r->>'quicket_event_id'), '') IS NULL THEN NULL::bigint
        ELSE (r->>'quicket_event_id')::bigint
      END AS quicket_event_id,
      nullif(btrim(r->>'event_name'), '')::text AS event_name,
      nullif(btrim(r->>'event_description'), '')::text AS event_description,
      nullif(btrim(r->>'event_url'), '')::text AS event_url,
      nullif(btrim(r->>'event_image_url'), '')::text AS event_image_url,
      nullif(btrim(r->>'event_start_date'), '')::timestamptz AS event_start_date,
      nullif(btrim(r->>'event_end_date'), '')::timestamptz AS event_end_date,
      nullif(btrim(r->>'event_created_at'), '')::timestamptz AS event_created_at,
      nullif(btrim(r->>'event_last_modified'), '')::timestamptz AS event_last_modified,
      CASE
        WHEN nullif(btrim(r->>'venue_id'), '') IS NULL THEN NULL::bigint
        ELSE (r->>'venue_id')::bigint
      END AS venue_id,
      nullif(btrim(r->>'venue_name'), '')::text AS venue_name,
      nullif(btrim(r->>'venue_address_line1'), '')::text AS venue_address_line1,
      nullif(btrim(r->>'venue_address_line2'), '')::text AS venue_address_line2,
      CASE
        WHEN nullif(btrim(r->>'venue_latitude'), '') IS NULL THEN NULL::double precision
        ELSE (r->>'venue_latitude')::double precision
      END AS venue_latitude,
      CASE
        WHEN nullif(btrim(r->>'venue_longitude'), '') IS NULL THEN NULL::double precision
        ELSE (r->>'venue_longitude')::double precision
      END AS venue_longitude,
      nullif(btrim(r->>'locality_level_one'), '')::text AS locality_level_one,
      nullif(btrim(r->>'locality_level_two'), '')::text AS locality_level_two,
      nullif(btrim(r->>'locality_level_three'), '')::text AS locality_level_three,
      CASE
        WHEN nullif(btrim(r->>'organiser_id'), '') IS NULL THEN NULL::bigint
        ELSE (r->>'organiser_id')::bigint
      END AS organiser_id,
      nullif(btrim(r->>'organiser_name'), '')::text AS organiser_name,
      nullif(btrim(r->>'organiser_phone'), '')::text AS organiser_phone,
      nullif(btrim(r->>'organiser_mobile'), '')::text AS organiser_mobile,
      nullif(btrim(r->>'organiser_facebook_url'), '')::text AS organiser_facebook_url,
      nullif(btrim(r->>'organiser_twitter_handle'), '')::text AS organiser_twitter_handle,
      nullif(btrim(r->>'organiser_hashtag'), '')::text AS organiser_hashtag,
      nullif(btrim(r->>'organiser_page_url'), '')::text AS organiser_page_url,
      CASE
        WHEN jsonb_typeof(r->'quicket_categories_json') = 'array' THEN r->'quicket_categories_json'
        ELSE NULL::jsonb
      END AS quicket_categories_json,
      CASE
        WHEN jsonb_typeof(r->'tickets_json') = 'array' THEN r->'tickets_json'
        ELSE NULL::jsonb
      END AS tickets_json,
      CASE
        WHEN nullif(btrim(r->>'minimum_ticket_price'), '') IS NULL THEN NULL::numeric
        ELSE (r->>'minimum_ticket_price')::numeric
      END AS minimum_ticket_price,
      CASE
        WHEN nullif(btrim(r->>'maximum_ticket_price'), '') IS NULL THEN NULL::numeric
        ELSE (r->>'maximum_ticket_price')::numeric
      END AS maximum_ticket_price,
      CASE
        WHEN nullif(btrim(r->>'tickets_available_boolean'), '') IS NULL THEN NULL::boolean
        ELSE (r->>'tickets_available_boolean')::boolean
      END AS tickets_available_boolean,
      CASE
        WHEN jsonb_typeof(r->'schedules_json') = 'array' THEN r->'schedules_json'
        ELSE NULL::jsonb
      END AS schedules_json,
      CASE
        WHEN nullif(btrim(r->>'guestlist_count'), '') IS NULL THEN 0
        ELSE GREATEST((r->>'guestlist_count')::integer, 0)
      END AS guestlist_count
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
      is_community_event,
      external_url,
      cta_source,
      whatsapp_number,
      whatsapp_prefill_template,
      availability_status,
      quicket_category_slug,
      quicket_category_label,
      quicket_event_id,
      event_name,
      event_description,
      event_url,
      event_image_url,
      event_start_date,
      event_end_date,
      event_created_at,
      event_last_modified,
      venue_id,
      venue_name,
      venue_address_line1,
      venue_address_line2,
      venue_latitude,
      venue_longitude,
      locality_level_one,
      locality_level_two,
      locality_level_three,
      organiser_id,
      organiser_name,
      organiser_phone,
      organiser_mobile,
      organiser_facebook_url,
      organiser_twitter_handle,
      organiser_hashtag,
      organiser_page_url,
      quicket_categories_json,
      tickets_json,
      minimum_ticket_price,
      maximum_ticket_price,
      tickets_available_boolean,
      schedules_json,
      guestlist_count
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
      f.is_community_event,
      f.external_url,
      f.cta_source,
      f.whatsapp_number,
      f.whatsapp_prefill_template,
      f.availability_status,
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
      ),
      f.quicket_event_id,
      coalesce(f.event_name, f.title),
      coalesce(f.event_description, f.description),
      coalesce(f.event_url, f.booking_url),
      coalesce(f.event_image_url, f.image),
      coalesce(f.event_start_date, f.start_date),
      f.event_end_date,
      f.event_created_at,
      f.event_last_modified,
      f.venue_id,
      f.venue_name,
      f.venue_address_line1,
      f.venue_address_line2,
      f.venue_latitude,
      f.venue_longitude,
      f.locality_level_one,
      f.locality_level_two,
      f.locality_level_three,
      f.organiser_id,
      f.organiser_name,
      f.organiser_phone,
      f.organiser_mobile,
      f.organiser_facebook_url,
      f.organiser_twitter_handle,
      f.organiser_hashtag,
      f.organiser_page_url,
      f.quicket_categories_json,
      f.tickets_json,
      f.minimum_ticket_price,
      f.maximum_ticket_price,
      f.tickets_available_boolean,
      f.schedules_json,
      f.guestlist_count
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
      booking_contact = COALESCE(EXCLUDED.booking_contact, events_and_specials.booking_contact),
      external_url = COALESCE(EXCLUDED.external_url, events_and_specials.external_url),
      cta_source = COALESCE(EXCLUDED.cta_source, events_and_specials.cta_source),
      whatsapp_number = COALESCE(EXCLUDED.whatsapp_number, events_and_specials.whatsapp_number),
      whatsapp_prefill_template = COALESCE(EXCLUDED.whatsapp_prefill_template, events_and_specials.whatsapp_prefill_template),
      availability_status = COALESCE(EXCLUDED.availability_status, events_and_specials.availability_status),
      quicket_category_slug = COALESCE(EXCLUDED.quicket_category_slug, events_and_specials.quicket_category_slug),
      quicket_category_label = COALESCE(EXCLUDED.quicket_category_label, events_and_specials.quicket_category_label),
      quicket_event_id = COALESCE(EXCLUDED.quicket_event_id, events_and_specials.quicket_event_id),
      event_name = COALESCE(EXCLUDED.event_name, events_and_specials.event_name),
      event_description = CASE
        WHEN EXCLUDED.event_description IS NOT NULL
         AND (events_and_specials.event_description IS NULL
              OR length(EXCLUDED.event_description) > length(events_and_specials.event_description))
        THEN EXCLUDED.event_description
        ELSE events_and_specials.event_description
      END,
      event_url = COALESCE(EXCLUDED.event_url, events_and_specials.event_url),
      event_image_url = COALESCE(EXCLUDED.event_image_url, events_and_specials.event_image_url),
      event_start_date = CASE
        WHEN events_and_specials.event_start_date IS NULL THEN EXCLUDED.event_start_date
        WHEN EXCLUDED.event_start_date IS NULL THEN events_and_specials.event_start_date
        ELSE LEAST(events_and_specials.event_start_date, EXCLUDED.event_start_date)
      END,
      event_end_date = CASE
        WHEN events_and_specials.event_end_date IS NULL THEN EXCLUDED.event_end_date
        WHEN EXCLUDED.event_end_date IS NULL THEN events_and_specials.event_end_date
        ELSE GREATEST(events_and_specials.event_end_date, EXCLUDED.event_end_date)
      END,
      event_created_at = CASE
        WHEN events_and_specials.event_created_at IS NULL THEN EXCLUDED.event_created_at
        WHEN EXCLUDED.event_created_at IS NULL THEN events_and_specials.event_created_at
        ELSE LEAST(events_and_specials.event_created_at, EXCLUDED.event_created_at)
      END,
      event_last_modified = CASE
        WHEN events_and_specials.event_last_modified IS NULL THEN EXCLUDED.event_last_modified
        WHEN EXCLUDED.event_last_modified IS NULL THEN events_and_specials.event_last_modified
        ELSE GREATEST(events_and_specials.event_last_modified, EXCLUDED.event_last_modified)
      END,
      venue_id = COALESCE(EXCLUDED.venue_id, events_and_specials.venue_id),
      venue_name = COALESCE(EXCLUDED.venue_name, events_and_specials.venue_name),
      venue_address_line1 = COALESCE(EXCLUDED.venue_address_line1, events_and_specials.venue_address_line1),
      venue_address_line2 = COALESCE(EXCLUDED.venue_address_line2, events_and_specials.venue_address_line2),
      venue_latitude = COALESCE(EXCLUDED.venue_latitude, events_and_specials.venue_latitude),
      venue_longitude = COALESCE(EXCLUDED.venue_longitude, events_and_specials.venue_longitude),
      locality_level_one = COALESCE(EXCLUDED.locality_level_one, events_and_specials.locality_level_one),
      locality_level_two = COALESCE(EXCLUDED.locality_level_two, events_and_specials.locality_level_two),
      locality_level_three = COALESCE(EXCLUDED.locality_level_three, events_and_specials.locality_level_three),
      organiser_id = COALESCE(EXCLUDED.organiser_id, events_and_specials.organiser_id),
      organiser_name = COALESCE(EXCLUDED.organiser_name, events_and_specials.organiser_name),
      organiser_phone = COALESCE(EXCLUDED.organiser_phone, events_and_specials.organiser_phone),
      organiser_mobile = COALESCE(EXCLUDED.organiser_mobile, events_and_specials.organiser_mobile),
      organiser_facebook_url = COALESCE(EXCLUDED.organiser_facebook_url, events_and_specials.organiser_facebook_url),
      organiser_twitter_handle = COALESCE(EXCLUDED.organiser_twitter_handle, events_and_specials.organiser_twitter_handle),
      organiser_hashtag = COALESCE(EXCLUDED.organiser_hashtag, events_and_specials.organiser_hashtag),
      organiser_page_url = COALESCE(EXCLUDED.organiser_page_url, events_and_specials.organiser_page_url),
      quicket_categories_json = COALESCE(EXCLUDED.quicket_categories_json, events_and_specials.quicket_categories_json),
      tickets_json = COALESCE(EXCLUDED.tickets_json, events_and_specials.tickets_json),
      minimum_ticket_price = COALESCE(EXCLUDED.minimum_ticket_price, events_and_specials.minimum_ticket_price),
      maximum_ticket_price = COALESCE(EXCLUDED.maximum_ticket_price, events_and_specials.maximum_ticket_price),
      tickets_available_boolean = COALESCE(EXCLUDED.tickets_available_boolean, events_and_specials.tickets_available_boolean),
      schedules_json = COALESCE(EXCLUDED.schedules_json, events_and_specials.schedules_json),
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

REVOKE EXECUTE ON FUNCTION public.refresh_events_and_specials_guestlist_count(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_events_and_specials_guestlist_count(text) TO service_role;
