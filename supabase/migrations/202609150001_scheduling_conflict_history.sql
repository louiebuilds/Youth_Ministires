begin;

create function public.list_schedule_assignment_conflict_history(p_schedule_id uuid)
returns table(
  assignment_id uuid,
  position_id uuid,
  volunteer_name text,
  responsibility text,
  location_name text,
  assignment_status public.schedule_assignment_status,
  assignment_starts_at timestamptz,
  assignment_ends_at timestamptz,
  conflict_codes text[],
  conflict_overridden boolean,
  override_reason text
)
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
begin
  if not private.current_profile_is_active() or not private.can_manage_scheduling() then
    raise exception 'Scheduling conflict history access is denied.' using errcode = '42501';
  end if;

  if not exists (select 1 from public.ministry_schedules where id = p_schedule_id) then
    raise exception 'Schedule not found.' using errcode = 'P0002';
  end if;

  return query
  select
    assignment.id,
    assignment.position_id,
    coalesce(
      nullif(concat_ws(' ', coalesce(nullif(person.preferred_name, ''), person.first_name), person.last_name), ''),
      profile.display_name
    ),
    assignment.responsibility,
    location.name,
    assignment.status,
    assignment.starts_at,
    assignment.ends_at,
    assignment.conflict_codes,
    assignment.conflict_overridden,
    assignment.override_reason
  from public.schedule_assignments as assignment
  join public.profiles as profile on profile.id = assignment.profile_id
  left join public.people as person on person.id = profile.person_id
  left join public.schedule_locations as location on location.id = assignment.location_id
  where assignment.schedule_id = p_schedule_id
    and cardinality(assignment.conflict_codes) > 0
  order by assignment.starts_at, assignment.created_at, assignment.id;
end;
$$;

revoke all on function public.list_schedule_assignment_conflict_history(uuid)
  from public, anon, authenticated;
grant execute on function public.list_schedule_assignment_conflict_history(uuid)
  to authenticated;

commit;
