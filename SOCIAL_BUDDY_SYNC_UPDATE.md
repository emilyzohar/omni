# Omni social update — Buddy Watch sync + “With people” sharing

## Buddy Watch TV episodes
- TV Buddy Watch updates now use Season + Episode fields.
- Posting `Mark watched & post` writes the episode to the user's normal private Omni episode history first, then posts the Buddy Watch update.
- The normal TV progress / Up Next state is recalculated immediately, so the episode does not need to be marked a second time in Up Next.
- The local episode write is idempotent: posting the same S/E again does not create a duplicate normal-history record.
- If an invited buddy does not already have the show locally, the first watched-episode update creates a normal local TV item and places it in Up Next so future progress has somewhere to live.
- Buddy Watch social progress remains in the separate Buddy Watch Supabase tables; the other person's private history is never edited.

## “With people” on profiles
- Profile & sharing now has a separate `With people` privacy toggle, off by default.
- When enabled, the existing item-level `people` / “With” names are included only for items that are already shared through Recommended, Up Next, Ratings, or Library.
- Turning on `With people` does not make an otherwise hidden item visible.
- Books remain excluded because Omni's item-level “With people” field is excluded for books.

## Supabase
- No new tables or SQL migration are required for this update.
- Existing `social_preferences.share_settings` and `social_snapshots.payload` JSON fields accept the new preference / snapshot fields.
- Existing `user_state` storage is unchanged.
