\set ON_ERROR_STOP on

-- READ-ONLY Full Platform Acceptance identity-reconciliation preview.
-- This file never changes application data. Run it before considering the
-- rollback-only mutation rehearsal in dev-reconcile-duplicate-parent.sql.

begin transaction read only;

\echo '=== Expected Person records (safe structural fields only) ==='
select
  id,
  status,
  archived_at,
  created_at
from public.people
where id in (
  '591cba95-a32d-4ca4-a7ac-d9b422a6db60'::uuid,
  '75b2a220-170a-485b-ab01-049a18b38966'::uuid
)
order by id;

\echo '=== Household membership that must move ==='
select
  id as membership_id,
  household_id,
  person_id,
  relationship_label,
  is_responsible_adult,
  is_primary_contact,
  receive_email,
  receive_sms,
  receive_emergency_notifications,
  created_at
from public.household_memberships
where person_id in (
  '591cba95-a32d-4ca4-a7ac-d9b422a6db60'::uuid,
  '75b2a220-170a-485b-ab01-049a18b38966'::uuid
)
order by id;

\echo '=== Guardian relationships that must move ==='
select
  id as relationship_id,
  student_id,
  person_id,
  relationship_type,
  is_legal_guardian,
  is_emergency_contact,
  is_authorized_pickup,
  may_sign_permission_forms,
  may_view_student_information,
  receive_email,
  receive_sms,
  created_at
from public.student_relationships
where person_id in (
  '591cba95-a32d-4ca4-a7ac-d9b422a6db60'::uuid,
  '75b2a220-170a-485b-ab01-049a18b38966'::uuid
)
order by student_id, id;

\echo '=== Parent profile link that must move ==='
select
  id as profile_id,
  person_id,
  primary_role,
  status
from public.profiles
where id = '6e9f7c76-0849-467b-b6cd-a67dc7d6dffb'::uuid
   or person_id in (
     '591cba95-a32d-4ca4-a7ac-d9b422a6db60'::uuid,
     '75b2a220-170a-485b-ab01-049a18b38966'::uuid
   )
order by id;

\echo '=== Every public FK that references public.people ==='
select
  source_ns.nspname as source_schema,
  source.relname as source_table,
  source_column.attname as source_column,
  constraint_record.conname as constraint_name,
  pg_get_constraintdef(constraint_record.oid) as constraint_definition
from pg_constraint as constraint_record
join pg_class as source
  on source.oid = constraint_record.conrelid
join pg_namespace as source_ns
  on source_ns.oid = source.relnamespace
join unnest(constraint_record.conkey) with ordinality as source_key(attnum, position)
  on true
join unnest(constraint_record.confkey) with ordinality as target_key(attnum, position)
  on target_key.position = source_key.position
join pg_attribute as source_column
  on source_column.attrelid = source.oid
 and source_column.attnum = source_key.attnum
join pg_attribute as target_column
  on target_column.attrelid = constraint_record.confrelid
 and target_column.attnum = target_key.attnum
where constraint_record.contype = 'f'
  and constraint_record.confrelid = 'public.people'::regclass
  and source_ns.nspname = 'public'
  and target_column.attname = 'id'
order by source.relname, constraint_record.conname, source_key.position;

\echo '=== Current counts for every single-column public FK to people.id ==='
select format(
  'select %L as source_table, %L as source_column, '
  || 'count(*) filter (where %I = %L::uuid) as canonical_count, '
  || 'count(*) filter (where %I = %L::uuid) as duplicate_count '
  || 'from %I.%I;',
  source.relname,
  source_column.attname,
  source_column.attname,
  '591cba95-a32d-4ca4-a7ac-d9b422a6db60',
  source_column.attname,
  '75b2a220-170a-485b-ab01-049a18b38966',
  source_ns.nspname,
  source.relname
)
from pg_constraint as constraint_record
join pg_class as source
  on source.oid = constraint_record.conrelid
join pg_namespace as source_ns
  on source_ns.oid = source.relnamespace
join pg_attribute as source_column
  on source_column.attrelid = source.oid
 and source_column.attnum = constraint_record.conkey[1]
where constraint_record.contype = 'f'
  and constraint_record.confrelid = 'public.people'::regclass
  and source_ns.nspname = 'public'
  and array_length(constraint_record.conkey, 1) = 1
  and array_length(constraint_record.confkey, 1) = 1
order by source.relname, source_column.attname
\gexec

\echo '=== Uniqueness constraints relevant to moving relationships ==='
select
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('household_memberships', 'student_relationships', 'profiles')
  and indexdef ilike '%unique%'
order by tablename, indexname;

\echo '=== Fail-closed before-state assessment ==='
with checks as (
  select 'both expected People exist and are active' as check_name,
    (select count(*) = 2
       from public.people
      where id in (
        '591cba95-a32d-4ca4-a7ac-d9b422a6db60'::uuid,
        '75b2a220-170a-485b-ab01-049a18b38966'::uuid
      ) and status = 'active' and archived_at is null) as passed
  union all
  select 'canonical has no household membership',
    not exists (
      select 1 from public.household_memberships
      where person_id = '591cba95-a32d-4ca4-a7ac-d9b422a6db60'::uuid
    )
  union all
  select 'duplicate has exactly the expected Father membership',
    (select count(*) = 1
       from public.household_memberships
      where id = '58853d21-41b7-4f89-a98b-21a10c225840'::uuid
        and household_id = 'e5328f94-0233-465b-9975-c218cc739561'::uuid
        and person_id = '75b2a220-170a-485b-ab01-049a18b38966'::uuid
        and relationship_label = 'Father'
        and is_responsible_adult)
  union all
  select 'canonical has no student relationships',
    not exists (
      select 1 from public.student_relationships
      where person_id = '591cba95-a32d-4ca4-a7ac-d9b422a6db60'::uuid
    )
  union all
  select 'duplicate has exactly the two expected guardian relationships',
    (select count(*) = 2
       from public.student_relationships
      where id in (
        '587656ea-3cd3-46aa-8f6a-e96416973d92'::uuid,
        'a71bda65-4a9a-4d56-94a1-d1dbcc11d884'::uuid
      )
        and person_id = '75b2a220-170a-485b-ab01-049a18b38966'::uuid
        and is_legal_guardian
        and may_view_student_information)
  union all
  select 'Parent profile is active and linked only to duplicate',
    (select count(*) = 1
       from public.profiles
      where id = '6e9f7c76-0849-467b-b6cd-a67dc7d6dffb'::uuid
        and person_id = '75b2a220-170a-485b-ab01-049a18b38966'::uuid
        and primary_role = 'parent'
        and status = 'active')
  union all
  select 'canonical is not linked to another profile',
    not exists (
      select 1 from public.profiles
      where person_id = '591cba95-a32d-4ca4-a7ac-d9b422a6db60'::uuid
    )
)
select check_name, passed
from checks
order by check_name;

rollback;
