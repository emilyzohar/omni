-- Enable pg_cron and pg_net in Supabase Database > Extensions.
-- Create Vault secrets FIRST, through the Supabase Vault interface:
-- omni_web_push_url = https://kkstpjzwxdytjuogfmmz.supabase.co/functions/v1/send-web-releases
-- omni_web_push_cron_secret = the same random value as WEB_PUSH_CRON_SECRET
-- Then run this once. Inspect cron.job_run_details and function logs to check success.
select cron.schedule('omni-web-release-alerts','*/15 * * * *',$$
 select net.http_post(
  url := (select decrypted_secret from vault.decrypted_secrets where name='omni_web_push_url'),
  headers := jsonb_build_object('Content-Type','application/json','x-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='omni_web_push_cron_secret')),
  body := '{}'::jsonb,
  timeout_milliseconds := 60000
 );
$$);
