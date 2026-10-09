begin;

create or replace function public.list_ministry_schedules(
  p_from timestamptz,
  p_until timestamptz
)
returns table(
  schedule_id uuid,
  schedule_name text,
  ministry_context text,
  event_id uuid,
  schedule_status public.ministry_schedule_status,
  starts_at timestamptz,
  ends_at timestamptz,
  timezone text,
  notes text,
  position_id uuid,
  responsibility text,
  required_count integer,
  location_id uuid,
  location_name text,
  assignment_id uuid,
  profile_id uuid,
  volunteer_name text,
  assignment_status public.schedule_assignment_status,
  assignment_starts_at timestamptz,
  assignment_ends_at timestamptz,
  conflict_codes text[],
  conflict_overridden boolean
)
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
declare
  manager boolean := private.can_manage_scheduling();
  volunteer_access boolean;
begin
  volunteer_access :=
    private.has_role(
      array['volunteer']::public.account_role[]
    )
    or exists (
      select 1
      from public.volunteer_profiles
      where volunteer_profiles.profile_id = (select auth.uid())
        and volunteer_profiles.is_active
    );

  if not private.current_profile_is_active()
    or (
      not manager
      and not volunteer_access
    )
  then
    raise exception 'Scheduling access is denied.'
      using errcode = '42501';
  end if;

  return query
  select
    schedules.id,
    schedules.name,
    schedules.ministry_context,
    schedules.event_id,
    schedules.status,
    schedules.starts_at,
    schedules.ends_at,
    schedules.timezone,
    schedules.notes,
    positions.id,
    positions.responsibility,
    positions.required_count,
    locations.id,
    locations.name,
    assignments.id,
    assignments.profile_id,
    coalesce(
      nullif(
        concat_ws(
          ' ',
          coalesce(
            nullif(person.preferred_name, ''),
            person.first_name
          ),
          person.last_name
        ),
        ''
      ),
      profiles.display_name
    ),
    assignments.status,
    assignments.starts_at,
    assignments.ends_at,
    assignments.conflict_codes,
    assignments.conflict_overridden
  from public.ministry_schedules schedules
  left join public.schedule_positions positions
    on positions.schedule_id = schedules.id
  left join public.schedule_locations locations
    on locations.id = positions.location_id
  left join public.schedule_assignments assignments
    on assignments.position_id = positions.id
    and assignments.schedule_id = schedules.id
    and assignments.status <> 'cancelled'
    and (
      manager
      or assignments.profile_id = (select auth.uid())
    )
  left join public.profiles profiles
    on profiles.id = assignments.profile_id
  left join public.people person
    on person.id = profiles.person_id
  where schedules.starts_at < p_until
    and schedules.ends_at > p_from
    and (
      manager
      or (
        schedules.status = 'published'
        and assignments.profile_id = (select auth.uid())
      )
    )
  order by
    schedules.starts_at,
    positions.responsibility,
    coalesce(
      nullif(
        concat_ws(
          ' ',
          coalesce(
            nullif(person.preferred_name, ''),
            person.first_name
          ),
          person.last_name
        ),
        ''
      ),
      profiles.display_name
    );
end;
$$;

revoke all
on function public.list_ministry_schedules(timestamptz, timestamptz)
from public, anon, authenticated;

grant execute
on function public.list_ministry_schedules(timestamptz, timestamptz)
to authenticated;

commit;