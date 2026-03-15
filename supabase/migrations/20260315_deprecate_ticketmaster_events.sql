-- ============================================
-- DEPRECATION NOTICE: ticketmaster_events
-- ============================================
-- All new Ticketmaster event data is written to events_and_specials
-- (icon = 'ticketmaster') via the upsert_events_and_specials_consolidated RPC,
-- triggered by the services/ticketmaster-ingestor service and the
-- fetch-ticketmaster-events Supabase Edge Function.
--
-- The ticketmaster_events table is preserved for backwards-compat only:
--   - Legacy bookmarked/shared URLs may carry old ticketmaster_id slugs
--   - Existing foreign-key references must be resolved before dropping
--
-- DO NOT drop this table until:
--   1. All application reads have been confirmed to use events_and_specials
--   2. Old ticketmaster_id links have been fully redirected or expired
--   3. A separate DROP migration is created and reviewed
-- ============================================

COMMENT ON TABLE ticketmaster_events IS
  'DEPRECATED — use events_and_specials (icon = ''ticketmaster'') for all reads. '
  'Kept for backwards-compat with legacy ticketmaster_id slugs. Do NOT write new rows here.';
