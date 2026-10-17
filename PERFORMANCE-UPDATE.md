Changes
- Calendar now appears below Up Next. Old calendar links redirect there.
- Bottom navigation: Up Next, Discover, Add, Social, Library. Add uses a centered SVG.
- Library opens its dedicated page rather than redirecting through Social.
- Completion buttons immediately show a spinner and Saving; duplicate completion taps are blocked.
- TV card loading reuses season data used by the completion action. Background reconciliation no longer holds up card details, and duplicate reconciliation scans share one run.
- Repeat visits use an authenticated, account-specific IndexedDB snapshot while cloud updates load in the background. Pending local updates are retained and retried on reconnection; page navigation waits for local persistence.
- Cloud refreshes skip applying their response if a local edit or completion started during the request.
- Concurrent identical API requests share a promise. Cache persistence batches writes rather than serializing the whole cache after every response.
- Independent For You recommendation sources run concurrently. Unselected seed types are skipped. Unfiltered Discover no longer waits for genre metadata or follower context; streaming annotation only blocks ranking when streaming preferences need it.

Installation
Replace the repository files with this folder's contents and commit to main. The existing GitHub Pages workflow installs dependencies and builds/deploys the app. Do not upload node_modules. No database migration is needed.

Validation
npm test: request deduplication, cache reuse, retry after failure, batched cache persistence, and local edits during an in-flight cloud refresh.
npm run build: passed.
Navigation markup checks: all entry points have the four destinations and one active destination.
A full visual browser check and authenticated cross-device sync test were not available in this environment. Performance against real catalogue services and your account still needs checking after deployment. The production JavaScript bundle remains large; these changes address blocking work and redundant requests rather than splitting the app into separate bundles.

Navigation follow-up
Service-worker updates now activate immediately; updated clients reload when safe. The 404 fallback uses the new navigation. The dist folder contains ready-built files, while the repository root remains the editable source. After the deployment completes, reload the app; close and reopen old tabs if the previous release remains visible.

Social update
- Recent replaces Highlights: type groups, newest logged titles first, clear /5 rating and recommendation badge, readable public comments, search/type/recommendation filters, and expandable shelves.
- Calendar is a second Social tab, with week/month navigation and one row per person you follow. Each sticker opens shared item details and uses the viewer's existing type/subcategory shape and colour preferences.
- The shared snapshot now includes permitted calendar dates, deduplicated per title/day. Existing activity-sharing exclusions, calendar visibility and account access rules remain in force; private notes are not published.
- Older snapshots fall back to the latest shared activity dates. Historical dates fill in when each person next opens the updated app and publishes their snapshot. Up to 3,000 recent title/date pairs are retained per profile.
- Fixed feed item details to resolve followed profiles directly.
Validation: npm test covers social grouping, recency, metadata merging, escaping, filters, calendar date boundaries, row count, sticker preferences, details lookup, activity sharing and calendar deduplication. Production build passed. Visual browser verification and signed-in multi-account verification remain unavailable here.

Social appearance correction
- Social calendar now reuses the main calendar's tracker-grid/tracker-month-grid, cell, theme variables, month controls and monthStickerPileMarkup, replacing the mismatched white cells and oversized fixed columns.
- Multiple shared items on a day form the same overlapping sticker piles; tapping a pile opens that person's entries for the date.
- Removed the circle search field and missing-rating placeholder.
- All/Recommended and By type/Recent use the existing Library folder-tab controls. Recent switches to one chronological feed.
- TV then Movies precede the remaining alphabetical type groups.
Changed for this correction: app.js, app-shell.css, social.html, sw.js, tests/social.cjs, this file, and regenerated dist.
