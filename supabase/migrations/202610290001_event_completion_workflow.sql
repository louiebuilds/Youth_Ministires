begin;

alter table public.events
  add column if not exists completed_at timestamptz,
  add column if not exists completed_by_profile_id uuid references public.profiles(id),
  add column if not exists completed_from_status public.event_status,
  add column if not exists reopened_at timestamptz,
  add column if not exists reopened_by_profile_id uuid references public.profiles(id);

create or replace function private.guard_event_completion()
returns trigger language plpgsql
set search_path = '' as $$
begin
  if coalesce(current_setting('app.event_lifecycle_transition', true), '') <> 'allowed' then
    if tg_op = 'INSERT' and new.status = 'completed' then
      raise exception 'Events must be completed through the completion workflow.' using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' and (old.status = 'completed' or new.status = 'completed') then
      raise exception 'Completed events must be reopened before editing.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_event_completion on public.events;
create trigger guard_event_completion before insert or update on public.events
for each row execute function private.guard_event_completion();

create or replace function public.complete_event(p_event_id uuid)
returns void language plpgsql security definer
set search_path = '' set row_security = off as $$
declare current_status public.event_status; event_end timestamptz;
begin
  if not private.current_profile_is_active() or not private.has_role(array['platform_administrator','youth_pastor']::public.account_role[]) then
    raise exception 'Event completion is denied.' using errcode = '42501';
  end if;
  select status, ends_at into current_status, event_end from public.events where id = p_event_id for update;
  if current_status is null or current_status in ('completed','archived') or event_end > now() then
    raise exception 'Event cannot be completed.' using errcode = '22023';
  end if;
  perform set_config('app.event_lifecycle_transition', 'allowed', true);
  update public.events set status='completed', completed_at=now(), completed_by_profile_id=(select auth.uid()),
    completed_from_status=current_status, reopened_at=null, reopened_by_profile_id=null where id=p_event_id;
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata)
  values ((select auth.uid()),'event.completed','event',p_event_id,'success','web',
    jsonb_build_object('priorStatus',current_status,'completedAt',now()));
end;
$$;

create or replace function public.reopen_event(p_event_id uuid)
returns void language plpgsql security definer
set search_path = '' set row_security = off as $$
declare restore_status public.event_status;
begin
  if not private.current_profile_is_active() or not private.has_role(array['platform_administrator','youth_pastor']::public.account_role[]) then
    raise exception 'Event reopening is denied.' using errcode = '42501';
  end if;
  select completed_from_status into restore_status from public.events where id=p_event_id and status='completed' for update;
  if restore_status is null or restore_status in ('completed','archived') then
    raise exception 'Event cannot be reopened.' using errcode = '22023';
  end if;
  perform set_config('app.event_lifecycle_transition', 'allowed', true);
  update public.events set status=restore_status, reopened_at=now(), reopened_by_profile_id=(select auth.uid()),
    completed_at=null, completed_by_profile_id=null, completed_from_status=null where id=p_event_id;
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata)
  values ((select auth.uid()),'event.reopened','event',p_event_id,'success','web',
    jsonb_build_object('restoredStatus',restore_status,'reopenedAt',now()));
end;
$$;

create or replace function public.get_event_completion_summary(p_event_id uuid)
returns jsonb language plpgsql stable security definer
set search_path = '' set row_security = off as $$
begin
  if not private.current_profile_is_active() or not private.has_role(array['platform_administrator','youth_pastor']::public.account_role[]) then
    raise exception 'Event completion summary access is denied.' using errcode = '42501';
  end if;
  if not exists(select 1 from public.events where id=p_event_id) then
    raise exception 'Event not found.' using errcode = '22023';
  end if;
  return jsonb_build_object(
    'attendancePresent',(select count(*) from public.attendance_records ar join public.attendance_sessions s on s.id=ar.session_id where s.event_id=p_event_id and ar.status='present'),
    'attendanceTotal',(select count(*) from public.attendance_records ar join public.attendance_sessions s on s.id=ar.session_id where s.event_id=p_event_id),
    'registeredCount',(select count(*) from public.event_registrations where event_id=p_event_id and status in ('registered','confirmed','completed')),
    'waitlistedCount',(select count(*) from public.event_registrations where event_id=p_event_id and status='waitlisted'),
    'volunteerCount',(select count(*) from public.event_volunteer_assignments where event_id=p_event_id and status not in ('declined','cancelled')),
    'outstandingChecklistCount',(select count(*) from public.event_checklist_items where event_id=p_event_id and not is_completed),
    'scheduledReminderCount',(select count(*) from public.event_reminders where event_id=p_event_id and status='scheduled')
  );
