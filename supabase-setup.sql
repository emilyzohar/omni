-- Run this once in Supabase > SQL Editor.
-- It creates one cloud profile row per authenticated user.

create table if not exists public.user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_state enable row level security;

grant select, insert, update, delete on public.user_state to authenticated;

-- Re-running this file safely replaces the policy.
drop policy if exists "Users manage their own state" on public.user_state;

create policy "Users manage their own state"
on public.user_state
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
