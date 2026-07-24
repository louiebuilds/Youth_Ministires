-- Milestone 3 user-management reconciliation Product Owner acceptance check
-- Run after applying 202607240001_milestone3_user_management.sql.
-- This query is read-only and returns no account or personal profile details.

with routine_check as (
  select
    count(*) = 3 as all_user_management_functions_exist,
    bool_and(security_type = 'DEFINER') as all_functions_are_definer_functions
  from information_schema.routines
  where routine_schema = 'public'
    and routine_name in (
      'admin_update_account',
      'list_managed_accounts',
      'update_own_profile'
    )
),
execute_check as (
  select
    has_function_privilege(
      'authenticated',
      'public.update_own_profile(text)',
      'execute'
    ) as authenticated_can_update_own_profile,
    has_function_privilege(
      'authenticated',
      'public.list_managed_accounts(text)',
      'execute'
    ) as authenticated_can_request_managed_accounts,
    has_function_privilege(
      'authenticated',
      'public.admin_update_account(uuid,text,public.account_role,public.account_status)',
      'execute'
    ) as authenticated_can_request_account_update
),
profile_grant_check as (
  select
    not has_table_privilege(
      'authenticated',
      'public.profiles',
      'insert'
    ) as authenticated_cannot_insert_profiles_directly,
    not has_table_privilege(
      'authenticated',
      'public.profiles',
      'update'
    ) as authenticated_cannot_update_profiles_directly,
    not has_table_privilege(
      'authenticated',
      'public.profiles',
      'delete'
    ) as authenticated_cannot_delete_profiles_directly
)
select
  routine_check.all_user_management_functions_exist,
  routine_check.all_functions_are_definer_functions,
  execute_check.authenticated_can_update_own_profile,
  execute_check.authenticated_can_request_managed_accounts,
  execute_check.authenticated_can_request_account_update,
  profile_grant_check.authenticated_cannot_insert_profiles_directly,
  profile_grant_check.authenticated_cannot_update_profiles_directly,
  profile_grant_check.authenticated_cannot_delete_profiles_directly
from routine_check
cross join execute_check
cross join profile_grant_check;
