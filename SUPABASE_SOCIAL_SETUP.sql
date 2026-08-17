-- Omni social layer
-- Safe/additive: this script does not alter or migrate public.user_state.
-- Run once in Supabase -> SQL Editor.

begin;

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null default '',
  bio text not null default '',
  avatar_url text not null default '',
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9][a-z0-9._-]{2,29}$')
);

create table if not exists public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_not_self check (follower_id <> following_id)
);

create table if not exists public.social_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  share_settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.social_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.buddy_watches (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  item jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active','completed','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.buddy_watch_members (
  buddy_watch_id uuid not null references public.buddy_watches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (buddy_watch_id, user_id)
);

create table if not exists public.buddy_watch_progress (
  buddy_watch_id uuid not null references public.buddy_watches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  progress_text text not null default '',
  note text not null default '',
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (buddy_watch_id, user_id)
);

create table if not exists public.buddy_watch_updates (
  id uuid primary key default gen_random_uuid(),
  buddy_watch_id uuid not null references public.buddy_watches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  progress_text text not null default '',
  note text not null default '',
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists profiles_username_idx on public.profiles (username);
create index if not exists follows_following_idx on public.follows (following_id, status);
create index if not exists follows_follower_idx on public.follows (follower_id, status);
create index if not exists buddy_watch_members_user_idx on public.buddy_watch_members (user_id, status);
create index if not exists buddy_watch_updates_watch_idx on public.buddy_watch_updates (buddy_watch_id, created_at desc);

-- Security-definer helpers keep RLS policies simple and avoid recursive policy checks.
create or replace function public.omni_is_accepted_follower(viewer uuid, target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.follows f
    where f.follower_id = viewer
      and f.following_id = target
      and f.status = 'accepted'
  );
$$;

create or replace function public.omni_can_view_social(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.user_id = target
        and (
          p.is_private = false
          or public.omni_is_accepted_follower(auth.uid(), target)
        )
    );
$$;

create or replace function public.omni_is_buddy_member(watch_id uuid, viewer uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.buddy_watch_members m
    where m.buddy_watch_id = watch_id
      and m.user_id = viewer
      and m.status in ('pending','accepted')
  );
$$;

create or replace function public.omni_is_buddy_accepted(watch_id uuid, viewer uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.buddy_watch_members m
    where m.buddy_watch_id = watch_id
      and m.user_id = viewer
      and m.status = 'accepted'
  );
$$;

-- Relationship identity columns are immutable after insert. This prevents an allowed
-- status update from being repurposed to forge a different relationship.
create or replace function public.omni_lock_follow_participants()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.follower_id <> old.follower_id or new.following_id <> old.following_id then
    raise exception 'Follow participants cannot be changed';
  end if;
  return new;
end;
$$;

drop trigger if exists omni_lock_follow_participants_trigger on public.follows;
create trigger omni_lock_follow_participants_trigger
before update on public.follows
for each row execute function public.omni_lock_follow_participants();

create or replace function public.omni_lock_buddy_member_keys()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.buddy_watch_id <> old.buddy_watch_id or new.user_id <> old.user_id then
    raise exception 'Buddy Watch membership keys cannot be changed';
  end if;
  return new;
end;
$$;

drop trigger if exists omni_lock_buddy_member_keys_trigger on public.buddy_watch_members;
create trigger omni_lock_buddy_member_keys_trigger
before update on public.buddy_watch_members
for each row execute function public.omni_lock_buddy_member_keys();

alter table public.profiles enable row level security;
alter table public.follows enable row level security;
alter table public.social_preferences enable row level security;
alter table public.social_snapshots enable row level security;
alter table public.buddy_watches enable row level security;
alter table public.buddy_watch_members enable row level security;
alter table public.buddy_watch_progress enable row level security;
alter table public.buddy_watch_updates enable row level security;

-- Profiles stay searchable to signed-in users. Sharing preferences live in a separate
-- self-only table so other authenticated users cannot inspect hidden-item/type choices.
drop policy if exists profiles_select_authenticated on public.profiles;
create policy profiles_select_authenticated on public.profiles for select to authenticated using (true);
drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles for insert to authenticated with check (user_id = auth.uid());
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Follow relationships are visible to either participant.
drop policy if exists follows_select_participant on public.follows;
create policy follows_select_participant on public.follows for select to authenticated
using (follower_id = auth.uid() or following_id = auth.uid());
drop policy if exists follows_insert_self on public.follows;
create policy follows_insert_self on public.follows for insert to authenticated
with check (
  follower_id = auth.uid()
  and follower_id <> following_id
  and (
    status = 'pending'
    or (
      status = 'accepted'
      and exists (select 1 from public.profiles p where p.user_id = following_id and p.is_private = false)
    )
  )
);
drop policy if exists follows_update_target on public.follows;
create policy follows_update_target on public.follows for update to authenticated
using (following_id = auth.uid())
with check (following_id = auth.uid());
drop policy if exists follows_delete_participant on public.follows;
create policy follows_delete_participant on public.follows for delete to authenticated
using (follower_id = auth.uid() or following_id = auth.uid());


-- Sharing preferences are private to their owner.
drop policy if exists social_preferences_select_self on public.social_preferences;
create policy social_preferences_select_self on public.social_preferences for select to authenticated
using (user_id = auth.uid());
drop policy if exists social_preferences_insert_self on public.social_preferences;
create policy social_preferences_insert_self on public.social_preferences for insert to authenticated
with check (user_id = auth.uid());
drop policy if exists social_preferences_update_self on public.social_preferences;
create policy social_preferences_update_self on public.social_preferences for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Only the filtered snapshot is social-readable; user_state remains governed by its existing policies.
drop policy if exists social_snapshots_select_allowed on public.social_snapshots;
create policy social_snapshots_select_allowed on public.social_snapshots for select to authenticated
using (public.omni_can_view_social(user_id));
drop policy if exists social_snapshots_insert_self on public.social_snapshots;
create policy social_snapshots_insert_self on public.social_snapshots for insert to authenticated
with check (user_id = auth.uid());
drop policy if exists social_snapshots_update_self on public.social_snapshots;
create policy social_snapshots_update_self on public.social_snapshots for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Buddy Watches are separate shared records. Neither member receives access to the other's user_state.
drop policy if exists buddy_watches_select_member on public.buddy_watches;
create policy buddy_watches_select_member on public.buddy_watches for select to authenticated
using (created_by = auth.uid() or public.omni_is_buddy_member(id, auth.uid()));
drop policy if exists buddy_watches_insert_creator on public.buddy_watches;
create policy buddy_watches_insert_creator on public.buddy_watches for insert to authenticated
with check (created_by = auth.uid());
drop policy if exists buddy_watches_update_creator on public.buddy_watches;
create policy buddy_watches_update_creator on public.buddy_watches for update to authenticated
using (created_by = auth.uid()) with check (created_by = auth.uid());
drop policy if exists buddy_watches_delete_creator on public.buddy_watches;
create policy buddy_watches_delete_creator on public.buddy_watches for delete to authenticated
using (created_by = auth.uid());

-- Creator may invite; a member may manage only their own membership state.
drop policy if exists buddy_members_select_watch_member on public.buddy_watch_members;
create policy buddy_members_select_watch_member on public.buddy_watch_members for select to authenticated
using (user_id = auth.uid() or public.omni_is_buddy_member(buddy_watch_id, auth.uid()));
drop policy if exists buddy_members_insert_creator on public.buddy_watch_members;
create policy buddy_members_insert_creator on public.buddy_watch_members for insert to authenticated
with check (
  exists (select 1 from public.buddy_watches w where w.id = buddy_watch_id and w.created_by = auth.uid())
);
drop policy if exists buddy_members_update_self on public.buddy_watch_members;
create policy buddy_members_update_self on public.buddy_watch_members for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists buddy_members_delete_self_or_creator on public.buddy_watch_members;
create policy buddy_members_delete_self_or_creator on public.buddy_watch_members for delete to authenticated
using (
  user_id = auth.uid()
  or exists (select 1 from public.buddy_watches w where w.id = buddy_watch_id and w.created_by = auth.uid())
);

-- Accepted members can see all member progress and post only their own progress/updates.
drop policy if exists buddy_progress_select_member on public.buddy_watch_progress;
create policy buddy_progress_select_member on public.buddy_watch_progress for select to authenticated
using (public.omni_is_buddy_member(buddy_watch_id, auth.uid()));
drop policy if exists buddy_progress_insert_self on public.buddy_watch_progress;
create policy buddy_progress_insert_self on public.buddy_watch_progress for insert to authenticated
with check (user_id = auth.uid() and public.omni_is_buddy_accepted(buddy_watch_id, auth.uid()));
drop policy if exists buddy_progress_update_self on public.buddy_watch_progress;
create policy buddy_progress_update_self on public.buddy_watch_progress for update to authenticated
using (user_id = auth.uid() and public.omni_is_buddy_accepted(buddy_watch_id, auth.uid()))
with check (user_id = auth.uid() and public.omni_is_buddy_accepted(buddy_watch_id, auth.uid()));

drop policy if exists buddy_updates_select_member on public.buddy_watch_updates;
create policy buddy_updates_select_member on public.buddy_watch_updates for select to authenticated
using (public.omni_is_buddy_member(buddy_watch_id, auth.uid()));
drop policy if exists buddy_updates_insert_self on public.buddy_watch_updates;
create policy buddy_updates_insert_self on public.buddy_watch_updates for insert to authenticated
with check (user_id = auth.uid() and public.omni_is_buddy_accepted(buddy_watch_id, auth.uid()));

commit;
