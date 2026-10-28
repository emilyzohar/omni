# Omni sync, notification and mobile interface fixes

## Install
Replace the project source with this folder, run `npm ci`, `npm test`, and `npm run build`, then deploy `dist` using the existing GitHub Pages workflow. The included dist folder is a production build. This archive does not deploy changes to a live account.

After deploying, open Omni on both devices with the same account. Keep the mobile app open and online until its status reads Synced. The desktop checks for updates on focus and every 30 seconds while visible. Do not clear mobile storage or reinstall while it holds unsynced entries.

## Sync
Saves now read the latest server profile, merge independent changes against the device's last cloud baseline, and conditionally update the server version. A concurrent save is retried rather than blindly overwritten. Local field edits win same-field conflicts. Independent keyed-list additions are retained; unchanged records deleted remotely stay deleted. Unkeyed arrays remain whole-field conflicts. Pending saves cache their baseline for offline recovery. Remote versions are compared for inequality, avoiding device clock skew blocking refreshes.

Older pending caches without a baseline now recover automatically. Before any server write, Omni saves both original copies in IndexedDB and provides a Download sync recovery backup button beside sync status. Recovery retains records from both devices, merges remote-only fields, and uses local values for conflicting fields. Without a baseline, missing records cannot reliably be treated as deletions, so previously deleted entries may return. The first recovery backup is retained on this device across subsequent recovery attempts. If backup storage fails, saving stops and the local pending flag remains. This patch cannot recover entries already overwritten on the server. Devices running the previous build can still overwrite profiles, so update both devices.

## Closed-app notifications
The client repairs missing server device registrations and checks server registration before showing alerts as enabled. It retains existing browser subscriptions when enabling, rather than silently turning them off. Watchlists resync on reconnect and foregrounding.

The following existing backend components must also be installed in the SAME Supabase project as runtime-config.js:
1. Tables and policies in supabase/web-push.sql (run once; existing policies are not idempotent).
2. Deploy supabase/functions/send-web-releases with supabase/config.toml.
3. Configure WEB_PUSH_SUBJECT, WEB_PUSH_PUBLIC_KEY, WEB_PUSH_PRIVATE_KEY, WEB_PUSH_CRON_SECRET, and TMDB_READ_ACCESS_TOKEN in function secrets. Public/private VAPID keys must match the client's public key.
4. Enable pg_cron and pg_net, create the two Vault secrets named in supabase/schedule.sql, then install that scheduled job once. It runs every 15 minutes.
5. Check cron.job_run_details and function logs. A successful client subscription alone does not verify scheduled delivery. Test a real release after enabling alerts, including while the app is closed. The sender excludes releases before the subscription's enabled day.

On iPhone, enable New-release alerts from the installed Home Screen app. In-app Up Next alerts only work while Omni is running. Backend status and physical-device delivery have not been verified here.

## Interface
Social feed filters collapse into a keyboard-accessible native disclosure named Feed settings. Existing filter, type and ordering controls remain inside. Mobile Up Next, Discover and Social card backgrounds and blurred layers are clipped to the same 20px corner radius.

## Validation
Production Vite build; JavaScript syntax checks; cloud merge and legacy recovery regression tests; existing social behavior tests. Mobile rendering and real push delivery require device verification after deployment.
