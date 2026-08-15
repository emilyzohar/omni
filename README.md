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

## Google Books genre reliability fix

Book Discover requests are now serialized and limited to 20 books per page. Genre-filtered results returned by a Google Books `subject:` query are trusted even when Google omits the optional `volumeInfo.categories` field. Romance has an additional `romance fiction` fallback for transient Google Books failures. Search + genre also sends the genre to Google Books instead of filtering only after retrieval.

## Genre filter fix

Discover genre filtering now uses a media-specific strategy:

- TMDB movie/TV official genre IDs when that genre exists for that media type.
- TMDB keyword filtering when a cross-media label is not an official TMDB genre for that type (for example Horror, Romance, or Thriller on TV).
- Google Books subject queries for books.
- Search results use the same rules; TMDB keyword metadata is checked when an official genre ID is unavailable.

This avoids treating the movie and TV genre taxonomies as identical.

## Library rating / notes and calendar controls update

- Library poster covers display your personal rating as a small badge.
- Opening any Library item shows an editable `Your rating & notes` panel near the top of its detail view.
- Discover personal rating/notes are available as soon as a Discover result has been saved/created in your tracker (including after marking an episode watched), and also work for completed movies/books.
- Stickers and Streaks controls now live in the Track/calendar section rather than Library.
- Enabled streak summaries are displayed above the calendar and no longer clutter Library shelves or Up Next cards.

## Same-name Library grouping
Library shelves and the Library type filter now group by the visible type label rather than the underlying API/source type. For example, a YouTube-backed `Workout` item and a manually entered `Workout` item appear in the same `Workout` shelf while retaining their own source/provider behavior when opened.

## Book reading ranges

Books can now store one or more reading periods (`startDate` + optional `endDate`).
An open period means the book is currently being read. Pausing closes the current
period; resuming starts a new period. Desktop month view renders each period as a
continuous horizontal line, while mobile week view renders it as a connected
vertical rail. These periods are stored inside the existing profile JSON, so no
Supabase schema change is required.

## Recurring reminders

Choose **Reminder** in Add/Edit, give it a title (for example `Laundry`) and a visible type (for example `Chores`). Reminders can repeat every day or weekly on a selected weekday. They live in Up Next. Checking a due reminder logs that completion to today's calendar under its visible type, contributes to that type's streak, and automatically advances the next occurrence. Future reminders remain visible but cannot be checked before they are due.

## Book edition deduplication

Discover now treats a Google Books result as already tracked when its normalized title and author(s) match a saved book, even when Google Books returns a different volume ID for another edition. The same title/author signature is also used to deduplicate multiple editions inside the Discover feed itself.

## One-time reminders

Reminder repeat options now include **Never**. A one-time reminder uses a specific due date. Completing it logs the occurrence to calendar/history and removes the reminder from Up Next without adding it to Library. Daily and weekly reminders continue to reschedule.

## Reminder visibility

Reminders stay hidden from **Up Next** before the current occurrence is due. They appear on the scheduled date and remain visible as **Overdue** until checked off. Completing a recurring reminder schedules its next occurrence, which stays hidden until that next due date. One-time reminders disappear after completion.


## Library display filters
Library now defaults to Movie, TV, and Book sections only. The Library Types control is a checkbox multi-select for temporarily showing or hiding any visible type. Genre filtering has been removed. Library Settings lets each profile choose which type sections should be visible by default; that preference is included in the existing Supabase profile JSON and requires no schema migration.

### Latest UI fixes
- Mobile book reading periods use the normal per-day calendar sticker rather than the continuous reading rail; desktop month view keeps the continuous book range line.
- Up Next/TBR now have a visible-type filter (same-name types are grouped together).
- Discover rating/notes saving now targets the exact tracked item, immediately refreshes after adding from Discover, and fixes the book-detail metadata error that could prevent book details/personal metadata from working.

### Streaming availability on saved cards
TV and movie cards in Up Next, TBR, and Library now show TMDB watch-provider availability for the configured watch region. Up Next/TBR use a compact “Available on …” line. Library posters show a compact provider badge; collapsed shelves hydrate the visible first row and expanded shelves hydrate all posters. Availability uses the existing one-hour API cache.

### Streaming availability placement
- Up Next: TV/movie services are shown inline with the type metadata, e.g. `TV · Netflix`.
- TBR: services are inline after the TBR marker, e.g. `TV · TBR · Crave`.
- Library shelves: no streaming badge is shown on posters.
- TV/movie details: opening a tracked item shows a Streaming section using the configured TMDB watch region. Discover TV/movie detail continues to show streaming availability as well.


## Ticketmaster + upcoming Calendar

- Ticketmaster Discovery API is now a real content source. **Event** is available in Add/Edit search, event details include date/time, venue, classifications, price range when returned, and a Ticketmaster ticket link.
- Discover now mixes upcoming Ticketmaster events with TV, movies, and books. The Type filter includes **Events**, search includes Ticketmaster, and Discover Settings includes an event city/country.
- Up Next now has a **Calendar** tab. It shows future one-time/recurring reminder occurrences, saved Ticketmaster events, followed TV shows' next scheduled episode, and other future-dated/release items in chronological groups.
- Saved Ticketmaster events use the existing item/profile JSON and therefore require no Supabase schema change.
- Configure `EXPO_PUBLIC_TICKETMASTER_API_KEY`; optional `EXPO_PUBLIC_HOME_CITY` / `EXPO_PUBLIC_HOME_COUNTRY` provide the initial event location.
