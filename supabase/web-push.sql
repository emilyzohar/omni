-- Run once in the SQL Editor of the SAME Supabase project used by Omni.
create table if not exists public.web_push_devices (
 endpoint text primary key, user_id uuid not null references auth.users(id) on delete cascade,
 subscription jsonb not null, enabled_at timestamptz not null default now()
);
create table if not exists public.web_release_watchlists (
 user_id uuid primary key references auth.users(id) on delete cascade,
 watches jsonb not null default '[]', updated_at timestamptz not null default now(),
 check (jsonb_typeof(watches)='array' and jsonb_array_length(watches)<=2000)
);
create table if not exists public.web_push_deliveries (
 endpoint text references public.web_push_devices(endpoint) on delete cascade,
 release_key text not null, sent_at timestamptz not null default now(), primary key(endpoint,release_key)
);
alter table public.web_push_devices enable row level security;
alter table public.web_release_watchlists enable row level security;
alter table public.web_push_deliveries enable row level security;
create policy "Own web push devices" on public.web_push_devices for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "Own web release watchlist" on public.web_release_watchlists for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
grant select,insert,update,delete on public.web_push_devices,public.web_release_watchlists to authenticated;
revoke all on public.web_push_deliveries from anon,authenticated;
-- A lease prevents overlapping scheduled senders.
create table if not exists public.web_push_sender_lock (id int primary key, until_at timestamptz not null);
alter table public.web_push_sender_lock enable row level security;
revoke all on public.web_push_sender_lock from anon,authenticated;
create or replace function public.claim_web_push_sender() returns boolean language plpgsql security definer set search_path=public as $$
begin
 insert into web_push_sender_lock values(1,now()+interval '10 minutes') on conflict(id) do update set until_at=excluded.until_at where web_push_sender_lock.until_at<now();
 return found;
end;$$;
revoke all on function public.claim_web_push_sender() from public,anon,authenticated;
grant execute on function public.claim_web_push_sender() to service_role;
