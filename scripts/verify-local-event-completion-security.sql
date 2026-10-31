begin;
insert into auth.users(id,email,raw_user_meta_data) values
 ('26000000-0000-4000-8000-000000000001','step26-local@example.test','{}');
update public.profiles set primary_role='platform_administrator',status='active'
where id='26000000-0000-4000-8000-000000000001';
insert into public.events(id,name,event_type,status,starts_at,ends_at,timezone)
values ('26000000-0000-4000-8000-000000000002','Step 26 rollback fixture','Test','published',now()-interval '2 hours',now()-interval '1 hour','UTC');
create function pg_temp.denied(command text) returns void language plpgsql as $$
begin
  begin execute command;
  exception when insufficient_privilege then return; end;
  raise exception 'Security check unexpectedly succeeded: %',command;
end $$;
create temp table preserved_public_data(name text primary key, data jsonb);
do $$ declare t record; value jsonb; begin
 for t in select tablename from pg_tables where schemaname='public' and tablename not in ('events','audit_events') loop
  execute format('select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),''[]''::jsonb) from public.%I r',t.tablename) into value;
  insert into preserved_public_data values(t.tablename,value);
 end loop;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','26000000-0000-4000-8000-000000000001',true);
select set_config('app.event_lifecycle_transition','allowed',true);
select pg_temp.denied($q$update public.events set status='completed' where id='26000000-0000-4000-8000-000000000002'$q$);
select pg_temp.denied($q$insert into public.events(name,event_type,status,starts_at,ends_at) values ('Denied','Test','completed',now(),now()+interval '1 hour')$q$);
select public.complete_event('26000000-0000-4000-8000-000000000002');
select pg_temp.denied($q$update public.events set name='Denied' where id='26000000-0000-4000-8000-000000000002'$q$);
select pg_temp.denied($q$update public.events set status='published' where id='26000000-0000-4000-8000-000000000002'$q$);
select public.reopen_event('26000000-0000-4000-8000-000000000002');
select pg_temp.denied($q$update public.events set status='completed' where id='26000000-0000-4000-8000-000000000002'$q$);
reset role;
do $$ declare t record; value jsonb; begin
 for t in select * from preserved_public_data loop
  execute format('select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),''[]''::jsonb) from public.%I r',t.name) into value;
  if value is distinct from t.data then raise exception 'Dependent data changed: %',t.name; end if;
 end loop;
end $$;
do $$ begin
 if (select count(*) from public.audit_events where entity_id='26000000-0000-4000-8000-000000000002' and action in ('event.completed','event.reopened')) <> 2 then raise exception 'Audit count mismatch'; end if;
 if exists(select 1 from pg_auth_members where roleid='event_lifecycle_owner'::regrole and member in ('authenticated'::regrole,'anon'::regrole,'authenticator'::regrole,'service_role'::regrole)) then raise exception 'Owner has members'; end if;
 if has_schema_privilege('event_lifecycle_owner','public','CREATE') then raise exception 'Owner can create public functions'; end if;
end $$;
rollback;
-- A real non-superuser session cannot assume the lifecycle role.
set session authorization authenticated;
do $$ begin
 begin execute 'set role event_lifecycle_owner';
 exception when insufficient_privilege then return; end;
 raise exception 'Authenticated can assume owner';
end $$;
reset session authorization;
