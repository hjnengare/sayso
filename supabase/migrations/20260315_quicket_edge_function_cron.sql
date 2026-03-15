-- ============================================
-- pg_cron job: call fetch-quicket-events Edge Function every 6 hours
-- Mirrors the Ticketmaster cron setup (20250107_setup_edge_function_cron.sql)
-- ============================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Unschedule any existing job with the same name before re-registering
SELECT cron.unschedule('fetch-quicket-events-edge-function')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'fetch-quicket-events-edge-function'
);

-- Schedule: every 6 hours, offset by 30 minutes from Ticketmaster to avoid simultaneous load
SELECT cron.schedule(
  'fetch-quicket-events-edge-function',
  $$30 */6 * * *$$,
  $$
  SELECT net.http_post(
    url := 'https://rnlbbnluoxydtqviwtqj.supabase.co/functions/v1/fetch-quicket-events',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || get_supabase_anon_key()
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ============================================
-- Monitor
-- ============================================
-- View all cron jobs:
--   SELECT * FROM cron.job;
--
-- View execution history:
--   SELECT * FROM cron.job_run_details
--   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'fetch-quicket-events-edge-function')
--   ORDER BY start_time DESC LIMIT 10;
--
-- Unschedule:
--   SELECT cron.unschedule('fetch-quicket-events-edge-function');
-- ============================================
