begin;

revoke insert, update, delete on table public.event_volunteer_assignments
  from authenticated;

drop policy if exists event_assignments_manage_ministry
  on public.event_volunteer_assignments;

create or replace function public.list_volunteer_assignments(
  p_profile_id uuid
)
returns table (
  assignment_id uuid,
  event_id uuid,
  event_name text,
  event_status public.event_status,
  event_starts_at timestamp with time zone,
  event_ends_at timestamp with time zone,
  event_timezone text,
  assignment_role text,
  assignment_status public.volunteer_assignment_status,
  assignment_starts_at timestamp with time zone,
  assignment_ends_at timestamp with time zone
)
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
begin
  if p_profile_id is null
    or (
      not private.has_role(array[
        'platform_administrator', 'youth_pastor', 'staff_member'
      ]::public.account_role[])
      and (
        not private.current_profile_is_active()
        or p_profile_id <> (select auth.uid())
      )
    ) then
    raise exception 'Volunteer assignment access is denied.'
      using errcode = '42501';
  end if;

  return query
  select
    assignments.id,
    events.id,
    events.name,
    events.status,
    events.starts_at,
    events.ends_at,
    events.timezone,
    assignments.assignment_role,
    assignments.status,
    assignments.starts_at,
    assignments.ends_at
  from public.event_volunteer_assignments as assignments
  join public.events on events.id = assignments.event_id
  where assignments.profile_id = p_profile_id
  order by events.starts_at, assignments.assignment_role;
end;
$$;

create or replace function public.list_schedulable_events()
returns table (
  event_id uuid,
  event_name text,
  event_status public.event_status,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  timezone text
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
    raise exception 'Event scheduling access is denied.'
      using errcode = '42501';
  end if;

  return query
  select
    events.id, events.name, events.status, events.starts_at,
    events.ends_at, events.timezone
  from public.events
  where events.status in ('draft', 'published', 'active')
    and events.ends_at >= now()
  order by events.starts_at
  limit 200;
end;
$$;

create or replace function public.schedule_volunteer(
  p_event_id uuid,
  p_profile_id uuid,
  p_assignment_role text,
  p_starts_at timestamp with time zone,
  p_ends_at timestamp with time zone
)
returns uuid
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  assignment_id uuid;
begin
  if not private.has_role(array[
    'platform_administrator', 'youth_pastor', 'staff_member'
  ]::public.account_role[]) then
    raise exception 'Volunteer scheduling is denied.'
      using errcode = '42501';
  end if;
  if not exists (
      select 1 from public.volunteer_profiles
      where profile_id = p_profile_id and is_active
    )
    or not exists (
      select 1 from public.events
      where id = p_event_id
        and status in ('draft', 'published', 'active')
    )
    or length(btrim(coalesce(p_assignment_role, ''))) not between 1 and 100
    or (p_starts_at is not null and p_ends_at is not null
      and p_ends_at <= p_starts_at) then
    raise exception 'Volunteer assignment details are invalid.'
      using errcode = '22023';
  end if;

  insert into public.event_volunteer_assignments (
    event_id, profile_id, assignment_role, status,
    starts_at, ends_at, assigned_by_profile_id
  )
  values (
    p_event_id, p_profile_id, btrim(p_assignment_role), 'assigned',
    p_starts_at, p_ends_at, (select auth.uid())
  )
  on conflict (event_id, profile_id, assignment_role) do update set
    status = 'assigned',
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    assigned_by_profile_id = excluded.assigned_by_profile_id
  returning id into assignment_id;

  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  )
  values (
    (select auth.uid()), 'volunteer.assignment_scheduled',
    'event_volunteer_assignment', assignment_id, 'success', 'web',
    jsonb_build_object(
      'eventId', p_event_id,
      'profileId', p_profile_id,
      'assignmentRole', btrim(p_assignment_role)
    )
  );
  return assignment_id;
end;
$$;

create or replace function public.set_volunteer_assignment_status(
  p_assignment_id uuid,
  p_status public.volunteer_assignment_status
)
returns void
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  target_profile_id uuid;
  manager_access boolean;
begin
  select profile_id into target_profile_id
  from public.event_volunteer_assignments
  where id = p_assignment_id;

  manager_access := private.has_role(array[
    'platform_administrator', 'youth_pastor', 'staff_member'
  ]::public.account_role[]);

  if target_profile_id is null
    or (
      not manager_access
      and (
        not private.current_profile_is_active()
        or target_profile_id <> (select auth.uid())
        or p_status not in ('confirmed', 'declined')
      )
    ) then
    raise exception 'Assignment status change is denied.'
      using errcode = '42501';
  end if;

  update public.event_volunteer_assignments
  set status = p_status
  where id = p_assignment_id;

  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  )
  values (
    (select auth.uid()), 'volunteer.assignment_status_changed',
    'event_volunteer_assignment', p_assignment_id, 'success', 'web',
    jsonb_build_object('status', p_status, 'profileId', target_profile_id)
  );
end;
$$;

revoke all on function public.list_volunteer_assignments(uuid)
  from public, anon, authenticated;
revoke all on function public.list_schedulable_events()
  from public, anon, authenticated;
revoke all on function public.schedule_volunteer(
  uuid, uuid, text, timestamp with time zone, timestamp with time zone
) from public, anon, authenticated;
revoke all on function public.set_volunteer_assignment_status(
  uuid, public.volunteer_assignment_status
) from public, anon, authenticated;

grant execute on function public.list_volunteer_assignments(uuid)
  to authenticated;
grant execute on function public.list_schedulable_events()
  to authenticated;
grant execute on function public.schedule_volunteer(
  uuid, uuid, text, timestamp with time zone, timestamp with time zone
) to authenticated;
grant execute on function public.set_volunteer_assignment_status(
  uuid, public.volunteer_assignment_status
) to authenticated;

commit;
