# GitHub Pages setup for Catch All

The site uses Vite environment variables. Do not publish the raw repository files directly from a branch. GitHub Pages must publish the Vite `dist/` build.

## 1. Add repository secrets

GitHub repository → Settings → Secrets and variables → Actions → New repository secret.

Create secrets matching the names in `.env.example`. At minimum for the core tracker/login:

- `EXPO_PUBLIC_TMDB_READ_ACCESS_TOKEN`
- `EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY`
- `EXPO_PUBLIC_YOUTUBE_API_KEY`
- `EXPO_PUBLIC_TICKETMASTER_API_KEY`
- `EXPO_PUBLIC_HOME_CITY` (optional initial event city)
- `EXPO_PUBLIC_HOME_COUNTRY` (optional, e.g. `CA`)
- `EXPO_PUBLIC_ITUNES_COUNTRY`
- `EXPO_PUBLIC_TMDB_WATCH_REGION`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

The other API/location values can be added when you use those integrations.

## 2. Enable GitHub Actions Pages deployment

Repository → Settings → Pages → Build and deployment → Source → **GitHub Actions**.

## 3. Push the project

The included `.github/workflows/deploy-pages.yml` runs whenever `main` is pushed. It installs the project, builds both `index.html` and `discover.html`, and deploys the resulting `dist/` folder.

## 4. Supabase URL configuration

In Supabase → Authentication → URL Configuration:

Site URL:

`https://emilyzohar.github.io/catch-all/`

Add the same URL to Redirect URLs if email confirmation is enabled.

## 5. Local development

Keep your real `.env` in the project root and run:

```bash
npm install
npm run dev
```

Do not open `index.html` directly with a `file://` URL.
