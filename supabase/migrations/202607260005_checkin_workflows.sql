begin;

create or replace function private.can_manage_event_checkin(target_event_id uuid)
returns boolean
language sql stable security definer
set search_path = '' set row_security = off
as $$
  select private.has_role(array[
    'platform_administrator', 'youth_pastor', 'staff_member'
  ]::public.account_role[])
  or (
    private.current_profile_is_active()
    and private.is_assigned_to_event(target_event_id)
  )
$$;

revoke all on function private.can_manage_event_checkin(uuid)
  from public, anon, authenticated;
grant execute on function private.can_manage_event_checkin(uuid)
  to authenticated;

create or replace function public.list_checkin_events()
returns table (
  event_id uuid, event_name text, starts_at timestamp with time zone,
  ends_at timestamp with time zone, timezone text
)
language sql stable security definer
set search_path = '' set row_security = off
as $$
  select events.id, events.name, events.starts_at, events.ends_at,
    events.timezone
  from public.events
  where events.status in ('published', 'active')
    and private.can_manage_event_checkin(events.id)
  order by events.starts_at desc
  limit 100
$$;

create or replace function public.search_checkin_households(
  p_event_id uuid, p_search text
)
returns table (
  household_id uuid, household_name text, student_count bigint
)
language plpgsql stable security definer
set search_path = '' set row_security = off
as $$
declare normalized_search text;
begin
  if not private.can_manage_event_checkin(p_event_id) then
    raise exception 'Check-in search is denied.' using errcode = '42501';
  end if;
  normalized_search := nullif(btrim(coalesce(p_search, '')), '');
  if normalized_search is null or length(normalized_search) > 100 then
    raise exception 'Check-in search is invalid.' using errcode = '22023';
  end if;
  return query
  select households.id, households.name, count(distinct students.id)
  from public.households
  left join public.students on students.primary_household_id = households.id
    and students.status in ('registered', 'active')
  left join public.household_memberships
    on household_memberships.household_id = households.id
  left join public.people as adults
    on adults.id = household_memberships.person_id
  left join public.people as student_people
    on student_people.id = students.person_id
  where households.status = 'active'
    and (
      lower(households.name) like '%' || lower(normalized_search) || '%'
      or lower(coalesce(adults.first_name, ''))
        like '%' || lower(normalized_search) || '%'
      or lower(coalesce(adults.last_name, ''))
        like '%' || lower(normalized_search) || '%'
      or lower(coalesce(student_people.first_name, ''))
        like '%' || lower(normalized_search) || '%'
      or lower(coalesce(student_people.last_name, ''))
        like '%' || lower(normalized_search) || '%'
    )
  group by households.id, households.name
  order by households.name
  limit 50;
end;
$$;

create or replace function public.get_checkin_household(
  p_event_id uuid, p_household_id uuid
)
returns jsonb
language plpgsql stable security definer
set search_path = '' set row_security = off
as $$
begin
  if not private.can_manage_event_checkin(p_event_id)
    or not exists (
      select 1 from public.households
      where id = p_household_id and status = 'active'
    ) then
    raise exception 'Check-in household access is denied.'
      using errcode = '42501';
  end if;
  return (
    select jsonb_build_object(
      'householdId', households.id,
      'householdName', households.name,
      'students', coalesce((
        select jsonb_agg(jsonb_build_object(
          'studentId', students.id,
          'displayName', coalesce(
            nullif(btrim(people.preferred_name), ''), btrim(people.first_name)
          ) || ' ' || left(btrim(people.last_name), 1) || '.',
          'grade', students.grade,
          'medicalSummary', students.medical_summary,
          'allergySummary', students.allergy_summary,
          'dietarySummary', students.dietary_summary,
          'checkInStatus', check_in_records.status
        ) order by people.first_name)
        from public.students
        join public.people on people.id = students.person_id
        left join public.check_in_records
          on check_in_records.student_id = students.id
          and check_in_records.event_id = p_event_id
        where students.primary_household_id = p_household_id
          and students.status in ('registered', 'active')
      ), '[]'::jsonb),
      'pickups', coalesce((
        select jsonb_agg(jsonb_build_object(
          'personId', people.id,
          'displayName', coalesce(
            nullif(btrim(people.preferred_name), ''), btrim(people.first_name)
          ) || ' ' || btrim(people.last_name),
          'relationshipType', student_relationships.relationship_type,
          'studentId', student_relationships.student_id
        ) order by people.last_name)
        from public.student_relationships
        join public.people on people.id = student_relationships.person_id
        join public.students on students.id = student_relationships.student_id
        where students.primary_household_id = p_household_id
          and student_relationships.is_authorized_pickup
      ), '[]'::jsonb)
    )
    from public.households where households.id = p_household_id
  );
