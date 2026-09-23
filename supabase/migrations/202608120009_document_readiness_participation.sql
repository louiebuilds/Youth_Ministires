begin;

create or replace function private.validate_participation_override_scope()
returns trigger
language plpgsql
set search_path=''
as $$
declare
  selected record;
  requirement_count integer;
begin
  if tg_op='UPDATE'
    and new.event_id=old.event_id
    and new.registration_id=old.registration_id
    and new.student_id=old.student_id
    and new.unmet_requirement_ids=old.unmet_requirement_ids
  then
    return new;
  end if;

  select event_id,student_id
  into selected
  from public.event_registrations
  where id=new.registration_id;

  if selected.event_id is distinct from new.event_id
    or selected.student_id is distinct from new.student_id
  then
    raise exception
      'Participation override must match its Event Registration and student.'
      using errcode='23514';
  end if;

  if cardinality(new.unmet_requirement_ids) is distinct from
    (
      select count(distinct requirement_id)
      from unnest(new.unmet_requirement_ids) requirement_id
    )
  then
    raise exception
      'Participation override requirement identifiers must be unique.'
      using errcode='23514';
  end if;

  select count(*)
  into requirement_count
  from public.event_document_requirements requirements
  where requirements.id=any(new.unmet_requirement_ids)
    and requirements.event_id=new.event_id
    and requirements.archived_at is null;

  if requirement_count<>cardinality(new.unmet_requirement_ids) then
    raise exception
      'Participation override requirements must be active requirements for the same Event.'
      using errcode='23514';
  end if;

  return new;
end
$$;

