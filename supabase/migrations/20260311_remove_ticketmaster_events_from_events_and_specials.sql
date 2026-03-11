-- Remove Ticketmaster events from public.events_and_specials for now.
-- Keeps Quicket events, business-uploaded events, and specials untouched.
-- Also cleans dependent rows so deletes do not fail or leave orphans.

DO $$
DECLARE
  v_target_count integer := 0;
BEGIN
  CREATE TEMP TABLE _ticketmaster_event_ids ON COMMIT DROP AS
  SELECT
    id AS id_uuid,
    id::text AS id_text
  FROM public.events_and_specials
  WHERE type = 'event'
    AND (
      lower(coalesce(icon, '')) = 'ticketmaster'
      OR lower(coalesce(cta_source, '')) = 'ticketmaster'
      OR lower(coalesce(booking_url, '')) LIKE '%ticketmaster.%'
      OR lower(coalesce(external_url, '')) LIKE '%ticketmaster.%'
    );

  SELECT count(*) INTO v_target_count FROM _ticketmaster_event_ids;
  RAISE NOTICE 'Ticketmaster events to delete: %', v_target_count;

  IF v_target_count = 0 THEN
    RETURN;
  END IF;

  -- FK-backed click tracking table (if present)
  IF to_regclass('public.event_special_cta_clicks') IS NOT NULL THEN
    DELETE FROM public.event_special_cta_clicks esc
    USING _ticketmaster_event_ids t
    WHERE esc.event_special_id = t.id_uuid;
  END IF;

  -- Non-FK helper tables (if present)
  IF to_regclass('public.event_rsvps') IS NOT NULL THEN
    DELETE FROM public.event_rsvps r
    USING _ticketmaster_event_ids t
    WHERE r.event_id = t.id_text;
  END IF;

  IF to_regclass('public.event_reminders') IS NOT NULL THEN
    DELETE FROM public.event_reminders r
    USING _ticketmaster_event_ids t
    WHERE r.event_id = t.id_text;
  END IF;

  -- Finally remove Ticketmaster events.
  DELETE FROM public.events_and_specials e
  USING _ticketmaster_event_ids t
  WHERE e.id = t.id_uuid;
END $$;