end;
$$;

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
    status = 'checked_in', checked_in_at = now(),
    checked_in_by_profile_id = (select auth.uid()),
    checked_out_at = null, checked_out_by_profile_id = null,
    pickup_person_id = null, exception_reason = null,
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

create or replace function public.check_out_student(
  p_event_id uuid, p_student_id uuid, p_pickup_person_id uuid,
  p_override_reason text
)
returns void
language plpgsql security definer
set search_path = '' set row_security = off
as $$
declare
  record_id uuid; pickup_authorized boolean; manager_access boolean;
  normalized_reason text;
begin
  if not private.can_manage_event_checkin(p_event_id) then
    raise exception 'Student check-out is denied.' using errcode = '42501';
  end if;
  select id into record_id from public.check_in_records
  where event_id = p_event_id and student_id = p_student_id
    and status = 'checked_in';
  pickup_authorized := exists (
    select 1 from public.student_relationships
    where student_id = p_student_id and person_id = p_pickup_person_id
      and is_authorized_pickup
  );
  manager_access := private.has_role(array[
    'platform_administrator', 'youth_pastor', 'staff_member'
  ]::public.account_role[]);
  normalized_reason := nullif(btrim(coalesce(p_override_reason, '')), '');
  if record_id is null or p_pickup_person_id is null
    or (not pickup_authorized
      and (not manager_access or normalized_reason is null))
    or (normalized_reason is not null and length(normalized_reason) > 1000) then
    raise exception 'Pickup is not authorized.' using errcode = '42501';
  end if;
  update public.check_in_records set
    status = case when pickup_authorized then 'checked_out'
      else 'exception'::public.check_in_status end,
    checked_out_at = now(), checked_out_by_profile_id = (select auth.uid()),
    pickup_person_id = p_pickup_person_id,
    exception_reason = case when pickup_authorized then null
      else normalized_reason end,
    override_by_profile_id = case when pickup_authorized then null
      else (select auth.uid()) end
  where id = record_id;
  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    (select auth.uid()),
    case when pickup_authorized then 'checkin.student_checked_out'
      else 'checkin.pickup_override' end,
    'check_in_record', record_id, 'success', 'web',
    jsonb_build_object(
      'eventId', p_event_id, 'studentId', p_student_id,
      'pickupPersonId', p_pickup_person_id,
      'override', not pickup_authorized
    )
  );
end;
$$;

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

