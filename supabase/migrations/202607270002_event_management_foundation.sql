begin;

alter table public.events
  add column description text check (
    description is null or length(btrim(description)) between 1 and 4000
  ),
  add column campus text check (
    campus is null or length(btrim(campus)) between 1 and 150
  ),
  add column building text check (
    building is null or length(btrim(building)) between 1 and 150
  ),
  add column room text check (
    room is null or length(btrim(room)) between 1 and 100
  ),
  add column address text check (
    address is null or length(btrim(address)) between 1 and 300
  ),
  add column meeting_instructions text check (
    meeting_instructions is null
      or length(btrim(meeting_instructions)) between 1 and 2000
  );

create or replace function private.can_manage_events()
returns boolean
language sql stable security definer
set search_path = '' set row_security = off
as $$
  select private.has_role(array[
    'platform_administrator', 'youth_pastor', 'staff_member'
  ]::public.account_role[])
$$;

revoke all on function private.can_manage_events()
  from public, anon, authenticated;
grant execute on function private.can_manage_events() to authenticated;

create or replace function public.list_event_calendar(
  p_from_date date, p_to_date date, p_search text default null,
  p_status public.event_status default null
)
returns table (
  event_id uuid, event_name text, event_type text,
  event_status public.event_status, starts_at timestamp with time zone,
  ends_at timestamp with time zone, timezone text, capacity integer,
  campus text, building text, room text, can_manage boolean
)
language plpgsql stable security definer
set search_path = '' set row_security = off
as $$
declare normalized_search text;
begin
  if not private.current_profile_is_active() then
    raise exception 'Event access is denied.' using errcode = '42501';
  end if;
  if p_from_date is null or p_to_date is null or p_to_date < p_from_date
    or p_to_date - p_from_date > 400 then
    raise exception 'Event calendar range is invalid.' using errcode = '22023';
  end if;
  normalized_search := nullif(btrim(coalesce(p_search, '')), '');
  if normalized_search is not null and length(normalized_search) > 100 then
    raise exception 'Event search is invalid.' using errcode = '22023';
  end if;
  return query
  select events.id, events.name, events.event_type, events.status,
    events.starts_at, events.ends_at, events.timezone, events.capacity,
    events.campus, events.building, events.room,
    private.can_manage_events()
  from public.events
  where (events.starts_at at time zone events.timezone)::date
      between p_from_date and p_to_date
    and (p_status is null or events.status = p_status)
    and (
      normalized_search is null
      or lower(events.name) like '%' || lower(normalized_search) || '%'
      or lower(events.event_type) like '%' || lower(normalized_search) || '%'
      or lower(coalesce(events.campus, ''))
        like '%' || lower(normalized_search) || '%'
    )
    and (
      private.can_manage_events()
      or (
        private.has_role(array['parent']::public.account_role[])
        and events.status in ('published', 'active')
      )
      or private.is_assigned_to_event(events.id)
    )
  order by events.starts_at, events.name;
end;
$$;

create or replace function public.get_event_workspace(p_event_id uuid)
returns jsonb
language plpgsql stable security definer
set search_path = '' set row_security = off
as $$
declare can_manage boolean; allowed boolean;
begin
  can_manage := private.can_manage_events();
  allowed := can_manage or exists (
    select 1 from public.events
    where id = p_event_id
      and (
        (private.has_role(array['parent']::public.account_role[])
          and status in ('published', 'active'))
        or private.is_assigned_to_event(id)
      )
  );
  if not private.current_profile_is_active() or not allowed then
    raise exception 'Event workspace access is denied.' using errcode = '42501';
  end if;
  return (
    select jsonb_build_object(
      'eventId', events.id, 'name', events.name,
      'eventType', events.event_type, 'status', events.status,
      'description', events.description, 'startsAt', events.starts_at,
      'endsAt', events.ends_at, 'timezone', events.timezone,
      'capacity', events.capacity, 'campus', events.campus,
      'building', events.building, 'room', events.room,
      'address', events.address,
      'meetingInstructions', events.meeting_instructions,
      'canManage', can_manage
    )
    from public.events where events.id = p_event_id
  );
end;
$$;

