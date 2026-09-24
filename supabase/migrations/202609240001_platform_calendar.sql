begin;

create or replace function public.list_platform_calendar(
  p_from_date date,
  p_to_date date
)
returns table (
  item_type text,
  item_id uuid,
  title text,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  timezone text,
  status text,
  context text,
  location text,
  href text,
  is_personal boolean,
  source_event_id uuid
)
language plpgsql stable security definer
set search_path = '' set row_security = off
as $$
declare
  caller_role public.account_role;
  manager boolean;
begin
  if not private.current_profile_is_active() then
    raise exception 'Calendar access is denied.' using errcode = '42501';
  end if;

  if p_from_date is null or p_to_date is null
    or p_to_date < p_from_date or p_to_date - p_from_date > 400 then
    raise exception 'Calendar range is invalid.' using errcode = '22023';
  end if;

  caller_role := private.current_profile_role();
  manager := caller_role in (
    'platform_administrator', 'youth_pastor', 'staff_member'
  );

  return query
  select
    'event'::text,
    events.id,
    events.name,
    events.starts_at,
    events.ends_at,
    events.timezone,
    events.status::text,
    case
      when caller_role = 'parent' then (
        select string_agg(
          btrim(people.first_name || ' ' || people.last_name)
            || ' • ' || initcap(registrations.status::text),
          ', ' order by btrim(people.first_name || ' ' || people.last_name)
        )
        from public.event_registrations registrations
        join public.students on students.id = registrations.student_id
        join public.people on people.id = students.person_id
        where registrations.event_id = events.id
          and registrations.status in (
            'registered', 'waitlisted', 'confirmed', 'completed'
          )
          and private.can_view_student(registrations.student_id)
      )
      else events.event_type
    end,
    nullif(concat_ws(' • ', events.campus, events.building, events.room), ''),
    '/events/' || events.id::text,
    caller_role = 'parent' and exists (
      select 1
      from public.event_registrations registrations
      where registrations.event_id = events.id
        and registrations.status in (
          'registered', 'waitlisted', 'confirmed', 'completed'
        )
        and private.can_view_student(registrations.student_id)
    ),
    events.id
  from public.events events
  where (events.starts_at at time zone events.timezone)::date <= p_to_date
    and (events.ends_at at time zone events.timezone)::date >= p_from_date
    and events.status <> 'archived'
    and (
      manager
      or events.status in ('published', 'active')
    )

  union all

  select
    'schedule'::text,
    schedules.id,
    schedules.name,
    schedules.starts_at,
    schedules.ends_at,
    schedules.timezone,
    schedules.status::text,
    case
      when manager then schedules.ministry_context
      else (
        select string_agg(
          distinct assignments.responsibility,
          ', ' order by assignments.responsibility
        )
        from public.schedule_assignments assignments
        where assignments.schedule_id = schedules.id
          and assignments.profile_id = (select auth.uid())
          and assignments.status <> 'cancelled'
      )
    end,
    (
      select string_agg(distinct locations.name, ', ' order by locations.name)
      from public.schedule_assignments assignments
      left join public.schedule_locations locations
        on locations.id = assignments.location_id
      where assignments.schedule_id = schedules.id
        and assignments.status <> 'cancelled'
        and (manager or assignments.profile_id = (select auth.uid()))
    ),
    '/scheduling/' || schedules.id::text,
    not manager,
    schedules.event_id
  from public.ministry_schedules schedules
  where (schedules.starts_at at time zone schedules.timezone)::date <= p_to_date
    and (schedules.ends_at at time zone schedules.timezone)::date >= p_from_date
    and schedules.status <> 'cancelled'
    and (
      manager
      or (
        caller_role = 'volunteer'
        and schedules.status = 'published'
        and exists (
          select 1
          from public.schedule_assignments assignments
          where assignments.schedule_id = schedules.id
            and assignments.profile_id = (select auth.uid())
            and assignments.status <> 'cancelled'
        )
      )
    )
  order by 4, 1, 3;
end;
$$;

revoke all on function public.list_platform_calendar(date, date)
  from public, anon, authenticated;
grant execute on function public.list_platform_calendar(date, date)
  to authenticated;

commit;
