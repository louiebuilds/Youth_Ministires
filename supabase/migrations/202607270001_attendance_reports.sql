begin;

create or replace function public.list_attendance_report_sessions(
  p_from_date date, p_to_date date
)
returns table (
  session_id uuid, session_date date, event_name text, class_name text,
  finalized_at timestamp with time zone, present_count bigint,
  absent_count bigint, excused_count bigint, pending_count bigint
)
language plpgsql stable security definer
set search_path = '' set row_security = off
as $$
begin
  if not private.has_role(array[
    'platform_administrator', 'youth_pastor', 'staff_member'
  ]::public.account_role[]) then
    raise exception 'Attendance report access is denied.' using errcode = '42501';
  end if;
  if p_from_date is null or p_to_date is null or p_to_date < p_from_date
    or p_to_date - p_from_date > 366 then
    raise exception 'Attendance report range is invalid.' using errcode = '22023';
  end if;
  return query
  select attendance_sessions.id, attendance_sessions.session_date,
    events.name, attendance_sessions.class_name,
    attendance_sessions.finalized_at,
    count(attendance_records.id) filter (
      where attendance_records.status = 'present'
    ),
    count(attendance_records.id) filter (
      where attendance_records.status = 'absent'
    ),
    count(attendance_records.id) filter (
      where attendance_records.status = 'excused'
    ),
    count(attendance_records.id) filter (
      where attendance_records.id is null
        or attendance_records.status = 'pending'
    )
  from public.attendance_sessions
  join public.events on events.id = attendance_sessions.event_id
  left join public.attendance_records
    on attendance_records.session_id = attendance_sessions.id
  where attendance_sessions.session_date between p_from_date and p_to_date
  group by attendance_sessions.id, events.name
  order by attendance_sessions.session_date desc, events.name,
    attendance_sessions.class_name;
end;
$$;

create or replace function public.list_checkin_report_events(
  p_from_date date, p_to_date date
)
returns table (
  event_id uuid, event_name text, starts_at timestamp with time zone,
  checked_in_count bigint, checked_out_count bigint,
  exception_count bigint, visitor_count bigint,
  visitor_checked_out_count bigint
)
language plpgsql stable security definer
set search_path = '' set row_security = off
as $$
begin
  if not private.has_role(array[
    'platform_administrator', 'youth_pastor', 'staff_member'
  ]::public.account_role[]) then
    raise exception 'Check-in report access is denied.' using errcode = '42501';
  end if;
  if p_from_date is null or p_to_date is null or p_to_date < p_from_date
    or p_to_date - p_from_date > 366 then
    raise exception 'Check-in report range is invalid.' using errcode = '22023';
  end if;
  return query
  select events.id, events.name, events.starts_at,
    (select count(*) from public.check_in_records
      where check_in_records.event_id = events.id
        and check_in_records.status = 'checked_in'),
    (select count(*) from public.check_in_records
      where check_in_records.event_id = events.id
        and check_in_records.status = 'checked_out'),
    (select count(*) from public.check_in_records
      where check_in_records.event_id = events.id
        and check_in_records.status = 'exception'),
    (select count(*) from public.visitor_check_ins
      where visitor_check_ins.event_id = events.id),
    (select count(*) from public.visitor_check_ins
      where visitor_check_ins.event_id = events.id
        and visitor_check_ins.status = 'checked_out')
  from public.events
  where (events.starts_at at time zone events.timezone)::date
    between p_from_date and p_to_date
    and (
      exists (select 1 from public.check_in_records
        where check_in_records.event_id = events.id)
      or exists (select 1 from public.visitor_check_ins
        where visitor_check_ins.event_id = events.id)
    )
  order by events.starts_at desc;
end;
$$;

revoke all on function public.list_attendance_report_sessions(date, date)
  from public, anon, authenticated;
revoke all on function public.list_checkin_report_events(date, date)
  from public, anon, authenticated;
grant execute on function public.list_attendance_report_sessions(date, date)
  to authenticated;
grant execute on function public.list_checkin_report_events(date, date)
  to authenticated;

commit;
