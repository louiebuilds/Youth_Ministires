-- Youth Ministries Platform: Group Chat Family Adults production preflight
-- Target migrations: 202610250001, then 202610250002. Generated 2026-10-26.
-- Paste the ENTIRE script into the intended production project's SQL Editor.
-- This script never calls application RPCs and never writes data or schema.
-- Output is metadata, SQL definitions, and aggregate counts; no person names,
-- contacts, message bodies, family names, or authentication tokens are selected.
-- Run as the trusted SQL Editor database administrator, not an end-user role.
-- An error/timeout means INCOMPLETE, never PASS. ROLLBACK is safe to run afterward.
-- Returns ONE result table: section + details JSON. Save/export the whole table.
-- Definitions/grants need human review against the repository even if checks pass.

-- Interpretation:
-- * BLOCKER: stop release; REVIEW: explain and compare against the repository.
-- * 03: all four prerequisites must be present. Release versions should be pending
--   for a first application. Already-recorded releases must not be replayed.
-- * 07/09: verify current definitions, input names/defaults, ownership and ability
--   of the intended migration role to replace functions; do not overwrite drift.
-- * 08: no rows expected for a clean first application of 202610250001.
-- * 10-12: anon must not execute public chat RPCs; authenticated must not directly
--   read/write chat tables or discovery-preference storage. Protected private
--   helper grants vary: compare the actual prerequisite migration definitions.
--   Household tables retain their baseline role/RLS protections. service_role
--   bypass is privileged infrastructure access, not an ordinary app-user grant.
-- * 13: additional constraints, required columns, triggers, enums, rules and
--   default grants require review for compatibility; do not remove them here.
-- * 14: active_student_membership_rows and active_memberships_linked_to_archived_students
--   must be zero. Investigate active_student_linked_profiles and student-linked
--   owners before release. Retained removed memberships are historical evidence;
--   do not delete them. Missing person links mean identity cannot be age-verified
--   from this join alone. Numeric counts are XML tags inside the JSON detail.
-- * 15: examine unexpected membership writers. This heuristic is not exhaustive
--   and cannot inspect external service-role code or concurrent future changes.
-- * Any permission error/timeout/absent completion marker = incomplete inspection.
-- Successful execution is NOT proof of migration applicability or release approval.
-- After review/acceptance/backup/approval: migrate 202610250001, then 202610250002,
-- verify both, and only then deploy the application. No blanket database push.

begin transaction isolation level repeatable read read only;
set local statement_timeout = '60s';
set local lock_timeout = '3s';
set local search_path = pg_catalog;
-- Fail rather than silently reporting RLS-filtered partial counts.
set local row_security = off;
-- 01: Execution context. Independently confirm the SQL Editor project identity.
select '01_context' as section, current_database() as database_name,
       current_user as executing_role, session_user as session_role,
       current_setting('transaction_read_only') as read_only,
       current_setting('transaction_isolation') as isolation,
       current_setting('server_version') as postgres_version,
       transaction_timestamp() as inspected_at,
       'This script cannot prove that you selected the production project.' as note;

