begin;

-- Paper-only intake for event Waiver / Permission Form requirements.
--
-- This creates a retained submission row with no digital file when a
-- physical waiver is received, then records normal paper evidence.
--
-- The existing readiness calculation can then treat:
--
--   accepted digital copy
--        OR
--   confirmed paper copy
--
-- as satisfying the event waiver requirement.

create or replace function public.record_paper_event_waiver(
  p_requirement_id uuid,
  p_student_id uuid,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  v_submission_id uuid;
  v_household_id uuid;
  v_template_version_id uuid;
  v_validity_policy public.document_validity_policy;
  v_valid_for interval;
  v_explicit_expires_on date;
  v_reason text :=
    nullif(
      btrim(coalesce(p_reason, '')),
      ''
    );
begin
  if not private.current_profile_is_active()
    or not private.has_forms_capability(
      'forms.documents.paper_confirm'
    ) then
    raise exception
      'Paper waiver receipt is denied.'
      using errcode = '42501';
  end if;

  if v_reason is not null
    and length(v_reason) not between 5 and 1000 then
    raise exception
      'Reason is invalid.'
      using errcode = '22023';
  end if;

  -- Lock the student row while deciding whether a retained
  -- paper-only submission needs to be created.
  select students.primary_household_id
  into v_household_id
  from public.students as students
  where students.id = p_student_id
    and students.status <> 'archived'
  for update;

  if not found then
    raise exception
      'Active student not found.'
      using errcode = 'P0002';
  end if;

  -- Resolve the exact active event requirement and pinned
  -- published Waiver / Permission Form version.
  select
    requirements.template_version_id,
    versions.validity_policy,
    versions.valid_for,
    versions.explicit_expires_on
  into
    v_template_version_id,
    v_validity_policy,
    v_valid_for,
    v_explicit_expires_on
  from public.event_document_requirements
    as requirements
  join public.document_templates as templates
    on templates.id = requirements.template_id
  join public.document_template_versions
    as versions
    on versions.id =
      requirements.template_version_id
    and versions.template_id =
      requirements.template_id
  where requirements.id = p_requirement_id
    and requirements.archived_at is null
    and requirements.required
    and templates.status = 'active'
    and templates.document_kind =
      'permission_slip'
    and versions.status = 'published';

  if not found then
    raise exception
      'Active Waiver / Permission Form requirement not found.'
      using errcode = 'P0002';
  end if;

  -- Reuse an existing retained submission when one already
  -- exists for this student and exact pinned version.
  --
  -- This lets paper evidence coexist with a digital submission
  -- instead of creating duplicate records.
  select submissions.id
  into v_submission_id
  from public.student_document_submissions
    as submissions
  where submissions.student_id = p_student_id
    and submissions.template_version_id =
      v_template_version_id
    and submissions.lifecycle_status
      not in ('superseded', 'archived')
  order by submissions.created_at desc
  limit 1
  for update;

  -- If there is no submission yet, create a genuine paper-only
  -- record. Storage/file fields remain NULL because no digital
  -- document was uploaded.
  if v_submission_id is null then
    v_submission_id :=
      extensions.gen_random_uuid();

    insert into public.student_document_submissions (
      id,
      student_id,
      household_id,
      template_version_id,
      upload_source,
      submitted_by_profile_id,
      storage_bucket,
      storage_object_path,
      original_file_name,
      content_type,
      file_size_bytes,
      checksum_sha256,
      digital_status,
      lifecycle_status,
      valid_from,
      expires_on
    ) values (
      v_submission_id,
      p_student_id,
      v_household_id,
      v_template_version_id,
      'staff',
      (select auth.uid()),
      null,
      null,
      null,
      null,
      null,
      null,
      'missing',
      'paper_required',
      current_date,
      case
        when v_validity_policy =
          'explicit_expiration'
          then v_explicit_expires_on

        when v_validity_policy =
          'fixed_interval'
          then (
            current_date + v_valid_for
          )::date

        else null
      end
    );

    insert into public.audit_events (
      actor_profile_id,
      action,
      entity_type,
      entity_id,
      result,
      source,
      metadata
    ) values (
      (select auth.uid()),
      'forms.paper_waiver_submission_created',
      'student_document_submission',
      v_submission_id,
      'success',
      'web',
      jsonb_build_object(
        'studentId',
        p_student_id,
        'requirementId',
        p_requirement_id,
        'templateVersionId',
        v_template_version_id,
        'completionPath',
        'paper'
      )
    );
  end if;

  -- Reuse the existing protected paper-confirmation workflow so
  -- capability enforcement, validation, retained evidence, and
  -- normal paper-copy auditing remain consistent.
  perform private.record_document_paper_event(
    v_submission_id,
    'confirmed_on_file',
    v_reason
  );

  return v_submission_id;
end;
$$;


revoke all
on function public.record_paper_event_waiver(
  uuid,
  uuid,
  text
)
from public, anon, authenticated;

grant execute
on function public.record_paper_event_waiver(
  uuid,
  uuid,
  text
)
to authenticated;


commit;