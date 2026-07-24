-- Milestone 3 Product Owner acceptance check
-- Run after applying 202607230001_core_database_foundation.sql.
-- This query is read-only and returns no personal profile details.

with expected_tables(table_name) as (
  values
    ('audit_events'),
    ('event_volunteer_assignments'),
    ('events'),
    ('household_memberships'),
    ('households'),
    ('people'),
    ('profiles'),
    ('student_relationships'),
    ('students')
),
table_security as (
  select
    expected_tables.table_name,
    coalesce(pg_class.relrowsecurity, false) as rls_enabled,
    coalesce(pg_class.relforcerowsecurity, false) as rls_forced
  from expected_tables
  left join pg_catalog.pg_namespace
    on pg_namespace.nspname = 'public'
  left join pg_catalog.pg_class
    on pg_class.relnamespace = pg_namespace.oid
    and pg_class.relname = expected_tables.table_name
    and pg_class.relkind = 'r'
),
auth_profile_counts as (
  select
    (select count(*) from auth.users) as auth_user_count,
    (select count(*) from public.profiles) as profile_count,
    (
      select count(*)
      from public.profiles
      where primary_role = 'parent'
    ) as parent_profile_count
)
select
  count(*) filter (
    where rls_enabled and rls_forced
  ) = count(*) as all_nine_tables_have_forced_rls,
  count(*) = 9 as all_nine_tables_exist,
  (
    select count(*)
    from pg_catalog.pg_policies
    where schemaname = 'public'
  ) = 1 as only_one_baseline_policy_exists,
  (
    select count(*)
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_read_own'
      and cmd = 'SELECT'
  ) = 1 as own_profile_policy_exists,
  auth_profile_counts.auth_user_count =
    auth_profile_counts.profile_count as every_auth_user_has_a_profile,
  auth_profile_counts.parent_profile_count =
    auth_profile_counts.profile_count as all_initial_profiles_are_least_privilege
from table_security
cross join auth_profile_counts
group by
  auth_profile_counts.auth_user_count,
  auth_profile_counts.profile_count,
  auth_profile_counts.parent_profile_count;
