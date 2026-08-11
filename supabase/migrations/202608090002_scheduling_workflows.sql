begin;

create or replace function private.schedule_conflicts(p_schedule_id uuid, p_profile_id uuid, p_starts_at timestamptz, p_ends_at timestamptz, p_location_id uuid, p_exclude_assignment_id uuid default null)
returns text[] language plpgsql stable security definer set search_path='' set row_security=off as $$
declare result text[] := '{}'; target public.ministry_schedules%rowtype;
begin
  select * into target from public.ministry_schedules where id=p_schedule_id;
  if target.id is null or p_ends_at <= p_starts_at then return array['invalid_window']; end if;
  if p_starts_at < target.starts_at or p_ends_at > target.ends_at then result:=array_append(result,'outside_schedule'); end if;
  if not exists (
    select 1 from public.volunteer_availability a
    where a.profile_id=p_profile_id and a.day_of_week=extract(dow from (p_starts_at at time zone a.timezone))::smallint
      and (p_starts_at at time zone a.timezone)::date between a.effective_from and coalesce(a.effective_until,'infinity'::date)
      and (p_starts_at at time zone a.timezone)::time >= a.starts_at
      and (p_ends_at at time zone a.timezone)::time <= a.ends_at
  ) then result:=array_append(result,'unavailable'); end if;
  if exists (select 1 from public.schedule_assignments a where a.profile_id=p_profile_id and a.status<>'cancelled' and a.id is distinct from p_exclude_assignment_id and tstzrange(a.starts_at,a.ends_at,'[)') && tstzrange(p_starts_at,p_ends_at,'[)')) then result:=array_append(result,'overlap'); end if;
  if exists (select 1 from public.schedule_assignments a where a.schedule_id=p_schedule_id and a.profile_id=p_profile_id and a.status<>'cancelled' and a.id is distinct from p_exclude_assignment_id and a.starts_at=p_starts_at and a.ends_at=p_ends_at) then result:=array_append(result,'duplicate'); end if;
  if p_location_id is not null and exists (select 1 from public.schedule_assignments a where a.profile_id=p_profile_id and a.status<>'cancelled' and a.location_id is distinct from p_location_id and a.id is distinct from p_exclude_assignment_id and tstzrange(a.starts_at,a.ends_at,'[)') && tstzrange(p_starts_at,p_ends_at,'[)')) then result:=array_append(result,'multiple_locations'); end if;
  return result;
end $$;

create or replace function public.list_ministry_schedules(p_from timestamptz, p_until timestamptz)
returns table(schedule_id uuid,schedule_name text,ministry_context text,event_id uuid,schedule_status public.ministry_schedule_status,starts_at timestamptz,ends_at timestamptz,timezone text,notes text,position_id uuid,responsibility text,required_count integer,location_id uuid,location_name text,assignment_id uuid,profile_id uuid,volunteer_name text,assignment_status public.schedule_assignment_status,conflict_codes text[],conflict_overridden boolean)
language plpgsql stable security definer set search_path='' set row_security=off as $$
declare manager boolean:=private.can_manage_scheduling();
begin
 if not private.current_profile_is_active() or (not manager and not private.has_role(array['volunteer']::public.account_role[])) then raise exception 'Scheduling access is denied.' using errcode='42501'; end if;
 return query select s.id,s.name,s.ministry_context,s.event_id,s.status,s.starts_at,s.ends_at,s.timezone,s.notes,p.id,p.responsibility,p.required_count,l.id,l.name,a.id,a.profile_id,coalesce(nullif(concat_ws(' ',coalesce(nullif(person.preferred_name,''),person.first_name),person.last_name),''),pr.display_name),a.status,a.conflict_codes,a.conflict_overridden
 from public.ministry_schedules s left join public.schedule_positions p on p.schedule_id=s.id left join public.schedule_locations l on l.id=p.location_id left join public.schedule_assignments a on a.position_id=p.id and a.schedule_id=s.id and a.status<>'cancelled' and (manager or a.profile_id=auth.uid()) left join public.profiles pr on pr.id=a.profile_id left join public.people person on person.id=pr.person_id
 where s.starts_at < p_until and s.ends_at > p_from and (manager or (s.status='published' and a.profile_id=auth.uid())) order by s.starts_at,p.responsibility,coalesce(nullif(concat_ws(' ',coalesce(nullif(person.preferred_name,''),person.first_name),person.last_name),''),pr.display_name);
