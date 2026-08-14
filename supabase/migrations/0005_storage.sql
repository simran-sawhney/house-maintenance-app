-- ============================================================================
--  Supabase Storage — private bucket for shopping/product images.
--  Paths: households/{household_id}/shopping/{shopping_item_id}/{filename}
--         households/{household_id}/products/{product_id}/{filename}
--  Access is gated by household membership on the 2nd path segment.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('shopping-images', 'shopping-images', false)
on conflict (id) do nothing;

-- Household members may read images belonging to their household.
drop policy if exists "shopping images read" on storage.objects;
create policy "shopping images read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'shopping-images'
    and (storage.foldername(name))[1] = 'households'
    and public.is_household_member(((storage.foldername(name))[2])::uuid)
  );

-- ...and upload only into their own household's folder.
drop policy if exists "shopping images insert" on storage.objects;
create policy "shopping images insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'shopping-images'
    and (storage.foldername(name))[1] = 'households'
    and public.is_household_member(((storage.foldername(name))[2])::uuid)
  );

-- ...and replace/delete within their household.
drop policy if exists "shopping images update" on storage.objects;
create policy "shopping images update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'shopping-images'
    and (storage.foldername(name))[1] = 'households'
    and public.is_household_member(((storage.foldername(name))[2])::uuid)
  );

drop policy if exists "shopping images delete" on storage.objects;
create policy "shopping images delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'shopping-images'
    and (storage.foldername(name))[1] = 'households'
    and public.is_household_member(((storage.foldername(name))[2])::uuid)
  );
