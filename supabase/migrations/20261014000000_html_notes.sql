-- =====================================================================
-- Project Status Service — HTML notes
--
-- Stand-up and meeting notes can be Markdown (the default) or an HTML
-- document that is shown as designed. Existing notes stay Markdown.
--
-- Run after 20261013120000_meetings.sql (SQL Editor → New query → Run),
-- or with the Supabase CLI: `supabase db push`.
-- =====================================================================

alter table public.standups
  add column content_format text not null default 'markdown'
  constraint standups_content_format_check check (content_format in ('markdown', 'html'));

alter table public.meetings
  add column notes_format text not null default 'markdown'
  constraint meetings_notes_format_check check (notes_format in ('markdown', 'html'));
