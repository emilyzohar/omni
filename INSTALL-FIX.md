# Calendar, manifest and service worker build fix

Copy the CONTENTS of this folder into your existing Omni repository root. Replace vite.config.js and package.json and include both .mjs scripts and public/.

This is a patch, not a complete app. Keep your existing HTML, JavaScript, runtime-config.js, API settings, Supabase files and GitHub workflows.

In VS Code Terminal, from your repository root:

    npm install
    npm run build

The build now includes Calendar. It updates the manifest/icon links in all five source HTML pages, copies public/manifest.webmanifest and public/icons unchanged, and generates dist/sw.js from the actual compiled files instead of an obsolete source cache list. Original root-level sw.js and manifest.webmanifest are no longer the deployed versions.

Commit package-lock.json along with these changes so GitHub's npm ci works. Also commit the updated HTML pages. Your website workflow must publish dist/ after npm run build. Keep the notification sender workflow separately.

Verify locally that dist/calendar.html, dist/manifest.webmanifest, dist/icons/icon-192.png and dist/sw.js exist. After website deployment check:

https://emilyzohar.github.io/omni/calendar.html
https://emilyzohar.github.io/omni/manifest.webmanifest
https://emilyzohar.github.io/omni/icons/icon-192.png

Close all Omni tabs and installed app windows once after deployment, then reopen to activate the updated service worker. If old cache errors remain, in desktop Chrome DevTools > Application > Service Workers, unregister the Omni worker, then reload. Unregistering the worker alone preserves your sign-in storage. Avoid clearing all site data.

The patch does not change your keys or validate them. A TMDB token consisting of ',,' is invalid. Push still requires the previously supplied sender, SQL and secrets setup. Placeholder Omni icons are included.
