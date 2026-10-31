begin;

-- Legacy means all three original completion fields are absent. Partial
-- metadata (including an actor removed by a future retention policy) is not
-- evidence of legacy history and must not use this recovery path.
create function public.reopen_legacy_event(p_event_id uuid, p_target_status public.event_status)
returns void language plpgsql security definer
set search_path = '' set row_security = on as $$
begin
  if not private.current_profile_is_active() or not private.has_role(array['platform_administrator','youth_pastor']::public.account_role[]) then
    raise exception 'Legacy event reopening is denied.' using errcode = '42501';
  end if;
  if p_target_status is null or p_target_status not in ('draft','published','active') then
    raise exception 'Select a valid target status.' using errcode = '22023';
  end if;
  perform 1 from public.events where id=p_event_id and status='completed'
    and completed_from_status is null and completed_at is null
    and completed_by_profile_id is null for update;
  if not found then
    raise exception 'Event is not a legacy Completed record.' using errcode = '22023';
  end if;
  update public.events set status=p_target_status, reopened_at=now(),
    reopened_by_profile_id=(select private.event_lifecycle_actor()) where id=p_event_id;
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata)
  values ((select private.event_lifecycle_actor()),'event.legacy_reopened','event',p_event_id,'success','web',
    jsonb_build_object('selectedTargetStatus',p_target_status,'previousStatusUnknown',true,'reopenedAt',now()));
end;
$$;
revoke all on function public.reopen_legacy_event(uuid,public.event_status) from public,anon,authenticated;
do $$ begin
  if exists(select 1 from pg_roles where rolname='service_role') then
    revoke all on function public.reopen_legacy_event(uuid,public.event_status) from service_role;
  end if;
end $$;
grant execute on function public.reopen_legacy_event(uuid,public.event_status) to authenticated;
do $$ begin execute format('grant event_lifecycle_owner to %I',current_user); end $$;
grant create on schema public to event_lifecycle_owner;
alter function public.reopen_legacy_event(uuid,public.event_status) owner to event_lifecycle_owner;
revoke create on schema public from event_lifecycle_owner;
do $$ begin execute format('revoke event_lifecycle_owner from %I',current_user); end $$;
do $$ declare r text; begin
  if has_schema_privilege('event_lifecycle_owner','public','CREATE') or
     has_schema_privilege('event_lifecycle_owner','private','CREATE') then
    raise exception 'Lifecycle owner must not have schema CREATE privileges';
  end if;
  foreach r in array array['anon','authenticated','authenticator','service_role'] loop
    if exists(select 1 from pg_roles where rolname=r) and pg_has_role(r,'event_lifecycle_owner','MEMBER') then
      raise exception 'Client role % must not be a lifecycle owner member',r;
    end if;
  end loop;
end $$;

-- Retain the same calendar/workspace access rules: unknown completion history
-- grants no Parent publication access. Registration/attendance alone proves
-- participation, not publication. Existing active assignment access is retained.
-- No inference or backfill of prior status, actor, or completion time occurs.
create or replace function public.get_event_workspace(p_event_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' set row_security=off as $$
declare can_manage boolean; allowed boolean;
begin
  can_manage:=private.can_manage_events();
  allowed:=can_manage or exists(select 1 from public.events where id=p_event_id and ((private.has_role(array['parent']::public.account_role[]) and (status in ('published','active') or (status='completed' and completed_from_status in ('published','active')))) or private.is_assigned_to_event(id)));
  if not private.current_profile_is_active() or not allowed then raise exception 'Event workspace access is denied.' using errcode='42501'; end if;
  return (select jsonb_build_object('eventId',e.id,'name',e.name,'eventType',e.event_type,'status',e.status,'description',e.description,'startsAt',e.starts_at,'endsAt',e.ends_at,'timezone',e.timezone,'capacity',e.capacity,'campus',e.campus,'building',e.building,'room',e.room,'address',e.address,'meetingInstructions',e.meeting_instructions,'canManage',can_manage,'isLegacyCompleted',(e.status='completed' and e.completed_from_status is null and e.completed_at is null and e.completed_by_profile_id is null),'completedAt',e.completed_at,'completedByProfileId',e.completed_by_profile_id,'reopenedAt',e.reopened_at,'reopenedByProfileId',e.reopened_by_profile_id) from public.events e where e.id=p_event_id);
end;
$$;

commit;