end $$;

create or replace function public.list_scheduling_candidates()
returns table(profile_id uuid,display_name text) language plpgsql stable security definer set search_path='' set row_security=off as $$
begin if not private.can_manage_scheduling() then raise exception 'Scheduling management is denied.' using errcode='42501'; end if;
return query select v.profile_id,coalesce(nullif(concat_ws(' ',coalesce(nullif(person.preferred_name,''),person.first_name),person.last_name),''),p.display_name) from public.volunteer_profiles v join public.profiles p on p.id=v.profile_id left join public.people person on person.id=p.person_id where v.is_active and p.status='active' order by coalesce(nullif(concat_ws(' ',coalesce(nullif(person.preferred_name,''),person.first_name),person.last_name),''),p.display_name); end $$;

create or replace function public.list_schedule_locations(p_schedule_id uuid)
returns table(location_id uuid,location_name text)
language plpgsql stable security definer set search_path='' set row_security=off as $$
begin
  if not private.can_manage_scheduling() then
    raise exception 'Scheduling location access is denied.' using errcode='42501';
  end if;
  if not exists (
    select 1 from public.ministry_schedules
    where id=p_schedule_id and status in ('draft','published')
  ) then
    raise exception 'Active schedule not found.' using errcode='P0002';
  end if;
  return query
  select locations.id,locations.name
  from public.schedule_locations locations
  where locations.schedule_id=p_schedule_id
  order by lower(locations.name),locations.id;
end $$;

create or replace function public.create_ministry_schedule(p_name text,p_ministry_context text,p_event_id uuid,p_starts_at timestamptz,p_ends_at timestamptz,p_timezone text,p_notes text)
returns uuid language plpgsql security definer set search_path='' set row_security=off as $$ declare new_id uuid;
begin if not private.can_manage_scheduling() then raise exception 'Scheduling management is denied.' using errcode='42501'; end if;
if length(btrim(coalesce(p_name,''))) not between 1 and 200 or p_ends_at<=p_starts_at or length(btrim(coalesce(p_timezone,''))) not between 1 and 100 or (p_event_id is not null and not exists(select 1 from public.events where id=p_event_id)) then raise exception 'Schedule details are invalid.' using errcode='22023'; end if;
insert into public.ministry_schedules(name,ministry_context,event_id,starts_at,ends_at,timezone,notes,created_by_profile_id) values(btrim(p_name),nullif(btrim(coalesce(p_ministry_context,'')),''),p_event_id,p_starts_at,p_ends_at,btrim(p_timezone),nullif(btrim(coalesce(p_notes,'')),''),auth.uid()) returning id into new_id;
insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata) values(auth.uid(),'scheduling.schedule_created','ministry_schedule',new_id,'success','web',jsonb_build_object('eventId',p_event_id)); return new_id; end $$;

create or replace function public.set_ministry_schedule_status(p_schedule_id uuid,p_status public.ministry_schedule_status,p_allow_unfilled boolean default false)
returns void language plpgsql security definer set search_path='' set row_security=off as $$ declare current_status public.ministry_schedule_status;
begin if not private.can_manage_scheduling() then raise exception 'Scheduling management is denied.' using errcode='42501'; end if; select status into current_status from public.ministry_schedules where id=p_schedule_id;
if current_status is null or current_status in ('cancelled','completed') or (p_status='published' and current_status<>'draft') then raise exception 'Schedule lifecycle change is invalid.' using errcode='22023'; end if;
if p_status='published' and not p_allow_unfilled and exists(select 1 from public.schedule_positions p where p.schedule_id=p_schedule_id and (select count(*) from public.schedule_assignments a where a.position_id=p.id and a.status<>'cancelled')<p.required_count) then raise exception 'Schedule has unfilled positions.' using errcode='P0001'; end if;
update public.ministry_schedules set status=p_status,allow_unfilled_on_publish=case when p_status='published' then p_allow_unfilled else allow_unfilled_on_publish end,published_at=case when p_status='published' then now() else published_at end,cancelled_at=case when p_status='cancelled' then now() else cancelled_at end,completed_at=case when p_status='completed' then now() else completed_at end where id=p_schedule_id;
insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata) values(auth.uid(),'scheduling.schedule_'||p_status,'ministry_schedule',p_schedule_id,'success','web',jsonb_build_object('allowUnfilled',p_allow_unfilled)); end $$;