create or replace function public.create_event(
  p_name text, p_event_type text, p_status public.event_status,
  p_description text, p_starts_at timestamp without time zone,
  p_ends_at timestamp without time zone, p_timezone text, p_capacity integer,
  p_campus text, p_building text, p_room text, p_address text,
  p_meeting_instructions text
)
returns uuid
language plpgsql security definer
set search_path = '' set row_security = off
as $$
declare new_event_id uuid;
begin
  if not private.can_manage_events() then
    raise exception 'Event creation is denied.' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_name, ''))) not between 1 and 200
    or length(btrim(coalesce(p_event_type, ''))) not between 1 and 100
    or p_status = 'archived' or p_starts_at is null or p_ends_at is null
    or p_ends_at <= p_starts_at
    or length(btrim(coalesce(p_timezone, ''))) not between 1 and 100
    or (p_capacity is not null and p_capacity < 0) then
    raise exception 'Event details are invalid.' using errcode = '22023';
  end if;
  insert into public.events (
    name, event_type, status, description, starts_at, ends_at, timezone,
    capacity, campus, building, room, address, meeting_instructions
  ) values (
    btrim(p_name), btrim(p_event_type), p_status,
    nullif(btrim(coalesce(p_description, '')), ''),
    p_starts_at at time zone btrim(p_timezone),
    p_ends_at at time zone btrim(p_timezone), btrim(p_timezone), p_capacity,
    nullif(btrim(coalesce(p_campus, '')), ''),
    nullif(btrim(coalesce(p_building, '')), ''),
    nullif(btrim(coalesce(p_room, '')), ''),
    nullif(btrim(coalesce(p_address, '')), ''),
    nullif(btrim(coalesce(p_meeting_instructions, '')), '')
  ) returning id into new_event_id;
  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    (select auth.uid()), 'event.created', 'event', new_event_id,
    'success', 'web', jsonb_build_object('status', p_status)
  );
  return new_event_id;
end;
$$;

create or replace function public.update_event(
  p_event_id uuid, p_name text, p_event_type text,
  p_status public.event_status, p_description text,
  p_starts_at timestamp without time zone,
  p_ends_at timestamp without time zone,
  p_timezone text, p_capacity integer, p_campus text, p_building text,
  p_room text, p_address text, p_meeting_instructions text
)
returns void
language plpgsql security definer
set search_path = '' set row_security = off
as $$
declare prior_status public.event_status;
begin
  if not private.can_manage_events() then
    raise exception 'Event update is denied.' using errcode = '42501';
  end if;
  select status into prior_status from public.events where id = p_event_id;
  if prior_status is null or prior_status = 'archived' or p_status = 'archived'
    or length(btrim(coalesce(p_name, ''))) not between 1 and 200
    or length(btrim(coalesce(p_event_type, ''))) not between 1 and 100
    or p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at
    or length(btrim(coalesce(p_timezone, ''))) not between 1 and 100
    or (p_capacity is not null and p_capacity < 0) then
    raise exception 'Event details are invalid.' using errcode = '22023';
  end if;
  update public.events set
    name = btrim(p_name), event_type = btrim(p_event_type),
    status = p_status,
    description = nullif(btrim(coalesce(p_description, '')), ''),
    starts_at = p_starts_at at time zone btrim(p_timezone),
    ends_at = p_ends_at at time zone btrim(p_timezone),
    timezone = btrim(p_timezone), capacity = p_capacity,
    campus = nullif(btrim(coalesce(p_campus, '')), ''),
    building = nullif(btrim(coalesce(p_building, '')), ''),
    room = nullif(btrim(coalesce(p_room, '')), ''),
    address = nullif(btrim(coalesce(p_address, '')), ''),
    meeting_instructions =
      nullif(btrim(coalesce(p_meeting_instructions, '')), '')
  where id = p_event_id;
  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    (select auth.uid()), 'event.updated', 'event', p_event_id,
    'success', 'web',
    jsonb_build_object(
      'statusChanged', prior_status <> p_status, 'status', p_status
    )
  );
end;
$$;

create or replace function public.archive_event(p_event_id uuid)
returns void
language plpgsql security definer
set search_path = '' set row_security = off
as $$
begin
  if not private.can_manage_events() then
    raise exception 'Event archive is denied.' using errcode = '42501';
  end if;
  update public.events set status = 'archived', archived_at = now()
  where id = p_event_id and status <> 'archived';
  if not found then
    raise exception 'Event cannot be archived.' using errcode = '22023';
  end if;
  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    (select auth.uid()), 'event.archived', 'event', p_event_id,
    'success', 'web', '{}'::jsonb
  );
end;
$$;

revoke all on function public.list_event_calendar(
  date, date, text, public.event_status
) from public, anon, authenticated;
revoke all on function public.get_event_workspace(uuid)
  from public, anon, authenticated;
revoke all on function public.create_event(
  text, text, public.event_status, text, timestamp without time zone,
  timestamp without time zone, text, integer, text, text, text, text, text
) from public, anon, authenticated;
revoke all on function public.update_event(
  uuid, text, text, public.event_status, text, timestamp without time zone,
  timestamp without time zone, text, integer, text, text, text, text, text
) from public, anon, authenticated;
revoke all on function public.archive_event(uuid)
  from public, anon, authenticated;
grant execute on function public.list_event_calendar(
  date, date, text, public.event_status
) to authenticated;
grant execute on function public.get_event_workspace(uuid) to authenticated;
grant execute on function public.create_event(
  text, text, public.event_status, text, timestamp without time zone,
  timestamp without time zone, text, integer, text, text, text, text, text
) to authenticated;
grant execute on function public.update_event(
  uuid, text, text, public.event_status, text, timestamp without time zone,
  timestamp without time zone, text, integer, text, text, text, text, text
) to authenticated;
grant execute on function public.archive_event(uuid) to authenticated;

commit;
