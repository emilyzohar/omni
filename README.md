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

## Watched-state fixes

- Marking an entire TV season watched creates undated history only; it does not create calendar entries.
- TV episode synopses are no longer copied into history Notes.
- Checked TV episodes are toggleable. Clicking a checked episode marks it not watched and recalculates Up Next.
- The TV add/edit episode checklist can clear previously watched episodes as well as add them.
- Season-level watched controls toggle between marking and clearing the season.
