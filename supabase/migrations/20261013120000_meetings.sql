-- =====================================================================
-- Project Status Service — meetings
--
-- Custom meetings per project (kickoff, sprint planning, client demo…),
-- each with optional times, a location or call link, attendees and
-- Markdown notes. Several meetings can share a day.
--
-- Run after 20261013000000_init.sql (SQL Editor → New query → Run),
-- or with the Supabase CLI: `supabase db push`.
-- =====================================================================

create table public.meetings (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  title       text not null check (char_length(trim(title)) > 0),
  date        date not null,
  -- Local wall-clock times; both optional ("time to be decided").
  start_time  time,
  end_time    time,
  -- Room, address or video-call link.
  location    text,
  attendees   text[] not null default '{}',
  -- Markdown: agenda, notes, action items.
  notes       text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint meetings_times_check
    check (end_time is null or (start_time is not null and end_time > start_time))
);

create index meetings_project_id_date_idx on public.meetings (project_id, date);

create trigger meetings_set_updated_at
  before update on public.meetings
  for each row execute function public.set_updated_at();

alter table public.meetings enable row level security;

create policy "Users manage meetings of their projects"
  on public.meetings for all to authenticated
  using (exists (
    select 1 from public.projects p
    where p.id = meetings.project_id and p.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.projects p
    where p.id = meetings.project_id and p.owner_id = (select auth.uid())
  ));

revoke all on public.meetings from anon;
grant select, insert, update, delete on public.meetings to authenticated;
