-- ============================================================================
--  Row Level Security
--  A user may only touch data for households they belong to. Helper functions
--  are SECURITY DEFINER so membership checks don't recurse through RLS.
-- ============================================================================

-- ---------------------------------------------------------------------------
--  Helper functions
-- ---------------------------------------------------------------------------
create or replace function public.is_household_member(hid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = hid and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_household_admin(hid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = hid
      and m.user_id = auth.uid()
      and m.role = 'admin'
  );
$$;

-- True when the current user shares any household with `other` (for reading
-- co-members' profile display names in the activity feed etc).
create or replace function public.shares_household(other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members a
    join public.household_members b on a.household_id = b.household_id
    where a.user_id = auth.uid() and b.user_id = other
  );
$$;

-- ---------------------------------------------------------------------------
--  Enable RLS everywhere
-- ---------------------------------------------------------------------------
alter table public.households        enable row level security;
alter table public.profiles          enable row level security;
alter table public.household_members enable row level security;
alter table public.stores            enable row level security;
alter table public.products          enable row level security;
alter table public.shopping_items    enable row level security;
alter table public.purchases         enable row level security;
alter table public.task_categories   enable row level security;
alter table public.tasks             enable row level security;
alter table public.maintenance_items enable row level security;
alter table public.maintenance_logs  enable row level security;
alter table public.notes             enable row level security;
alter table public.activity_events   enable row level security;

-- ---------------------------------------------------------------------------
--  households
-- ---------------------------------------------------------------------------
create policy households_select on public.households
  for select using (public.is_household_member(id));
create policy households_insert on public.households
  for insert with check (auth.uid() is not null);
create policy households_update on public.households
  for update using (public.is_household_admin(id))
  with check (public.is_household_admin(id));

-- ---------------------------------------------------------------------------
--  profiles
-- ---------------------------------------------------------------------------
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.shares_household(id));
create policy profiles_insert on public.profiles
  for insert with check (id = auth.uid());
create policy profiles_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------------------
--  household_members
--  Insert allows a user to add THEMSELVES (first membership at onboarding) or
--  an admin to add others. Uses the SECURITY DEFINER helper -> no recursion.
-- ---------------------------------------------------------------------------
create policy members_select on public.household_members
  for select using (public.is_household_member(household_id));
create policy members_insert on public.household_members
  for insert with check (
    user_id = auth.uid() or public.is_household_admin(household_id)
  );
create policy members_update on public.household_members
  for update using (public.is_household_admin(household_id))
  with check (public.is_household_admin(household_id));
create policy members_delete on public.household_members
  for delete using (public.is_household_admin(household_id));

-- ---------------------------------------------------------------------------
--  stores  (members read; admins manage)
-- ---------------------------------------------------------------------------
create policy stores_select on public.stores
  for select using (public.is_household_member(household_id));
create policy stores_insert on public.stores
  for insert with check (public.is_household_admin(household_id));
create policy stores_update on public.stores
  for update using (public.is_household_admin(household_id))
  with check (public.is_household_admin(household_id));
create policy stores_delete on public.stores
  for delete using (public.is_household_admin(household_id));

-- ---------------------------------------------------------------------------
--  task_categories  (members read; admins manage)
-- ---------------------------------------------------------------------------
create policy task_categories_select on public.task_categories
  for select using (public.is_household_member(household_id));
create policy task_categories_insert on public.task_categories
  for insert with check (public.is_household_admin(household_id));
create policy task_categories_update on public.task_categories
  for update using (public.is_household_admin(household_id))
  with check (public.is_household_admin(household_id));
create policy task_categories_delete on public.task_categories
  for delete using (public.is_household_admin(household_id));

-- ---------------------------------------------------------------------------
--  Generic member-scoped tables: products, shopping_items, purchases, tasks,
--  maintenance_items, maintenance_logs, notes, activity_events.
--  Any member may read and write within their household.
-- ---------------------------------------------------------------------------
create policy products_all on public.products
  for all using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy shopping_items_all on public.shopping_items
  for all using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy purchases_all on public.purchases
  for all using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy tasks_all on public.tasks
  for all using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy maintenance_items_all on public.maintenance_items
  for all using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy maintenance_logs_all on public.maintenance_logs
  for all using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy notes_all on public.notes
  for all using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

-- Activity is append + read only from the app's perspective.
create policy activity_select on public.activity_events
  for select using (public.is_household_member(household_id));
create policy activity_insert on public.activity_events
  for insert with check (public.is_household_member(household_id));
