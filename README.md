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
  chips, product autocomplete, batch paste (one item per line), duplicate
  detection.
- **Buy** — one shared list grouped by store, urgent first. Tap to purchase
  (saved to history), optional price sheet, Undo. Distraction-free **Shopping
  mode**.
- **Tasks** — urgent / due / other, completion with Undo, simple recurrence
  (daily, weekly, fortnightly, monthly) that spawns the next occurrence.
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
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ | Not needed. Never expose to the browser. |

Onboarding creates the household, membership and default stores/categories
entirely under the signed-in user's session (RLS-safe), so **no service role
key is required**.

---

## Supabase setup

1. Create a project at supabase.com.
2. Apply the migrations in `supabase/migrations/` **in order**:
   - `0001_init.sql` — tables, indexes, constraints, triggers
   - `0002_rls.sql` — RLS enablement, helper functions and policies

   **Option A — SQL editor:** paste each file's contents and run, in order.

   **Option B — Supabase CLI:**

   ```bash
   supabase link --project-ref YOUR-PROJECT-REF
   supabase db push
   ```

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