create or replace function public.list_emergency_roster(p_event_id uuid)
returns table (
  check_in_id uuid, student_id uuid, display_name text,
  household_name text, checked_in_at timestamp with time zone,
  medical_alert boolean, emergency_contact text
)
language plpgsql stable security definer
set search_path = '' set row_security = off
as $$
begin
  if not private.can_manage_event_checkin(p_event_id) then
    raise exception 'Emergency roster access is denied.' using errcode = '42501';
  end if;
  return query
  select check_in_records.id, students.id,
    coalesce(nullif(btrim(people.preferred_name), ''), btrim(people.first_name))
      || ' ' || left(btrim(people.last_name), 1) || '.',
    households.name, check_in_records.checked_in_at,
    students.medical_summary is not null
      or students.allergy_summary is not null
      or students.dietary_summary is not null,
    (
      select coalesce(contact.email, contact.phone)
      from public.student_relationships
      join public.people as contact
        on contact.id = student_relationships.person_id
      where student_relationships.student_id = students.id
        and student_relationships.is_emergency_contact
      order by student_relationships.is_legal_guardian desc
      limit 1
    )
  from public.check_in_records
  join public.students on students.id = check_in_records.student_id
  join public.people on people.id = students.person_id
  join public.households on households.id = check_in_records.household_id
  where check_in_records.event_id = p_event_id
    and check_in_records.status = 'checked_in'
  order by households.name, people.first_name;
end;
$$;

create or replace function public.check_in_visitor(
  p_event_id uuid, p_first_name text, p_last_name text, p_grade text,
  p_guardian_name text, p_guardian_contact text
)
returns uuid
language plpgsql security definer
set search_path = '' set row_security = off
as $$
declare visitor_id uuid;
begin
  if not private.can_manage_event_checkin(p_event_id) then
    raise exception 'Visitor check-in is denied.' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_first_name, ''))) not between 1 and 100
    or length(btrim(coalesce(p_last_name, ''))) not between 1 and 100
    or length(btrim(coalesce(p_guardian_name, ''))) not between 1 and 200
    or length(btrim(coalesce(p_guardian_contact, ''))) not between 3 and 320
    then raise exception 'Visitor details are invalid.' using errcode = '22023';
  end if;
  insert into public.visitor_check_ins (
    event_id, first_name, last_name, grade, guardian_name, guardian_contact,
    checked_in_by_profile_id
  ) values (
    p_event_id, btrim(p_first_name), btrim(p_last_name),
    nullif(btrim(coalesce(p_grade, '')), ''), btrim(p_guardian_name),
    btrim(p_guardian_contact), (select auth.uid())
  ) returning id into visitor_id;
  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    (select auth.uid()), 'checkin.visitor_checked_in', 'visitor_check_in',
    visitor_id, 'success', 'web', jsonb_build_object('eventId', p_event_id)
  );
  return visitor_id;
end;
$$;

create or replace function public.check_out_visitor(p_visitor_id uuid)
returns void
language plpgsql security definer
set search_path = '' set row_security = off
as $$
declare target_event_id uuid;
begin
  select event_id into target_event_id from public.visitor_check_ins
  where id = p_visitor_id and status = 'checked_in';
  if target_event_id is null
    or not private.can_manage_event_checkin(target_event_id) then
    raise exception 'Visitor check-out is denied.' using errcode = '42501';
  end if;
  update public.visitor_check_ins set status = 'checked_out',
    checked_out_at = now(), checked_out_by_profile_id = (select auth.uid())
  where id = p_visitor_id;
  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    (select auth.uid()), 'checkin.visitor_checked_out', 'visitor_check_in',
    p_visitor_id, 'success', 'web', jsonb_build_object('eventId', target_event_id)
  );
end;
$$;

create or replace function public.list_checked_in_visitors(p_event_id uuid)
returns table (
  visitor_id uuid, display_name text, grade text, guardian_name text,
  guardian_contact text, checked_in_at timestamp with time zone
)
language plpgsql stable security definer
set search_path = '' set row_security = off
as $$
begin
  if not private.can_manage_event_checkin(p_event_id) then
    raise exception 'Visitor roster access is denied.' using errcode = '42501';
  end if;
  return query
  select visitor_check_ins.id,
    btrim(visitor_check_ins.first_name) || ' ' ||
      left(btrim(visitor_check_ins.last_name), 1) || '.',
    visitor_check_ins.grade, visitor_check_ins.guardian_name,
    visitor_check_ins.guardian_contact, visitor_check_ins.checked_in_at
  from public.visitor_check_ins
  where visitor_check_ins.event_id = p_event_id
    and visitor_check_ins.status = 'checked_in'
  order by visitor_check_ins.checked_in_at;
