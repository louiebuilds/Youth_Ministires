begin;

create or replace function public.correct_student_check_in(
  p_event_id uuid, p_student_id uuid, p_reason text
)
returns void
language plpgsql security definer
set search_path = '' set row_security = off
as $$
declare record_id uuid; normalized_reason text;
begin
  if not private.has_role(array[
    'platform_administrator', 'youth_pastor', 'staff_member'
  ]::public.account_role[]) then
    raise exception 'Check-in correction is denied.' using errcode = '42501';
  end if;
  normalized_reason := nullif(btrim(coalesce(p_reason, '')), '');
  if normalized_reason is null or length(normalized_reason) > 1000 then
    raise exception 'A correction reason is required.' using errcode = '22023';
  end if;
  select id into record_id from public.check_in_records
  where event_id = p_event_id and student_id = p_student_id
    and status = 'checked_in'
  for update;
  if record_id is null then
    raise exception 'Active check-in was not found.' using errcode = '22023';
  end if;
  update public.check_in_records set
    status = 'exception',
    exception_reason = normalized_reason,
    override_by_profile_id = (select auth.uid())
  where id = record_id;
  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    (select auth.uid()), 'checkin.student_corrected', 'check_in_record',
    record_id, 'success', 'web',
    jsonb_build_object(
      'eventId', p_event_id, 'studentId', p_student_id,
      'reason', normalized_reason
    )
  );
end;
$$;

revoke all on function public.correct_student_check_in(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.correct_student_check_in(uuid, uuid, text)
  to authenticated;

commit;
