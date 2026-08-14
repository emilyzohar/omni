# IMPORTANT: GitHub Pages deployment

This project must be built with Vite before GitHub Pages serves it. Use the included `.github/workflows/deploy-pages.yml` and set Pages → Source to **GitHub Actions**. See `GITHUB-PAGES-SETUP.md`.

# Catch All tracker

Responsive Vite/HTML/CSS/JavaScript tracker with Supabase login and cross-device profile sync.

## What changed in this build

- The desktop layout now uses the browser window instead of a narrow fixed-looking center column.
- Large empty fixed-height sections were removed; each section sizes to its content.
- Up Next uses two columns on wide screens and one column on smaller screens.
- Desktop calendar uses the available width; phones/narrow tablets switch to the vertical Monday-Sunday week view at 760px.
- Navigation stays compact and shows sync status, signed-in email, and Sign out.
- A real Supabase email/password login is now shown before the tracker.
- Library, history, TV/YouTube/book progress, queue state, custom types, sticker settings, and Discover preferences sync through one `user_state` row per account.
- Existing local browser data is automatically uploaded the first time that account has no cloud profile yet.
- Returning to a browser tab refreshes newer cloud state from another device.

## 1. Supabase setup

Create a Supabase project. In **SQL Editor**, run the included `supabase-setup.sql` once.

Then add these to your `.env` beside `package.json`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Keep your existing TMDB / Google Books / YouTube values in the same `.env`.

In Supabase **Authentication → URL Configuration**, use your deployed site as the Site URL. For the current GitHub Pages location that is:

```text
https://emilyzohar.github.io/catch-all/
```

Also add that URL to the allowed redirect URLs if email confirmation is enabled.

## 2. Run on your computer

```bash
npm install
npm run dev
```

Open the Local URL Vite prints (normally `http://localhost:5173`).

To open the development copy from your phone while it is on the same Wi-Fi:

```bash
npm run dev -- --host
```

Then open Vite's **Network** URL on the phone.

## 3. Build for GitHub Pages

```bash
npm run build
```

Deploy the generated `dist/` folder using the same GitHub Pages deployment method you already use. `.env` is read at build time; do not upload the `.env` file itself.

Once the new build is live, open the same deployed URL on your computer and phone and sign in with the same account. The synced profile is then loaded from Supabase on both devices.

## Synced vs local-only data

Synced through Supabase:

- Library items and ratings/notes
- Up Next / TBR state
- TV episode progress and watched history
- YouTube playlist/video progress
- Book page progress
- Calendar history
- Custom types
- Sticker preferences
- Discover/streaming-service preferences

Uploaded attachment **file bytes** still live in IndexedDB in the browser where they were uploaded. Their metadata can sync, but syncing the actual image/PDF/file across devices requires moving those blobs to Supabase Storage in a later step.

# Zohar Tracker

Plain HTML/CSS/JavaScript tracker built with Vite only for `.env` access.

## Current structure

- **Up Next** — current TV episode, book progress, and YouTube playlist progress.
- **Track** — monthly sticker calendar; multiple entries of the same type/date are grouped and all open together.
- **Discover** — API-backed discovery for TV, movies, and books.
- **Library** — everything saved, grouped by type and sorted by rating.

The old hero landing page has been removed. The site now opens directly into the tracker navigation and Up Next.

## Discover

Discover uses:

- TMDB weekly trending TV
- TMDB weekly trending movies
- Google Books results ordered by newest publication date
- TMDB recommendations based on TV/movie items already in your library/progress
- Google Books subject/author recommendations based on books you have saved/read

Click **+ Add** on a Discover card to prefill the normal Add modal.

## YouTube playlists

YouTube playlists are fully drillable:

1. The Up Next arrow opens the playlist.
2. Every playlist video has its own arrow.
3. The video arrow opens video metadata, description, duration, channel, date, and available statistics.
4. Use **← Playlist** to go back.
5. Marking the current Up Next video complete records it on today's tracker and advances to the next playlist video.

## API environment variables

Place your `.env` beside `package.json`.

```env
EXPO_PUBLIC_TMDB_READ_ACCESS_TOKEN=...
EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY=...
EXPO_PUBLIC_YOUTUBE_API_KEY=...
EXPO_PUBLIC_ITUNES_COUNTRY=CA
EXPO_PUBLIC_TMDB_WATCH_REGION=CA
```

Do not commit `.env`.

## Run locally

```bash
npm install
npm run dev
```

Open the localhost URL Vite prints.

## Build

```bash
npm run build
```

Deploy the generated `dist/` folder.

## Saving your personal data

The browser still keeps a local cache so the app remains fast, but the signed-in profile is now also saved to Supabase. When you open the deployed site on another device and sign into the same account, the cloud profile is loaded there.

