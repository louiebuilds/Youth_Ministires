-- Milestone 4 Product Owner acceptance check
-- Run after applying 202607230002_security_authorization.sql.
-- This query is read-only and returns no personal profile details.

with expected_policies(policy_name) as (
  values
    ('audit_events_read_oversight'),
    ('event_assignments_manage_ministry'),
    ('event_assignments_read_authorized'),
    ('events_manage_ministry'),
    ('events_read_authorized'),
    ('household_memberships_manage_ministry'),
    ('household_memberships_read_authorized'),
    ('households_manage_ministry'),
    ('households_read_authorized'),
    ('people_manage_ministry'),
    ('people_read_authorized'),
    ('profiles_admin_delete'),
    ('profiles_admin_insert'),
    ('profiles_admin_update'),
    ('profiles_read_active_authorized'),
    ('student_relationships_manage_ministry'),
    ('student_relationships_read_authorized'),
    ('students_manage_ministry'),
    ('students_read_authorized')
),
expected_helpers(routine_name) as (
  values
    ('can_view_household'),
    ('can_view_person'),
    ('can_view_student'),
    ('current_profile_is_active'),
    ('current_profile_role'),
    ('has_role'),
    ('is_assigned_to_event')
),
policy_check as (
  select
    count(*) = 19 as exact_policy_count,
    count(*) filter (
      where policyname in (select policy_name from expected_policies)
    ) = 19 as all_expected_policies_exist,
    count(*) filter (
      where policyname = 'profiles_read_own'
    ) = 0 as baseline_profile_policy_replaced
  from pg_catalog.pg_policies
  where schemaname = 'public'
),
helper_check as (
  select
    count(*) = 7 as all_private_helpers_exist,
    bool_and(security_type = 'DEFINER') as all_helpers_are_definer_functions
  from information_schema.routines
  where routine_schema = 'private'
    and routine_name in (select routine_name from expected_helpers)
),
rls_check as (
  select
    count(*) = 9 as all_core_tables_found,
    bool_and(pg_class.relrowsecurity) as all_core_tables_enable_rls,
    bool_and(pg_class.relforcerowsecurity) as all_core_tables_force_rls
  from pg_catalog.pg_class
  join pg_catalog.pg_namespace
    on pg_namespace.oid = pg_class.relnamespace
  where pg_namespace.nspname = 'public'
    and pg_class.relname in (
      'audit_events',
      'event_volunteer_assignments',
      'events',
      'household_memberships',
      'households',
      'people',
      'profiles',
      'student_relationships',
      'students'
    )
    and pg_class.relkind = 'r'
),
audit_grant_check as (
  select
    has_table_privilege(
      'authenticated',
      'public.audit_events',
      'select'
    ) as authenticated_can_select_audit_through_rls,
    not has_table_privilege(
      'authenticated',
      'public.audit_events',
      'insert'
    ) as authenticated_cannot_insert_audit_directly,
    not has_table_privilege(
      'authenticated',
      'public.audit_events',
      'update'
    ) as authenticated_cannot_update_audit,
    not has_table_privilege(
      'authenticated',
      'public.audit_events',
      'delete'
    ) as authenticated_cannot_delete_audit
)
select
  policy_check.exact_policy_count,
  policy_check.all_expected_policies_exist,
  policy_check.baseline_profile_policy_replaced,
  helper_check.all_private_helpers_exist,
  helper_check.all_helpers_are_definer_functions,
  rls_check.all_core_tables_found,
  rls_check.all_core_tables_enable_rls,
  rls_check.all_core_tables_force_rls,
  audit_grant_check.authenticated_can_select_audit_through_rls,
  audit_grant_check.authenticated_cannot_insert_audit_directly,
  audit_grant_check.authenticated_cannot_update_audit,
  audit_grant_check.authenticated_cannot_delete_audit
from policy_check
cross join helper_check
cross join rls_check
cross join audit_grant_check;
