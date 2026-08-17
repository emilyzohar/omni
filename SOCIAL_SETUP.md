# Omni Social setup

This build adds Social without changing the existing `user_state` cloud-sync model.

## One-time Supabase step

1. Open your existing Supabase project.
2. Open **SQL Editor**.
3. Paste and run `SUPABASE_SOCIAL_SETUP.sql` from this folder.
4. Deploy the site normally. No new API keys or GitHub secrets are required for Social.

The SQL creates only new tables/functions/policies:

- `profiles`
- `social_preferences` (self-only sharing choices)
- `follows`
- `social_snapshots` (already-filtered public/follower-facing data)
- `buddy_watches`
- `buddy_watch_members`
- `buddy_watch_progress`
- `buddy_watch_updates`

It does not alter, migrate, delete, or normalize `user_state`.

## Sharing behavior

All sharing sections start **off**. A user can separately enable:

- Recommended — choose types and individual visible items
- Up Next — choose types and individual visible items
- Ratings — choose types and individual visible items
- Streaks — choose which streak/type groups are visible
- Library — choose types and individual visible items

For Library types selected for sharing, the profile also shows the total number of tracked items in that type. Hiding individual Library items does not change that total.

Private notes, attachments, “with people” metadata, and the private `user_state` object are never copied into social snapshots.

## Following

- Public profiles: a follow becomes active immediately.
- Private profiles: a follow is pending until accepted.
- Usernames remain searchable so private profiles can receive requests.

## Buddy Watch

Buddy Watch is shared progress/status, not synchronized streaming playback.

- Create a Buddy Watch from a TV, Movie, or YouTube item already in Omni.
- Invite an accepted social connection.
- Each member has their own progress row and update history.
- Buddy Watch progress does not write into the other member's private Library/history.