## Mobile layout

On screens 760px wide or smaller, the tracker automatically switches from the desktop month grid to a vertical Monday–Sunday week view. Use the previous/next arrows or Today button to move between weeks. Multiple entries of the same type on one day stay grouped behind one tappable row and open the existing day/type detail list.

Discover rows become horizontally swipeable poster carousels, Up Next keeps both its detail arrow and completion control visible, Library rows collapse to the essential title/rating/edit controls, and dialogs open as mobile bottom sheets.


## Separate Discover page

Discover now lives at `discover.html`. The main `index.html` contains Up Next, Track, and Library only. Both pages use the same signed-in Supabase profile (with local browser caching), so saved items and recommendation history stay consistent across the site and across devices.


## Discover preferences

Discover now has a Settings button. Streaming-service selections are cached locally and included in the synced Supabase profile. TV/movie cards available on selected subscription/free/ad-supported services in `EXPO_PUBLIC_TMDB_WATCH_REGION` are prioritized. Book recommendations prioritize authors from completed books. Items already in the library/history are excluded from Discover results.

Watch-provider data is supplied by TMDB/JustWatch and the Discover page includes the required attribution.

## Episode/video logging

TV season/episode lists and YouTube playlist lists now include a check button beside every episode/video. Checking one logs that exact episode/video to today's tracker history. If it is the current Up Next item, progress advances; if it is a later item, the current Up Next position stays put and later advancement skips the already-logged item.

## Library quick add

Library now has a `+ Add` button. It opens the standard add form with Date optional, so items can live only in the Library (or in Up Next where relevant) without creating a calendar sticker.

## Sticker customization

On the main page, open **Library → Stickers** to customize the calendar sticker used for each recognized type.

For every type you can choose:
- shape: square, circle, or star
- short text: up to 3 characters for square/circle stickers
- color: rust, yellow, cream, lavender, navy, green, or pink

Built-in and custom types are both supported. Preferences are currently saved in browser storage under `zoharTracker.stickerPrefs.v1`. When Supabase profile sync is enabled, include this object in the user's synced profile state so the same sticker choices follow the account across devices.

## Files, images, and links

Library items can now include optional attachments and external links from the normal Add/Edit form.

- Images open in an in-site popup.
- PDFs open in an embedded popup viewer.
- Text/JSON files open as text in the popup.
- Audio and video files open in popup players.
- Unsupported file formats remain saved and show their file information in the popup rather than forcing a download.
- External links are shown as labeled buttons in the item's detail view and open the linked website.

Uploaded file blobs are stored in **IndexedDB** in the current browser. The library item only stores lightweight attachment metadata in the tracker state/localStorage. This avoids filling localStorage with base64 file data.

Important: IndexedDB is device/browser-local. When Supabase cross-device sync is added, upload the blobs to **Supabase Storage** and keep their storage paths in the synced profile. Until then, the attachment metadata may travel with exported/synced tracker data, but the actual uploaded file is available only in the browser where it was added.

## TV queue/status behavior

TV shows now keep two separate states:

- Personal watching state: Following, Watch later, or Stopped watching.
- TMDB series state: the current series status returned by TMDB.

For shows you are following, the app checks for the first aired episode you have not watched. If one exists, the show is automatically moved into Up Next. When you are caught up, it leaves Up Next but remains monitored; when another episode has aired, it returns to Up Next the next time the app refreshes.

TV library/detail labels include Up to date, Finished, Cancelled, Watch later, and Stopped watching where appropriate.


## Streaks

The Library now includes a **Streaks** button. Streaks are optional per type. For each enabled type you can choose recurring weekly rest days (Monday–Sunday). A scheduled rest day neither increases nor breaks the streak. The current day is also treated as still in progress, so a streak is not broken simply because you have not logged today yet. Streak preferences are included in the Supabase profile JSON and therefore sync with the rest of the profile.

## If Create account does not work

In Supabase Dashboard, check all three of these:

1. **Authentication → Sign In / Providers → Email**: Email provider is enabled.
2. **Authentication settings**: new-user signups are allowed.
3. **Authentication → URL Configuration**: Site URL is `https://emilyzohar.github.io/catch-all/`.

The signup form now shows the actual Supabase error instead of silently doing nothing. It deliberately does not pass a custom `emailRedirectTo`; confirmation emails use the Site URL configured in Supabase.

## Full-window layout fix

This build intentionally uses the available browser width on desktop instead of a narrow centered content column. The final CSS overrides use full-width shells with responsive gutters and a 1920px safety cap. At 760px and below, the dedicated mobile layout takes over.

The stylesheet URL also contains a version query so browsers do not keep serving a stale cached CSS file after deployment.
