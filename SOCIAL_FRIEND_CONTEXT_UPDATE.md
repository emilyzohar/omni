# Omni — follower activity context

## Matching-item friend context
- Library item details now include a collapsed **People you follow** section when followed accounts have shared activity for the same item.
- Discover item details show the same section after opening a card.
- Matching uses provider + provider ID when available, with type + normalized title as a fallback for manual items.
- Each person can show whether they logged/watched the item, their rating, and (only if permitted) their note.

## Privacy defaults
- New **Watched & ratings** sharing is ON by default and is independent of Library, Recommended, Up Next, and Ratings-shelf profile sharing.
- Users can opt out globally, by type, or by individual item.
- New **Notes** sharing is OFF by default. If enabled, it follows the same all-by-default / opt-out-by-type-or-item model.
- Notes no longer automatically become social just because a Library item is shared.
- The existing **Ratings shelf** still controls the separate Ratings collection on the profile; it does not control matching-item friend context.

## Discover ranking
- Discover lightly boosts results that one or more people you follow have logged.
- Boost is +1.15 per followed person, capped at +3.2, so it nudges ranking without overriding the stronger taste/genre/author signals.
- Friend snapshots are cached for up to one minute to avoid repeatedly querying Supabase during endless-scroll ranking.

## Storage / Supabase
- No new table or SQL migration is required.
- The filtered social snapshot format is version 8 and stores the new context fields in the existing `social_snapshots.payload` JSON.
- Private `user_state` remains untouched.