end;
$$;

create or replace function public.list_event_calendar(p_from_date date,p_to_date date,p_search text default null,p_status public.event_status default null)
returns table(event_id uuid,event_name text,event_type text,event_status public.event_status,starts_at timestamptz,ends_at timestamptz,timezone text,capacity integer,campus text,building text,room text,can_manage boolean)
language plpgsql stable security definer set search_path='' set row_security=off as $$
declare normalized_search text;
begin
  if not private.current_profile_is_active() then raise exception 'Event access is denied.' using errcode='42501'; end if;
  if p_from_date is null or p_to_date is null or p_to_date<p_from_date or p_to_date-p_from_date>400 then raise exception 'Event calendar range is invalid.' using errcode='22023'; end if;
  normalized_search:=nullif(btrim(coalesce(p_search,'')),'');
  if normalized_search is not null and length(normalized_search)>100 then raise exception 'Event search is invalid.' using errcode='22023'; end if;
  return query select e.id,e.name,e.event_type,e.status,e.starts_at,e.ends_at,e.timezone,e.capacity,e.campus,e.building,e.room,private.can_manage_events()
  from public.events e where (e.starts_at at time zone e.timezone)::date between p_from_date and p_to_date
    and (p_status is null or e.status=p_status)
    and (normalized_search is null or lower(e.name) like '%'||lower(normalized_search)||'%' or lower(e.event_type) like '%'||lower(normalized_search)||'%' or lower(coalesce(e.campus,'')) like '%'||lower(normalized_search)||'%')
    and (private.can_manage_events() or (private.has_role(array['parent']::public.account_role[]) and (e.status in ('published','active') or (e.status='completed' and e.completed_from_status in ('published','active')))) or private.is_assigned_to_event(e.id))
  order by e.starts_at,e.name;
end;
$$;

create or replace function public.get_event_workspace(p_event_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' set row_security=off as $$
declare can_manage boolean; allowed boolean;
begin
  can_manage:=private.can_manage_events();
  allowed:=can_manage or exists(select 1 from public.events where id=p_event_id and ((private.has_role(array['parent']::public.account_role[]) and (status in ('published','active') or (status='completed' and completed_from_status in ('published','active')))) or private.is_assigned_to_event(id)));
  if not private.current_profile_is_active() or not allowed then raise exception 'Event workspace access is denied.' using errcode='42501'; end if;
  return (select jsonb_build_object('eventId',e.id,'name',e.name,'eventType',e.event_type,'status',e.status,'description',e.description,'startsAt',e.starts_at,'endsAt',e.ends_at,'timezone',e.timezone,'capacity',e.capacity,'campus',e.campus,'building',e.building,'room',e.room,'address',e.address,'meetingInstructions',e.meeting_instructions,'canManage',can_manage,'completedAt',e.completed_at,'completedByProfileId',e.completed_by_profile_id,'reopenedAt',e.reopened_at,'reopenedByProfileId',e.reopened_by_profile_id) from public.events e where e.id=p_event_id);
end;
$$;

revoke all on function public.complete_event(uuid), public.reopen_event(uuid), public.get_event_completion_summary(uuid) from public,anon,authenticated;
grant execute on function public.complete_event(uuid), public.reopen_event(uuid), public.get_event_completion_summary(uuid) to authenticated;

commit;
