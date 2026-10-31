-- Step 31AR manual read-only evidence. Verify dashboard project txjwwxzlsltbwixrscfp.
-- Save results privately; never share credentials, Auth row contents or participant data.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT version(),current_user,session_user,current_database();
SELECT rolname,rolsuper,rolcreaterole,rolcanlogin,rolinherit,rolbypassrls FROM pg_roles
WHERE rolname IN (current_user,'event_lifecycle_owner','anon','authenticated','authenticator','service_role');
SELECT version,name FROM supabase_migrations.schema_migrations ORDER BY version;
SELECT version,name,cardinality(statements) AS statement_count FROM supabase_migrations.schema_migrations
WHERE version IN ('202610090001','202610170004','202610290001','202610300001','202610310001') ORDER BY version;
SELECT n.nspname,t.typname,e.enumlabel,e.enumsortorder FROM pg_type t
JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid
WHERE n.nspname='public' ORDER BY t.typname,e.enumsortorder;
SELECT table_schema,table_name,column_name,udt_schema,udt_name,is_nullable,column_default,is_identity
FROM information_schema.columns WHERE table_schema IN ('public','private') ORDER BY 1,2,ordinal_position;
SELECT c.oid::regclass AS relation,pg_get_userbyid(c.relowner) AS owner,c.relkind,c.relrowsecurity,c.relforcerowsecurity,c.relacl
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname IN ('public','private') AND c.relkind IN ('r','p','S') ORDER BY 1;
SELECT conrelid::regclass AS relation,conname,contype,convalidated,pg_get_constraintdef(oid,true) AS definition
FROM pg_constraint WHERE connamespace IN ('public'::regnamespace,'private'::regnamespace) ORDER BY 1,2;
SELECT schemaname,tablename,indexname,indexdef FROM pg_indexes WHERE schemaname IN ('public','private') ORDER BY 1,2,3;
SELECT schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check FROM pg_policies
WHERE schemaname IN ('public','private','storage') ORDER BY 1,2,3;
SELECT nspname,pg_get_userbyid(nspowner) AS owner,nspacl FROM pg_namespace WHERE nspname IN ('public','private','auth');
SELECT pg_get_userbyid(defaclrole) AS owner,defaclnamespace::regnamespace AS schema,defaclobjtype,defaclacl FROM pg_default_acl;
SELECT parent.rolname AS granted_role,member.rolname AS member,m.admin_option,m.inherit_option,m.set_option,pg_get_userbyid(m.grantor) AS grantor
FROM pg_auth_members m JOIN pg_roles parent ON parent.oid=m.roleid JOIN pg_roles member ON member.oid=m.member ORDER BY 1,2;
SELECT t.tgrelid::regclass AS relation,t.tgname,t.tgenabled,p.oid::regprocedure AS function,p.prosecdef,pg_get_triggerdef(t.oid,true) AS definition
FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid WHERE NOT t.tgisinternal
AND t.tgrelid IN ('public.events'::regclass,'public.audit_events'::regclass) ORDER BY 1,2;
-- Signature catalog for historical comparison. Inspect complete definitions privately;
-- definitions can contain configuration literals and should be redacted before sharing.
SELECT p.oid::regprocedure AS function,pg_get_function_arguments(p.oid) AS arguments,
pg_get_function_result(p.oid) AS result,pg_get_userbyid(p.proowner) AS owner,p.prosecdef,p.proconfig,p.proacl
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname IN ('public','private') AND p.prokind='f' ORDER BY 1;
SELECT p.oid::regprocedure AS function,pg_get_functiondef(p.oid) AS definition
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname IN ('public','private') AND p.prokind='f' AND p.proname IN (
'current_profile_is_active','has_role','can_manage_events','is_assigned_to_event','event_lifecycle_actor',
'guard_event_completion','list_event_calendar','get_event_workspace','get_event_completion_summary',
'complete_event','reopen_event','reopen_legacy_event','can_send_live_sms','normalize_sms_phone',
'preview_live_sms_recipients','create_live_sms_communication','claim_live_sms_delivery',
'finalize_live_sms_delivery','get_live_sms_send_result') ORDER BY 1;
SELECT p.oid::regprocedure AS function,r.rolname,has_function_privilege(r.oid,p.oid,'EXECUTE') AS can_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace CROSS JOIN pg_roles r
WHERE n.nspname IN ('public','private') AND p.proname IN ('event_lifecycle_actor','guard_event_completion',
'complete_event','reopen_event','reopen_legacy_event','get_event_completion_summary')
AND r.rolname IN ('anon','authenticated','authenticator','service_role','event_lifecycle_owner') ORDER BY 1,2;
SELECT p.oid::regprocedure AS function,CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS grantee,
a.privilege_type,a.is_grantable FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
WHERE n.nspname IN ('public','private') AND p.proname IN ('event_lifecycle_actor','guard_event_completion',
'complete_event','reopen_event','reopen_legacy_event','get_event_completion_summary') ORDER BY 1,2;
SELECT r.rolname,n.nspname,has_schema_privilege(r.oid,n.oid,'USAGE') AS usage,has_schema_privilege(r.oid,n.oid,'CREATE') AS create_objects
FROM pg_roles r CROSS JOIN pg_namespace n WHERE r.rolname IN ('event_lifecycle_owner',current_user)
AND n.nspname IN ('public','private','auth') ORDER BY 1,2;
SELECT r.rolname,c.oid::regclass AS relation,has_table_privilege(r.oid,c.oid,'SELECT') AS can_select,
has_table_privilege(r.oid,c.oid,'UPDATE') AS full_update,has_table_privilege(r.oid,c.oid,'INSERT') AS can_insert,
has_table_privilege(r.oid,c.oid,'DELETE') AS can_delete FROM pg_roles r CROSS JOIN pg_class c
WHERE r.rolname='event_lifecycle_owner' AND c.oid IN ('public.events'::regclass,'public.audit_events'::regclass);
SELECT r.rolname,a.attname,has_column_privilege(r.oid,a.attrelid,a.attnum,'UPDATE') AS can_update
FROM pg_roles r CROSS JOIN pg_attribute a WHERE r.rolname='event_lifecycle_owner'
AND a.attrelid='public.events'::regclass AND a.attnum>0 AND NOT a.attisdropped ORDER BY 2;
SELECT r.rolname,has_sequence_privilege(r.oid,c.oid,'USAGE') AS sequence_usage FROM pg_roles r CROSS JOIN pg_class c
JOIN pg_namespace n ON n.oid=c.relnamespace WHERE r.rolname='event_lifecycle_owner'
AND n.nspname='public' AND c.relname='audit_events_id_seq';
SELECT r.rolname,pg_has_role(r.oid,o.oid,'MEMBER') AS member,pg_has_role(r.oid,o.oid,'SET') AS can_assume,
pg_has_role(r.oid,o.oid,'USAGE') AS inherited FROM pg_roles r CROSS JOIN pg_roles o
WHERE o.rolname='event_lifecycle_owner' AND r.rolname IN ('anon','authenticated','authenticator','service_role',current_user);
-- Before and after: JSON extraction works before lifecycle columns exist.
SELECT status,count(*) FROM public.events GROUP BY status ORDER BY status;
SELECT id,status,(to_jsonb(e)->>'completed_at') IS NULL AS completion_time_unknown,
(to_jsonb(e)->>'completed_by_profile_id') IS NULL AS completion_actor_unknown,
(to_jsonb(e)->>'completed_from_status') IS NULL AS previous_status_unknown,
(to_jsonb(e)->>'reopened_at') IS NULL AS not_reopened,
(to_jsonb(e)->>'reopened_by_profile_id') IS NULL AS reopening_actor_absent FROM public.events e ORDER BY id;
SELECT count(*)=1 AND bool_and(status='completed') AS legacy_reference_preserved
FROM public.events WHERE id='1a75d927-1674-4d37-a7a7-8da9be7fcddf';
-- Generate only: copy these SELECT results into a new READ ONLY transaction.
-- Run the same generated table list before and after, under approved writer freeze.
-- JSON text sort supports tables without id, retains duplicate rows, emits no row bodies.
SELECT format($q$SELECT %L AS relation,count(*) AS row_count,md5(coalesce(string_agg(row_value,E'\n' ORDER BY row_value),'')) AS fingerprint FROM (SELECT %s AS row_value FROM %I.%I t) s;$q$,
schemaname||'.'||tablename,
CASE WHEN tablename='events' THEN $e$(to_jsonb(t)-ARRAY['completed_at','completed_by_profile_id','completed_from_status','reopened_at','reopened_by_profile_id'])::text$e$
ELSE 'to_jsonb(t)::text' END,schemaname,tablename) AS read_only_snapshot_query
FROM pg_tables WHERE schemaname='public' ORDER BY tablename;
-- Optional Auth fingerprint: only if authorized; never output actual Auth rows.
-- SELECT count(*) AS row_count,md5(coalesce(string_agg(v,E'\n' ORDER BY v),'')) AS fingerprint
-- FROM (SELECT to_jsonb(u)::text AS v FROM auth.users u) s;
ROLLBACK;
-- Do NOT invoke mutating RPCs, impersonate JWTs, or run fixture scripts here.
-- Compare snapshots BEFORE authorized acceptance fixture writes.
-- Verify lifecycle columns really exist after deployment, with correct types/FKs,
-- in addition to the NULL tests above. Absent columns before deployment are expected.
