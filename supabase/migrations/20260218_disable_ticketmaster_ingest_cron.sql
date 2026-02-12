-- Temporarily disable Ticketmaster ingestion jobs.
-- Re-enable later by re-scheduling the Ticketmaster cron job and setting
-- ENABLE_TICKETMASTER_INGEST=true in the relevant runtime environments.

DO $$
BEGIN
  IF to_regclass('cron.job') IS NULL THEN
    RAISE NOTICE 'pg_cron is not installed; no Ticketmaster jobs to unschedule.';
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ticketmaster-ingest-6h') THEN
    PERFORM cron.unschedule('ticketmaster-ingest-6h');
    RAISE NOTICE 'Unscheduled job: ticketmaster-ingest-6h';
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'fetch-ticketmaster-events-edge-function') THEN
    PERFORM cron.unschedule('fetch-ticketmaster-events-edge-function');
    RAISE NOTICE 'Unscheduled job: fetch-ticketmaster-events-edge-function';
  END IF;
END
$$;
