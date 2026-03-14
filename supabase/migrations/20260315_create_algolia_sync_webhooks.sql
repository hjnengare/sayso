-- =============================================================================
-- Algolia Sync Webhooks
-- =============================================================================
-- Creates (or re-creates) the four Supabase Database Webhooks that fire on
-- changes to Algolia-indexed tables and POST to /api/algolia/sync.
--
-- Supabase webhooks are stored in supabase_functions.hooks and are plain
-- trigger functions — this migration is fully idempotent (drop-if-exists
-- before re-creating).
--
-- Tables:
--   businesses           INSERT / UPDATE / DELETE
--   profiles             INSERT / UPDATE / DELETE
--   business_stats       UPDATE
--   events_and_specials  INSERT / UPDATE / DELETE  ← added for events/specials search
-- =============================================================================

-- businesses ──────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS algolia_sync_businesses ON public.businesses;

CREATE TRIGGER algolia_sync_businesses
  AFTER INSERT OR UPDATE OR DELETE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION supabase_functions.http_request(
    'https://sayso.co.za/api/algolia/sync',
    'POST',
    '{"Content-Type":"application/json","Authorization":"Bearer some-long-ass-random-secret"}',
    '{}',
    '5000'
  );

-- profiles ────────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS algolia_sync_profiles ON public.profiles;

CREATE TRIGGER algolia_sync_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION supabase_functions.http_request(
    'https://sayso.co.za/api/algolia/sync',
    'POST',
    '{"Content-Type":"application/json","Authorization":"Bearer some-long-ass-random-secret"}',
    '{}',
    '5000'
  );

-- business_stats ──────────────────────────────────────────────────────────────
-- Only UPDATE — inserts are done by the stats trigger, deletes follow the
-- parent business delete which is already handled above.

DROP TRIGGER IF EXISTS algolia_sync_business_stats ON public.business_stats;

CREATE TRIGGER algolia_sync_business_stats
  AFTER UPDATE ON public.business_stats
  FOR EACH ROW
  EXECUTE FUNCTION supabase_functions.http_request(
    'https://sayso.co.za/api/algolia/sync',
    'POST',
    '{"Content-Type":"application/json","Authorization":"Bearer some-long-ass-random-secret"}',
    '{}',
    '5000'
  );

-- events_and_specials ─────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS algolia_sync_events_and_specials ON public.events_and_specials;

CREATE TRIGGER algolia_sync_events_and_specials
  AFTER INSERT OR UPDATE OR DELETE ON public.events_and_specials
  FOR EACH ROW
  EXECUTE FUNCTION supabase_functions.http_request(
    'https://sayso.co.za/api/algolia/sync',
    'POST',
    '{"Content-Type":"application/json","Authorization":"Bearer some-long-ass-random-secret"}',
    '{}',
    '5000'
  );
