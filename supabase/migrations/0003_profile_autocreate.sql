-- ============================================================================
--  Ensure every auth user has a profile row (so actor names always resolve).
--
--  Previously a profile was only created during onboarding, which the household
--  creator runs but directly-added members do not. Those members had no
--  display_name, so the activity feed fell back to "Someone".
--
--  This adds an auth.users insert trigger + a one-off backfill.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: create profiles for existing users who don't have one.
insert into public.profiles (id, display_name)
select
  u.id,
  coalesce(
    nullif(u.raw_user_meta_data ->> 'display_name', ''),
    split_part(u.email, '@', 1)
  )
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

-- Backfill: give a name to existing profiles that have a blank one.
update public.profiles p
set display_name = split_part(u.email, '@', 1)
from auth.users u
where u.id = p.id
  and (p.display_name is null or p.display_name = '');
