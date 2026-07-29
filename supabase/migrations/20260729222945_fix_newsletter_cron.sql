/*
# Fix newsletter cron job to not require service_role_key setting

1. Purpose
   The process-scheduled-newsletters edge function has verify_jwt=false and
   does not check auth (it uses SUPABASE_SERVICE_ROLE_KEY from env internally).
   So the cron job does not need an Authorization header.

2. Changes
   - Unschedules the previous job.
   - Reschedules with a simpler POST that doesn't require app.service_role_key.
*/

DO $$
BEGIN
  PERFORM cron.unschedule('process_scheduled_newsletters');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'process_scheduled_newsletters',
  '* * * * *',
  $cron$
    SELECT net.http_post(
      url := 'https://cekajfmiubswbymzuypy.supabase.co/functions/v1/process-scheduled-newsletters',
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  $cron$
);
