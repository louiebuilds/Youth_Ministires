begin;

create or replace function public.get_event_registration_settings(
  p_event_id uuid
)
returns jsonb
language plpgsql stable security definer
set search_path = '' set row_security = off
as $$
declare
  can_manage boolean;
  allowed boolean;
begin
  can_manage := private.can_manage_events();
  allowed := can_manage or exists (
    select 1
    from public.events
    where id = p_event_id
      and (
        (
          private.has_role(array['parent']::public.account_role[])
          and status in ('published', 'active')
        )
        or private.is_assigned_to_event(id)
      )
  );

  if not private.current_profile_is_active() or not allowed then
    raise exception 'Event registration access is denied.'
      using errcode = '42501';
  end if;

  return (
    select jsonb_build_object(
      'eventId', events.id,
      'capacity', events.capacity,
      'waitlistCapacity', events.waitlist_capacity,
      'registrationOpensAt', events.registration_opens_at,
      'registrationClosesAt', events.registration_closes_at,
      'registeredCount', (
        select count(*)
        from public.event_registrations
        where event_id = events.id
          and status in ('registered', 'confirmed', 'completed')
      ),
      'waitlistedCount', (
        select count(*)
        from public.event_registrations
        where event_id = events.id
          and status = 'waitlisted'
      ),
      'canManage', can_manage
    )
    from public.events
    where events.id = p_event_id
  );
end;
$$;

create or replace function public.update_event_registration_settings(
  p_event_id uuid,
  p_capacity integer,
  p_waitlist_capacity integer,
  p_registration_opens_at timestamp without time zone,
  p_registration_closes_at timestamp without time zone
)
returns void
language plpgsql security definer
set search_path = '' set row_security = off
as $$
declare
  event_timezone text;
  opens_at timestamp with time zone;
  closes_at timestamp with time zone;
  occupied_count bigint;
begin
  if not private.can_manage_events() then
    raise exception 'Event registration settings update is denied.'
      using errcode = '42501';
  end if;

  select timezone
  into event_timezone
  from public.events
  where id = p_event_id
    and status <> 'archived'
  for update;

  if event_timezone is null then
    raise exception 'Event is unavailable.' using errcode = '22023';
  end if;

  if p_capacity is not null and p_capacity < 0 then
    raise exception 'Event capacity is invalid.' using errcode = '22023';
  end if;

  if p_waitlist_capacity is not null and p_waitlist_capacity < 0 then
    raise exception 'Waitlist capacity is invalid.' using errcode = '22023';
  end if;

  if (
    p_registration_opens_at is null
    and p_registration_closes_at is not null
  ) or (
    p_registration_opens_at is not null
    and p_registration_closes_at is null
  ) then
    raise exception 'Both registration dates are required.'
      using errcode = '22023';
  end if;

  if p_registration_opens_at is not null then
    opens_at := p_registration_opens_at at time zone event_timezone;
    closes_at := p_registration_closes_at at time zone event_timezone;

    if closes_at <= opens_at then
      raise exception 'Registration must close after it opens.'
        using errcode = '22023';
    end if;
  end if;

  select count(*)
  into occupied_count
  from public.event_registrations
  where event_id = p_event_id
    and status in ('registered', 'confirmed', 'completed');

  if p_capacity is not null and p_capacity < occupied_count then
    raise exception 'Capacity cannot be lower than current registrations.'
      using errcode = '22023';
  end if;

  update public.events
  set
    capacity = p_capacity,
    waitlist_capacity = p_waitlist_capacity,
    registration_opens_at = opens_at,
    registration_closes_at = closes_at,
    updated_at = now()
  where id = p_event_id;

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
    'event.registration_settings_updated',
    'event',
    p_event_id,
    'success',
    'web',
    jsonb_build_object(
      'capacity', p_capacity,
      'waitlistCapacity', p_waitlist_capacity,
      'hasRegistrationWindow', opens_at is not null
    )
  );
end;
$$;

revoke all on function public.get_event_registration_settings(uuid)
  from public, anon, authenticated;

revoke all on function public.update_event_registration_settings(
  uuid,
  integer,
  integer,
  timestamp without time zone,
  timestamp without time zone
) from public, anon, authenticated;

grant execute on function public.get_event_registration_settings(uuid)
  to authenticated;

grant execute on function public.update_event_registration_settings(
  uuid,
  integer,
  integer,
  timestamp without time zone,
  timestamp without time zone
) to authenticated;

commit;
