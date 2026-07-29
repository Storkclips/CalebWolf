/*
# Set up pg_cron to process scheduled newsletters

1. Purpose
   Creates a pg_cron job that runs every minute, calling the
   process-scheduled-newsletters edge function via pg_net HTTP POST.
   This ensures scheduled newsletter emails are sent at their scheduled time.

2. Changes
   - Enables pg_cron and pg_net extensions (if not already enabled).
   - Creates a cron job named 'process_scheduled_newsletters' that runs every minute.
   - The job POSTs to the edge function URL with the service role key for auth.

3. Notes
   - The cron schedule is '* * * * *' (every minute).
   - The edge function checks for due pending emails and sends them via Resend.
*/

-- Enable extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant permissions for pg_net (needed for cron jobs to use it)
GRANT USAGE ON SCHEMA extensions TO postgres;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA extensions TO postgres;

-- Remove existing job if present (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule('process_scheduled_newsletters');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Schedule the job: every minute, POST to the edge function
SELECT cron.schedule(
  'process_scheduled_newsletters',
  '* * * * *',
  $cron$
    SELECT net.http_post(
      url := 'https://cekajfmiubswbymzuypy.supabase.co/functions/v1/process-scheduled-newsletters',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
      ),
      body := '{}'::jsonb
    );
  $cron$
);
