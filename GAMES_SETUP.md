# Games catalogue setup

Omni's **Games** type uses one server-side proxy for both IGDB and BoardGameGeek. The browser never receives the IGDB Client Secret or the BGG Application Token.

## Use the same env + GitHub Secrets pattern as the rest of Omni

### Local development

Keep local credentials in an uncommitted `.env` file:

```text
IGDB_CLIENT_ID=YOUR_TWITCH_CLIENT_ID
IGDB_CLIENT_SECRET=YOUR_TWITCH_CLIENT_SECRET
BGG_APPLICATION_TOKEN=YOUR_BGG_APPLICATION_TOKEN
```

When serving the Edge Function locally, point Supabase CLI at that file:

```sh
supabase functions serve game-catalogue --env-file .env
```

Do **not** rename the secret values to `VITE_...` or `EXPO_PUBLIC_...`; those prefixes are intentionally exposed to browser code by this Vite project.

### Production / GitHub

Add these under **GitHub repository → Settings → Secrets and variables → Actions → Secrets**:

```text
IGDB_CLIENT_ID
IGDB_CLIENT_SECRET
BGG_APPLICATION_TOKEN
SUPABASE_ACCESS_TOKEN
SUPABASE_PROJECT_ID
```

The included workflow at `.github/workflows/deploy-game-catalogue.yml` reads those GitHub Secrets, synchronizes the three game credentials to the Edge Function runtime, and deploys `game-catalogue`. You therefore do not have to enter the game credentials manually in the Supabase dashboard.

`SUPABASE_ACCESS_TOKEN` is the deployment credential used by the Supabase CLI in GitHub Actions. `SUPABASE_PROJECT_ID` is your project ref.

## Twitch / IGDB

Register a Twitch developer application and create a Client Secret. For the registration's OAuth Redirect URL, `http://localhost` is sufficient for this IGDB client-credentials use case.

IGDB uses the Twitch **client credentials** flow. The Client Secret must remain server-side, and IGDB does not accept direct browser requests.

## BoardGameGeek

Register Omni at BoardGameGeek's Applications page and create an Application Token when approved. Store it in the `BGG_APPLICATION_TOKEN` GitHub secret/local `.env` value above.

## Frontend proxy URL

If your existing build already defines either:

```text
EXPO_PUBLIC_SUPABASE_URL
```

or

```text
VITE_SUPABASE_URL
```

Omni now automatically derives:

```text
https://YOUR_PROJECT_REF.supabase.co/functions/v1/game-catalogue
```

so you do **not** need an additional game-proxy variable.

If you want to override it, you can still use the public build variable:

```text
EXPO_PUBLIC_GAME_CATALOGUE_PROXY_URL=https://YOUR_PROJECT_REF.supabase.co/functions/v1/game-catalogue
```

That URL is public and is safe to expose; the actual IGDB/BGG credentials remain server-side.
