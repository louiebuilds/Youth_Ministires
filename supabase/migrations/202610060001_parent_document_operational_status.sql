begin;

create or replace function public.list_document_submission_operational_statuses()
returns table(
  submission_id uuid,
  operational_status text
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
      private.current_profile_role() = 'parent'
      or private.is_document_forms_manager()
      or private.has_forms_capability('forms.medical.view')
      or private.has_forms_capability('forms.medical.verify')
    ) then
    raise exception 'Document operational status listing denied.'
      using errcode = '42501';
  end if;

  return query
  with authorized_submissions as (
    select
      submissions.id,
      submissions.student_id,
      submissions.household_id,
      submissions.template_version_id,
      submissions.digital_status,
      submissions.lifecycle_status,
      submissions.expires_on,
      templates.document_kind,
      coalesce((
        select evidence.action = 'confirmed_on_file'
        from public.document_paper_evidence_events as evidence
        where evidence.submission_id = submissions.id
        order by evidence.occurred_at desc, evidence.id desc
        limit 1
      ), false) as paper_copy_on_file,
      coalesce((
        select reviews.action = 'accepted'
        from public.document_review_events as reviews
        where reviews.submission_id = submissions.id
          and reviews.action in (
            'accepted',
            'rejected',
            'replacement_requested'
          )
        order by reviews.occurred_at desc, reviews.id desc
        limit 1
      ), false) as digital_review_accepted,
      coalesce((
        select reviews.action = 'medical_verified'
        from public.document_review_events as reviews
        where reviews.submission_id = submissions.id
          and reviews.action in (
            'medical_verified',
            'medical_verification_revoked'
          )
        order by reviews.occurred_at desc, reviews.id desc
        limit 1
      ), false) as medical_authorized
    from public.student_document_submissions as submissions
    join public.document_template_versions as versions
      on versions.id = submissions.template_version_id
    join public.document_templates as templates
      on templates.id = versions.template_id
    where (
      templates.document_kind = 'medical_release'
      and (
        private.has_forms_capability('forms.medical.view')
        or private.has_forms_capability('forms.medical.verify')
      )
    ) or (
      templates.document_kind = 'permission_slip'
      and private.is_document_forms_manager()
    ) or (
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
  ), operational as (
    select
      authorized_submissions.*,
      (
        digital_status = 'accepted'
        and digital_review_accepted
      ) or paper_copy_on_file as has_completion_path,
      expires_on is not null
        and expires_on < current_date as expired
    from authorized_submissions
  )
  select
    operational.id,
    case
      when operational.lifecycle_status in ('superseded', 'archived')
        then 'retained_history'
      when operational.expired
        or operational.digital_status = 'needs_replacement'
        or operational.lifecycle_status = 'rejected'
        then 'parent_action_required'
      when operational.document_kind = 'medical_release'
        and operational.medical_authorized
        and operational.has_completion_path
        then 'complete'
      when operational.document_kind = 'permission_slip'
        and operational.has_completion_path
        then 'complete'
      when operational.digital_status in ('uploaded', 'accepted')
        or operational.paper_copy_on_file
        then 'ministry_processing'
      else 'parent_action_required'
    end
  from operational;
end;
$$;

revoke all on function public.list_document_submission_operational_statuses()
  from public, anon, authenticated;

grant execute on function public.list_document_submission_operational_statuses()
  to authenticated;

commit;
