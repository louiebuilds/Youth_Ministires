begin;

-- Deliberately fail if this role already exists: do not trust an existing role's
-- memberships, ownership, or privileges. This role owns only the two fixed RPCs.
create role event_lifecycle_owner nologin noinherit nosuperuser nocreatedb
  nocreaterole noreplication nobypassrls;
grant usage on schema public, private to event_lifecycle_owner;
grant execute on function private.current_profile_is_active(),
  private.has_role(public.account_role[]) to event_lifecycle_owner;
-- Supabase postgres cannot grant privileges on the managed auth schema.
-- This read-only identity bridge runs with the migration owner's existing access.
create function private.event_lifecycle_actor() returns uuid
language sql stable security definer set search_path = '' as $$ select auth.uid() $$;
revoke all on function private.event_lifecycle_actor() from public, anon, authenticated;
grant execute on function private.event_lifecycle_actor() to event_lifecycle_owner;
grant select on public.events to event_lifecycle_owner;
grant update(status, completed_at, completed_by_profile_id, completed_from_status,
  reopened_at, reopened_by_profile_id) on public.events to event_lifecycle_owner;
grant insert on public.audit_events to event_lifecycle_owner;
grant usage on sequence public.audit_events_id_seq to event_lifecycle_owner;
create policy event_lifecycle_read on public.events for select
  to event_lifecycle_owner using (true);
create policy event_lifecycle_update on public.events for update
  to event_lifecycle_owner using (true) with check (true);
create policy event_lifecycle_audit on public.audit_events for insert
  to event_lifecycle_owner with check (true);

-- SECURITY INVOKER is essential: observe the calling RPC's effective owner,
-- never the trigger owner's identity or any client-settable session setting.
create or replace function private.guard_event_completion()
returns trigger language plpgsql security invoker
set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'completed' or
       row(new.completed_at,new.completed_by_profile_id,new.completed_from_status,
           new.reopened_at,new.reopened_by_profile_id)
       is distinct from row(null,null,null,null,null) then
      raise exception 'Events must be completed through the completion workflow.' using errcode = '42501';
    end if;
  elsif current_user <> 'event_lifecycle_owner' then
    if old.status = 'completed' or new.status = 'completed' or
       row(new.completed_at,new.completed_by_profile_id,new.completed_from_status,
           new.reopened_at,new.reopened_by_profile_id)
       is distinct from
       row(old.completed_at,old.completed_by_profile_id,old.completed_from_status,
           old.reopened_at,old.reopened_by_profile_id) then
      raise exception 'Completed events must use the lifecycle workflow.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.guard_event_completion() from public, anon, authenticated;
alter table public.events enable always trigger guard_event_completion;

create or replace function public.complete_event(p_event_id uuid)
returns void language plpgsql security definer
set search_path = '' set row_security = on as $$
declare current_status public.event_status; event_end timestamptz;
begin
  if not private.current_profile_is_active() or not private.has_role(array['platform_administrator','youth_pastor']::public.account_role[]) then
    raise exception 'Event completion is denied.' using errcode = '42501';
  end if;
  select status, ends_at into current_status, event_end from public.events where id = p_event_id for update;
  if current_status is null or current_status in ('completed','archived') or event_end > now() then
    raise exception 'Event cannot be completed.' using errcode = '22023';
  end if;
  update public.events set status='completed', completed_at=now(), completed_by_profile_id=(select private.event_lifecycle_actor()),
    completed_from_status=current_status, reopened_at=null, reopened_by_profile_id=null where id=p_event_id;
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata)
  values ((select private.event_lifecycle_actor()),'event.completed','event',p_event_id,'success','web',
    jsonb_build_object('priorStatus',current_status,'completedAt',now()));
end;
$$;

create or replace function public.reopen_event(p_event_id uuid)
returns void language plpgsql security definer
set search_path = '' set row_security = on as $$
declare restore_status public.event_status;
begin
  if not private.current_profile_is_active() or not private.has_role(array['platform_administrator','youth_pastor']::public.account_role[]) then
    raise exception 'Event reopening is denied.' using errcode = '42501';
  end if;
  select completed_from_status into restore_status from public.events where id=p_event_id and status='completed' for update;
  if restore_status is null or restore_status in ('completed','archived') then
    raise exception 'Event cannot be reopened.' using errcode = '22023';
  end if;
  update public.events set status=restore_status, reopened_at=now(), reopened_by_profile_id=(select private.event_lifecycle_actor()),
    completed_at=null, completed_by_profile_id=null, completed_from_status=null where id=p_event_id;
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata)
  values ((select private.event_lifecycle_actor()),'event.reopened','event',p_event_id,'success','web',
    jsonb_build_object('restoredStatus',restore_status,'reopenedAt',now()));
end;
$$;


revoke all on function public.complete_event(uuid), public.reopen_event(uuid)
  from public, anon, authenticated;
grant execute on function public.complete_event(uuid), public.reopen_event(uuid) to authenticated;
do $$ begin
  if exists(select 1 from pg_roles where rolname='service_role') then
    revoke all on function public.complete_event(uuid), public.reopen_event(uuid),
      private.event_lifecycle_actor() from service_role;
  end if;
end $$;

-- Ownership transfer requires schema CREATE and membership for a non-superuser
-- migration operator. CREATE and usable membership are revoked below.
-- PostgreSQL 17 may retain the trusted creator's ADMIN-only membership.
do $$ begin
  execute format('grant event_lifecycle_owner to %I', current_user);
end $$;
grant create on schema public to event_lifecycle_owner;
alter function public.complete_event(uuid) owner to event_lifecycle_owner;
alter function public.reopen_event(uuid) owner to event_lifecycle_owner;
revoke create on schema public from event_lifecycle_owner;
do $$ begin
  execute format('revoke event_lifecycle_owner from %I', current_user);
end $$;
-- Fail closed if inherited privileges would let a client assume this identity
-- or let its owner create additional writable entry points.
do $$ declare r text; begin
  if has_schema_privilege('event_lifecycle_owner','public','CREATE')
     or has_schema_privilege('event_lifecycle_owner','private','CREATE') then
    raise exception 'Lifecycle owner must not have schema CREATE privileges';
  end if;
  foreach r in array array['anon','authenticated','authenticator','service_role'] loop
    if exists(select 1 from pg_roles where rolname=r) then
      if pg_has_role(r,'event_lifecycle_owner','MEMBER') then
        raise exception 'Client role % must not be a lifecycle owner member', r;
      end if;
    end if;
  end loop;
end $$;
commit;
