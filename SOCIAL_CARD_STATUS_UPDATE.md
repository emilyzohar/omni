OMNI — SOCIAL PROFILE CARD STATUS UPDATE

PROFILE CARDS
- TV episode position is shared/rendered only while the owner is actively watching the show.
- Active means: following the show, has an unwatched aired episode, not paused, not completed, and series is not ended/cancelled.
- Episode position is fixed to the bottom-right of poster cards.
- Ordinary In progress / Finished / Up to date states are no longer card badges.
- Exceptional Library-style disposition badges remain for Paused, Stopped, and Not Released.
- If a watched/completed date is logged, the latest date is included inside the card.

TBR PRIVACY
- Pure TBR/watch-later items are not published by default.
- Library sharing now has an explicit “Include TBR items” opt-in.
- If enabled, TBR items appear in a separate TBR subsection, grouped by content type.
- TBR items do not count toward shared tracked totals.
- Paused/in-progress titles and Not Released titles continue to follow normal Library behavior rather than being treated as pure TBR.
- TBR sharing uses the existing social_preferences JSON; no Supabase schema change is required.

VALIDATION
- node --check passed for app.js, api.js, config.js, supabase.js, and vite.config.js.
- No duplicate HTML IDs in index.html, discover.html, or social.html.
- CSS braces balanced.
- Production Vite build was not run because dependencies are not installed in this working copy.
