-- ============================================================================
--  DEV SEED — sample household data (build spec §62)
--  Adds example shopping items, tasks, a maintenance item + log, and a note to
--  the FIRST existing household. Run AFTER you have signed up and created a
--  household in the app (which already seeds stores + task categories).
--
--  Usage (local):   supabase db reset            # runs migrations + this file
--         (remote):  psql "$DATABASE_URL" -f supabase/seed.sql
--
--  Do NOT run this against production with real data.
-- ============================================================================

do $$
declare
  hid uuid;
  s_wool uuid;
  s_veg  uuid;
  s_ind  uuid;
  s_bun  uuid;
  cat_repair uuid;
  cat_car uuid;
  mi_tap uuid;
begin
  select id into hid from public.households order by created_at asc limit 1;
  if hid is null then
    raise notice 'No household found — sign up and create a home first.';
    return;
  end if;

  select id into s_wool from public.stores where household_id = hid and name = 'Woolworths' limit 1;
  select id into s_veg  from public.stores where household_id = hid and name = 'Veggie Shop' limit 1;
  select id into s_ind  from public.stores where household_id = hid and name = 'Indian Shop' limit 1;
  select id into s_bun  from public.stores where household_id = hid and name = 'Bunnings' limit 1;
  select id into cat_repair from public.task_categories where household_id = hid and name = 'Repair' limit 1;
  select id into cat_car    from public.task_categories where household_id = hid and name = 'Car' limit 1;

  -- Shopping items (build spec sample data)
  insert into public.shopping_items (household_id, name, normalized_name, store_id, urgent)
  values
    (hid, 'Milk', 'milk', s_wool, true),
    (hid, 'Coriander', 'coriander', s_veg, false),
    (hid, 'Atta 10kg', 'atta 10kg', s_ind, false),
    (hid, 'Silicone', 'silicone', s_bun, false);

  -- Tasks
  insert into public.tasks (household_id, title, category_id, urgent)
  values (hid, 'Repair kitchen tap', cat_repair, true);

  insert into public.tasks (household_id, title, category_id, recurrence_rule)
  values (hid, 'Car wash', cat_car, '{"freq":"weekly","interval":2}'::jsonb);

  -- Maintenance item + log
  insert into public.maintenance_items (household_id, title, area, status, description)
  values (hid, 'Kitchen Tap', 'Kitchen', 'needs_attention', 'Occasional drip')
  returning id into mi_tap;

  insert into public.maintenance_logs (household_id, maintenance_item_id, note, cost, occurred_at)
  values (hid, mi_tap, 'Started leaking occasionally', null, now() - interval '20 days');

  -- Note
  insert into public.notes (household_id, title, content, area)
  values (hid, 'Hot water system', 'Model + serial on the unit. Service phone on fridge magnet.', 'Garage');

  raise notice 'Seeded sample data for household %', hid;
end $$;