create or replace function public.add_schedule_location(p_schedule_id uuid,p_name text,p_notes text default null) returns uuid language plpgsql security definer set search_path='' set row_security=off as $$ declare new_id uuid; begin if not private.can_manage_scheduling() then raise exception 'Scheduling management is denied.' using errcode='42501'; end if; insert into public.schedule_locations(schedule_id,name,notes) values(p_schedule_id,btrim(p_name),nullif(btrim(coalesce(p_notes,'')),'')) returning id into new_id; insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata) values(auth.uid(),'scheduling.location_added','schedule_location',new_id,'success','web','{}'); return new_id; end $$;
create or replace function public.add_schedule_position(p_schedule_id uuid,p_location_id uuid,p_responsibility text,p_required_count integer,p_starts_at timestamptz default null,p_ends_at timestamptz default null) returns uuid language plpgsql security definer set search_path='' set row_security=off as $$ declare new_id uuid; begin if not private.can_manage_scheduling() then raise exception 'Scheduling management is denied.' using errcode='42501'; end if; insert into public.schedule_positions(schedule_id,location_id,responsibility,required_count,starts_at,ends_at) values(p_schedule_id,p_location_id,btrim(p_responsibility),p_required_count,p_starts_at,p_ends_at) returning id into new_id; insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata) values(auth.uid(),'scheduling.position_added','schedule_position',new_id,'success','web',jsonb_build_object('requiredCount',p_required_count)); return new_id; end $$;

create or replace function public.assign_schedule_position(p_position_id uuid,p_profile_id uuid,p_starts_at timestamptz,p_ends_at timestamptz,p_override boolean default false,p_override_reason text default null)
returns uuid language plpgsql security definer set search_path='' set row_security=off as $$ declare pos public.schedule_positions%rowtype; conflicts text[]; new_id uuid;
begin if not private.can_manage_scheduling() then raise exception 'Scheduling management is denied.' using errcode='42501'; end if; select * into pos from public.schedule_positions where id=p_position_id; if pos.id is null or not exists(select 1 from public.volunteer_profiles where profile_id=p_profile_id and is_active) then raise exception 'Assignment details are invalid.' using errcode='22023'; end if;
conflicts:=private.schedule_conflicts(pos.schedule_id,p_profile_id,p_starts_at,p_ends_at,pos.location_id,null); if cardinality(conflicts)>0 and (not p_override or length(btrim(coalesce(p_override_reason,'')))<3) then raise exception 'Scheduling conflict: %',array_to_string(conflicts,', ') using errcode='P0001'; end if;
insert into public.schedule_assignments(schedule_id,position_id,profile_id,location_id,responsibility,starts_at,ends_at,conflict_codes,conflict_overridden,override_reason,assigned_by_profile_id) values(pos.schedule_id,pos.id,p_profile_id,pos.location_id,pos.responsibility,p_starts_at,p_ends_at,conflicts,cardinality(conflicts)>0,nullif(btrim(coalesce(p_override_reason,'')),''),auth.uid()) returning id into new_id;
insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata) values(auth.uid(),case when cardinality(conflicts)>0 then 'scheduling.conflict_overridden' else 'scheduling.volunteer_assigned' end,'schedule_assignment',new_id,'success','web',jsonb_build_object('profileId',p_profile_id,'conflicts',conflicts)); return new_id; end $$;

