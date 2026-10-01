# Omni — clean app refresh

## Install

Copy the files in this ZIP into the root of your existing Omni project, replacing the corresponding files. Add both `ui.css` and `ui.js`; all four pages reference them. Use your existing dependency installation, environment variables, assets, manifest and normal build/deployment process. This ZIP is an update to the supplied project files, not a standalone replacement repository. No database migration is needed for these changes. Keep your existing social-table setup.

The API file is unchanged. Configuration now supports both Vite environment variables and optional public runtime settings. Treat this ZIP as private if your project configuration contains credentials. Open the app through your existing Vite server rather than by double-clicking an HTML file.

## What changed

- Neutral gray surfaces, Inter typography, smaller navigation and simpler controls; your original blue accents retain a playful feel.
- Artwork softly tints queue, Discover and social cards using the actual cover image. This is a blurred artwork treatment, not dominant-color extraction. It avoids canvas/CORS restrictions and reuses the same image URL.
- Social highlights become compact cover-and-copy cards. Names and dates are secondary, comments are limited to two lines, and ratings only occupy space when present. Item detail and profile action hooks remain unchanged.
- Followers no longer occupy the highlights grid; existing follower/profile controls remain available elsewhere. Follow requests and Buddy Watch invitations retain their actions and span the grid.
- Sticker geometry, images, calendar data, drag logic and theme code are unchanged. The original `style.css` is byte-for-byte unchanged; `ui.css` provides the refresh without editing sticker rules.
- Feed and Discover images load lazily; decoding is asynchronous. Card rendering uses CSS content visibility on browsers that support it.
- Artwork enhancement batches DOM updates into animation frames and only observes new nodes or changed image sources.
- Service worker caches only explicitly listed same-origin app files, ignores private/no-store responses, retains unrelated caches and tolerates individual precache failures. API responses, external requests and arbitrary GETs no longer enter its cache.

## Audit and remaining work

The supplied application JS is about 978 KB and the stylesheet about 353 KB before compression. Both contain many accumulated features/overrides. This update preserves those systems to avoid breaking calendar/sticker behavior. It does not claim a measured improvement in Lighthouse scores or reduce the size of that legacy application bundle. A future performance pass should split page-specific JavaScript, consolidate the CSS with visual regression coverage, and measure cold-load performance in production.

The previous worker cached every successful GET, including third-party/API responses, and its all-or-nothing precache depended on a manifest not supplied here. These were concrete reliability and cache-scope issues; the replacement corrects them. Confirm that your existing deployment actually registers `sw.js`; no new registration flow is introduced.

Large social cards cropped artwork to landscape and gave follower lists equal grid priority. The replacement emphasizes short updates and preserves portrait covers. The feed still shows the existing maximum of 120 entries; there is no new pagination behavior or fabricated social data.

## Validation

Passed JS syntax checks and fixture checks for HTML escaping, item/profile action hooks, missing artwork, optional metadata, service-worker API/external exclusions, page asset references, and unchanged base/sticker CSS.

Browser visual testing was attempted but the installed Playwright package has no browser executable in this environment. The mobile/desktop CSS has not been visually verified in a live browser. Authentication, Supabase syncing, real artwork, API results, drag interactions and offline navigation require a smoke test in the existing deployed project. A system font fallback is provided when Google Fonts cannot load.

Suggested smoke test: Home queue actions; calendar drag/sticker shapes; Library detail/edit; Discover add/complete; Social item/profile opening and invitations; sign-in/sign-out; 390px and desktop widths.

## Module-resolution fix (107)

The original Supabase file imported a bare npm package and both configuration files read `import.meta.env` without a fallback. These only work after Vite processes the files. Supabase now imports a pinned browser ESM URL, and both configuration files safely merge optional public runtime settings with Vite variables. Cache versions have been bumped.

For your existing Vite deployment, retain the environment variables and run your normal build. If hosting the source files directly, supply your project URL and publishable/anon key in `runtime-config.js`. The uploaded files contained no actual Supabase URL or key, so these cannot be filled in automatically. Missing configuration is not a working sign-in setup. Other API settings likewise need appropriate browser-safe runtime settings or your existing Vite build.

Errors naming `zotero_config.js`, `pageSaving.js`, `TranslateWeb`, etc. are not from files in this project. Verify by temporarily disabling Zotero Connector and reloading, or using a browser profile without that extension. No app code has been altered to suppress extension errors.

## Blue accents and Live Server (108)

Restored the original blue values `#8b99ca` and `#7889c2`, with pale blue selected controls. Purple UI accents have been removed. Cover-derived colors still reflect each content image.

Live Server serves source files and does not read `.env` or inject Vite environment variables. If your Last.fm key is in `.env`, launch your existing project using its Vite development script (usually `npm run dev`), or build with Vite and deploy the `dist` output. Restart Vite after editing `.env`.

If intentionally using Live Server, uncomment `EXPO_PUBLIC_LASTFM_API_KEY` in `runtime-config.js` and put your Last.fm key there. Supabase also needs its project URL and public key there for unbundled hosting. This file is publicly served; only browser-safe settings belong in it. The supplied attachments do not contain these values, so no keys have been invented or populated.

## Original star and heart silhouettes (109)

These stickers use font glyphs rather than vector outlines. The global Inter switch changed their appearance despite leaving the base sticker CSS intact. DM Sans is now loaded alongside Inter and explicitly used for star/heart stickers and rating symbols. Their original weights, sizes, transforms and shadows remain unchanged. Interface text stays in Inter.

## Navigation hover (110)

Restored transparent navigation links with the original italic hover/active treatment and animated underline. Removed the filled highlight box. This ZIP does not yet split Up Next and Calendar or add an app bottom bar.
