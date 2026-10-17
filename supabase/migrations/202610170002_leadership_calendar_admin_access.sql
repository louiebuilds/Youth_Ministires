begin;

-- Allow both approved leadership roles to manage
-- standalone leadership calendar entries.

create or replace function private.can_manage_leadership_calendar()
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select private.current_profile_is_active()
    and private.has_role(array[
      'platform_administrator',
      'youth_pastor'
    ]::public.account_role[]);
$$;

commit;