create or replace function public.cancel_schedule_assignment(p_assignment_id uuid) returns void language plpgsql security definer set search_path='' set row_security=off as $$ begin if not private.can_manage_scheduling() then raise exception 'Scheduling management is denied.' using errcode='42501'; end if; update public.schedule_assignments set status='cancelled' where id=p_assignment_id and status<>'cancelled'; if not found then raise exception 'Active assignment not found.' using errcode='P0002'; end if; insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata) values(auth.uid(),'scheduling.assignment_cancelled','schedule_assignment',p_assignment_id,'success','web','{}'); end $$;

create or replace function public.create_schedule_rotation(p_name text,p_pattern public.schedule_recurrence_pattern,p_weekday smallint,p_monthly_ordinal smallint,p_starts_on date,p_ends_on date,p_starts_at time,p_ends_at time,p_timezone text,p_schedule_name text,p_ministry_context text,p_responsibility text,p_location_name text,p_profile_id uuid)
returns uuid language plpgsql security definer set search_path='' set row_security=off as $$ declare new_id uuid; begin if not private.can_manage_scheduling() then raise exception 'Scheduling management is denied.' using errcode='42501'; end if; insert into public.schedule_rotations(name,recurrence_pattern,weekday,monthly_ordinal,starts_on,ends_on,starts_at,ends_at,timezone,schedule_name,ministry_context,responsibility,location_name,profile_id,created_by_profile_id) values(btrim(p_name),p_pattern,p_weekday,p_monthly_ordinal,p_starts_on,p_ends_on,p_starts_at,p_ends_at,btrim(p_timezone),btrim(p_schedule_name),nullif(btrim(coalesce(p_ministry_context,'')),''),btrim(p_responsibility),nullif(btrim(coalesce(p_location_name,'')),''),p_profile_id,auth.uid()) returning id into new_id; insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata) values(auth.uid(),'scheduling.rotation_created','schedule_rotation',new_id,'success','web',jsonb_build_object('pattern',p_pattern)); return new_id; end $$;

create or replace function public.set_schedule_rotation_status(p_rotation_id uuid,p_status public.schedule_rotation_status) returns void language plpgsql security definer set search_path='' set row_security=off as $$ begin if not private.can_manage_scheduling() then raise exception 'Scheduling management is denied.' using errcode='42501'; end if; update public.schedule_rotations set status=p_status,ends_on=case when p_status='ended' then greatest(starts_on,least(coalesce(ends_on,current_date),current_date)) else ends_on end where id=p_rotation_id and status<>'ended'; if not found then raise exception 'Active rotation not found.' using errcode='P0002'; end if; insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata) values(auth.uid(),'scheduling.rotation_'||p_status,'schedule_rotation',p_rotation_id,'success','web','{}'); end $$;

create or replace function public.generate_schedule_rotation(p_rotation_id uuid,p_through date) returns integer language plpgsql security definer set search_path='' set row_security=off as $$ declare r public.schedule_rotations%rowtype; d date; sid uuid; lid uuid; pid uuid; made integer:=0; assigned integer:=0; skipped integer:=0; conflicts text[]; local_start timestamp; local_end timestamp;
begin if not private.can_manage_scheduling() then raise exception 'Scheduling management is denied.' using errcode='42501'; end if; select * into r from public.schedule_rotations where id=p_rotation_id and status='active'; if r.id is null then raise exception 'Active rotation not found.' using errcode='P0002'; end if;
for d in select gs::date from generate_series(r.starts_on,least(p_through,coalesce(r.ends_on,p_through)),'1 day') gs where (r.recurrence_pattern='weekly' and extract(dow from gs)=coalesce(r.weekday,extract(dow from r.starts_on))) or (r.recurrence_pattern='biweekly' and extract(dow from gs)=coalesce(r.weekday,extract(dow from r.starts_on)) and ((gs::date-r.starts_on)%14)=0) or (r.recurrence_pattern='monthly' and extract(dow from gs)=coalesce(r.weekday,extract(dow from r.starts_on)) and ((extract(day from gs)::int-1)/7+1)=r.monthly_ordinal) loop
local_start:=d+r.starts_at; local_end:=d+r.ends_at; insert into public.ministry_schedules(name,ministry_context,status,starts_at,ends_at,timezone,rotation_id,occurrence_date,created_by_profile_id) values(r.schedule_name,r.ministry_context,'draft',local_start at time zone r.timezone,local_end at time zone r.timezone,r.timezone,r.id,d,auth.uid()) on conflict(rotation_id,occurrence_date) do nothing returning id into sid; if sid is null then continue; end if;
if r.location_name is not null then insert into public.schedule_locations(schedule_id,name) values(sid,r.location_name) returning id into lid; end if; insert into public.schedule_positions(schedule_id,location_id,responsibility,required_count) values(sid,lid,r.responsibility,1) returning id into pid;
if r.profile_id is not null then
  conflicts:=private.schedule_conflicts(sid,r.profile_id,local_start at time zone r.timezone,local_end at time zone r.timezone,lid,null);
  if cardinality(conflicts)=0 then
    insert into public.schedule_assignments(schedule_id,position_id,profile_id,location_id,responsibility,starts_at,ends_at,assigned_by_profile_id,rotation_id) values(sid,pid,r.profile_id,lid,r.responsibility,local_start at time zone r.timezone,local_end at time zone r.timezone,auth.uid(),r.id);
    assigned:=assigned+1;
  else
    skipped:=skipped+1;
    insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata) values(auth.uid(),'scheduling.rotation_assignment_skipped','schedule_position',pid,'success','web',jsonb_build_object('rotationId',r.id,'scheduleId',sid,'profileId',r.profile_id,'occurrenceDate',d,'conflicts',conflicts));
  end if;
