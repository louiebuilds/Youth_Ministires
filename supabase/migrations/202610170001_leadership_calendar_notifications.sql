begin;

create table public.leadership_calendar_entries (
  id uuid primary key default extensions.gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 200),
  details text check (details is null or length(btrim(details)) between 1 and 2000),
  starts_at timestamp with time zone not null,
  ends_at timestamp with time zone not null,
  timezone text not null default 'America/Chicago'
    check (length(btrim(timezone)) between 1 and 100),
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint leadership_calendar_entries_time_check check (ends_at > starts_at)
);

create index leadership_calendar_entries_range_idx
  on public.leadership_calendar_entries (starts_at, ends_at);

alter table public.leadership_calendar_entries enable row level security;
alter table public.leadership_calendar_entries force row level security;
revoke all on table public.leadership_calendar_entries from public, anon, authenticated;

create table public.announcement_read_states (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamp with time zone not null default now(),
  primary key (announcement_id, profile_id)
);

alter table public.announcement_read_states enable row level security;
alter table public.announcement_read_states force row level security;
revoke all on table public.announcement_read_states from public, anon, authenticated;

create or replace function private.can_view_leadership_calendar()
returns boolean
language sql stable security definer
set search_path = '' set row_security = off
as $$
  select private.current_profile_is_active()
    and private.has_role(array[
      'platform_administrator', 'youth_pastor'
    ]::public.account_role[])
$$;

create or replace function private.can_manage_leadership_calendar()
returns boolean
language sql stable security definer
set search_path = '' set row_security = off
as $$
  select private.current_profile_is_active()
    and private.has_role(array['youth_pastor']::public.account_role[])
$$;

revoke all on function private.can_view_leadership_calendar() from public, anon, authenticated;
revoke all on function private.can_manage_leadership_calendar() from public, anon, authenticated;
grant execute on function private.can_view_leadership_calendar() to authenticated;
grant execute on function private.can_manage_leadership_calendar() to authenticated;

create or replace function public.create_leadership_calendar_entry(
  p_title text,
  p_details text,
  p_starts_at timestamp with time zone,
  p_ends_at timestamp with time zone,
  p_timezone text default 'America/Chicago'
)
returns uuid
language plpgsql security definer
set search_path = '' set row_security = off
as $$
declare new_id uuid;
begin
  if not private.can_manage_leadership_calendar() then
    raise exception 'Leadership calendar management is denied.' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_title, ''))) not between 1 and 200
    or length(btrim(coalesce(p_timezone, ''))) not between 1 and 100
    or p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at
    or length(coalesce(p_details, '')) > 2000 then
    raise exception 'Leadership calendar details are invalid.' using errcode = '22023';
  end if;
  insert into public.leadership_calendar_entries (
    title, details, starts_at, ends_at, timezone, created_by_profile_id
  ) values (
    btrim(p_title), nullif(btrim(coalesce(p_details, '')), ''), p_starts_at,
    p_ends_at, btrim(p_timezone), (select auth.uid())
  ) returning id into new_id;
  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    (select auth.uid()), 'calendar.leadership_entry_created',
    'leadership_calendar_entry', new_id, 'success', 'web', '{}'::jsonb
  );
  return new_id;
end;
$$;

create or replace function public.update_leadership_calendar_entry(
  p_entry_id uuid,
  p_title text,
  p_details text,
  p_starts_at timestamp with time zone,
  p_ends_at timestamp with time zone,
  p_timezone text default 'America/Chicago'
)
returns void
language plpgsql security definer
set search_path = '' set row_security = off
as $$
begin
  if not private.can_manage_leadership_calendar() then
    raise exception 'Leadership calendar management is denied.' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_title, ''))) not between 1 and 200
    or length(btrim(coalesce(p_timezone, ''))) not between 1 and 100
    or p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at
    or length(coalesce(p_details, '')) > 2000 then
    raise exception 'Leadership calendar details are invalid.' using errcode = '22023';
  end if;
  update public.leadership_calendar_entries set
    title = btrim(p_title), details = nullif(btrim(coalesce(p_details, '')), ''),
    starts_at = p_starts_at, ends_at = p_ends_at, timezone = btrim(p_timezone),
    updated_at = now()
  where id = p_entry_id;
  if not found then
    raise exception 'Leadership calendar entry was not found.' using errcode = '22023';
  end if;
  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    (select auth.uid()), 'calendar.leadership_entry_updated',
    'leadership_calendar_entry', p_entry_id, 'success', 'web', '{}'::jsonb
  );
end;
$$;

