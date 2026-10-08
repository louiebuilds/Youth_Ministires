-- Read-only reconciliation for 202610040004_live_dashboard_birthdays.sql.
-- Run in the linked development project's Supabase SQL Editor.
-- This query changes no schema, data, grants, or migration history.

with expected(signature, function_name) as (
  values
    (
      'public.list_upcoming_dashboard_birthdays(integer)',
      'list_upcoming_dashboard_birthdays'
    ),
    (
      'public.get_dashboard_prayer_care_summary()',
      'get_dashboard_prayer_care_summary'
    )
),
installed as (
  select
    expected.signature,
    expected.function_name,
    to_regprocedure(expected.signature) as procedure_id
  from expected
)
select
  installed.signature,
  installed.procedure_id is not null as installed,
  coalesce(routines.prosecdef, false) as security_definer,
  coalesce(routines.proconfig @> array['search_path='], false)
    as empty_search_path,
  coalesce(routines.proconfig @> array['row_security=off'], false)
    as row_security_off,
  case
    when installed.procedure_id is null then false
    else has_function_privilege(
      'authenticated',
      installed.procedure_id,
      'EXECUTE'
    )
  end as authenticated_can_execute,
  case
    when installed.procedure_id is null then false
    else has_function_privilege(
      'anon',
      installed.procedure_id,
      'EXECUTE'
    )
  end as anon_can_execute,
  case
    when installed.procedure_id is null then null
    else pg_get_functiondef(installed.procedure_id)
  end as installed_definition
from installed
left join pg_proc as routines
  on routines.oid = installed.procedure_id
order by installed.function_name;
