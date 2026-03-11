-- Remove non-Quicket events at the DB layer while leaving specials untouched.

-- 1) Remove existing non-Quicket events.
DELETE FROM public.events_and_specials
WHERE type = 'event'
  AND lower(coalesce(icon, '')) <> 'quicket';

-- 2) Enforce: all future rows of type='event' must be Quicket.
ALTER TABLE public.events_and_specials
  DROP CONSTRAINT IF EXISTS events_and_specials_event_must_be_quicket_check;

ALTER TABLE public.events_and_specials
  ADD CONSTRAINT events_and_specials_event_must_be_quicket_check
  CHECK (
    type <> 'event' OR lower(coalesce(icon, '')) = 'quicket'
  );
