-- ============================================================================
--  Our Home — initial schema
--  Households, membership, shopping, tasks, maintenance, notes, activity.
--  All timestamps are timestamptz (UTC). RLS is mandatory and defined below.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
--  Core: households, profiles, membership
-- ---------------------------------------------------------------------------
create table if not exists public.households (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  currency_code text not null default 'AUD',
  timezone      text not null default 'Australia/Melbourne',
  created_at    timestamptz not null default now()
);

create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at   timestamptz not null default now()
);

create table if not exists public.household_members (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  role         text not null default 'member' check (role in ('admin', 'member')),
  created_at   timestamptz not null default now(),
  unique (household_id, user_id)
);
create index if not exists idx_members_user on public.household_members (user_id);
create index if not exists idx_members_household on public.household_members (household_id);

-- ---------------------------------------------------------------------------
--  Stores
-- ---------------------------------------------------------------------------
create table if not exists public.stores (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name         text not null,
  icon         text,
  sort_order   integer not null default 0,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists idx_stores_household on public.stores (household_id);

-- ---------------------------------------------------------------------------
--  Products (reusable knowledge behind shopping items)
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id                uuid primary key default gen_random_uuid(),
  household_id      uuid not null references public.households (id) on delete cascade,
  name              text not null,
  normalized_name   text not null,
  default_store_id  uuid references public.stores (id) on delete set null,
  default_quantity  numeric,
  default_unit      text,
  category          text,
  last_purchased_at timestamptz,
  purchase_count    integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (household_id, normalized_name)
);
create index if not exists idx_products_household on public.products (household_id);
create index if not exists idx_products_normalized on public.products (household_id, normalized_name);

-- ---------------------------------------------------------------------------
--  Shopping items (one shared family list)
-- ---------------------------------------------------------------------------
create table if not exists public.shopping_items (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references public.households (id) on delete cascade,
  product_id      uuid references public.products (id) on delete set null,
  name            text not null,
  normalized_name text not null,
  store_id        uuid references public.stores (id) on delete set null,
  quantity        numeric,
  unit            text,
  notes           text,
  urgent          boolean not null default false,
  status          text not null default 'active' check (status in ('active', 'purchased', 'cancelled')),
  added_by        uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  completed_at    timestamptz,
  completed_by    uuid references auth.users (id) on delete set null
);
create index if not exists idx_shopping_household on public.shopping_items (household_id);
-- Fast lookup of the active list (the hottest query in the app).
create index if not exists idx_shopping_active
  on public.shopping_items (household_id, store_id)
  where status = 'active';

-- ---------------------------------------------------------------------------
--  Purchases (permanent history)
-- ---------------------------------------------------------------------------
create table if not exists public.purchases (
  id               uuid primary key default gen_random_uuid(),
  household_id     uuid not null references public.households (id) on delete cascade,
  shopping_item_id uuid references public.shopping_items (id) on delete set null,
  product_id       uuid references public.products (id) on delete set null,
  name             text not null,
  store_id         uuid references public.stores (id) on delete set null,
  quantity         numeric,
  unit             text,
  price            numeric check (price is null or price >= 0),
  purchased_by     uuid references auth.users (id) on delete set null,
  purchased_at     timestamptz not null default now(),
  notes            text
);
create index if not exists idx_purchases_household on public.purchases (household_id);
create index if not exists idx_purchases_product on public.purchases (product_id);
create index if not exists idx_purchases_purchased_at on public.purchases (household_id, purchased_at desc);
-- Guards against duplicate purchase rows if a completion action runs twice.
create unique index if not exists uq_purchase_per_shopping_item
  on public.purchases (shopping_item_id)
  where shopping_item_id is not null;

-- ---------------------------------------------------------------------------
--  Task categories + tasks
-- ---------------------------------------------------------------------------
create table if not exists public.task_categories (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name         text not null,
  icon         text,
  sort_order   integer not null default 0
);
create index if not exists idx_task_categories_household on public.task_categories (household_id);

create table if not exists public.tasks (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references public.households (id) on delete cascade,
  title           text not null,
  category_id     uuid references public.task_categories (id) on delete set null,
  notes           text,
  urgent          boolean not null default false,
  assigned_to     uuid references auth.users (id) on delete set null,
  status          text not null default 'open' check (status in ('open', 'completed', 'cancelled')),
  due_date        timestamptz,
  recurrence_rule jsonb,
  created_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  completed_at    timestamptz,
  completed_by    uuid references auth.users (id) on delete set null,
  parent_task_id  uuid references public.tasks (id) on delete set null
);
create index if not exists idx_tasks_household on public.tasks (household_id);
create index if not exists idx_tasks_open
  on public.tasks (household_id, due_date)
  where status = 'open';

-- ---------------------------------------------------------------------------
--  Maintenance items + logs
-- ---------------------------------------------------------------------------
create table if not exists public.maintenance_items (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  title        text not null,
  area         text not null,
  description  text,
  status       text not null default 'good' check (status in ('good', 'watch', 'needs_attention')),
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_maintenance_household on public.maintenance_items (household_id);

create table if not exists public.maintenance_logs (
  id                  uuid primary key default gen_random_uuid(),
  household_id        uuid not null references public.households (id) on delete cascade,
  maintenance_item_id uuid not null references public.maintenance_items (id) on delete cascade,
  note                text not null,
  cost                numeric check (cost is null or cost >= 0),
  occurred_at         timestamptz not null default now(),
  created_by          uuid references auth.users (id) on delete set null,
  created_at          timestamptz not null default now()
);
create index if not exists idx_maintenance_logs_item on public.maintenance_logs (maintenance_item_id, occurred_at desc);

-- ---------------------------------------------------------------------------
--  Notes
-- ---------------------------------------------------------------------------
create table if not exists public.notes (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  title        text not null,
  content      text,
  area         text,
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_notes_household on public.notes (household_id);

-- ---------------------------------------------------------------------------
--  Activity feed
-- ---------------------------------------------------------------------------
create table if not exists public.activity_events (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  actor_id     uuid references auth.users (id) on delete set null,
  event_type   text not null,
  entity_type  text not null,
  entity_id    uuid,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists idx_activity_household on public.activity_events (household_id, created_at desc);

-- ---------------------------------------------------------------------------
--  updated_at maintenance trigger
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_products_touch on public.products;
create trigger trg_products_touch before update on public.products
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_maintenance_touch on public.maintenance_items;
create trigger trg_maintenance_touch before update on public.maintenance_items
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_notes_touch on public.notes;
create trigger trg_notes_touch before update on public.notes
  for each row execute function public.touch_updated_at();
