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
  select
    private.has_role(array[
      'platform_administrator',
      'youth_pastor',
      'staff_member'
    ]::public.account_role[])
    or (
      private.current_profile_is_active()
      and private.is_assigned_to_event(target_event_id)
    )
$$;

revoke all on function private.can_manage_event_attendance(uuid)
  from public, anon, authenticated;
grant execute on function private.can_manage_event_attendance(uuid)
  to authenticated;

create or replace function public.list_attendance_events()
returns table (
  event_id uuid,
  event_name text,
  event_status public.event_status,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  timezone text
)
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select
    events.id,
    events.name,
    events.status,
    events.starts_at,
    events.ends_at,
    events.timezone
  from public.events
  where events.status in ('draft', 'published', 'active', 'completed')
    and private.can_manage_event_attendance(events.id)
  order by events.starts_at desc
  limit 200
$$;

create or replace function public.list_attendance_sessions()
returns table (
  session_id uuid,
  event_id uuid,
  event_name text,
  session_date date,
  class_name text,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  finalized_at timestamp with time zone,
  present_count bigint,
  absent_count bigint,
  excused_count bigint,
  pending_count bigint
)
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select
    attendance_sessions.id,
    events.id,
    events.name,
    attendance_sessions.session_date,
    attendance_sessions.class_name,
    attendance_sessions.starts_at,
    attendance_sessions.ends_at,
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
      where attendance_records.status = 'pending'
    )
  from public.attendance_sessions
  join public.events on events.id = attendance_sessions.event_id
  left join public.attendance_records
    on attendance_records.session_id = attendance_sessions.id
  where private.can_manage_event_attendance(attendance_sessions.event_id)
  group by attendance_sessions.id, events.id, events.name
  order by attendance_sessions.session_date desc,
    attendance_sessions.class_name
$$;

create or replace function public.create_attendance_session(
  p_event_id uuid,
  p_session_date date,
  p_class_name text,
  p_starts_at timestamp with time zone,
  p_ends_at timestamp with time zone
)
returns uuid
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  session_id uuid;
begin
  if not private.can_manage_event_attendance(p_event_id) then
    raise exception 'Attendance session creation is denied.'
      using errcode = '42501';
  end if;
  if not exists (
      select 1 from public.events where id = p_event_id
    )
    or p_session_date is null
    or length(btrim(coalesce(p_class_name, ''))) not between 1 and 100
    or (p_starts_at is not null and p_ends_at is not null
      and p_ends_at <= p_starts_at) then
    raise exception 'Attendance session details are invalid.'
      using errcode = '22023';
  end if;

  insert into public.attendance_sessions (
    event_id, session_date, class_name, starts_at, ends_at,
    created_by_profile_id
  )
  values (
    p_event_id, p_session_date, btrim(p_class_name),
    p_starts_at, p_ends_at, (select auth.uid())
  )
  returning id into session_id;

  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  )
  values (
    (select auth.uid()), 'attendance.session_created',
    'attendance_session', session_id, 'success', 'web',
    jsonb_build_object(
      'eventId', p_event_id,
      'sessionDate', p_session_date,
      'className', btrim(p_class_name)
    )
  );
  return session_id;
end;
$$;

create or replace function public.list_attendance_roster(
  p_session_id uuid,
  p_search text default null
)
returns table (
  student_id uuid,
  display_name text,
  household_name text,
  grade text,
  student_status public.student_status,
  attendance_record_id uuid,
  attendance_status public.attendance_status,
  notes text,
  corrected_at timestamp with time zone
)
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
declare
  target_event_id uuid;
  normalized_search text;
begin
  select event_id into target_event_id
  from public.attendance_sessions
  where id = p_session_id;
  if target_event_id is null
    or not private.can_manage_event_attendance(target_event_id) then
    raise exception 'Attendance roster access is denied.'
      using errcode = '42501';
  end if;
  normalized_search := nullif(btrim(coalesce(p_search, '')), '');
  if normalized_search is not null and length(normalized_search) > 100 then
    raise exception 'Attendance search is invalid.' using errcode = '22023';
  end if;

  return query
  select
    students.id,
    coalesce(
      nullif(btrim(people.preferred_name), ''),
      btrim(people.first_name)
    ) || ' ' || left(btrim(people.last_name), 1) || '.',
    households.name,
    students.grade,
    students.status,
    attendance_records.id,
    coalesce(attendance_records.status, 'pending'::public.attendance_status),
    attendance_records.notes,
    attendance_records.corrected_at
  from public.students
  join public.people on people.id = students.person_id
  join public.households on households.id = students.primary_household_id
  left join public.attendance_records
    on attendance_records.student_id = students.id
    and attendance_records.session_id = p_session_id
  where students.status in ('registered', 'active')
    and (
      normalized_search is null
      or lower(people.first_name) like '%' || lower(normalized_search) || '%'
      or lower(coalesce(people.preferred_name, ''))
        like '%' || lower(normalized_search) || '%'
      or lower(people.last_name) like '%' || lower(normalized_search) || '%'
      or lower(households.name) like '%' || lower(normalized_search) || '%'
    )
  order by people.last_name, people.first_name
  limit 200;
