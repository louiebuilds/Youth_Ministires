begin;

create or replace function public.list_my_event_registration_options(
  p_event_id uuid
)
returns table (
  student_id uuid, student_name text, household_id uuid, household_name text,
  registration_id uuid,
  registration_status public.event_registration_status
)
language plpgsql stable security definer
set search_path = '' set row_security = off
as $$
begin
  if not private.current_profile_is_active() then
    raise exception 'Registration access is denied.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.events
    where id = p_event_id and status in ('published', 'active')
  ) then
    raise exception 'This event is unavailable for registration.'
      using errcode = '22023';
  end if;
  return query
  select students.id, btrim(people.first_name || ' ' || people.last_name),
    households.id, households.name, registrations.id, registrations.status
  from public.profiles
  join public.student_relationships
    on student_relationships.person_id = profiles.person_id
   and (
     student_relationships.may_view_student_information
     or student_relationships.may_sign_permission_forms
     or student_relationships.is_legal_guardian
   )
  join public.students
    on students.id = student_relationships.student_id
   and students.status = 'active'
  join public.people on people.id = students.person_id
  join public.households
    on households.id = students.primary_household_id
   and households.status = 'active'
  left join public.event_registrations as registrations
    on registrations.event_id = p_event_id
   and registrations.student_id = students.id
  where profiles.id = (select auth.uid())
  order by people.last_name, people.first_name;
end;
$$;

revoke all on function public.list_my_event_registration_options(uuid)
  from public, anon, authenticated;
grant execute on function public.list_my_event_registration_options(uuid)
  to authenticated;

commit;
