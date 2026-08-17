# Omni — Social profile detail + theme refinement

## Recommended badge fix
- Fixed the profile snapshot bug that could mark every shared Library item as Recommended when its type was allowed under Recommended sharing.
- A Recommended badge now requires both: the source item is actually recommended, and that item is allowed by Recommended sharing.
- Up Next progress now likewise requires the source item to actually be in Up Next.

## Profile item details
- Shared profile Library cards are clickable.
- Opening a card uses the familiar Library detail presentation with a collapsible Synopsis.
- Shared rating is shown only when Ratings sharing permits it.
- Notes are included only for items that are shared through Library.
- Shared With people, Recommended, progress, and status badges remain permission-aware.
- Track and TBR actions affect only the viewer's own Omni. They create/update a separate local/private item for the viewer and never modify the profile owner's data.

## Profile totals + streaks
- Tracked totals are compact pills instead of large dashboard cards.
- Streaks use the same compact pill/sticker presentation as the Track streak summary.

## Profile background themes
- Profile & sharing now includes the six Track colour families: Dusty blue, Burgundy, Slate, Charcoal, Forest, and Espresso.
- The selected theme is saved inside existing social_preferences JSON and published only as the profile theme in the social snapshot.
- No Supabase SQL migration is needed.
- Theme colours are deliberately softened for profile backgrounds so the Library remains readable.

## Social colour scheme
- Social returns to Omni's cream/maroon/navy base styling.
- The selected profile theme provides the small visual distinction instead of recolouring the entire Social page.

## Validation
- app.js passes node --check.
- No duplicate IDs in index.html, discover.html, or social.html.
- CSS braces are balanced.
