OMNI — SOCIAL SHARING OPT-OUT UPDATE

PROFILE SHARING
- Every sharing section is now opt-out after the section is enabled.
- Enabling Recommended, Up Next, Ratings, Streaks, or Library shares every currently eligible type by default.
- Uncheck a type to exclude it.
- Newly appearing types are shared automatically unless that type has explicitly been excluded.
- Recommended only lists types with recommended items.
- Up Next only lists types currently in Up Next.
- Ratings only lists types with ratings.
- Library only lists types currently present in Library.
- Streaks only lists streak types currently enabled in Track.

INDIVIDUAL ITEMS
- Per-item sharing remains opt-out: checked means shared; uncheck an individual item to hide it.
- Hiding a whole type disables its individual-item controls.
- Existing hidden-item choices are preserved.

COMPATIBILITY
- Existing saved opt-in type selections are migrated conservatively on load: previously unshared types remain excluded.
- Future saves use excludedTypes rather than the old selected types array.
- No Supabase SQL change is required because social_preferences.share_settings is JSON.
- Existing user_state/history/library data is unchanged.