with
report_00 as (
-- 02: History catalog exists and can be inspected. Missing history is a blocker.
select '02_history_access' as section,
       case when to_regclass('supabase_migrations.schema_migrations') is null
         then 'BLOCKER: history table missing'
         when not has_table_privilege(to_regclass('supabase_migrations.schema_migrations'),'SELECT')
         then 'BLOCKER: history inaccessible'
         when not exists (select 1 from pg_attribute
           where attrelid=to_regclass('supabase_migrations.schema_migrations')
             and attname='version' and attnum>0 and not attisdropped)
         then 'BLOCKER: version column missing'
         else 'AVAILABLE' end as status
),
report_01 as (
-- 03: Required history rows and whether either release migration is already recorded.
-- Dynamic SELECT is guarded so a missing history table does not abort other sections.
with expected(version,kind) as (values
 ('202609250001','prerequisite'),('202609250002','prerequisite'),
 ('202610080001','prerequisite'),('202610080002','prerequisite'),
 ('202610250001','release'),('202610250002','release')
), checked as (
 select e.*, case when exists (select 1 from pg_attribute
   where attrelid=to_regclass('supabase_migrations.schema_migrations')
     and attname='version' and attnum>0 and not attisdropped)
   and has_table_privilege(to_regclass('supabase_migrations.schema_migrations'),'SELECT')
 then ((xpath('/table/row/n/text()', query_to_xml(
   format('select count(*) as n from supabase_migrations.schema_migrations where version::text=%L',version),
   false,false,'')))[1]::text)::bigint end as matching_rows
 from expected e
)
select '03_migration_history' as section, *,
 case when matching_rows is null then 'BLOCKER: unverified'
      when matching_rows>1 then 'BLOCKER: duplicate history'
      when kind='prerequisite' and matching_rows=0 then 'BLOCKER: missing prerequisite'
      when kind='release' and matching_rows=1 then 'REVIEW: already recorded; do not replay'
      when kind='release' then 'EXPECTED: pending'
      else 'PRESENT: compare actual schema too' end as status
from checked order by version
),
report_02 as (
-- 04: Required columns/types. Nullability/defaults are included for comparison.
with expected(relation_name,column_name,type_name) as (values
    ('public.people','id','uuid'),
    ('public.people','first_name','text'),
    ('public.people','last_name','text'),
    ('public.people','status','public.person_status'),
    ('public.people','archived_at','timestamptz'),
    ('public.profiles','id','uuid'),
    ('public.profiles','person_id','uuid'),
    ('public.profiles','primary_role','public.account_role'),
    ('public.profiles','status','public.account_status'),
    ('public.profiles','display_name','text'),
    ('public.households','id','uuid'),
    ('public.households','name','text'),
    ('public.households','archived_at','timestamptz'),
    ('public.household_memberships','household_id','uuid'),
    ('public.household_memberships','person_id','uuid'),
    ('public.household_memberships','is_responsible_adult','bool'),
    ('public.students','id','uuid'),
    ('public.students','person_id','uuid'),
    ('public.students','primary_household_id','uuid'),
    ('public.students','status','public.student_status'),
    ('public.students','archived_at','timestamptz'),
    ('public.student_relationships','student_id','uuid'),
    ('public.student_relationships','person_id','uuid'),
    ('public.student_relationships','may_view_student_information','bool'),
    ('public.chat_rooms','id','uuid'),
    ('public.chat_rooms','name','text'),
    ('public.chat_rooms','room_type','public.chat_room_type'),
    ('public.chat_rooms','source_access','public.chat_source_access'),
    ('public.chat_rooms','event_id','uuid'),
    ('public.chat_rooms','schedule_id','uuid'),
    ('public.chat_rooms','created_by_profile_id','uuid'),
    ('public.chat_rooms','is_parent_managed','bool'),
    ('public.chat_rooms','archived_at','timestamptz'),
    ('public.chat_rooms','archived_by_profile_id','uuid'),
    ('public.chat_room_members','id','uuid'),
    ('public.chat_room_members','room_id','uuid'),
    ('public.chat_room_members','profile_id','uuid'),
    ('public.chat_room_members','membership_source','public.chat_membership_source'),
    ('public.chat_room_members','added_by_profile_id','uuid'),
    ('public.chat_room_members','removed_at','timestamptz'),
    ('public.chat_room_members','removed_by_profile_id','uuid'),
    ('public.chat_room_members','removal_reason','text'),
    ('public.chat_messages','id','uuid'),
    ('public.chat_messages','room_id','uuid'),
    ('public.chat_messages','author_profile_id','uuid'),
    ('public.chat_messages','message_body','text'),
    ('public.chat_messages','removed_at','timestamptz'),
    ('public.chat_read_state','room_id','uuid'),
    ('public.chat_read_state','profile_id','uuid'),
    ('public.chat_discovery_preferences','profile_id','uuid'),
    ('public.chat_discovery_preferences','parent_discoverable','bool'),
    ('public.chat_discovery_preferences','updated_by_profile_id','uuid'),
    ('public.audit_events','actor_profile_id','uuid'),
    ('public.audit_events','action','text'),
    ('public.audit_events','entity_type','text'),
    ('public.audit_events','entity_id','uuid'),
    ('public.audit_events','result','public.audit_result'),
    ('public.audit_events','source','public.audit_source'),
    ('public.audit_events','metadata','jsonb'),
    ('public.events','id','uuid'),
    ('public.ministry_schedules','id','uuid'),
    ('auth.users','id','uuid')
)
select '04_required_columns' as section, e.*,
       case when c.oid is null or c.relkind not in ('r','p') then 'BLOCKER: table missing or wrong kind'
            when a.attnum is null then 'BLOCKER: column missing'
            when a.atttypid<>to_regtype(e.type_name) then 'BLOCKER: incompatible type'
            else 'PRESENT' end as status,
       format_type(a.atttypid,a.atttypmod) as actual_type,
       a.attnotnull as not_null, a.attgenerated as generated_kind,
       pg_get_expr(d.adbin,d.adrelid) as column_default
from expected e left join pg_class c on c.oid=to_regclass(e.relation_name)
left join pg_attribute a on a.attrelid=c.oid and a.attname=e.column_name
  and a.attnum>0 and not a.attisdropped
left join pg_attrdef d on d.adrelid=c.oid and d.adnum=a.attnum
order by e.relation_name,e.column_name
),
report_03 as (
-- 05: Required FK relationships (column pairs and validated constraint, not names).
with expected(src,src_col,dst,dst_col) as (values
 ('public.profiles','id','auth.users','id'),
 ('public.profiles','person_id','public.people','id'),
 ('public.household_memberships','person_id','public.people','id'),
 ('public.household_memberships','household_id','public.households','id'),
 ('public.students','person_id','public.people','id'),
 ('public.students','primary_household_id','public.households','id'),
 ('public.student_relationships','person_id','public.people','id'),
 ('public.student_relationships','student_id','public.students','id'),
 ('public.chat_rooms','created_by_profile_id','public.profiles','id'),
 ('public.chat_rooms','event_id','public.events','id'),
 ('public.chat_rooms','schedule_id','public.ministry_schedules','id'),
 ('public.chat_room_members','profile_id','public.profiles','id'),
 ('public.chat_room_members','room_id','public.chat_rooms','id'),
 ('public.chat_room_members','added_by_profile_id','public.profiles','id'),
 ('public.chat_discovery_preferences','profile_id','public.profiles','id'),
 ('public.chat_messages','room_id','public.chat_rooms','id'),
 ('public.chat_messages','author_profile_id','public.profiles','id')
)
select '05_required_relationships' as section,e.*,
 case when exists (select 1 from pg_constraint k
  join pg_attribute sa on sa.attrelid=k.conrelid and sa.attname=e.src_col
  join pg_attribute da on da.attrelid=k.confrelid and da.attname=e.dst_col
  where k.contype='f' and k.conrelid=to_regclass(e.src)
    and k.confrelid=to_regclass(e.dst) and k.convalidated
    and k.conkey=array[sa.attnum]::smallint[]
    and k.confkey=array[da.attnum]::smallint[])
 then 'PRESENT' else 'BLOCKER: required validated FK missing' end as status
from expected e order by src,src_col
),
report_04 as (
-- 06: Definitions of ALL constraints and indexes for required tables.
-- Check active membership uniqueness, household/person uniqueness, student/person
-- uniqueness, room source shape, defaults, audit constraints, invalid indexes.
select '06_constraints' as section, k.conrelid::regclass::text as relation_name,
 k.conname, k.contype, k.convalidated, pg_get_constraintdef(k.oid,true) as definition
from pg_constraint k join pg_class c on c.oid=k.conrelid
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in (
 'people','profiles','households','household_memberships','students','student_relationships',
 'chat_rooms','chat_room_members','chat_messages','chat_read_state','chat_discovery_preferences','audit_events')
order by relation_name,k.conname
),
report_05 as (
select '06_indexes' as section, i.indrelid::regclass::text as relation_name,
 i.indexrelid::regclass::text as index_name, i.indisunique, i.indisvalid, i.indisready,
 pg_get_indexdef(i.indexrelid) as definition
from pg_index i where i.indrelid in (
 to_regclass('public.household_memberships'),to_regclass('public.students'),
 to_regclass('public.chat_room_members')) order by relation_name,index_name
),
report_06 as (
-- Required unique identity/membership indexes, independently of index names.
with expected(rel,cols,predicate) as (values
 ('public.household_memberships',array['household_id','person_id']::text[],'all'),
 ('public.students',array['person_id']::text[],'all'),
 ('public.chat_room_members',array['profile_id','room_id']::text[],'active')
)
select '06_required_unique_indexes' as section,e.*,
 case when exists (select 1 from pg_index i where i.indrelid=to_regclass(e.rel)
  and i.indisunique and i.indisvalid and i.indisready
  and array(select a.attname::text from unnest(i.indkey) with ordinality keys(attnum,pos)
    join pg_attribute a on a.attrelid=i.indrelid and a.attnum=keys.attnum
    where keys.pos<=i.indnkeyatts order by a.attname)=e.cols
  and ((e.predicate='all' and i.indpred is null) or
    (e.predicate='active' and regexp_replace(lower(pg_get_expr(i.indpred,i.indrelid)),
      '[()[:space:]]','','g')='removed_atisnull')))
 then 'PRESENT' else 'BLOCKER: required valid unique index missing' end as status
from expected e
),
report_07 as (
-- 07: Expected existing signatures and argument names/defaults used by RPC clients.
-- Exact signatures are catalog text; no application RPC is executed.
with expected(schema_name,function_name,args,result_type) as (values
 ('public','create_chat_room','text, public.chat_room_type, public.chat_source_access, uuid, uuid','uuid'),
 ('public','add_chat_room_member','uuid, uuid','uuid'),
 ('public','list_chat_member_candidates','uuid','TABLE(profile_id uuid, display_name text, primary_role public.account_role, is_member boolean)'),
 ('private','can_manage_chat_room','uuid','boolean'),
 ('private','can_parent_invite_to_chat','uuid, uuid','boolean'),
 ('private','can_view_household','uuid','boolean'),
 ('private','can_manage_chat','','boolean'),
 ('private','current_profile_is_active','','boolean'),
 ('private','current_profile_role','','public.account_role'),
 ('private','chat_role_allowed','uuid, uuid','boolean'),
 ('auth','uid','','uuid')
)
select '07_required_functions' as section,e.*,
 p.oid::regprocedure::text as actual_signature,
 pg_get_function_result(p.oid) as actual_result,
 p.proargnames as argument_names, p.pronargdefaults as default_argument_count,
 case when p.oid is null then 'BLOCKER: signature missing'
      when p.prokind<>'f' or pg_get_function_result(p.oid)<>e.result_type
        then 'BLOCKER: function kind/return type differs'
      when e.function_name='create_chat_room' and (
        p.proargnames is distinct from array['p_name','p_room_type','p_source_access','p_event_id','p_schedule_id']::text[]
        or p.pronargdefaults<>3) then 'BLOCKER: create RPC argument names/defaults conflict'
      when e.function_name='add_chat_room_member' and
        p.proargnames is distinct from array['p_room_id','p_profile_id']::text[]
        then 'BLOCKER: add-member RPC argument names conflict'
      else 'PRESENT: review definition and argument names/defaults' end as status
from expected e left join pg_namespace n on n.nspname=e.schema_name
left join pg_proc p on p.pronamespace=n.oid and p.proname=e.function_name
 and oidvectortypes(p.proargtypes)=e.args
order by e.schema_name,e.function_name
),
report_08 as (
-- 08: Existing release object names collide with CREATE FUNCTION in 202610250001.
-- Any match requires explanation/reconciliation; do not replay the migration.
select '08_release_name_collisions' as section,n.nspname,p.proname,
 p.oid::regprocedure::text as signature,p.prokind,
 'BLOCKER/REVIEW: release name already exists, including overloads' as status
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in
 ('list_private_chat_adults','list_private_chat_families','add_private_chat_adults')
order by p.proname,signature
),
report_09 as (
-- 09: Current chat functions and authorization dependencies: full definitions,
-- owner, owner privileges, SECURITY DEFINER, volatility, settings, and raw ACL.
with funcs as (
 select p.*,n.nspname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where p.prokind in ('f','p') and (
  (n.nspname in ('public','private') and p.proname ilike '%chat%') or
  (n.nspname='private' and p.proname in
    ('can_view_household','current_profile_is_active','current_profile_role','has_role')) or
  (n.nspname='auth' and p.proname='uid'))
)
select '09_function_definitions' as section,p.oid::regprocedure::text as signature,
 pg_get_function_arguments(p.oid) as arguments,pg_get_function_result(p.oid) as result,
 pg_get_userbyid(p.proowner) as owner,r.rolsuper as owner_superuser,
 r.rolbypassrls as owner_bypasses_rls,p.prosecdef as security_definer,
 p.provolatile,p.proconfig,p.proacl::text as raw_acl,
 pg_has_role(current_user,p.proowner,'USAGE') as inspector_has_owner_privileges,
 pg_get_functiondef(p.oid) as definition
from funcs p join pg_roles r on r.oid=p.proowner order by signature
),
report_10 as (
-- 10: Explicit/default function EXECUTE ACL entries, including PUBLIC defaults.
select '10_function_acl' as section,p.oid::regprocedure::text as signature,
 case when acl.grantee=0 then 'PUBLIC' else pg_get_userbyid(acl.grantee) end as grantee,
 pg_get_userbyid(acl.grantor) as grantor,acl.privilege_type,acl.is_grantable
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) acl
where n.nspname in ('public','private') and
 (p.proname ilike '%chat%' or p.proname in ('can_view_household','current_profile_is_active','current_profile_role','has_role'))
