# Our Home

A private, mobile-first household management app for one family. Open it, add
what the house needs in seconds, and move on.

**Shopping · Tasks · Home maintenance · Notes · Purchase & task history ·
History-based suggestions · Lightweight price tracking.**

Built with Next.js (App Router) · TypeScript · Tailwind · Supabase (Postgres +
Auth + Row Level Security) · installable PWA. Designed to run on the Vercel and
Supabase free tiers.

---

## What's inside

- **Quick Add** (`+`) — Buy / Task / Note in 2–5 seconds. Autofocus, store
  chips, batch paste (one item per line), duplicate detection, and type-ahead
  suggestions from your own history **plus a built-in grocery catalogue**
  (`src/lib/grocery/catalog.ts`) so suggestions work from day one — edit that
  file to tune the list; no database or deploy of data needed.
- **History** — reachable from the two cards on the Home screen, or the clock
  icon on Buy / Tasks. Purchases and completed tasks, each with dates.
- **Buy** — one shared list grouped by store, urgent first. Tap to purchase
  (saved to history), optional price sheet, Undo. Distraction-free **Shopping
  mode**.
- **Tasks** — grouped like the Buy screen (by category, or due date / person /
  none), with All / Mine / Urgent / Recurring filters. Optional due dates
  (Today / Tomorrow / This weekend / pick), completion with Undo, and overdue
  surfacing.
- **Calendar** — month + agenda views of dated and recurring tasks (tasks are
  the source of truth; the calendar is just another view). Tap a day to see or
  add tasks; complete straight from the calendar.
- **Recurring tasks** — daily / weekly (pick weekdays) / every 2 weeks /
  monthly / custom "every N units". Completing one occurrence never completes
  future ones — occurrences are computed on the fly and only completion state
  is stored (`task_occurrences`); no years of rows are pre-generated.
- **Shopping photos** — optional Take/Choose photo when adding an item
  (compressed client-side, stored in a private Supabase Storage bucket).
  Thumbnails on the Buy list, a larger preview in Shopping mode, and images
  reused automatically for repeat purchases of the same product.
- **House** — maintenance items per area with a status and a permanent
  timeline of logs (with optional cost). Household notes.
- **Home dashboard** — urgent items, shopping & task summaries, "You may need
  soon" suggestions, recent activity.
- **Search** — across shopping, purchases, tasks, maintenance and notes.
- **History** — purchases and completed tasks with store / date filters, plus
  per-product price history and "Check prices" links.

---

## Local setup

Requirements: Node 18+ and a free [Supabase](https://supabase.com) project.

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase URL + anon key
npm run dev
```

Open http://localhost:3000.

### Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | The public anon key |
| `SIGNUP_KEY` | ❌ | Set to lock sign-ups behind a shared key (see below). |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ | Not needed. Never expose to the browser. |

### Locking sign-ups (invite key)

Set `SIGNUP_KEY` (e.g. in Vercel → Project → Settings → Environment Variables)
to any secret value and share it with your family. On the **Create account**
form they enter this key; sign-up is rejected server-side without it. Leave
`SIGNUP_KEY` unset to allow open sign-up. The key is validated server-side and
never sent to the browser.

> For belt-and-braces enforcement you can also turn off "Allow new users to
> sign up" in Supabase → Authentication and add members via the SQL step below.

Onboarding creates the household, membership and default stores/categories
entirely under the signed-in user's session (RLS-safe), so **no service role
key is required**.

---

## Supabase setup

1. Create a project at supabase.com.
2. Apply the migrations in `supabase/migrations/` **in order**:
   - `0001_init.sql` — tables, indexes, constraints, triggers
   - `0002_rls.sql` — RLS enablement, helper functions and policies
   - `0003_profile_autocreate.sql` — auto-create a profile per user + backfill
   - `0004_calendar_recurrence_images.sql` — task occurrences, calendar/recurrence
     fields, product/shopping image columns
   - `0005_storage.sql` — private `shopping-images` Storage bucket + policies

   **Option A — SQL editor:** paste each file's contents and run, in order.

   **Option B — Supabase CLI:**

   ```bash
   supabase link --project-ref YOUR-PROJECT-REF
   supabase db push
   ```

   Migration `0005` creates a **private** Storage bucket `shopping-images` with
   household-scoped access policies — shopping photos are never public.

3. **Auth:** email + password is used. For the quickest family setup, disable
   "Confirm email" under Authentication → Providers → Email (otherwise each
   member must click a confirmation link before first sign-in).

4. (Optional) Sample data — after you've signed up and created a home, run
   `supabase/seed.sql` (SQL editor or `psql`). It seeds the **first** household
   with example items. Don't run it on production data.

---

## First login (bootstrap the household)

1. Open the app → **Create an account** (name, email, password).
2. You'll land on **Create your Home** → name it (default "Our Home") → create.
   You become the household **admin**; default stores and task categories are
   seeded automatically.
3. You're in. Start adding with the `+` button.

### Adding family members

Roles are `admin` and `member`. In V1, adding a member is a two-step manual
flow (kept simple on purpose):

1. The new member signs up in the app (they'll see "Create your Home" — they do
   **not** create one).
2. An admin adds them to the household. Find their `user_id` in Supabase
   (Authentication → Users) and insert a membership:

   ```sql
   insert into public.household_members (household_id, user_id, role)
   values ('<your-household-id>', '<their-user-id>', 'member');
   ```

   They can now sign in and land straight on the shared home.

---

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import it into [Vercel](https://vercel.com) (framework auto-detected as
   Next.js).
3. Add the two `NEXT_PUBLIC_SUPABASE_*` environment variables.
4. Deploy. In Supabase, add your Vercel URL under Authentication → URL
   Configuration (Site URL / redirect URLs).

---

## Install as a PWA

- **iPhone (Safari):** Share → *Add to Home Screen*.
- **Android (Chrome):** menu → *Install app* / *Add to Home screen*.

The service worker registers in production only and provides a graceful offline
shell (it does not do full offline sync).

App icons live in `public/icons/`. Regenerate them from `public/icons/icon.svg`
with `npm run gen:icons` after editing the source SVG.

---

## Scripts

```bash
npm run dev         # local dev server
npm run build       # production build
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm test            # vitest (business-logic unit tests)
npm run gen:icons   # regenerate PWA icons from the source SVG
```

## Tech notes

- **Security:** every Server Action calls `requireHousehold()` and all tables
  enforce RLS — a user can only ever touch data for households they belong to.
  Frontend filtering is never the security boundary.
- **Timezone/currency:** timestamps are stored in UTC and displayed in the
  household timezone (default `Australia/Melbourne`); currency defaults to AUD.
- **No LLM in V1.** Suggestions use purchase-interval statistics only. The code
  is structured (`lib/price-search/`, clean Quick Add flow) so a price provider,
  voice entry, or natural-language queries could be added later.
