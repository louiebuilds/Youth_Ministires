begin;

create type public.event_reminder_status as enum (
  'scheduled',
  'completed',
  'cancelled'
);

create table public.event_reminders (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  title text not null check (length(btrim(title)) between 1 and 200),
  remind_at timestamp with time zone not null,
  status public.event_reminder_status not null default 'scheduled',
  notes text check (notes is null or length(btrim(notes)) between 1 and 1000),
  created_by_profile_id uuid not null
    references public.profiles(id) on delete restrict,
  completed_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint event_reminders_completed_state_check check (
    (status = 'completed' and completed_at is not null)
    or (status <> 'completed' and completed_at is null)
  )
);

create table public.event_checklist_items (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  title text not null check (length(btrim(title)) between 1 and 200),
  notes text check (notes is null or length(btrim(notes)) between 1 and 1000),
  due_at timestamp with time zone,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_completed boolean not null default false,
  created_by_profile_id uuid not null
    references public.profiles(id) on delete restrict,
  completed_by_profile_id uuid
    references public.profiles(id) on delete restrict,
  completed_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint event_checklist_completed_state_check check (
    (
      is_completed
      and completed_by_profile_id is not null
      and completed_at is not null
    )
    or (
      not is_completed
      and completed_by_profile_id is null
      and completed_at is null
    )
  )
);

create index event_reminders_event_status_idx
  on public.event_reminders (event_id, status, remind_at);
create index event_checklist_items_event_order_idx
  on public.event_checklist_items (event_id, is_completed, sort_order, due_at);

alter table public.event_reminders enable row level security;
alter table public.event_reminders force row level security;
alter table public.event_checklist_items enable row level security;
alter table public.event_checklist_items force row level security;

revoke all on table public.event_reminders
  from public, anon, authenticated;
revoke all on table public.event_checklist_items
  from public, anon, authenticated;

create or replace function public.list_event_reminders(p_event_id uuid)
returns table (
  reminder_id uuid,
  title text,
  remind_at timestamp with time zone,
  reminder_status public.event_reminder_status,
  notes text
)
language plpgsql stable security definer
set search_path = '' set row_security = off
as $$
begin
  if not private.can_manage_events() then
    raise exception 'Event reminder access is denied.' using errcode = '42501';
  end if;
  return query
  select id, event_reminders.title, event_reminders.remind_at,
    event_reminders.status, event_reminders.notes
  from public.event_reminders
  where event_id = p_event_id
  order by
    case status when 'scheduled' then 1 when 'completed' then 2 else 3 end,
    remind_at;
end;
$$;

create or replace function public.create_event_reminder(
  p_event_id uuid,
  p_title text,
  p_remind_at timestamp without time zone,
  p_notes text
)
returns uuid
language plpgsql security definer
set search_path = '' set row_security = off
as $$
declare
  event_timezone text;
  new_id uuid;
begin
  if not private.can_manage_events() then
    raise exception 'Event reminder creation is denied.' using errcode = '42501';
  end if;
  select timezone into event_timezone from public.events
  where id = p_event_id and status <> 'archived';
  if event_timezone is null
    or length(btrim(coalesce(p_title, ''))) not between 1 and 200
    or p_remind_at is null then
    raise exception 'Reminder details are invalid.' using errcode = '22023';
  end if;
  insert into public.event_reminders (
    event_id, title, remind_at, notes, created_by_profile_id
  ) values (
    p_event_id, btrim(p_title),
    p_remind_at at time zone event_timezone,
    nullif(btrim(coalesce(p_notes, '')), ''), (select auth.uid())
  ) returning id into new_id;
  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    (select auth.uid()), 'event.reminder_created', 'event_reminder',
    new_id, 'success', 'web', jsonb_build_object('eventId', p_event_id)
  );
  return new_id;
end;
$$;

create or replace function public.set_event_reminder_status(
  p_reminder_id uuid,
  p_status public.event_reminder_status
)
returns void
language plpgsql security definer
set search_path = '' set row_security = off
as $$
declare selected_event_id uuid;
begin
  if not private.can_manage_events() then
    raise exception 'Event reminder update is denied.' using errcode = '42501';
  end if;
  update public.event_reminders as reminders
  set status = p_status,
    completed_at = case when p_status = 'completed' then now() else null end,
    updated_at = now()
  from public.events
  where reminders.id = p_reminder_id
    and events.id = reminders.event_id
    and events.status <> 'archived'
  returning reminders.event_id into selected_event_id;
  if not found then
    raise exception 'This reminder is unavailable.' using errcode = '22023';
  end if;
  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    (select auth.uid()), 'event.reminder_status_updated', 'event_reminder',
    p_reminder_id, 'success', 'web',
    jsonb_build_object('eventId', selected_event_id, 'status', p_status)
  );
