-- ============================================================================
--  Iteration 2 — Calendar, recurring-task occurrences, and shopping images.
--  Extends the existing schema; preserves all current data.
-- ============================================================================

-- ---------------------------------------------------------------------------
--  tasks: all-day flag + recurrence end + migrate recurrence_rule format
-- ---------------------------------------------------------------------------
alter table public.tasks
  add column if not exists all_day boolean not null default true;
alter table public.tasks
  add column if not exists recurrence_end_date date;

-- Migrate old recurrence rule shape {freq, interval, weekday}
-- -> {frequency, interval, days_of_week}.
update public.tasks
set recurrence_rule = jsonb_strip_nulls(
  jsonb_build_object(
    'frequency', recurrence_rule ->> 'freq',
    'interval', coalesce((recurrence_rule ->> 'interval')::int, 1),
    'days_of_week',
      case
        when (recurrence_rule ->> 'weekday') is not null
        then jsonb_build_array((recurrence_rule ->> 'weekday')::int)
        else null
      end
  )
)
where recurrence_rule ? 'freq';

-- Calendar range lookups over one-off dated tasks (open + completed).
create index if not exists idx_tasks_due
  on public.tasks (household_id, due_date)
  where due_date is not null;

-- Fast fetch of recurring definitions.
create index if not exists idx_tasks_recurring
  on public.tasks (household_id)
  where recurrence_rule is not null;

-- The previous implementation spawned a fresh child task per occurrence.
-- Under the occurrence model the parent is the single definition, so retire
-- any still-open spawned children to avoid duplicate active rows. Completed
-- children are left as-is (historical record).
update public.tasks
set status = 'cancelled'
where parent_task_id is not null and status = 'open';

-- ---------------------------------------------------------------------------
--  task_occurrences — per-occurrence completion state for recurring tasks.
--  We do NOT pre-generate future rows; occurrences are computed on the fly and
--  a row is only written when an occurrence is completed / rescheduled.
-- ---------------------------------------------------------------------------
create table if not exists public.task_occurrences (
  id               uuid primary key default gen_random_uuid(),
  household_id     uuid not null references public.households (id) on delete cascade,
  task_id          uuid not null references public.tasks (id) on delete cascade,
  occurrence_date  date not null,
  scheduled_time   time,
  status           text not null default 'completed' check (status in ('completed', 'skipped')),
  completed_at     timestamptz,
  completed_by     uuid references auth.users (id) on delete set null,
  rescheduled_from date,
  created_at       timestamptz not null default now(),
  unique (task_id, occurrence_date)
);
create index if not exists idx_task_occ_household
  on public.task_occurrences (household_id);
create index if not exists idx_task_occ_task_date
  on public.task_occurrences (task_id, occurrence_date);

alter table public.task_occurrences enable row level security;

drop policy if exists task_occurrences_all on public.task_occurrences;
create policy task_occurrences_all on public.task_occurrences
  for all using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

-- ---------------------------------------------------------------------------
--  Optional images for products + shopping items (paths into Storage bucket).
-- ---------------------------------------------------------------------------
alter table public.products
  add column if not exists image_path text;
alter table public.shopping_items
  add column if not exists image_path text;
