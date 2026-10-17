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
