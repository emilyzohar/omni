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
