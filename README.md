# Catch All tracker — mobile parity update

This version includes:

- Full TV episode/season watch-history setup when adding or editing a show.
- Mark individual episodes or whole seasons watched from TV details on desktop and mobile.
- Shows with no aired unwatched episodes remain in Library; followed shows return to Up Next automatically when a new episode airs.
- Queue controls remain available on mobile.
- Sticker customization adds Heart plus an expanded color palette.
- Square/circle sticker text is optional: leave Text blank for no letters.
- Mobile detail rows reflow instead of hiding episode/video controls.

## Run locally

Copy `.env.example` to `.env`, add your keys, then:

```bash
npm install
npm run dev
```

## GitHub Pages

The included `.github/workflows/deploy-pages.yml` builds the Vite app before deploying. Store the EXPO_PUBLIC_* values used by the workflow in GitHub repository Actions secrets, and set Pages source to GitHub Actions.

## Editable calendar history

Past tracked entries are now editable from the calendar. Open a sticker, choose an entry, then press **Edit**. You can change its title, type, date, rating, subtitle/episode label, notes, and whether it appears on the calendar. Changing the date moves the sticker. Dated Library items open the existing full item editor. History entries can also be deleted from the edit screen. These changes are included in the existing Supabase profile sync.

## Discover tabs

Discover now has four views:
- **New** — recent TV, movies, and newly published books.
- **Popular** — high-popularity/trending catalogue results.
- **For You** — recommendations seeded from watched/read/rated items, familiar authors, and selected streaming services.
- **Discover** — the shuffled, preference-weighted infinite feed.

All views filter out things already saved/consumed. TBR is a separate queue and is intentionally excluded from the Library display until an item is moved out of TBR.

## TV season/episode quick controls

- Season rows now show both a check and an arrow.
  - Check: toggle the entire aired season as watched without opening it.
  - Arrow: open that season and its episode list.
- Episode rows show both a check and an arrow.
  - Check: toggle that specific episode.
  - Arrow: open episode details.
- Marking a later season watched prompts whether earlier aired episodes should also be marked watched.
- Whole-season and Discover-history imports remain undated and never create calendar entries.
- On Discover, the TV-card check opens the season/episode picker instead of marking the entire series automatically.

## Discover language + personal TV notes

Discover Settings now includes **Show only English-language TV shows**. When enabled, TV recommendations in New, Popular, For You, and Discover are filtered using TMDB's original-language metadata.

After any episode/season of a TV show has been marked watched from Discover, that show's detail view includes a personal 1–5 star rating and notes field. These are show-level Library metadata and do not get copied into individual episode notes.

## Large history storage

Watched episode/video/history records are now cached in IndexedDB instead of localStorage. This avoids browser `QuotaExceededError` once the tracker contains hundreds or thousands of history records.

On first load, any legacy `zoharTracker.history.v1` localStorage data is automatically migrated to IndexedDB and the old localStorage copy is removed. Signed-in profiles continue syncing the full history through the existing Supabase `user_state` profile.

## Discover search and genre filters

Discover now includes:

- A direct search across TV, movies, and books.
- Type filtering for Everything / TV / Movies / Books.
- Genre filtering across New, Popular, For You, and Discover.
- Search respects the active Type, Genre, and English-TV preferences.
- Clear Search returns to the selected endless Discover feed.

TMDB catalogue requests use genre IDs when available; Google Books feed requests use subject queries for the selected genre.


## Google Books resilience

Discover book catalogue requests automatically retry transient 429/5xx responses. Subject filters such as Romance first retry with a smaller result page and then fall back to a broader query that is filtered back to the selected genre.
