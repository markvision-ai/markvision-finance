CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
DECLARE
  base text := 'https://project--403463c2-a092-4d21-b578-d1324753dcd8.lovable.app';
  anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzZ3dqaXd6YWlsbHlrdXFlZ3hiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4ODgwMzgsImV4cCI6MjA5NTQ2NDAzOH0.4PgqAWL4einCmbsg_euN672Ca1FrwcJ-prm8qai1MGo';
BEGIN
  PERFORM cron.unschedule('bot-weekly-report') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='bot-weekly-report');
  PERFORM cron.unschedule('bot-payment-reminders') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='bot-payment-reminders');
  PERFORM cron.unschedule('bot-anomaly-alerts') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='bot-anomaly-alerts');

  PERFORM cron.schedule('bot-weekly-report', '0 19 * * 0', format($f$
    SELECT net.http_post(url := %L, headers := %L::jsonb, body := '{}'::jsonb);
  $f$, base || '/api/public/bot/cron/weekly-report', json_build_object('Content-Type','application/json','apikey',anon)::text));

  PERFORM cron.schedule('bot-payment-reminders', '0 10 * * *', format($f$
    SELECT net.http_post(url := %L, headers := %L::jsonb, body := '{}'::jsonb);
  $f$, base || '/api/public/bot/cron/payment-reminders', json_build_object('Content-Type','application/json','apikey',anon)::text));

  PERFORM cron.schedule('bot-anomaly-alerts', '0 * * * *', format($f$
    SELECT net.http_post(url := %L, headers := %L::jsonb, body := '{}'::jsonb);
  $f$, base || '/api/public/bot/cron/anomaly-alerts', json_build_object('Content-Type','application/json','apikey',anon)::text));
END $$;