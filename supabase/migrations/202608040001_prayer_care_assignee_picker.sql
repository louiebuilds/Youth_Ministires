begin;

create or replace function public.list_prayer_care_assignees()
returns table (profile_id uuid, display_name text, primary_role public.account_role)
language plpgsql stable security definer set search_path = '' set row_security = off
as $$
begin
  if not private.can_manage_care() then
    raise exception 'Prayer and Care assignee access denied.' using errcode = '42501';
  end if;
  return query
  select p.id,
    coalesce(nullif(concat_ws(' ', coalesce(nullif(person.preferred_name,''), person.first_name), person.last_name), ''), p.display_name),
    p.primary_role
  from public.profiles p
  left join public.people person on person.id = p.person_id
  where p.status = 'active'
    and p.primary_role in ('platform_administrator','youth_pastor','staff_member')
  order by 2;
end;
$$;

revoke all on function public.list_prayer_care_assignees() from public, anon;
grant execute on function public.list_prayer_care_assignees() to authenticated;

comment on function public.list_prayer_care_assignees() is
  'Returns only active eligible caregiver IDs, proper names, and roles to Prayer and Care oversight roles.';

commit;
