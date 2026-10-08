begin;

create or replace function public.get_my_medical_access()
returns jsonb
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select jsonb_build_object(
    'canView',
      private.has_forms_capability('forms.medical.view')
      or private.has_forms_capability('forms.medical.verify'),
    'canVerify', private.has_forms_capability('forms.medical.verify')
  )
$$;

create or replace function public.get_student_current_medical_form_status(
  p_student_id uuid,
  p_on date default current_date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
declare
  req record;
  state jsonb;
begin
  if not (
    private.has_forms_capability('forms.medical.view')
    or private.has_forms_capability('forms.medical.verify')
  ) then
    raise exception 'Medical form status access is denied.' using errcode = '42501';
  end if;

  select * into req
  from public.school_year_medical_requirements
  where school_year_start = private.school_year_start_for(p_on)
    and archived_at is null;

  if not found then
    return jsonb_build_object(
      'studentId', p_student_id,
      'schoolYearStart', private.school_year_start_for(p_on),
      'configured', false,
      'ready', false
    );
  end if;

  state := private.submission_operational_state(
    p_student_id,
    req.template_version_id,
    req.school_year_start
  );
  return jsonb_build_object(
    'studentId', p_student_id,
    'schoolYearStart', req.school_year_start,
    'schoolYearEnd', req.school_year_end,
    'configured', true,
    'requirementId', req.id,
    'templateVersionId', req.template_version_id,
    'state', state,
    'ready', coalesce((state ->> 'ready')::boolean, false)
  );
end
$$;

create or replace function public.list_current_medical_form_status(
  p_on date default current_date
)
returns table(
  student_id uuid,
  student_name text,
  household_id uuid,
  school_year_start date,
  school_year_end date,
  template_version_id uuid,
  submission_id uuid,
  ready boolean,
  state jsonb
)
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
begin
  if not (
    private.has_forms_capability('forms.medical.view')
    or private.has_forms_capability('forms.medical.verify')
  ) then
    raise exception 'Medical Forms workspace access is denied.' using errcode = '42501';
  end if;

  return query
  select
    students.id,
    concat_ws(' ', people.first_name, people.last_name),
    students.primary_household_id,
    requirements.school_year_start,
    requirements.school_year_end,
    requirements.template_version_id,
    nullif(operational_state ->> 'submissionId', '')::uuid,
    coalesce((operational_state ->> 'ready')::boolean, false),
    operational_state
  from public.students as students
  join public.people as people on people.id = students.person_id
  join public.school_year_medical_requirements as requirements
    on requirements.school_year_start = private.school_year_start_for(p_on)
    and requirements.archived_at is null
  left join lateral private.submission_operational_state(
    students.id,
    requirements.template_version_id,
    requirements.school_year_start
  ) as operational_state on true
  where students.status = 'active'
  order by people.last_name, people.first_name;
end
$$;

create or replace function public.authorize_document_submission_download(
  p_submission_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  selected record;
begin
  select submissions.*, templates.document_kind
  into selected
  from public.student_document_submissions as submissions
  join public.document_template_versions as versions
    on versions.id = submissions.template_version_id
  join public.document_templates as templates
    on templates.id = versions.template_id
  where submissions.id = p_submission_id
    and submissions.content_type is not null
    and submissions.file_size_bytes is not null;

  if not found or not private.current_profile_is_active() or not (
    private.is_document_forms_manager()
    or (
      selected.document_kind = 'medical_release'
      and (
        private.has_forms_capability('forms.medical.view')
        or private.has_forms_capability('forms.medical.verify')
      )
    )
    or (
      private.current_profile_role() = 'parent'
      and private.can_parent_access_student_document(
        selected.student_id,
        selected.household_id
      )
      and private.parent_may_use_document_version(
        selected.student_id,
        selected.template_version_id
      )
    )
  ) then
    raise exception 'Document download is denied.' using errcode = '42501';
  end if;

  insert into public.audit_events(
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    result,
    source,
    metadata
  ) values (
    auth.uid(),
    'forms.document_download_authorized',
    'student_document_submission',
    p_submission_id,
    'success',
    'web',
    jsonb_build_object(
      'studentId', selected.student_id,
      'templateVersionId', selected.template_version_id,
      'documentKind', selected.document_kind
    )
  );

  return jsonb_build_object(
    'bucket', selected.storage_bucket,
    'objectPath', selected.storage_object_path,
    'fileName', selected.original_file_name,
    'contentType', selected.content_type
  );
end
$$;

create or replace function public.list_document_submissions()
returns table(
  submission_id uuid,
  student_id uuid,
  student_name text,
  household_id uuid,
  template_version_id uuid,
  template_name text,
  version_number integer,
  document_kind public.document_kind,
  upload_source public.document_upload_source,
  digital_status public.document_digital_status,
  lifecycle_status public.document_lifecycle_status,
  paper_copy_on_file boolean,
  review_state public.document_review_action,
  medical_verified boolean,
  expires_on date,
  supersedes_submission_id uuid,
  is_superseded boolean,
  original_file_name text
)
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
begin
  if not private.current_profile_is_active() or not (
    private.current_profile_role() = 'parent'
    or private.is_document_forms_manager()
    or private.has_forms_capability('forms.medical.view')
    or private.has_forms_capability('forms.medical.verify')
  ) then
    raise exception 'Submission listing denied.' using errcode = '42501';
  end if;

  return query
  select
    submissions.id,
    submissions.student_id,
    btrim(coalesce(people.preferred_name, people.first_name) || ' ' || people.last_name),
    submissions.household_id,
    submissions.template_version_id,
    templates.name,
    versions.version_number,
    templates.document_kind,
    submissions.upload_source,
    submissions.digital_status,
    submissions.lifecycle_status,
    coalesce((
      select evidence.action = 'confirmed_on_file'
      from public.document_paper_evidence_events as evidence
      where evidence.submission_id = submissions.id
      order by evidence.occurred_at desc, evidence.id desc
      limit 1
    ), false),
    (
      select reviews.action
      from public.document_review_events as reviews
      where reviews.submission_id = submissions.id
        and reviews.action in ('accepted', 'rejected', 'replacement_requested')
      order by reviews.occurred_at desc, reviews.id desc
      limit 1
    ),
    case
      when templates.document_kind = 'medical_release'
        and (
          private.has_forms_capability('forms.medical.view')
          or private.has_forms_capability('forms.medical.verify')
        )
      then submissions.digital_status = 'accepted'
        and coalesce((
          select reviews.action = 'accepted'
          from public.document_review_events as reviews
          where reviews.submission_id = submissions.id
            and reviews.action in ('accepted', 'rejected', 'replacement_requested')
          order by reviews.occurred_at desc, reviews.id desc
          limit 1
        ), false)
        and coalesce((
          select reviews.action = 'medical_verified'
          from public.document_review_events as reviews
          where reviews.submission_id = submissions.id
            and reviews.action in ('medical_verified', 'medical_verification_revoked')
          order by reviews.occurred_at desc, reviews.id desc
          limit 1
        ), false)
      else false
    end,
    submissions.expires_on,
    submissions.supersedes_submission_id,
    submissions.lifecycle_status = 'superseded',
    submissions.original_file_name
  from public.student_document_submissions as submissions
  join public.students as students on students.id = submissions.student_id
  join public.people as people on people.id = students.person_id
  join public.document_template_versions as versions
    on versions.id = submissions.template_version_id
  join public.document_templates as templates on templates.id = versions.template_id
  where
    (
      templates.document_kind = 'medical_release'
      and (
        private.has_forms_capability('forms.medical.view')
        or private.has_forms_capability('forms.medical.verify')
      )
    )
    or (
      templates.document_kind = 'permission_slip'
      and private.is_document_forms_manager()
    )
    or (
      private.current_profile_role() = 'parent'
      and private.can_parent_access_student_document(
        submissions.student_id,
        submissions.household_id
      )
      and private.parent_may_use_document_version(
        submissions.student_id,
        submissions.template_version_id
      )
    )
  order by submissions.created_at desc;
end
$$;

create or replace function private.record_medical_verification(
  p_submission_id uuid,
  p_action public.document_review_action,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
begin
  if not private.has_forms_capability('forms.medical.verify') or not exists (
    select 1
    from public.student_document_submissions as submissions
    join public.document_template_versions as versions
      on versions.id = submissions.template_version_id
    join public.document_templates as templates on templates.id = versions.template_id
    where submissions.id = p_submission_id
      and templates.document_kind = 'medical_release'
      and submissions.content_type is not null
      and submissions.lifecycle_status not in ('superseded', 'archived')
      and (
        p_action = 'medical_verification_revoked'
        or (
          submissions.digital_status = 'accepted'
          and submissions.lifecycle_status = 'under_review'
          and (
            select reviews.action
            from public.document_review_events as reviews
            where reviews.submission_id = submissions.id
              and reviews.action in ('accepted', 'rejected', 'replacement_requested')
            order by reviews.occurred_at desc, reviews.id desc
            limit 1
          ) = 'accepted'
        )
      )
  ) then
    raise exception 'Medical verification denied.' using errcode = '42501';
  end if;

  if p_reason is not null and length(btrim(p_reason)) not between 5 and 1000 then
    raise exception 'Reason is invalid.' using errcode = '22023';
  end if;

  insert into public.document_review_events(
    submission_id,
    action,
    actor_profile_id,
    reason
  ) values (
    p_submission_id,
    p_action,
    auth.uid(),
    nullif(btrim(coalesce(p_reason, '')), '')
  );

  insert into public.audit_events(
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    result,
    source,
    metadata
  ) values (
    auth.uid(),
    case
      when p_action = 'medical_verified' then 'forms.medical_document_verified'
      else 'forms.medical_verification_revoked'
    end,
    'student_document_submission',
    p_submission_id,
    'success',
    'web',
    jsonb_build_object('verificationAction', p_action)
  );
end
$$;

revoke all on function public.get_my_medical_access()
  from public, anon, authenticated;
revoke all on function public.get_student_current_medical_form_status(uuid, date)
  from public, anon, authenticated;
revoke all on function public.list_current_medical_form_status(date)
  from public, anon, authenticated;
revoke all on function public.authorize_document_submission_download(uuid)
  from public, anon, authenticated;
revoke all on function public.list_document_submissions()
  from public, anon, authenticated;
revoke all on function private.record_medical_verification(
  uuid,
  public.document_review_action,
  text
) from public, anon, authenticated;

grant execute on function public.get_my_medical_access() to authenticated;
grant execute on function public.get_student_current_medical_form_status(uuid, date)
  to authenticated;
grant execute on function public.list_current_medical_form_status(date)
  to authenticated;
grant execute on function public.authorize_document_submission_download(uuid)
  to authenticated;
grant execute on function public.list_document_submissions() to authenticated;

commit;
