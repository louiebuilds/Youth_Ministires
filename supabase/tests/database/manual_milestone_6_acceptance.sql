-- Milestone 6 Member Management Product Owner acceptance check
-- Run after applying 202607240002_member_management_foundation.sql.
-- This query is read-only and returns no member, family, contact, or medical data.

with table_check as (
  select
    count(*) = 2 as both_tag_tables_exist,
    bool_and(pg_class.relrowsecurity) as both_tag_tables_enable_rls,
    bool_and(pg_class.relforcerowsecurity) as both_tag_tables_force_rls
  from pg_catalog.pg_class
  join pg_catalog.pg_namespace
    on pg_namespace.oid = pg_class.relnamespace
  where pg_namespace.nspname = 'public'
    and pg_class.relname in (
      'member_tag_assignments',
      'member_tags'
    )
    and pg_class.relkind = 'r'
),
routine_check as (
  select
    count(*) = 13 as all_member_management_functions_exist,
    bool_and(security_type = 'DEFINER')
      as all_member_management_functions_are_definer
  from information_schema.routines
  where routine_schema = 'public'
    and routine_name in (
      'add_family_adult',
      'create_child',
      'create_family',
      'create_member_tag',
      'get_child_workspace',
      'get_family_workspace',
      'list_accessible_families',
      'list_member_directory',
      'set_child_tags',
      'update_child_details',
      'update_child_relationship',
      'update_family_adult',
      'update_family_details'
    )
),
core_grant_check as (
  select
    not has_table_privilege('authenticated', 'public.people', 'insert')
      and not has_table_privilege('authenticated', 'public.people', 'update')
      and not has_table_privilege('authenticated', 'public.people', 'delete')
      as people_direct_mutations_denied,
    not has_table_privilege('authenticated', 'public.households', 'insert')
      and not has_table_privilege('authenticated', 'public.households', 'update')
      and not has_table_privilege('authenticated', 'public.households', 'delete')
      as household_direct_mutations_denied,
    not has_table_privilege('authenticated', 'public.students', 'insert')
      and not has_table_privilege('authenticated', 'public.students', 'update')
      and not has_table_privilege('authenticated', 'public.students', 'delete')
      as student_direct_mutations_denied
),
relationship_grant_check as (
  select
    not has_table_privilege(
      'authenticated',
      'public.household_memberships',
      'insert'
    )
      and not has_table_privilege(
        'authenticated',
        'public.household_memberships',
        'update'
      )
      and not has_table_privilege(
        'authenticated',
        'public.household_memberships',
        'delete'
      )
      as household_membership_direct_mutations_denied,
    not has_table_privilege(
      'authenticated',
      'public.student_relationships',
      'insert'
    )
      and not has_table_privilege(
        'authenticated',
        'public.student_relationships',
        'update'
      )
      and not has_table_privilege(
        'authenticated',
        'public.student_relationships',
        'delete'
      )
      as student_relationship_direct_mutations_denied
),
tag_grant_check as (
  select
    not has_table_privilege(
      'authenticated',
      'public.member_tags',
      'insert'
    )
      and not has_table_privilege(
        'authenticated',
        'public.member_tags',
        'update'
      )
      and not has_table_privilege(
        'authenticated',
        'public.member_tags',
        'delete'
      )
      and not has_table_privilege(
        'authenticated',
        'public.member_tag_assignments',
        'insert'
      )
      and not has_table_privilege(
        'authenticated',
        'public.member_tag_assignments',
        'update'
      )
      and not has_table_privilege(
        'authenticated',
        'public.member_tag_assignments',
        'delete'
      )
      as tag_direct_mutations_denied
)
select
  table_check.both_tag_tables_exist,
  table_check.both_tag_tables_enable_rls,
  table_check.both_tag_tables_force_rls,
  routine_check.all_member_management_functions_exist,
  routine_check.all_member_management_functions_are_definer,
  core_grant_check.people_direct_mutations_denied,
  core_grant_check.household_direct_mutations_denied,
  core_grant_check.student_direct_mutations_denied,
  relationship_grant_check.household_membership_direct_mutations_denied,
  relationship_grant_check.student_relationship_direct_mutations_denied,
  tag_grant_check.tag_direct_mutations_denied
from table_check
cross join routine_check
cross join core_grant_check
cross join relationship_grant_check
cross join tag_grant_check;