order by signature,grantee
),
report_11 as (
-- 11: Effective grants, including inherited privileges, for API roles.
select '11_effective_rpc_access' as section,p.oid::regprocedure::text as signature,
 r.rolname,has_schema_privilege(r.oid,n.oid,'USAGE') as schema_usage,
 has_function_privilege(r.oid,p.oid,'EXECUTE') as effective_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
cross join pg_roles r where r.rolname in ('anon','authenticated','service_role')
 and n.nspname in ('public','private') and
 (p.proname ilike '%chat%' or p.proname in ('can_view_household','current_profile_is_active','current_profile_role','has_role'))
order by signature,r.rolname
),
report_12 as (
select '11_required_roles' as section,expected.role_name,
 case when r.oid is null then 'BLOCKER: required role missing' else 'PRESENT' end as status
from (values ('anon'),('authenticated'),('service_role')) expected(role_name)
left join pg_roles r on r.rolname=expected.role_name
),
report_13 as (
-- 12: RLS flags and effective table/column API privileges.
select '12_rls_and_table_access' as section,c.oid::regclass::text as relation_name,
 pg_get_userbyid(c.relowner) as owner,c.relrowsecurity as rls_enabled,
 c.relforcerowsecurity as rls_forced,r.rolname,
 has_table_privilege(r.oid,c.oid,'SELECT') as can_select,
 has_table_privilege(r.oid,c.oid,'INSERT') as can_insert,
 has_table_privilege(r.oid,c.oid,'UPDATE') as can_update,
 has_table_privilege(r.oid,c.oid,'DELETE') as can_delete,
 has_table_privilege(r.oid,c.oid,'TRUNCATE') as can_truncate,
 has_any_column_privilege(r.oid,c.oid,'SELECT') as any_column_select,
 has_any_column_privilege(r.oid,c.oid,'INSERT') as any_column_insert,
 has_any_column_privilege(r.oid,c.oid,'UPDATE') as any_column_update
from pg_class c join pg_namespace n on n.oid=c.relnamespace cross join pg_roles r
where r.rolname in ('anon','authenticated','service_role') and n.nspname='public'
and c.relname in ('people','profiles','households','household_memberships','students',
 'student_relationships','chat_rooms','chat_room_members','chat_messages','chat_read_state',
 'chat_discovery_preferences','audit_events') order by relation_name,r.rolname
),
report_14 as (
select '12_rls_policies' as section,* from pg_policies where
 (schemaname='public' and tablename in ('people','profiles','households',
 'household_memberships','students','student_relationships','chat_rooms','chat_room_members',
 'chat_messages','chat_read_state','chat_discovery_preferences','audit_events'))
 or (schemaname='realtime' and tablename='messages') order by schemaname,tablename,policyname
),
report_15 as (
-- 13: Unexpected triggers, rewrite rules, overloads, required insert columns,
-- enum drift and default grants. Review every non-baseline definition.
select '13_triggers' as section,t.tgrelid::regclass::text as relation_name,
 t.tgname,t.tgenabled,pg_get_triggerdef(t.oid,true) as definition,
 pg_get_functiondef(t.tgfoid) as trigger_function
from pg_trigger t where not t.tgisinternal and t.tgrelid in
 (to_regclass('public.chat_rooms'),to_regclass('public.chat_room_members'),to_regclass('public.audit_events'))
order by relation_name,t.tgname
),
report_16 as (
select '13_rewrite_rules' as section,r.ev_class::regclass::text as relation_name,
 r.rulename,pg_get_ruledef(r.oid,true) as definition from pg_rewrite r
where r.ev_class in (to_regclass('public.chat_rooms'),to_regclass('public.chat_room_members'),to_regclass('public.audit_events'))
),
report_17 as (
select '13_required_insert_columns' as section,c.oid::regclass::text as relation_name,
 a.attname,format_type(a.atttypid,a.atttypmod) as type_name,
 'REVIEW: NOT NULL without default; must be supplied by migration function' as status
from pg_attribute a join pg_class c on c.oid=a.attrelid
left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
where c.oid in (to_regclass('public.chat_rooms'),to_regclass('public.chat_room_members'),to_regclass('public.audit_events'))
 and a.attnum>0 and not a.attisdropped and a.attnotnull and d.oid is null
 and a.attidentity='' and a.attgenerated='' order by relation_name,a.attname
),
report_18 as (
select '13_enum_labels' as section,t.oid::regtype::text as type_name,
 array_agg(e.enumlabel order by e.enumsortorder) as labels
from pg_type t join pg_enum e on e.enumtypid=t.oid
where t.typnamespace=(select oid from pg_namespace where nspname='public')
 and t.typname in ('account_role','account_status','person_status','student_status',
 'chat_room_type','chat_source_access','chat_membership_source','audit_result','audit_source')
group by t.oid order by type_name
),
report_19 as (
select '13_default_acl' as section,pg_get_userbyid(d.defaclrole) as owner,
 n.nspname as schema_name,d.defaclobjtype,d.defaclacl::text as acl
from pg_default_acl d left join pg_namespace n on n.oid=d.defaclnamespace
where d.defaclnamespace=0 or n.nspname in ('public','private')
),
report_20 as (
-- 14: Student-linked profile/membership COUNTS, across ALL student statuses.
-- Guarded dynamic SELECT avoids an undefined-table error on incompatible schemas.
-- If skipped, counts are UNVERIFIED. XML output contains only numeric totals.
with required(rel,col) as (values
 ('public.profiles','id'),('public.profiles','person_id'),('public.profiles','status'),
 ('public.students','person_id'),('public.students','archived_at'),
 ('public.chat_room_members','profile_id'),('public.chat_room_members','removed_at'),
 ('public.chat_rooms','created_by_profile_id'),('public.chat_rooms','is_parent_managed')),
ready as (select bool_and(exists(select 1 from pg_attribute a
 where a.attrelid=to_regclass(rel) and a.attname=col and a.attnum>0 and not a.attisdropped)) as ok from required)
select '14_student_membership_counts' as section,
 case when ok then 'INSPECT COUNTS: any active membership is a release blocker'
 else 'BLOCKER: counts unverified because required columns are missing' end as status,
 case when ok then query_to_xml($counts$
 select
 (select count(*) from public.profiles p where exists
   (select 1 from public.students s where s.person_id=p.person_id)) as student_linked_profiles,
 (select count(*) from public.profiles p where p.status::text='active' and exists
   (select 1 from public.students s where s.person_id=p.person_id)) as active_student_linked_profiles,
 (select count(*) from public.chat_room_members m join public.profiles p on p.id=m.profile_id
  where exists(select 1 from public.students s where s.person_id=p.person_id)) as retained_student_membership_rows,
 (select count(*) from public.chat_room_members m join public.profiles p on p.id=m.profile_id
  where m.removed_at is null and exists(select 1 from public.students s where s.person_id=p.person_id)) as active_student_membership_rows,
 (select count(*) from public.chat_room_members m join public.profiles p on p.id=m.profile_id
  where m.removed_at is null and exists(select 1 from public.students s where s.person_id=p.person_id and s.archived_at is not null)) as active_memberships_linked_to_archived_students,
 (select count(*) from public.chat_rooms r join public.profiles p on p.id=r.created_by_profile_id
  where r.is_parent_managed and exists(select 1 from public.students s where s.person_id=p.person_id)) as student_linked_private_group_owners,
 (select count(*) from public.profiles p where p.person_id is null) as profiles_without_person_link
 $counts$,false,false,'')::text end as numeric_counts_xml
from ready
),
report_21 as (
-- 15: Candidate alternative insertion functions. This is a heuristic scan, not
-- a proof that external service-role SQL cannot write. Investigate all matches.
select '15_membership_writer_scan' as section,p.oid::regprocedure::text as signature,
 pg_get_userbyid(p.proowner) as owner,p.prosecdef as security_definer,
 pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname not in ('pg_catalog','information_schema') and p.prokind in ('f','p')
 and p.prosrc ilike '%chat_room_members%'
 and p.prosrc ~* '(insert|update|merge|execute)'
order by signature
),
report_22 as (
-- 16: Explicit completion marker. No overall automatic production approval.
select '16_complete' as section,
 'Inspection completed. Review ALL prior results; completion is not release approval.' as status
),
report_overloads as (
select '08_existing_rpc_overloads' as section,p.oid::regprocedure::text as signature,
 'BLOCKER/REVIEW: unexpected overload may alter RPC resolution' as status
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and (
 (p.proname='create_chat_room' and oidvectortypes(p.proargtypes)<>'text, public.chat_room_type, public.chat_source_access, uuid, uuid') or
 (p.proname='add_chat_room_member' and oidvectortypes(p.proargtypes)<>'uuid, uuid') or
 (p.proname='list_chat_member_candidates' and oidvectortypes(p.proargtypes)<>'uuid'))
),
combined as (
select r.section, to_jsonb(r)-'section' as details from report_00 r
union all
select r.section, to_jsonb(r)-'section' as details from report_01 r
union all
select r.section, to_jsonb(r)-'section' as details from report_02 r
union all
select r.section, to_jsonb(r)-'section' as details from report_03 r
union all
select r.section, to_jsonb(r)-'section' as details from report_04 r
union all
select r.section, to_jsonb(r)-'section' as details from report_05 r
union all
select r.section, to_jsonb(r)-'section' as details from report_06 r
union all
select r.section, to_jsonb(r)-'section' as details from report_07 r
union all
select r.section, to_jsonb(r)-'section' as details from report_08 r
union all
select r.section, to_jsonb(r)-'section' as details from report_09 r
union all
select r.section, to_jsonb(r)-'section' as details from report_10 r
union all
select r.section, to_jsonb(r)-'section' as details from report_11 r
union all
select r.section, to_jsonb(r)-'section' as details from report_12 r
union all
select r.section, to_jsonb(r)-'section' as details from report_13 r
union all
select r.section, to_jsonb(r)-'section' as details from report_14 r
union all
select r.section, to_jsonb(r)-'section' as details from report_15 r
union all
select r.section, to_jsonb(r)-'section' as details from report_16 r
union all
select r.section, to_jsonb(r)-'section' as details from report_17 r
union all
select r.section, to_jsonb(r)-'section' as details from report_18 r
union all
select r.section, to_jsonb(r)-'section' as details from report_19 r
union all
select r.section, to_jsonb(r)-'section' as details from report_20 r
union all
select r.section, to_jsonb(r)-'section' as details from report_21 r
union all
select r.section, to_jsonb(r)-'section' as details from report_22 r
union all
select r.section, to_jsonb(r)-'section' as details from report_overloads r
 )
select section, details from combined
order by section, details::text;

rollback;
