# Omni installable web app

This package preserves the supplied tracker, calendar, Discover and Social/Library screens. The web app uses the app layout, fixed bottom navigation, content-only scrolling, episode ratings and modal scrolling fixes. Source filenames have been normalized. Social was converted from the supplied built HTML to use the supplied source modules. Placeholder Omni icons are included because original icons were not supplied.

## 1. Configure and host

Edit runtime-config.js: add your existing public Supabase URL and publishable/anon key inside PUBLIC_RUNTIME_CONFIG. Copy your existing browser-safe catalogue settings there too (TMDB, Last.fm and other settings used by config.js). The uploaded config had no active credentials. Use the same Supabase project as the current app; existing tracker database tables and policies must already be installed. This package does not replace your tracker database.

Upload the web files to your existing HTTPS static host. Keep all filenames and folders intact. The supabase folder and README are setup files, not required public web assets. Opening index.html as a local file will not support login or push. Add your HTTPS app URL to the existing Supabase Auth redirect allowlist. No build is needed; the Supabase client loads from the existing pinned CDN import map. Initial launch needs network; offline catalogue queries and sync are not supported.

On iPhone (iOS 16.4+): open the hosted URL in Safari, Share > Add to Home Screen, then open Omni from its icon. Sign in, open Calendar, tap New-release alerts and allow notifications. No Apple developer account, APNs key or App Store submission is required for Web Push. On supported desktop/Android browsers, use the Install button or browser's install menu.

## 2. Set up alerts while closed

Run supabase/web-push.sql once in your existing Supabase project's SQL Editor. These are separate web-push tables, protected so users can access only their own subscription and watchlist. Existing native push tables are unaffected.

Generate a VAPID key pair locally:

    npx web-push generate-vapid-keys

Put only the PUBLIC key in runtime-config.js as VITE_WEB_PUSH_PUBLIC_KEY. In Supabase Edge Function secrets set:

- WEB_PUSH_PUBLIC_KEY: the same public key
- WEB_PUSH_PRIVATE_KEY: the private key
- WEB_PUSH_SUBJECT: mailto:your-real-email@example.com
- WEB_PUSH_CRON_SECRET: a long random secret (generate with openssl rand -hex 32)
- WEB_PUSH_TIMEZONE: America/Toronto (optional)
- TMDB_READ_ACCESS_TOKEN: your TMDB token, required for automatic TV episode checks

Supabase provides SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to the Edge Function. Never put server credentials into runtime-config.js or public web files.

With the Supabase CLI installed, sign in and deploy from this folder:

    supabase login
    supabase link --project-ref YOUR_PROJECT_REF
    supabase functions deploy send-web-releases --no-verify-jwt

The function checks a separate cron secret. It does not accept an unauthenticated send request. Enable pg_cron and pg_net; create the two Vault secrets described in supabase/schedule.sql, then run that SQL to schedule checks every 15 minutes.

Open Calendar after enabling alerts so the latest watchlist syncs. Revisit the app after changing your library to sync those changes. Each device has a separate subscription; switching alerts off on one does not disable another. Sign-out removes this device's backend subscription before clearing the session.

## 3. Verify delivery

First verify sign-in, Discover search, adding a title, progress, episode ratings, Social/Library and Calendar using your real configuration. Enable New-release alerts from the installed app. Confirm rows appear for your account in web_push_devices and web_release_watchlists. Then close the app and test a tracked release whose date is today. Invoke the function using POST with x-cron-secret (from a private server-side tool) or wait for the scheduled run. Inspect function logs, cron logs and web_push_deliveries. Tap the notification: it should open Up Next.

“In-app Up Next alerts” is a separate feature for additions detected while the app is open. “New-release alerts” uses browser push and the scheduled sender while closed.

## Limits and updates

Release dates are date-level, checked in Toronto time, not precise streaming availability times. The sender checks fixed release dates already saved in Omni and TV last/next episodes from TMDB; it does not discover new YouTube uploads or new music/book releases without a saved release date. It does not mutate your tracker data while closed; the existing app refreshes Up Next when reopened. TV polling uses last/next episodes and can miss episodes during an extended sender outage. Delivery retries can rarely duplicate an alert if recording delivery fails after a successful push; tags collapse duplicate notifications where supported. The function has a 45-second batch budget for a small personal app, and reports a failure if it needs scaling. Supported push endpoints: Apple, Firefox and Chrome/FCM.

For an update, change the CACHE version in sw.js when editing app files. The complete new shell activates after old app windows close. CDN dependencies must have loaded at least once for the cached shell to be useful offline.

Validation completed locally: JavaScript syntax, local dependency/page/asset links, service-worker push/click behavior, release-watch extraction and backend authorization/source checks. Browser visual checks were unavailable because this environment has no installed browser executable. No live Supabase deployment or real device delivery was possible with the blank runtime settings supplied. Do not treat push as live until the verification above succeeds.

References: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/ and https://supabase.com/docs/guides/database/postgres/row-level-security