create or replace function private.document_requirement_state(
  p_requirement_id uuid,
  p_student_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path=''
set row_security=off
as $$
with requirement as (
  select
    r.id,
    r.event_id,
    r.template_version_id,
    r.required,
    r.blocks_participation,
    t.name,
    t.document_kind
  from public.event_document_requirements r
  join public.document_templates t
    on t.id=r.template_id
  where r.id=p_requirement_id
    and r.archived_at is null
),
candidate as (
  select
    s.id,
    s.digital_status,
    s.lifecycle_status,
    s.expires_on,
    coalesce(
      (
        select e.action='confirmed_on_file'
        from public.document_paper_evidence_events e
        where e.submission_id=s.id
        order by e.occurred_at desc,e.id desc
        limit 1
      ),
      false
    ) paper_on_file,
    coalesce(
      (
        select e.action='medical_verified'
        from public.document_review_events e
        where e.submission_id=s.id
          and e.action in (
            'medical_verified',
            'medical_verification_revoked'
          )
        order by e.occurred_at desc,e.id desc
        limit 1
      ),
      false
    )
    and coalesce(
      (
        select e.action='accepted'
        from public.document_review_events e
        where e.submission_id=s.id
          and e.action in (
            'accepted',
            'rejected',
            'replacement_requested'
          )
        order by e.occurred_at desc,e.id desc
        limit 1
      ),
      false
    ) medical_verified
  from public.student_document_submissions s,
       requirement r
  where s.student_id=p_student_id
    and s.template_version_id=r.template_version_id
    and s.lifecycle_status not in ('superseded','archived')
  order by s.created_at desc
  limit 1
),
state as (
  select
    r.id requirement_id,
    r.event_id,
    r.template_version_id,
    r.required,
    r.blocks_participation,
    r.name,
    r.document_kind,
    c.id submission_id,
    c.digital_status,
    c.lifecycle_status,
    c.expires_on,
    coalesce(c.paper_on_file,false) paper_on_file,
    coalesce(c.medical_verified,false) medical_verified,
    c.id is not null
      and (
        c.expires_on is null
        or c.expires_on>=current_date
      ) valid,
    coalesce(c.digital_status='accepted',false) digital_accepted
  from requirement r
  left join candidate c on true
)
select jsonb_build_object(
  'requirementId',requirement_id,
  'eventId',event_id,
  'templateVersionId',template_version_id,
  'templateName',name,
  'documentKind',document_kind,
  'required',required,
  'blocksParticipation',blocks_participation,

  'ready',
    case
      when document_kind='medical_release' then
        valid
        and digital_accepted
        and paper_on_file
        and medical_verified
      else
        valid
        and digital_accepted
        and paper_on_file
    end,

  'missing',
    to_jsonb(
      array_remove(
        array[
          case
            when submission_id is null
            then 'digital_copy_missing'
          end,

          case
            when submission_id is not null
              and not valid
            then 'expired'
          end,

          case
            when submission_id is not null
              and digital_status='needs_replacement'
            then 'replacement_required'
          end,

          case
            when submission_id is not null
              and not digital_accepted
              and digital_status<>'needs_replacement'
            then 'digital_copy_not_accepted'
          end,

          case
            when not paper_on_file
            then 'paper_copy_missing'
          end,

          case
            when document_kind='medical_release'
              and not medical_verified
            then 'medical_verification_missing'
          end
        ],
        null
      )
    )
)
from state
$$;

create or replace function private.registration_document_readiness(
  p_registration_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path=''
set row_security=off
as $$
with registration as (
  select
    id,
    event_id,
    student_id,
    status
  from public.event_registrations
  where id=p_registration_id
),
states as (
  select private.document_requirement_state(
    r.id,
    registration.student_id
  ) state
  from registration
  join public.event_document_requirements r
    on r.event_id=registration.event_id
  where r.archived_at is null
    and r.required
),
aggregate_state as (
  select
    coalesce(
      bool_and((state->>'ready')::boolean),
      true
    ) ready,
    coalesce(
      jsonb_agg(
        state
        order by state->>'templateName'
      ),
      '[]'::jsonb
    ) requirements
  from states
)
select jsonb_build_object(
  'registrationId',registration.id,
  'eventId',registration.event_id,
  'studentId',registration.student_id,
  'registrationStatus',registration.status,
  'ready',aggregate_state.ready,
  'requirements',aggregate_state.requirements
)
from registration
cross join aggregate_state
$$;

create or replace function private.current_participation_override(
  p_registration_id uuid,
  p_unmet_ids uuid[]
)
returns uuid
language sql
stable
security definer
set search_path=''
set row_security=off
as $$
  select o.id
  from public.event_participation_overrides o
  join public.event_registrations r
    on r.id=o.registration_id
    and r.event_id=o.event_id
    and r.student_id=o.student_id
  where o.registration_id=p_registration_id
    and r.status in ('registered','confirmed')
    and o.revoked_at is null
    and (
      o.expires_at is null
      or o.expires_at>now()
    )
    and o.unmet_requirement_ids<@p_unmet_ids
    and p_unmet_ids<@o.unmet_requirement_ids
    and not exists(
      select 1
      from unnest(o.unmet_requirement_ids) x(id)
      left join public.event_document_requirements requirement
        on requirement.id=x.id
      where requirement.id is null
        or requirement.archived_at is not null
        or requirement.event_id<>o.event_id
    )
  order by o.created_at desc
  limit 1
$$;

create or replace function public.get_event_registration_document_readiness(
  p_registration_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
set row_security=off
as $$
declare
  result jsonb;
  target_event uuid;
begin
  select event_id
  into target_event
  from public.event_registrations
  where id=p_registration_id;

  if target_event is null
    or not private.can_manage_events()
  then
    raise exception
      'Documentation readiness access is denied.'
      using errcode='42501';
  end if;

  result:=private.registration_document_readiness(
    p_registration_id
  );

  return result;
end
$$;

create or replace function public.list_event_registration_document_readiness(
  p_event_id uuid
)
returns table(
  registration_id uuid,
  event_id uuid,
  student_id uuid,
  registration_status public.event_registration_status,
  documentation_ready boolean,
  requirements jsonb,
  participation_override_id uuid
)
language plpgsql
stable
security definer
set search_path=''
set row_security=off
as $$
begin
  if not private.can_manage_events()
    and not private.can_manage_event_checkin(p_event_id)
  then
    raise exception
      'Documentation readiness roster access is denied.'
      using errcode='42501';
  end if;

  return query
  select
    r.id,
    r.event_id,
    r.student_id,
    r.status,
    (ready->>'ready')::boolean,
    ready->'requirements',
    private.current_participation_override(
      r.id,
      coalesce(
        array(
          select (x->>'requirementId')::uuid
          from jsonb_array_elements(
            ready->'requirements'
          ) x
          where not (x->>'ready')::boolean
            and (x->>'blocksParticipation')::boolean
        ),
        '{}'::uuid[]
      )
    )
  from public.event_registrations r
  cross join lateral
    private.registration_document_readiness(r.id) ready
  where r.event_id=p_event_id
  order by r.created_at;
end
$$;

create or replace function public.create_event_participation_override(
  p_registration_id uuid,
  p_unmet_requirement_ids uuid[],
  p_reason text,
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path=''
set row_security=off
as $$
declare
  selected record;
  override_id uuid;
  current_unmet uuid[];
begin
  if not private.has_forms_capability(
    'forms.participation.override'
  )
  then
    raise exception
      'Participation override is denied.'
      using errcode='42501';
  end if;

  if length(
      btrim(
        coalesce(p_reason,'')
      )
    ) not between 5 and 2000
    or (
      p_expires_at is not null
      and p_expires_at<=now()
    )
  then
    raise exception
      'Override reason or expiration is invalid.'
      using errcode='22023';
  end if;

  select
    r.event_id,
    r.student_id,
    r.status
  into selected
  from public.event_registrations r
  where r.id=p_registration_id;

  if not found
    or selected.status not in ('registered','confirmed')
  then
    raise exception
      'Active Event Registration not found.'
      using errcode='22023';
  end if;

  select coalesce(
    array_agg(
      (x->>'requirementId')::uuid
      order by x->>'requirementId'
    ),
    '{}'::uuid[]
  )
  into current_unmet
  from jsonb_array_elements(
    private.registration_document_readiness(
      p_registration_id
    )->'requirements'
  ) x
  where not (x->>'ready')::boolean
    and (x->>'blocksParticipation')::boolean;

  if cardinality(current_unmet)=0
    or not (
      p_unmet_requirement_ids<@current_unmet
      and current_unmet<@p_unmet_requirement_ids
    )
  then
    raise exception
      'Override requirements must exactly match current unmet participation requirements.'
      using errcode='22023';
  end if;

  insert into public.event_participation_overrides(
    event_id,
    registration_id,
    student_id,
    reason,
    unmet_requirement_ids,
    evidence,
    created_by_profile_id,
    expires_at
  )
  values(
    selected.event_id,
    p_registration_id,
    selected.student_id,
    btrim(p_reason),
    p_unmet_requirement_ids,
    jsonb_build_object(
      'status',
      'approved'
    ),
    auth.uid(),
    p_expires_at
  )
  returning id
  into override_id;

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
    'forms.participation_override_created',
    'event_participation_override',
    override_id,
    'success',
    'web',
    jsonb_build_object(
      'eventId',
      selected.event_id,
      'registrationId',
      p_registration_id,
      'studentId',
      selected.student_id,
      'requirementIds',
      p_unmet_requirement_ids,
      'status',
      'approved'
    )
  );

  return override_id;
end
$$;

create or replace function public.revoke_event_participation_override(
  p_override_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path=''
set row_security=off
as $$
declare
  selected record;
begin
  if not private.has_forms_capability(
    'forms.participation.override'
  )
    or length(
      btrim(
        coalesce(p_reason,'')
      )
    ) not between 5 and 1000
  then
    raise exception
      'Participation override revocation is denied.'
      using errcode='42501';
  end if;

  update public.event_participation_overrides
  set
    revoked_at=now(),
    revoked_by_profile_id=auth.uid(),
    revocation_reason=btrim(p_reason)
  where id=p_override_id
    and revoked_at is null
  returning
    event_id,
    registration_id,
    student_id
  into selected;

  if not found then
    raise exception
      'Active participation override not found.'
      using errcode='P0002';
  end if;

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
    'forms.participation_override_revoked',
    'event_participation_override',
    p_override_id,
    'success',
    'web',
    jsonb_build_object(
      'eventId',
      selected.event_id,
      'registrationId',
      selected.registration_id,
      'studentId',
      selected.student_id,
      'status',
      'revoked'
    )
  );
end
$$;

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

  select id
  into registration_id
  from public.event_registrations
  where event_id=p_event_id
    and student_id=p_student_id
    and status in ('registered','confirmed');

  if registration_id is not null then
    readiness:=
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

    if cardinality(unmet_ids)>0 then
      override_id:=
        private.current_participation_override(
          registration_id,
          unmet_ids
        );
    end if;

    if cardinality(unmet_ids)>0
      and override_id is null
    then
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
        'checkin.blocked_documentation',
        'event_registration',
        registration_id,
        'denied',
        'web',
        jsonb_build_object(
          'eventId',
          p_event_id,
          'registrationId',
          registration_id,
          'studentId',
          p_student_id,
          'requirementIds',
          unmet_ids,
          'status',
          'not_ready'
        )
      );

      return null;
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
end
$$;

revoke all
on function private.document_requirement_state(uuid,uuid),
  private.registration_document_readiness(uuid),
  private.current_participation_override(uuid,uuid[])
from public,anon,authenticated;

revoke all
on function public.get_event_registration_document_readiness(uuid),
  public.list_event_registration_document_readiness(uuid),
  public.create_event_participation_override(
    uuid,
    uuid[],
    text,
    timestamptz
  ),
  public.revoke_event_participation_override(uuid,text)
from public,anon,authenticated;

grant execute
on function public.get_event_registration_document_readiness(uuid),
  public.list_event_registration_document_readiness(uuid),
  public.create_event_participation_override(
    uuid,
    uuid[],
    text,
    timestamptz
  ),
  public.revoke_event_participation_override(uuid,text)
to authenticated;

commit;