create or replace function public.delete_leadership_calendar_entry(p_entry_id uuid)
returns void
language plpgsql security definer
set search_path = '' set row_security = off
as $$
begin
  if not private.can_manage_leadership_calendar() then
    raise exception 'Leadership calendar management is denied.' using errcode = '42501';
  end if;
  delete from public.leadership_calendar_entries where id = p_entry_id;
  if not found then
    raise exception 'Leadership calendar entry was not found.' using errcode = '22023';
  end if;
  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    (select auth.uid()), 'calendar.leadership_entry_deleted',
    'leadership_calendar_entry', p_entry_id, 'success', 'web', '{}'::jsonb
  );
end;
$$;

drop function public.list_platform_calendar(date, date);
create function public.list_platform_calendar(p_from_date date, p_to_date date)
returns table (
  item_type text, item_id uuid, title text, starts_at timestamp with time zone,
  ends_at timestamp with time zone, timezone text, status text, context text,
  location text, href text, is_personal boolean, source_event_id uuid
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
  manager := caller_role in ('platform_administrator', 'youth_pastor', 'staff_member');

  return query
  select 'event'::text, e.id, e.name, e.starts_at, e.ends_at, e.timezone,
    e.status::text,
    case when caller_role = 'parent' then (
      select string_agg(btrim(p.first_name || ' ' || p.last_name) || ' • ' || initcap(r.status::text), ', ' order by btrim(p.first_name || ' ' || p.last_name))
      from public.event_registrations r join public.students s on s.id=r.student_id join public.people p on p.id=s.person_id
      where r.event_id=e.id and r.status in ('registered','waitlisted','confirmed','completed') and private.can_view_student(r.student_id)
    ) else e.event_type end,
    nullif(concat_ws(' • ', e.campus, e.building, e.room), ''),
    '/events/' || e.id::text,
    caller_role='parent' and exists(select 1 from public.event_registrations r where r.event_id=e.id and r.status in ('registered','waitlisted','confirmed','completed') and private.can_view_student(r.student_id)),
    e.id
  from public.events e
  where (e.starts_at at time zone e.timezone)::date <= p_to_date
    and (e.ends_at at time zone e.timezone)::date >= p_from_date
    and e.status <> 'archived' and (manager or e.status in ('published','active'))
  union all
  select 'schedule'::text, s.id, s.name, s.starts_at, s.ends_at, s.timezone,
    s.status::text,
    case when manager then s.ministry_context else (
      select string_agg(distinct a.responsibility, ', ' order by a.responsibility)
      from public.schedule_assignments a where a.schedule_id=s.id and a.profile_id=(select auth.uid()) and a.status<>'cancelled'
    ) end,
    (select string_agg(distinct l.name, ', ' order by l.name) from public.schedule_assignments a left join public.schedule_locations l on l.id=a.location_id where a.schedule_id=s.id and a.status<>'cancelled' and (manager or a.profile_id=(select auth.uid()))),
    '/scheduling/' || s.id::text, not manager, s.event_id
  from public.ministry_schedules s
  where (s.starts_at at time zone s.timezone)::date <= p_to_date
    and (s.ends_at at time zone s.timezone)::date >= p_from_date
    and s.status <> 'cancelled'
    and (manager or (caller_role='volunteer' and s.status='published' and exists(select 1 from public.schedule_assignments a where a.schedule_id=s.id and a.profile_id=(select auth.uid()) and a.status<>'cancelled')))
  union all
  select 'leadership'::text, l.id, l.title, l.starts_at, l.ends_at, l.timezone,
    'leadership_only'::text, l.details, null::text,
    '/calendar?entry=' || l.id::text, false, null::uuid
  from public.leadership_calendar_entries l
  where private.can_view_leadership_calendar()
    and (l.starts_at at time zone l.timezone)::date <= p_to_date
    and (l.ends_at at time zone l.timezone)::date >= p_from_date
  order by 4, 1, 3;
end;
$$;

create or replace function public.list_header_notifications(p_limit integer default 20)
returns table (
  notification_type text, notification_id uuid, title text,
  occurred_at timestamp with time zone, read_at timestamp with time zone,
  href text
)
language plpgsql stable security definer
set search_path = '' set row_security = off
as $$
begin
  if not private.current_profile_is_active() then
    raise exception 'Notification access is denied.' using errcode = '42501';
  end if;
  if p_limit not between 1 and 50 then
    raise exception 'Notification limit is invalid.' using errcode = '22023';
  end if;
  return query
  select * from (
    select 'notification'::text, n.id, n.title, n.created_at, n.read_at,
      '/communications'::text
    from public.in_app_notifications n where n.recipient_profile_id=(select auth.uid())
    union all
    select 'announcement'::text, a.id, a.title, a.published_at, rs.read_at,
      '/communications/' || a.id::text
    from public.announcements a
    left join public.announcement_read_states rs on rs.announcement_id=a.id and rs.profile_id=(select auth.uid())
    where a.published_at is not null and a.published_at <= now()
      and a.published_at >= '2026-10-17 00:00:00+00'::timestamp with time zone
      and a.archived_at is null and (a.expires_at is null or a.expires_at > now())
      and (private.can_manage_communications() or private.can_view_announcement_audience(a.audience_type))
    union all
    select 'chat'::text, r.room_id, r.room_name || ' — ' || r.unread_count::text || ' unread',
      r.last_message_at, null::timestamp with time zone,
      '/communications/chat/' || r.room_id::text
    from public.list_chat_rooms() r
    where r.archived_at is null and r.unread_count > 0
  ) items
  order by items.occurred_at desc nulls last
  limit p_limit;
end;
$$;

create or replace function public.mark_header_notification_read(
  p_notification_type text, p_notification_id uuid
)
returns void
language plpgsql security definer
set search_path = '' set row_security = off
as $$
begin
  if not private.current_profile_is_active() then
    raise exception 'Notification access is denied.' using errcode = '42501';
  end if;
  if p_notification_type = 'notification' then
    update public.in_app_notifications set read_at=coalesce(read_at,now())
    where id=p_notification_id and recipient_profile_id=(select auth.uid());
  elsif p_notification_type = 'announcement' then
    if not exists (
      select 1 from public.announcements a where a.id=p_notification_id
        and a.published_at is not null and a.published_at <= now()
        and a.archived_at is null and (a.expires_at is null or a.expires_at > now())
        and (private.can_manage_communications() or private.can_view_announcement_audience(a.audience_type))
    ) then raise exception 'Notification access is denied.' using errcode='42501'; end if;
    insert into public.announcement_read_states(announcement_id,profile_id)
    values(p_notification_id,(select auth.uid()))
    on conflict(announcement_id,profile_id) do update set read_at=excluded.read_at;
  else
    raise exception 'Notification type is invalid.' using errcode='22023';
  end if;
end;
$$;

create or replace function public.mark_all_header_notifications_read()
returns integer
language plpgsql security definer
set search_path = '' set row_security = off
as $$
declare changed integer := 0; added integer := 0;
begin
  if not private.current_profile_is_active() then
    raise exception 'Notification access is denied.' using errcode='42501';
  end if;
  update public.in_app_notifications set read_at=now()
  where recipient_profile_id=(select auth.uid()) and read_at is null;
  get diagnostics changed = row_count;
  insert into public.announcement_read_states(announcement_id,profile_id)
  select a.id,(select auth.uid()) from public.announcements a
  where a.published_at is not null and a.published_at <= now()
    and a.published_at >= '2026-10-17 00:00:00+00'::timestamp with time zone
    and a.archived_at is null and (a.expires_at is null or a.expires_at > now())
    and (private.can_manage_communications() or private.can_view_announcement_audience(a.audience_type))
  on conflict(announcement_id,profile_id) do nothing;
  get diagnostics added = row_count;
  return changed + added;
end;
$$;

revoke all on function public.create_leadership_calendar_entry(text,text,timestamp with time zone,timestamp with time zone,text) from public,anon,authenticated;
revoke all on function public.update_leadership_calendar_entry(uuid,text,text,timestamp with time zone,timestamp with time zone,text) from public,anon,authenticated;
revoke all on function public.delete_leadership_calendar_entry(uuid) from public,anon,authenticated;
revoke all on function public.list_platform_calendar(date,date) from public,anon,authenticated;
revoke all on function public.list_header_notifications(integer) from public,anon,authenticated;
revoke all on function public.mark_header_notification_read(text,uuid) from public,anon,authenticated;
revoke all on function public.mark_all_header_notifications_read() from public,anon,authenticated;
grant execute on function public.create_leadership_calendar_entry(text,text,timestamp with time zone,timestamp with time zone,text) to authenticated;
grant execute on function public.update_leadership_calendar_entry(uuid,text,text,timestamp with time zone,timestamp with time zone,text) to authenticated;
grant execute on function public.delete_leadership_calendar_entry(uuid) to authenticated;
grant execute on function public.list_platform_calendar(date,date) to authenticated;
grant execute on function public.list_header_notifications(integer) to authenticated;
grant execute on function public.mark_header_notification_read(text,uuid) to authenticated;
grant execute on function public.mark_all_header_notifications_read() to authenticated;

commit;
