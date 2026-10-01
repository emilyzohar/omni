# Open in VS Code

1. Unzip this download and open the omni-web-app folder in VS Code.
2. For your existing GitHub repo, copy the CONTENTS of this folder into the repo root. calendar.html and index.html must be beside each other, and supabase/ must be at the repo root. Include the hidden .github folder.
3. Preserve your already configured runtime-config.js. This package's copy still has blank placeholders. Do not overwrite your real public settings with those placeholders.
4. Replace the old workflow that deploys game-catalogue with the supplied .github/workflows/deploy-supabase.yml. Delete the old games workflow, or replace its contents with the supplied workflow. Simply adding this workflow will NOT stop the old one from running. Preserve unrelated website deployment workflows.
5. The new workflow deploys only send-web-releases. It does not set IGDB or BoardGameGeek secrets or deploy game-catalogue. It relies on your existing SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_ID GitHub secrets. Notification secrets still need to be configured in Supabase, as explained in README.md.
6. Commit and push. In GitHub Actions choose Deploy notification sender > Run workflow if it does not start automatically.
7. Verify the website build also includes calendar.html. This workflow deploys the Supabase sender, not the website itself.

This ZIP removes games from the deployment workflow. Games options in the supplied app interface remain; no existing game records are deleted. Other existing Supabase functions are not recreated or deleted by this package.
