-- =====================================================================
-- Project Status Service — tickets completed per day
--
-- One number per project per day. The dashboard adds these up per client
-- for "today" and "last 7 days". A missing row means nothing was logged.
--
-- Run after the earlier migrations (SQL Editor → New query → Run),
-- or with the Supabase CLI: `supabase db push`.
-- =====================================================================

create table public.ticket_counts (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  date        date not null,
  completed   integer not null check (completed >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (project_id, date)
);

-- The unique constraint serves lookups by project; this one serves the
-- dashboard, which reads the last 7 days across all projects.
create index ticket_counts_date_idx on public.ticket_counts (date);

create trigger ticket_counts_set_updated_at
  before update on public.ticket_counts
  for each row execute function public.set_updated_at();

alter table public.ticket_counts enable row level security;

create policy "Users manage ticket counts of their projects"
  on public.ticket_counts for all to authenticated
  using (exists (
    select 1 from public.projects p
    where p.id = ticket_counts.project_id and p.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.projects p
    where p.id = ticket_counts.project_id and p.owner_id = (select auth.uid())
  ));

revoke all on public.ticket_counts from anon;
grant select, insert, update, delete on public.ticket_counts to authenticated;