end;
$$;

create or replace function public.list_event_checklist_items(p_event_id uuid)
returns table (
  checklist_item_id uuid,
  title text,
  notes text,
  due_at timestamp with time zone,
  sort_order integer,
  is_completed boolean
)
language plpgsql stable security definer
set search_path = '' set row_security = off
as $$
begin
  if not private.can_manage_events() then
    raise exception 'Event checklist access is denied.' using errcode = '42501';
  end if;
  return query
  select id, event_checklist_items.title, event_checklist_items.notes,
    event_checklist_items.due_at, event_checklist_items.sort_order,
    event_checklist_items.is_completed
  from public.event_checklist_items
  where event_id = p_event_id
  order by is_completed, sort_order, due_at nulls last, created_at;
end;
$$;

create or replace function public.create_event_checklist_item(
  p_event_id uuid,
  p_title text,
  p_notes text,
  p_due_at timestamp without time zone
)
returns uuid
language plpgsql security definer
set search_path = '' set row_security = off
as $$
declare event_timezone text; next_order integer; new_id uuid;
begin
  if not private.can_manage_events() then
    raise exception 'Event checklist creation is denied.' using errcode = '42501';
  end if;
  select timezone into event_timezone from public.events
  where id = p_event_id and status <> 'archived';
  if event_timezone is null
    or length(btrim(coalesce(p_title, ''))) not between 1 and 200 then
    raise exception 'Checklist details are invalid.' using errcode = '22023';
  end if;
  select coalesce(max(sort_order), -1) + 1 into next_order
  from public.event_checklist_items where event_id = p_event_id;
  insert into public.event_checklist_items (
    event_id, title, notes, due_at, sort_order, created_by_profile_id
  ) values (
    p_event_id, btrim(p_title), nullif(btrim(coalesce(p_notes, '')), ''),
    case when p_due_at is null then null
      else p_due_at at time zone event_timezone end,
    next_order, (select auth.uid())
  ) returning id into new_id;
  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    (select auth.uid()), 'event.checklist_item_created',
    'event_checklist_item', new_id, 'success', 'web',
    jsonb_build_object('eventId', p_event_id)
  );
  return new_id;
end;
$$;

create or replace function public.set_event_checklist_item_completed(
  p_checklist_item_id uuid,
  p_is_completed boolean
)
returns void
language plpgsql security definer
set search_path = '' set row_security = off
as $$
declare selected_event_id uuid;
begin
  if not private.can_manage_events() then
    raise exception 'Event checklist update is denied.' using errcode = '42501';
  end if;
  update public.event_checklist_items as items
  set is_completed = p_is_completed,
    completed_by_profile_id =
      case when p_is_completed then (select auth.uid()) else null end,
    completed_at = case when p_is_completed then now() else null end,
    updated_at = now()
  from public.events
  where items.id = p_checklist_item_id
    and events.id = items.event_id
    and events.status <> 'archived'
  returning items.event_id into selected_event_id;
  if not found then
    raise exception 'This checklist item is unavailable.' using errcode = '22023';
  end if;
  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    (select auth.uid()), 'event.checklist_item_updated',
    'event_checklist_item', p_checklist_item_id, 'success', 'web',
    jsonb_build_object(
      'eventId', selected_event_id, 'completed', p_is_completed
    )
  );
end;
$$;

revoke all on function public.list_event_reminders(uuid)
  from public, anon, authenticated;
revoke all on function public.create_event_reminder(
  uuid, text, timestamp without time zone, text
) from public, anon, authenticated;
revoke all on function public.set_event_reminder_status(
  uuid, public.event_reminder_status
) from public, anon, authenticated;
revoke all on function public.list_event_checklist_items(uuid)
  from public, anon, authenticated;
revoke all on function public.create_event_checklist_item(
  uuid, text, text, timestamp without time zone
) from public, anon, authenticated;
revoke all on function public.set_event_checklist_item_completed(uuid, boolean)
  from public, anon, authenticated;

grant execute on function public.list_event_reminders(uuid) to authenticated;
grant execute on function public.create_event_reminder(
  uuid, text, timestamp without time zone, text
) to authenticated;
grant execute on function public.set_event_reminder_status(
  uuid, public.event_reminder_status
) to authenticated;
grant execute on function public.list_event_checklist_items(uuid)
  to authenticated;
grant execute on function public.create_event_checklist_item(
  uuid, text, text, timestamp without time zone
) to authenticated;
grant execute on function public.set_event_checklist_item_completed(uuid, boolean)
  to authenticated;

commit;
