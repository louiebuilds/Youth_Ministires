begin;

create or replace function public.list_volunteer_candidates()
returns table (
  profile_id uuid,
  display_name text,
  primary_role public.account_role
)
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
begin
  if not private.has_role(array[
    'platform_administrator', 'youth_pastor', 'staff_member'
  ]::public.account_role[]) then
    raise exception 'Volunteer candidate access is denied.'
      using errcode = '42501';
  end if;

  return query
  select profiles.id, profiles.display_name, profiles.primary_role
  from public.profiles
  where profiles.status = 'active'
    and not exists (
      select 1
      from public.volunteer_profiles
      where volunteer_profiles.profile_id = profiles.id
    )
  order by profiles.display_name
  limit 200;
end;
$$;

revoke all on function public.list_volunteer_candidates()
  from public, anon, authenticated;
grant execute on function public.list_volunteer_candidates()
  to authenticated;

comment on function public.list_volunteer_candidates() is
  'Lists every active account without a volunteer profile, including Parent accounts, for authorized volunteer managers.';

commit;