end;
$$;

create or replace function public.save_attendance_record(
  p_session_id uuid,
  p_student_id uuid,
  p_status public.attendance_status,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  target_event_id uuid;
  record_id uuid;
  previous_status public.attendance_status;
begin
  select event_id into target_event_id
  from public.attendance_sessions
  where id = p_session_id and finalized_at is null;
  if target_event_id is null
    or not private.can_manage_event_attendance(target_event_id) then
    raise exception 'Attendance recording is denied.' using errcode = '42501';
  end if;
  if not exists (
      select 1 from public.students
      where id = p_student_id and status in ('registered', 'active')
    )
    or (p_notes is not null
      and length(btrim(p_notes)) not between 1 and 1000) then
    raise exception 'Attendance record details are invalid.'
      using errcode = '22023';
  end if;

  select status into previous_status
  from public.attendance_records
  where session_id = p_session_id and student_id = p_student_id;

  insert into public.attendance_records (
    session_id, student_id, status, notes, recorded_by_profile_id
  )
  values (
    p_session_id, p_student_id, p_status,
    nullif(btrim(coalesce(p_notes, '')), ''), (select auth.uid())
  )
  on conflict (session_id, student_id) do update set
    status = excluded.status,
    notes = excluded.notes,
    corrected_at = case
      when attendance_records.status is distinct from excluded.status
        or attendance_records.notes is distinct from excluded.notes
      then now()
      else attendance_records.corrected_at
    end,
    corrected_by_profile_id = case
      when attendance_records.status is distinct from excluded.status
        or attendance_records.notes is distinct from excluded.notes
      then (select auth.uid())
      else attendance_records.corrected_by_profile_id
    end
  returning id into record_id;

  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  )
  values (
    (select auth.uid()),
    case when previous_status is null
      then 'attendance.record_created'
      else 'attendance.record_corrected'
    end,
    'attendance_record', record_id, 'success', 'web',
    jsonb_build_object(
      'sessionId', p_session_id,
      'studentId', p_student_id,
      'previousStatus', previous_status,
      'status', p_status
    )
  );
  return record_id;
end;
$$;

create or replace function public.finalize_attendance_session(
  p_session_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  target_event_id uuid;
begin
  select event_id into target_event_id
  from public.attendance_sessions
  where id = p_session_id and finalized_at is null;
  if target_event_id is null
    or not private.can_manage_event_attendance(target_event_id) then
    raise exception 'Attendance finalization is denied.'
      using errcode = '42501';
  end if;

  update public.attendance_sessions
  set finalized_at = now(), finalized_by_profile_id = (select auth.uid())
  where id = p_session_id;

  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  )
  values (
    (select auth.uid()), 'attendance.session_finalized',
    'attendance_session', p_session_id, 'success', 'web',
    jsonb_build_object('eventId', target_event_id)
  );
end;
$$;

revoke all on function public.list_attendance_events()
  from public, anon, authenticated;
revoke all on function public.list_attendance_sessions()
  from public, anon, authenticated;
revoke all on function public.create_attendance_session(
  uuid, date, text, timestamp with time zone, timestamp with time zone
) from public, anon, authenticated;
revoke all on function public.list_attendance_roster(uuid, text)
  from public, anon, authenticated;
revoke all on function public.save_attendance_record(
  uuid, uuid, public.attendance_status, text
) from public, anon, authenticated;
revoke all on function public.finalize_attendance_session(uuid)
  from public, anon, authenticated;

grant execute on function public.list_attendance_events() to authenticated;
grant execute on function public.list_attendance_sessions() to authenticated;
grant execute on function public.create_attendance_session(
  uuid, date, text, timestamp with time zone, timestamp with time zone
) to authenticated;
grant execute on function public.list_attendance_roster(uuid, text)
  to authenticated;
grant execute on function public.save_attendance_record(
  uuid, uuid, public.attendance_status, text
) to authenticated;
grant execute on function public.finalize_attendance_session(uuid)
  to authenticated;

commit;