end if; made:=made+1; sid:=null; lid:=null; pid:=null; conflicts:='{}'; end loop;
insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata) values(auth.uid(),'scheduling.rotation_generated','schedule_rotation',r.id,'success','web',jsonb_build_object('through',p_through,'occurrences',made,'assignmentsCreated',assigned,'assignmentsSkipped',skipped)); return made; end $$;

create or replace function public.list_schedule_rotations() returns setof public.schedule_rotations language plpgsql stable security definer set search_path='' set row_security=off as $$ begin if not private.can_manage_scheduling() then raise exception 'Scheduling management is denied.' using errcode='42501'; end if; return query select * from public.schedule_rotations order by status,name; end $$;

revoke all on function private.schedule_conflicts(uuid,uuid,timestamptz,timestamptz,uuid,uuid) from public,anon,authenticated;
revoke all on function public.list_ministry_schedules(timestamptz,timestamptz), public.list_scheduling_candidates(), public.list_schedule_locations(uuid), public.create_ministry_schedule(text,text,uuid,timestamptz,timestamptz,text,text), public.set_ministry_schedule_status(uuid,public.ministry_schedule_status,boolean), public.add_schedule_location(uuid,text,text), public.add_schedule_position(uuid,uuid,text,integer,timestamptz,timestamptz), public.assign_schedule_position(uuid,uuid,timestamptz,timestamptz,boolean,text), public.cancel_schedule_assignment(uuid), public.create_schedule_rotation(text,public.schedule_recurrence_pattern,smallint,smallint,date,date,time,time,text,text,text,text,text,uuid), public.set_schedule_rotation_status(uuid,public.schedule_rotation_status), public.generate_schedule_rotation(uuid,date), public.list_schedule_rotations() from public,anon,authenticated;
grant execute on function public.list_ministry_schedules(timestamptz,timestamptz), public.list_scheduling_candidates(), public.list_schedule_locations(uuid), public.create_ministry_schedule(text,text,uuid,timestamptz,timestamptz,text,text), public.set_ministry_schedule_status(uuid,public.ministry_schedule_status,boolean), public.add_schedule_location(uuid,text,text), public.add_schedule_position(uuid,uuid,text,integer,timestamptz,timestamptz), public.assign_schedule_position(uuid,uuid,timestamptz,timestamptz,boolean,text), public.cancel_schedule_assignment(uuid), public.create_schedule_rotation(text,public.schedule_recurrence_pattern,smallint,smallint,date,date,time,time,text,text,text,text,text,uuid), public.set_schedule_rotation_status(uuid,public.schedule_rotation_status), public.generate_schedule_rotation(uuid,date), public.list_schedule_rotations() to authenticated;

commit;
