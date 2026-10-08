begin;

create or replace function private.can_manage_event_attendance(
  target_event_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select private.has_role(array[
    'platform_administrator',
    'youth_pastor',
    'staff_member'
  ]::public.account_role[])
$$;

revoke all on function private.can_manage_event_attendance(uuid)
  from public, anon, authenticated;
grant execute on function private.can_manage_event_attendance(uuid)
  to authenticated;

create or replace function private.can_manage_event_checkin(
  target_event_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select private.has_role(array[
    'platform_administrator',
    'youth_pastor',
    'staff_member'
  ]::public.account_role[])
$$;

revoke all on function private.can_manage_event_checkin(uuid)
  from public, anon, authenticated;
grant execute on function private.can_manage_event_checkin(uuid)
  to authenticated;

commit;
