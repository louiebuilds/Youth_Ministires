begin;

-- Medical Release independent completion paths.
--
-- A current Medical Release may be satisfied through either:
--   1. an accepted digital copy, OR
--   2. a confirmed physical paper copy.
--
-- Final Medical Release authorization is still required.
--
-- Youth Pastor:
--   primary final approver.
--
-- Platform Administrator:
--   backup final approver and must record confirmation that the
--   Youth Pastor / Youth Director approved the Medical Release.


create or replace function public.record_paper_medical_release(
  p_student_id uuid,
  p_template_version_id uuid,
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
  v_validity_policy public.document_validity_policy;
  v_valid_for interval;
  v_explicit_expires_on date;
  v_reason text := nullif(
    btrim(coalesce(p_reason, '')),
    ''
  );
begin
  if not private.current_profile_is_active()
    or not private.has_forms_capability(
      'forms.documents.paper_confirm'
    ) then
    raise exception
      'Paper Medical Release receipt is denied.'
      using errcode = '42501';
  end if;

  if v_reason is not null
    and length(v_reason) not between 5 and 1000 then
    raise exception 'Reason is invalid.'
      using errcode = '22023';
  end if;

  select
    students.primary_household_id,
    versions.validity_policy,
    versions.valid_for,
    versions.explicit_expires_on
  into
    v_household_id,
    v_validity_policy,
    v_valid_for,
    v_explicit_expires_on
  from public.students as students
  join public.document_template_versions as versions
    on versions.id = p_template_version_id
  join public.document_templates as templates
    on templates.id = versions.template_id
  where students.id = p_student_id
    and students.status <> 'archived'
    and versions.status = 'published'
    and templates.status = 'active'
    and templates.document_kind = 'medical_release';

  if not found then
    raise exception
      'Active published Medical Release version not found.'
      using errcode = 'P0002';
  end if;

  if not exists (
    select 1
    from public.school_year_medical_requirements
      as requirements
    where requirements.template_version_id =
      p_template_version_id
      and requirements.archived_at is null
      and requirements.school_year_start =
        private.school_year_start_for(current_date)
  ) then
    raise exception
      'This Medical Release is not the current school-year form.'
      using errcode = '22023';
  end if;

  -- If a current active submission already exists, attach the
  -- paper receipt evidence to that same retained record.
  select submissions.id
  into v_submission_id
  from public.student_document_submissions as submissions
  where submissions.student_id = p_student_id
    and submissions.template_version_id =
      p_template_version_id
    and submissions.lifecycle_status
      not in ('superseded', 'archived')
  order by submissions.created_at desc
  limit 1
  for update;

  -- Otherwise create a retained paper-only submission record.
  --
  -- Storage/file metadata remains NULL because no digital copy
  -- was uploaded.
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
      p_template_version_id,
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
  end if;

  insert into public.document_paper_evidence_events (
    submission_id,
    action,
    actor_profile_id,
    reason
  ) values (
    v_submission_id,
    'confirmed_on_file',
    (select auth.uid()),
    v_reason
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
    'forms.paper_medical_release_received',
    'student_document_submission',
    v_submission_id,
    'success',
    'web',
    jsonb_build_object(
      'studentId',
      p_student_id,
      'templateVersionId',
      p_template_version_id,
      'completionPath',
      'paper'
    )
  );

  return v_submission_id;
end;
$$;


create or replace function private.submission_operational_state(
  p_student_id uuid,
  p_version_id uuid,
  p_school_start date default null
)
returns jsonb
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  with candidate as (
    select submissions.*
    from public.student_document_submissions
      as submissions
    where submissions.student_id = p_student_id
      and submissions.template_version_id =
        p_version_id
      and submissions.lifecycle_status
        not in ('superseded', 'archived')
      and (
        p_school_start is null
        or (
          submissions.valid_from >=
            p_school_start
          and submissions.valid_from <=
            p_school_start
            + interval '1 year'
            - interval '1 day'
        )
      )
    order by submissions.created_at desc
    limit 1
  ),

  state as (
    select
      candidate.*,

      coalesce((
        select
          evidence.action =
            'confirmed_on_file'
        from public.document_paper_evidence_events
          as evidence
        where evidence.submission_id =
          candidate.id
        order by
          evidence.occurred_at desc,
          evidence.id desc
        limit 1
      ), false) as paper_copy_on_file,

      coalesce((
        select
          reviews.action = 'accepted'
        from public.document_review_events
          as reviews
        where reviews.submission_id =
          candidate.id
          and reviews.action in (
            'accepted',
            'rejected',
            'replacement_requested'
          )
        order by
          reviews.occurred_at desc,
          reviews.id desc
        limit 1
      ), false) as digital_review_accepted,

      coalesce((
        select
          reviews.action =
            'medical_verified'
        from public.document_review_events
          as reviews
        where reviews.submission_id =
          candidate.id
          and reviews.action in (
            'medical_verified',
            'medical_verification_revoked'
          )
        order by
          reviews.occurred_at desc,
          reviews.id desc
        limit 1
      ), false) as medical_authorized

    from candidate
  )

  select jsonb_build_object(
    'submissionId',
    id,

    'digitalStatus',
    digital_status,

    'lifecycleStatus',
    lifecycle_status,

    'paperCopyOnFile',
    paper_copy_on_file,

    'digitalAccepted',
    (
      digital_status = 'accepted'
      and digital_review_accepted
    ),

    'medicalVerified',
    medical_authorized,

    'expired',
    (
      expires_on is not null
      and expires_on < current_date
    ),

    'completionPath',
    case
      when
        digital_status = 'accepted'
        and digital_review_accepted
        and paper_copy_on_file
        then 'digital_and_paper'

      when
        digital_status = 'accepted'
        and digital_review_accepted
        then 'digital'

      when paper_copy_on_file
        then 'paper'

      else 'none'
    end,

    'ready',
    (
      medical_authorized
      and (
        (
          digital_status = 'accepted'
          and digital_review_accepted
        )
        or paper_copy_on_file
      )
      and (
        expires_on is null
        or expires_on >= current_date
      )
    )
  )
  from state
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
declare
  v_actor_role public.account_role;

  v_reason text :=
    nullif(
      btrim(coalesce(p_reason, '')),
      ''
    );

  v_submission_found boolean := false;
  v_not_expired boolean := true;
  v_digital_accepted boolean := false;
  v_paper_on_file boolean := false;
begin
  select profiles.primary_role
  into v_actor_role
  from public.profiles as profiles
  where profiles.id =
    (select auth.uid())
    and profiles.status = 'active';

  select
    true,

    (
      submissions.expires_on is null
      or submissions.expires_on >=
        current_date
    ),

    (
      submissions.digital_status =
        'accepted'
      and coalesce((
        select
          reviews.action = 'accepted'
        from public.document_review_events
          as reviews
        where reviews.submission_id =
          submissions.id
          and reviews.action in (
            'accepted',
            'rejected',
            'replacement_requested'
          )
        order by
          reviews.occurred_at desc,
          reviews.id desc
        limit 1
      ), false)
    ),

    coalesce((
      select
        evidence.action =
          'confirmed_on_file'
      from public.document_paper_evidence_events
        as evidence
      where evidence.submission_id =
        submissions.id
      order by
        evidence.occurred_at desc,
        evidence.id desc
      limit 1
    ), false)

  into
    v_submission_found,
    v_not_expired,
    v_digital_accepted,
    v_paper_on_file

  from public.student_document_submissions
    as submissions

  join public.document_template_versions
    as versions
    on versions.id =
      submissions.template_version_id

  join public.document_templates
    as templates
    on templates.id =
      versions.template_id

  where submissions.id =
    p_submission_id

    and templates.document_kind =
      'medical_release'

    and submissions.lifecycle_status
      not in ('superseded', 'archived');

  if v_actor_role is null
    or v_actor_role not in (
      'platform_administrator',
      'youth_pastor'
    )
    or not v_submission_found
    or (
      p_action = 'medical_verified'
      and (
        not v_not_expired
        or not (
          v_digital_accepted
          or v_paper_on_file
        )
      )
    ) then
    raise exception
      'Medical authorization denied.'
      using errcode = '42501';
  end if;

  if p_action = 'medical_verified'
    and v_actor_role =
      'platform_administrator'
    and (
      v_reason is null
      or length(v_reason)
        not between 5 and 1000
    ) then
    raise exception
      'Backup authorization note is required.'
      using errcode = '22023';
  end if;

  if p_action =
      'medical_verification_revoked'
    and (
      v_reason is null
      or length(v_reason)
        not between 5 and 1000
    ) then
    raise exception
      'Revocation reason is required.'
      using errcode = '22023';
  end if;

  if p_action = 'medical_verified'
    and v_actor_role = 'youth_pastor'
    and v_reason is not null
    and length(v_reason)
      not between 5 and 1000 then
    raise exception 'Reason is invalid.'
      using errcode = '22023';
  end if;

  insert into public.document_review_events (
    submission_id,
    action,
    actor_profile_id,
    reason
  ) values (
    p_submission_id,
    p_action,
    (select auth.uid()),
    v_reason
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

    case
      when p_action = 'medical_verified'
        then 'medical_release.authorized'
      else
        'forms.medical_verification_revoked'
    end,

    'student_document_submission',
    p_submission_id,
    'success',
    'web',

    case
      when p_action = 'medical_verified'
      then
        jsonb_strip_nulls(
          jsonb_build_object(
            'submissionId',
            p_submission_id,

            'approvalMethod',
            case
              when v_actor_role =
                'youth_pastor'
                then 'youth_pastor'
              else
                'platform_administrator_backup'
            end,

            'completionPath',
            case
              when
                v_digital_accepted
                and v_paper_on_file
                then 'digital_and_paper'

              when v_digital_accepted
                then 'digital'

              else 'paper'
            end,

            'backupAuthorizationNote',
            case
              when v_actor_role =
                'platform_administrator'
                then v_reason
              else null
            end
          )
        )

      else
        jsonb_build_object(
          'verificationAction',
          p_action
        )
    end
  );
end;
$$;


create or replace function private.standing_medical_requirement_state(
  p_event_id uuid,
  p_student_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
declare
  v_school_start date;
  v_requirement record;
  v_state jsonb;
  v_has_completion_path boolean;
begin
  v_school_start :=
    private.event_school_year_start(
      p_event_id
    );

  select
    requirements.*,
    templates.name
  into v_requirement

  from public.school_year_medical_requirements
    as requirements

  join public.document_template_versions
    as versions
    on versions.id =
      requirements.template_version_id

  join public.document_templates
    as templates
    on templates.id =
      versions.template_id

  where requirements.school_year_start =
    v_school_start
    and requirements.archived_at is null;

  if not found then
    return jsonb_build_object(
      'requirementId',
      null,

      'eventId',
      p_event_id,

      'templateVersionId',
      null,

      'templateName',
      'Current school-year Medical Form',

      'documentKind',
      'medical_release',

      'configured',
      false,

      'schoolYearStart',
      v_school_start,

      'required',
      true,

      'blocksParticipation',
      true,

      'ready',
      false,

      'missing',
      jsonb_build_array(
        'medical_requirement_not_configured'
      )
    );
  end if;

  v_state :=
    private.submission_operational_state(
      p_student_id,
      v_requirement.template_version_id,
      v_requirement.school_year_start
    );

  v_has_completion_path :=
    v_state is not null
    and (
      coalesce(
        (
          v_state ->> 'digitalAccepted'
        )::boolean,
        false
      )
      or
      coalesce(
        (
          v_state ->> 'paperCopyOnFile'
        )::boolean,
        false
      )
    );

  return jsonb_build_object(
    'requirementId',
    v_requirement.id,

    'eventId',
    p_event_id,

    'templateVersionId',
    v_requirement.template_version_id,

    'templateName',
    v_requirement.name,

    'documentKind',
    'medical_release',

    'configured',
    true,

    'schoolYearStart',
    v_requirement.school_year_start,

    'required',
    true,

    'blocksParticipation',
    true,

    'ready',
    coalesce(
      (
        v_state ->> 'ready'
      )::boolean,
      false
    ),

    'missing',
    case
      when v_state is null then
        jsonb_build_array(
          'medical_completion_path_missing',
          'medical_authorization_missing'
        )

      else
        to_jsonb(
          array_remove(
            array[
              case
                when not v_has_completion_path
                then
                  'medical_completion_path_missing'
              end,

              case
                when not coalesce(
                  (
                    v_state
                    ->> 'medicalVerified'
                  )::boolean,
                  false
                )
                then
                  'medical_authorization_missing'
              end,

              case
                when coalesce(
                  (
                    v_state
                    ->> 'expired'
                  )::boolean,
                  false
                )
                then
                  'medical_release_expired'
              end
            ],
            null
          )
        )
    end
  );
end;
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
  if not private.current_profile_is_active()
    or not (
      private.current_profile_role() =
        'parent'

      or private.is_document_forms_manager()

      or private.has_forms_capability(
        'forms.medical.view'
      )

      or private.has_forms_capability(
        'forms.medical.verify'
      )
    ) then
    raise exception
      'Submission listing denied.'
      using errcode = '42501';
  end if;

  return query
  select
    submissions.id,

    submissions.student_id,

    btrim(
      coalesce(
        people.preferred_name,
        people.first_name
      )
      || ' '
      || people.last_name
    ),

    submissions.household_id,

    submissions.template_version_id,

    templates.name,

    versions.version_number,

    templates.document_kind,

    submissions.upload_source,

    submissions.digital_status,

    submissions.lifecycle_status,

    coalesce((
      select
        evidence.action =
          'confirmed_on_file'
      from public.document_paper_evidence_events
        as evidence
      where evidence.submission_id =
        submissions.id
      order by
        evidence.occurred_at desc,
        evidence.id desc
      limit 1
    ), false),

    (
      select reviews.action
      from public.document_review_events
        as reviews
      where reviews.submission_id =
        submissions.id
        and reviews.action in (
          'accepted',
          'rejected',
          'replacement_requested'
        )
      order by
        reviews.occurred_at desc,
        reviews.id desc
      limit 1
    ),

    case
      when
        templates.document_kind =
          'medical_release'

        and (
          private.has_forms_capability(
            'forms.medical.view'
          )

          or private.has_forms_capability(
            'forms.medical.verify'
          )
        )

      then
        coalesce((
          select
            reviews.action =
              'medical_verified'
          from public.document_review_events
            as reviews
          where reviews.submission_id =
            submissions.id
            and reviews.action in (
              'medical_verified',
              'medical_verification_revoked'
            )
          order by
            reviews.occurred_at desc,
            reviews.id desc
          limit 1
        ), false)

      else false
    end,

    submissions.expires_on,

    submissions.supersedes_submission_id,

    submissions.lifecycle_status =
      'superseded',

    submissions.original_file_name

  from public.student_document_submissions
    as submissions

  join public.students as students
    on students.id =
      submissions.student_id

  join public.people as people
    on people.id =
      students.person_id

  join public.document_template_versions
    as versions
    on versions.id =
      submissions.template_version_id

  join public.document_templates
    as templates
    on templates.id =
      versions.template_id

  where
    (
      templates.document_kind =
        'medical_release'

      and (
        private.has_forms_capability(
          'forms.medical.view'
        )

        or private.has_forms_capability(
          'forms.medical.verify'
        )
      )
    )

    or (
      templates.document_kind =
        'permission_slip'

      and private.is_document_forms_manager()
    )

    or (
      private.current_profile_role() =
        'parent'

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
end;
$$;


revoke all on function public.record_paper_medical_release(
  uuid,
  uuid,
  text
) from public, anon, authenticated;

grant execute on function public.record_paper_medical_release(
  uuid,
  uuid,
  text
) to authenticated;


revoke all on function private.submission_operational_state(
  uuid,
  uuid,
  date
) from public, anon, authenticated;


revoke all on function private.record_medical_verification(
  uuid,
  public.document_review_action,
  text
) from public, anon, authenticated;


revoke all on function private.standing_medical_requirement_state(
  uuid,
  uuid
) from public, anon, authenticated;


revoke all on function public.list_document_submissions()
  from public, anon, authenticated;

grant execute on function public.list_document_submissions()
  to authenticated;


commit;