begin;

create or replace function public.cancel_my_event_registration(
  p_registration_id uuid
)
returns void
language plpgsql security definer
set search_path = '' set row_security = off
as $$
declare selected_registration public.event_registrations%rowtype;
begin
  if not private.current_profile_is_active() then
    raise exception 'Registration access is denied.' using errcode = '42501';
  end if;
  select registrations.* into selected_registration
  from public.event_registrations as registrations
  join public.students on students.id = registrations.student_id
  join public.student_relationships
    on student_relationships.student_id = students.id
   and (
     student_relationships.may_view_student_information
     or student_relationships.may_sign_permission_forms
     or student_relationships.is_legal_guardian
   )
  join public.profiles on profiles.person_id = student_relationships.person_id
  where registrations.id = p_registration_id
    and profiles.id = (select auth.uid())
  for update of registrations;
  if not found then
    raise exception 'Registration access is denied.' using errcode = '42501';
  end if;
  if selected_registration.status not in (
    'registered', 'waitlisted', 'confirmed'
  ) then
    raise exception 'This registration cannot be cancelled.'
      using errcode = '22023';
  end if;
  update public.event_registrations set
    status = 'cancelled', waitlist_position = null, cancelled_at = now(),
    cancelled_by_profile_id = (select auth.uid()), updated_at = now()
  where id = p_registration_id;
  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    (select auth.uid()), 'event.registration_cancelled',
    'event_registration', p_registration_id, 'success', 'web',
    jsonb_build_object(
      'eventId', selected_registration.event_id,
      'priorStatus', selected_registration.status
    )
  );
end;
$$;

revoke all on function public.cancel_my_event_registration(uuid)
  from public, anon, authenticated;
grant execute on function public.cancel_my_event_registration(uuid)
  to authenticated;

commit;
