# Project Status

A small web app for keeping several projects under control, built with **React + Vite + TypeScript** and **Supabase**.

- **Projects**: client, status, dates, budget, currency, color and a Markdown description.
- **Daily stand-ups**: one Markdown entry per project per day, browsed on a calendar.
  - **Day view**: rendered Markdown, with prev/next to step through entries.
  - **Month view**: every stand-up of the month as one readable feed.
  - New stand-ups start from a *Yesterday / Today / Blockers* template, and the previous stand-up's *Today* is carried into *Yesterday*.
  - **Import `.md` files**: a file named like `2026-10-13.md` lands on that date. You can select many files at once.
  - **Download** a single day, or a whole month, as `.md`.
  - `Ctrl/⌘ + Enter` saves.
- **Sprints**: name, dates, goal, status and Markdown notes, with a progress bar. Sprints are also drawn on the stand-up calendar.
- **Payment timeline**: deposits, milestones and invoices on a timeline with a "today" marker.
  - Statuses: pending, invoiced, paid or cancelled. Overdue is detected automatically.
  - Totals for received, outstanding and overdue, and a comparison against the budget.
- **Dashboard**: which projects still need today's stand-up, payments due in the next 30 days, and a card per project.

Each user only ever sees their own data. Row Level Security in Postgres enforces this.

---

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the contents of
   [`supabase/migrations/20261013000000_init.sql`](supabase/migrations/20261013000000_init.sql) and click **Run**.
   (With the Supabase CLI, `supabase link` + `supabase db push` does the same.)
3. Go to **Authentication → URL Configuration**:
   - Set **Site URL** to your deployed URL, e.g. `https://projects.example.com`.
   - Under **Redirect URLs**, add `http://localhost:5173` for local development.
4. Optional:
   - Email confirmation is on by default. Sign-up then sends a confirmation link, and you sign in after clicking it.
   - If the app is only for you, create your account and then turn off **Allow new users to sign up** (Authentication → Sign In / Providers).

## 2. Environment variables

Copy `.env.example` to `.env.local` and fill in two values. Both are under **Project Settings → API** (or the **Connect** button):

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

Either the legacy `anon` key or the newer publishable key (`sb_publishable_…`) works. **Never** use the `service_role` or secret key here, because it would be shipped to the browser.

## 3. Run locally

```bash
npm install
npm run dev        # http://localhost:5173
```

`npm run build` type-checks and writes the static site to `dist/`.

## 4. Deploy

The app is a static single-page app. Set the two `VITE_…` variables in your host's settings. They are read at **build** time, so redeploy after changing them.

| Host             | Build command   | Output dir | SPA routing                     |
| ---------------- | --------------- | ---------- | ------------------------------- |
| Vercel           | `npm run build` | `dist`     | `vercel.json` (included)        |
| Netlify          | `npm run build` | `dist`     | `public/_redirects` (included)  |
| Cloudflare Pages | `npm run build` | `dist`     | `public/_redirects` (included)  |

---

## Data model

| Table      | What it holds                                                                               |
| ---------- | ------------------------------------------------------------------------------------------- |
| `projects` | One row per project, owned by `owner_id` (= the signed-in user)                             |
| `standups` | `project_id`, `date`, `content` (Markdown). Unique per `(project_id, date)`                 |
| `sprints`  | `project_id`, `name`, `goal`, `start_date`, `end_date`, `status`, `notes` (Markdown)        |
| `payments` | `project_id`, `title`, `amount`, `due_date`, `status`, `paid_date`, `notes`                 |

Deleting a project deletes its stand-ups, sprints and payments. Amounts use the project's currency.

## Project structure

```
src/
  auth/            Supabase session context, login page, route guard
  components/      Calendar, Markdown renderer/editor, Modal, badges, …
  lib/
    api.ts         All Supabase queries
    types.ts       Row types
    standup.ts     Template + "carry over Today" + date-from-filename
    sprints.ts     Sprint progress helpers
    payments.ts    Overdue detection + totals
  pages/
    DashboardPage.tsx
    ProjectFormModal.tsx
    skeletons.tsx  Loading placeholders that mirror each page's layout
    project/       Project layout + Overview / Stand-ups / Sprints / Payments tabs
supabase/migrations/  Database schema + RLS policies
```

## Ideas for later

- **Team access**: add a `project_members` table and extend the RLS policies to members.
- **Typed client**: generate types with `supabase gen types typescript` and pass them to `createClient<Database>()`.
