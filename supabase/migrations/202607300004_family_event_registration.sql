begin;

create or replace function public.register_my_student_for_event(
  p_event_id uuid, p_student_id uuid
)
returns public.event_registration_status
language plpgsql security definer
set search_path = '' set row_security = off
as $$
declare
  selected_event public.events%rowtype;
  selected_household_id uuid;
  existing_registration public.event_registrations%rowtype;
  registered_count bigint; waitlisted_count bigint;
  new_status public.event_registration_status;
  new_waitlist_position bigint; registration_id uuid;
begin
  if not private.current_profile_is_active() then
    raise exception 'Registration access is denied.' using errcode = '42501';
  end if;
  select * into selected_event from public.events
  where id = p_event_id and status in ('published', 'active') for update;
  if not found then
    raise exception 'This event is unavailable for registration.'
      using errcode = '22023';
  end if;
  if selected_event.registration_opens_at is not null
    and now() < selected_event.registration_opens_at then
    raise exception 'Registration has not opened.' using errcode = '22023';
  end if;
  if selected_event.registration_closes_at is not null
    and now() > selected_event.registration_closes_at then
    raise exception 'Registration has closed.' using errcode = '22023';
  end if;
  select students.primary_household_id into selected_household_id
  from public.students
  join public.households
    on households.id = students.primary_household_id
   and households.status = 'active'
  join public.student_relationships
    on student_relationships.student_id = students.id
   and (
     student_relationships.may_view_student_information
     or student_relationships.may_sign_permission_forms
     or student_relationships.is_legal_guardian
   )
  join public.profiles on profiles.person_id = student_relationships.person_id
  where students.id = p_student_id and students.status = 'active'
    and profiles.id = (select auth.uid());
  if selected_household_id is null then
    raise exception 'Student registration access is denied.'
      using errcode = '42501';
  end if;
  select * into existing_registration from public.event_registrations
  where event_id = p_event_id and student_id = p_student_id for update;
  if found and existing_registration.status <> 'cancelled' then
    raise exception 'This student is already registered or waitlisted.'
      using errcode = '22023';
  end if;
  select count(*) into registered_count from public.event_registrations
  where event_id = p_event_id
    and status in ('registered', 'confirmed', 'completed');
  if selected_event.capacity is null
    or registered_count < selected_event.capacity then
    new_status := 'registered'; new_waitlist_position := null;
  else
    select count(*), coalesce(max(waitlist_position), 0) + 1
    into waitlisted_count, new_waitlist_position
    from public.event_registrations
    where event_id = p_event_id and status = 'waitlisted';
    if selected_event.waitlist_capacity is null
      or waitlisted_count >= selected_event.waitlist_capacity then
      raise exception 'This event and its waitlist are full.'
        using errcode = '22023';
    end if;
    new_status := 'waitlisted';
  end if;
  if existing_registration.id is not null then
    update public.event_registrations set
      household_id = selected_household_id, status = new_status,
      waitlist_position = new_waitlist_position, notes = null,
      created_by_profile_id = (select auth.uid()), cancelled_at = null,
      cancelled_by_profile_id = null, updated_at = now()
    where id = existing_registration.id returning id into registration_id;
  else
    insert into public.event_registrations (
      event_id, household_id, student_id, status, waitlist_position,
      created_by_profile_id
    ) values (
      p_event_id, selected_household_id, p_student_id, new_status,
      new_waitlist_position, (select auth.uid())
    ) returning id into registration_id;
  end if;
  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    (select auth.uid()), 'event.registration_created', 'event_registration',
    registration_id, 'success', 'web',
    jsonb_build_object('eventId', p_event_id, 'status', new_status)
  );
  return new_status;
end;
$$;

revoke all on function public.register_my_student_for_event(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.register_my_student_for_event(uuid, uuid)
  to authenticated;

commit;
