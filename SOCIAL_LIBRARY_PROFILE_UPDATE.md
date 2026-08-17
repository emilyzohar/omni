# Omni social Library profile update

- Streak sharing now lists only streak types that are actually enabled in Track.
- Turning Streaks sharing on defaults to all currently active streak types; uncheck only the ones you want private.
- Following cards now show a compact poster window into each person’s shared Library/Recommended items.
- Opening a profile uses the same Library visual language: large poster cards, horizontal collapsed shelves, View all/Collapse, subcategory/status groupings, counts and badges.
- Shared Library has the same All / Recommended toggle pattern as the owner Library when both are available.
- Up Next is rendered as its own Library-style shelf; ratings that are not otherwise in shared Library/Recommended remain visible in a Ratings shelf.
- Rating, Recommended and Up Next badges are only included when that specific sharing permission allows them.
- “With people” remains separately opt-in.
- Social uses a slightly cooler slate/indigo background and header so it feels related to Omni without looking identical to the private app.
- No Supabase schema change is required; social snapshots are JSON and simply publish the richer filtered presentation fields.
