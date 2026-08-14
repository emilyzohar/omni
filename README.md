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

Personal state is stored in browser `localStorage`, including:

- saved library items
- ratings and notes
- TV episode progress
- book page progress
- YouTube playlist/video progress
- custom display types such as Pilates or Yoga
- completion history used by the calendar and Discover recommendations

The data persists when you close and reopen the same deployed site in the same browser. It does **not** automatically sync between browsers/devices. Supabase would be the next small backend addition if you want cross-device sync.

## Mobile layout

On screens 620px wide or smaller, the tracker automatically switches from the desktop month grid to a vertical Monday–Sunday week view. Use the previous/next arrows or Today button to move between weeks. Multiple entries of the same type on one day stay grouped behind one tappable row and open the existing day/type detail list.

Discover rows become horizontally swipeable poster carousels, Up Next keeps both its detail arrow and completion control visible, Library rows collapse to the essential title/rating/edit controls, and dialogs open as mobile bottom sheets.


## Separate Discover page

Discover now lives at `discover.html`. The main `index.html` contains Up Next, Track, and Library only. Both pages share the same `localStorage`, so saved items and recommendation history remain available when navigating between them on the same deployed origin.


## Discover preferences

Discover now has a Settings button. Streaming-service selections are stored in browser localStorage under `zoharTracker.discoverPrefs.v1`. TV/movie cards available on selected subscription/free/ad-supported services in `EXPO_PUBLIC_TMDB_WATCH_REGION` are prioritized. Book recommendations prioritize authors from completed books. Items already in the library/history are excluded from Discover results.

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

## Up Next / TBR and Discover actions

Items now have a queue state:

- `upnext` — currently consuming
- `tbr` — saved for later
- `library` — library only

The main page switches between Up Next and TBR using tabs. The normal Add/Edit form has a `Save to` selector so manual items can go directly to TBR.

On Discover:

- `✓` marks a title as already watched/read and saves it to the Library without making a calendar entry.
- `+` asks whether the title should go to Up Next or TBR.
- Clicking a title/poster opens API-backed details.
- TV details show streaming availability, synopsis, seasons and episodes. Episode/season checks record prior viewing in Library history only and deliberately do not create calendar stickers.
- TV/movie cards show year, API rating and streaming providers on one metadata line when provider data is available.

Calendar entries created by normal Up Next completion still work as before. Prior-consumption history from Discover is stored with `showOnCalendar: false`.
