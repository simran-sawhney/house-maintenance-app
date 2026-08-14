-- ============================================================================
--  History search & filters — indexes + a completed-task-history view.
--  Household scoping is enforced by existing RLS (the view is security_invoker).
-- ============================================================================

-- Trigram indexes make ILIKE '%term%' fast at 10k+ rows (spec §25).
create extension if not exists pg_trgm;

create index if not exists idx_purchases_name_trgm
  on public.purchases using gin (name gin_trgm_ops);
create index if not exists idx_products_name_trgm
  on public.products using gin (name gin_trgm_ops);
create index if not exists idx_tasks_title_trgm
  on public.tasks using gin (title gin_trgm_ops);

-- Filter/sort support.
create index if not exists idx_purchases_store
  on public.purchases (store_id);
create index if not exists idx_purchases_by
  on public.purchases (household_id, purchased_by);

create index if not exists idx_tasks_completed
  on public.tasks (household_id, completed_at desc)
  where status = 'completed';
create index if not exists idx_tasks_category
  on public.tasks (household_id, category_id);

create index if not exists idx_task_occ_completed
  on public.task_occurrences (household_id, completed_at desc)
  where status = 'completed';

-- ---------------------------------------------------------------------------
--  Unified completed-task history: one-off completed tasks + completed
--  recurring occurrences (spec §9). Never surfaces a recurring parent as a
--  single "completed forever" row. security_invoker => underlying-table RLS
--  applies as the querying user, so it stays household scoped.
-- ---------------------------------------------------------------------------
create or replace view public.completed_task_history
with (security_invoker = true) as
  select
    t.id            as task_id,
    t.household_id  as household_id,
    t.title         as title,
    t.category_id   as category_id,
    t.notes         as notes,
    false           as recurring,
    null::date      as occurrence_date,
    t.completed_at  as completed_at,
    t.completed_by  as completed_by
  from public.tasks t
  where t.status = 'completed' and t.recurrence_rule is null
  union all
  select
    o.task_id       as task_id,
    o.household_id  as household_id,
    t.title         as title,
    t.category_id   as category_id,
    t.notes         as notes,
    true            as recurring,
    o.occurrence_date as occurrence_date,
    o.completed_at  as completed_at,
    o.completed_by  as completed_by
  from public.task_occurrences o
  join public.tasks t on t.id = o.task_id
  where o.status = 'completed';
