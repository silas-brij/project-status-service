-- =====================================================================
-- Project Status Service — initial schema
--
-- Run this once in the Supabase dashboard (SQL Editor → New query → Run),
-- or with the Supabase CLI: `supabase db push`.
--
-- Every project belongs to the signed-in user who created it. Row Level
-- Security makes sure users can only ever see and change their own data.
-- =====================================================================

-- ---------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------
create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(trim(name)) > 0),
  client      text,
  description text,
  status      text not null default 'active'
              check (status in ('active', 'on_hold', 'completed', 'archived')),
  color       text not null default '#4f46e5',
  currency    text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  budget      numeric(14, 2) check (budget is null or budget >= 0),
  start_date  date,
  end_date    date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint projects_dates_check
    check (start_date is null or end_date is null or end_date >= start_date)
);

create index projects_owner_id_idx on public.projects (owner_id);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- standups: one Markdown entry per project per day
-- ---------------------------------------------------------------------
create table public.standups (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  date        date not null,
  content     text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint standups_project_date_key unique (project_id, date)
);

create trigger standups_set_updated_at
  before update on public.standups
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- sprints
-- ---------------------------------------------------------------------
create table public.sprints (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  name        text not null check (char_length(trim(name)) > 0),
  goal        text,
  start_date  date not null,
  end_date    date not null,
  status      text not null default 'planned'
              check (status in ('planned', 'active', 'completed')),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint sprints_dates_check check (end_date >= start_date)
);

create index sprints_project_id_start_date_idx on public.sprints (project_id, start_date);

create trigger sprints_set_updated_at
  before update on public.sprints
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- payments: the payment timeline (milestones / invoices) of a project
-- ---------------------------------------------------------------------
create table public.payments (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  title       text not null check (char_length(trim(title)) > 0),
  amount      numeric(14, 2) not null check (amount >= 0),
  due_date    date not null,
  status      text not null default 'pending'
              check (status in ('pending', 'invoiced', 'paid', 'cancelled')),
  paid_date   date,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index payments_project_id_due_date_idx on public.payments (project_id, due_date);

create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.projects enable row level security;
alter table public.standups enable row level security;
alter table public.sprints  enable row level security;
alter table public.payments enable row level security;

create policy "Users manage their own projects"
  on public.projects for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "Users manage stand-ups of their projects"
  on public.standups for all to authenticated
  using (exists (
    select 1 from public.projects p
    where p.id = standups.project_id and p.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.projects p
    where p.id = standups.project_id and p.owner_id = (select auth.uid())
  ));

create policy "Users manage sprints of their projects"
  on public.sprints for all to authenticated
  using (exists (
    select 1 from public.projects p
    where p.id = sprints.project_id and p.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.projects p
    where p.id = sprints.project_id and p.owner_id = (select auth.uid())
  ));

create policy "Users manage payments of their projects"
  on public.payments for all to authenticated
  using (exists (
    select 1 from public.projects p
    where p.id = payments.project_id and p.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.projects p
    where p.id = payments.project_id and p.owner_id = (select auth.uid())
  ));

-- ---------------------------------------------------------------------
-- API access: signed-in users only (RLS still applies on top of this)
-- ---------------------------------------------------------------------
revoke all on public.projects, public.standups, public.sprints, public.payments from anon;
grant select, insert, update, delete
  on public.projects, public.standups, public.sprints, public.payments
  to authenticated;
