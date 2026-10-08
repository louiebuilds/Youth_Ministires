begin;

create or replace function public.check_in_student(
  p_event_id uuid,
  p_student_id uuid
)
returns uuid
language plpgsql
security definer
set search_path=''
set row_security=off
as $$
declare
  record_id uuid;
  target_household_id uuid;
  registration_id uuid;
  readiness jsonb;
  unmet_ids uuid[];
  override_id uuid;
begin
  if not private.can_manage_event_checkin(p_event_id) then
    raise exception
      'Student check-in is denied.'
      using errcode='42501';
  end if;

  select primary_household_id
  into target_household_id
  from public.students
  where id=p_student_id
    and status in ('registered','active');

  if target_household_id is null
    or exists(
      select 1
      from public.check_in_records
      where event_id=p_event_id
        and student_id=p_student_id
        and status in ('checked_in','checked_out')
    )
  then
    raise exception
      'Student cannot be checked in.'
      using errcode='22023';
  end if;

  /*
   * Documentation readiness remains informational.
   *
   * Missing or incomplete documentation is recorded in
   * audit metadata but no longer blocks attendance check-in.
   */
  select id
  into registration_id
  from public.event_registrations
  where event_id=p_event_id
    and student_id=p_student_id
    and status in ('registered','confirmed');

  if registration_id is not null then
    readiness :=
      private.registration_document_readiness(
        registration_id
      );

    select coalesce(
      array_agg(
        (x->>'requirementId')::uuid
      ),
      '{}'::uuid[]
    )
    into unmet_ids
    from jsonb_array_elements(
      readiness->'requirements'
    ) x
    where not (x->>'ready')::boolean
      and (x->>'blocksParticipation')::boolean;

    if cardinality(unmet_ids) > 0 then
      override_id :=
        private.current_participation_override(
          registration_id,
          unmet_ids
        );
    end if;
  end if;

  insert into public.check_in_records(
    event_id,
    student_id,
    household_id,
    status,
    checked_in_at,
    checked_in_by_profile_id
  )
  values(
    p_event_id,
    p_student_id,
    target_household_id,
    'checked_in',
    now(),
    auth.uid()
  )
  on conflict(event_id,student_id)
  do update
  set
    status='checked_in',
    checked_in_at=now(),
    checked_in_by_profile_id=auth.uid(),
    checked_out_at=null,
    checked_out_by_profile_id=null,
    pickup_person_id=null,
    exception_reason=null,
    override_by_profile_id=null
  returning id
  into record_id;

  insert into public.audit_events(
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    result,
    source,
    metadata
  )
  values(
    auth.uid(),
    case
      when override_id is null
        then 'checkin.student_checked_in'
      else 'checkin.allowed_participation_override'
    end,
    'check_in_record',
    record_id,
    'success',
    'web',
    jsonb_build_object(
      'eventId',
      p_event_id,
      'registrationId',
      registration_id,
      'studentId',
      p_student_id,
      'documentationNotice',
      cardinality(
        coalesce(
          unmet_ids,
          '{}'::uuid[]
        )
      ) > 0,
      'requirementIds',
      coalesce(
        unmet_ids,
        '{}'::uuid[]
      ),
      'overrideId',
      override_id
    )
  );

  return record_id;
end;
$$;

revoke all on function
  public.check_in_student(uuid, uuid)
from public, anon, authenticated;

grant execute on function
  public.check_in_student(uuid, uuid)
to authenticated;

comment on function
  public.check_in_student(uuid, uuid)
is
  'Checks an active or registered student into an event. Documentation readiness is informational and does not block attendance check-in.';

commit;