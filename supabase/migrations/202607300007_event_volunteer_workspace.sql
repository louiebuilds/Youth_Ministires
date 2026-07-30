begin;

create or replace function public.list_event_volunteer_assignments(
  p_event_id uuid
)
returns table (
  assignment_id uuid,
  profile_id uuid,
  display_name text,
  assignment_role text,
  assignment_status public.volunteer_assignment_status,
  assignment_starts_at timestamp with time zone,
  assignment_ends_at timestamp with time zone
)
language plpgsql stable security definer
set search_path = '' set row_security = off
as $$
begin
  if not private.can_manage_events() then
    raise exception 'Event volunteer management is denied.'
      using errcode = '42501';
  end if;

  return query
  select
    assignments.id,
    profiles.id,
    profiles.display_name,
    assignments.assignment_role,
    assignments.status,
    assignments.starts_at,
    assignments.ends_at
  from public.event_volunteer_assignments as assignments
  join public.profiles on profiles.id = assignments.profile_id
  where assignments.event_id = p_event_id
  order by profiles.display_name, assignments.assignment_role;
end;
$$;

create or replace function public.list_event_volunteer_candidates(
  p_event_id uuid
)
returns table (
  profile_id uuid,
  display_name text,
  ministry_title text,
  background_check_status public.background_check_status
)
language plpgsql stable security definer
set search_path = '' set row_security = off
as $$
begin
  if not private.can_manage_events() then
    raise exception 'Event volunteer management is denied.'
      using errcode = '42501';
  end if;

  return query
  select
    profiles.id,
    profiles.display_name,
    volunteer_profiles.ministry_title,
    volunteer_profiles.background_check_status
  from public.volunteer_profiles
  join public.profiles on profiles.id = volunteer_profiles.profile_id
  where volunteer_profiles.is_active
    and profiles.status = 'active'
    and not exists (
      select 1
      from public.event_volunteer_assignments as assignments
      where assignments.event_id = p_event_id
        and assignments.profile_id = profiles.id
        and assignments.status <> 'cancelled'
    )
  order by profiles.display_name;
end;
$$;

revoke all on function public.list_event_volunteer_assignments(uuid)
  from public, anon, authenticated;
revoke all on function public.list_event_volunteer_candidates(uuid)
  from public, anon, authenticated;

grant execute on function public.list_event_volunteer_assignments(uuid)
  to authenticated;
grant execute on function public.list_event_volunteer_candidates(uuid)
  to authenticated;

commit;
