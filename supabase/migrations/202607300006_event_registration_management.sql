begin;

create or replace function public.list_event_registrations(
  p_event_id uuid
)
returns table (
  registration_id uuid,
  student_id uuid,
  student_name text,
  household_name text,
  registration_status public.event_registration_status,
  waitlist_position bigint,
  created_at timestamp with time zone
)
language plpgsql stable security definer
set search_path = '' set row_security = off
as $$
begin
  if not private.can_manage_events() then
    raise exception 'Event registration management is denied.'
      using errcode = '42501';
  end if;

  return query
  select
    registrations.id,
    students.id,
    btrim(people.first_name || ' ' || people.last_name),
    households.name,
    registrations.status,
    registrations.waitlist_position,
    registrations.created_at
  from public.event_registrations as registrations
  join public.students on students.id = registrations.student_id
  join public.people on people.id = students.person_id
  join public.households on households.id = registrations.household_id
  where registrations.event_id = p_event_id
  order by
    case registrations.status
      when 'registered' then 1
      when 'confirmed' then 2
      when 'waitlisted' then 3
      when 'completed' then 4
      when 'cancelled' then 5
      else 6
    end,
    registrations.waitlist_position nulls last,
    registrations.created_at;
end;
$$;

create or replace function public.promote_waitlisted_registration(
  p_registration_id uuid
)
returns void
language plpgsql security definer
set search_path = '' set row_security = off
as $$
declare
  selected_registration public.event_registrations%rowtype;
  event_capacity integer;
  registered_count bigint;
begin
  if not private.can_manage_events() then
    raise exception 'Waitlist promotion is denied.'
      using errcode = '42501';
  end if;

  select *
  into selected_registration
  from public.event_registrations
  where id = p_registration_id
    and status = 'waitlisted'
  for update;

  if not found then
    raise exception 'This waitlisted registration is unavailable.'
      using errcode = '22023';
  end if;

  select capacity
  into event_capacity
  from public.events
  where id = selected_registration.event_id
    and status <> 'archived'
  for update;

  if not found then
    raise exception 'This event is unavailable.'
      using errcode = '22023';
  end if;

  select count(*)
  into registered_count
  from public.event_registrations
  where event_id = selected_registration.event_id
    and status in ('registered', 'confirmed', 'completed');

  if event_capacity is not null and registered_count >= event_capacity then
    raise exception 'No registration capacity is currently available.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.event_registrations
    where event_id = selected_registration.event_id
      and status = 'waitlisted'
      and waitlist_position < selected_registration.waitlist_position
  ) then
    raise exception 'Promote the next student on the waitlist first.'
      using errcode = '22023';
  end if;

  update public.event_registrations
  set
    status = 'registered',
    waitlist_position = null,
    updated_at = now()
  where id = p_registration_id;

  insert into public.audit_events (
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    result,
    source,
    metadata
  ) values (
    (select auth.uid()),
    'event.waitlist_promoted',
    'event_registration',
    p_registration_id,
    'success',
    'web',
    jsonb_build_object('eventId', selected_registration.event_id)
  );
end;
$$;

revoke all on function public.list_event_registrations(uuid)
  from public, anon, authenticated;
revoke all on function public.promote_waitlisted_registration(uuid)
  from public, anon, authenticated;

grant execute on function public.list_event_registrations(uuid)
  to authenticated;
grant execute on function public.promote_waitlisted_registration(uuid)
  to authenticated;

commit;