end;
$$;

create or replace function public.issue_family_checkin_token(p_household_id uuid)
returns text
language plpgsql security definer
set search_path = '' set row_security = off
as $$
declare raw_token text; hashed_token text;
begin
  if not private.current_profile_is_active()
    or not private.can_view_household(p_household_id) then
    raise exception 'Family check-in token access is denied.'
      using errcode = '42501';
  end if;
  raw_token := extensions.gen_random_uuid()::text
    || extensions.gen_random_uuid()::text;
  hashed_token := encode(
    extensions.digest(convert_to(raw_token, 'UTF8'), 'sha256'), 'hex'
  );
  update public.family_check_in_tokens set revoked_at = now()
  where household_id = p_household_id and revoked_at is null
    and used_at is null and expires_at > now();
  insert into public.family_check_in_tokens (
    household_id, token_hash, expires_at, created_by_profile_id
  ) values (
    p_household_id, hashed_token, now() + interval '15 minutes',
    (select auth.uid())
  );
  return raw_token;
end;
$$;

create or replace function public.resolve_family_checkin_token(
  p_event_id uuid, p_token text
)
returns uuid
language plpgsql security definer
set search_path = '' set row_security = off
as $$
declare target_household_id uuid; hashed_token text;
begin
  if not private.can_manage_event_checkin(p_event_id)
    or length(coalesce(p_token, '')) < 70 then
    raise exception 'Family QR token is invalid.' using errcode = '42501';
  end if;
  hashed_token := encode(
    extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex'
  );
  select household_id into target_household_id
  from public.family_check_in_tokens
  where token_hash = hashed_token and expires_at > now()
    and revoked_at is null and used_at is null
  for update;
  if target_household_id is null then
    raise exception 'Family QR token is invalid or expired.'
      using errcode = '42501';
  end if;
  update public.family_check_in_tokens set used_at = now()
  where token_hash = hashed_token;
  return target_household_id;
end;
$$;

revoke all on function public.list_checkin_events() from public, anon, authenticated;
revoke all on function public.search_checkin_households(uuid, text) from public, anon, authenticated;
revoke all on function public.get_checkin_household(uuid, uuid) from public, anon, authenticated;
revoke all on function public.check_in_student(uuid, uuid) from public, anon, authenticated;
revoke all on function public.check_out_student(uuid, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.correct_student_check_in(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.list_emergency_roster(uuid) from public, anon, authenticated;
revoke all on function public.check_in_visitor(uuid, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.check_out_visitor(uuid) from public, anon, authenticated;
revoke all on function public.list_checked_in_visitors(uuid) from public, anon, authenticated;
revoke all on function public.issue_family_checkin_token(uuid) from public, anon, authenticated;
revoke all on function public.resolve_family_checkin_token(uuid, text) from public, anon, authenticated;

grant execute on function public.list_checkin_events() to authenticated;
grant execute on function public.search_checkin_households(uuid, text) to authenticated;
grant execute on function public.get_checkin_household(uuid, uuid) to authenticated;
grant execute on function public.check_in_student(uuid, uuid) to authenticated;
grant execute on function public.check_out_student(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.correct_student_check_in(uuid, uuid, text) to authenticated;
grant execute on function public.list_emergency_roster(uuid) to authenticated;
grant execute on function public.check_in_visitor(uuid, text, text, text, text, text) to authenticated;
grant execute on function public.check_out_visitor(uuid) to authenticated;
grant execute on function public.list_checked_in_visitors(uuid) to authenticated;
grant execute on function public.issue_family_checkin_token(uuid) to authenticated;
grant execute on function public.resolve_family_checkin_token(uuid, text) to authenticated;

commit;
