-- More project statuses: a proposal not yet won, a project that hasn't started, and a cancelled one.
-- Existing projects keep their status.

alter table public.projects drop constraint projects_status_check;
alter table public.projects add constraint projects_status_check
  check (status in ('proposal', 'not_started', 'active', 'on_hold', 'completed', 'cancelled', 'archived'));
