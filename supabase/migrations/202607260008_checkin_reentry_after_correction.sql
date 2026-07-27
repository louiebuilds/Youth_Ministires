begin;

create or replace function public.check_in_student(
  p_event_id uuid, p_student_id uuid
)
returns uuid
language plpgsql security definer
set search_path = '' set row_security = off
as $$
declare record_id uuid; target_household_id uuid;
begin
  if not private.can_manage_event_checkin(p_event_id) then
    raise exception 'Student check-in is denied.' using errcode = '42501';
  end if;
  select primary_household_id into target_household_id
  from public.students
  where id = p_student_id and status in ('registered', 'active');
  if target_household_id is null
    or exists (
      select 1 from public.check_in_records
      where event_id = p_event_id and student_id = p_student_id
        and status in ('checked_in', 'checked_out')
    ) then
    raise exception 'Student cannot be checked in.' using errcode = '22023';
  end if;
  insert into public.check_in_records (
    event_id, student_id, household_id, status,
    checked_in_at, checked_in_by_profile_id
  ) values (
    p_event_id, p_student_id, target_household_id, 'checked_in',
    now(), (select auth.uid())
  )
  on conflict (event_id, student_id) do update set
    status = 'checked_in',
    checked_in_at = now(),
    checked_in_by_profile_id = (select auth.uid()),
    checked_out_at = null,
    checked_out_by_profile_id = null,
    pickup_person_id = null,
    exception_reason = null,
    override_by_profile_id = null
  returning id into record_id;
  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    (select auth.uid()), 'checkin.student_checked_in', 'check_in_record',
    record_id, 'success', 'web',
    jsonb_build_object('eventId', p_event_id, 'studentId', p_student_id)
  );
  return record_id;
end;
$$;

revoke all on function public.check_in_student(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.check_in_student(uuid, uuid)
  to authenticated;

commit;
