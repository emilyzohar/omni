# Omni — Buddy Watch entry points + profile TBR/date update

- Add/Edit TV, Movie, and YouTube now exposes **Save & Buddy Watch** when Social is available. The item saves normally first, then the friend picker opens.
- Up Next cards for TV, Movie, and YouTube have a direct **Buddy** action.
- Library detail actions for those types include **Buddy Watch**.
- Creating a Buddy Watch does not move an item between Library, Up Next, or TBR and does not change normal history.
- Social profiles are now initialized in the background on every signed-in Omni page; sharing remains opt-in/off by default.
- If TBR sharing is enabled, those items are folded into their normal content-type shelf in the shared Library. When expanded they appear under **Not started yet** rather than a separate TBR browser.
- TBR-only shared items remain excluded from tracked totals.
- Logged/watched dates were removed from poster cards and are shown only after opening a shared item.
- Social snapshot format bumped to v7; no Supabase SQL migration is required.
