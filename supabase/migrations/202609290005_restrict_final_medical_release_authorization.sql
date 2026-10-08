begin;

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
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  select profiles.primary_role
  into v_actor_role
  from public.profiles as profiles
  where profiles.id = (select auth.uid())
    and profiles.status = 'active';

  if v_actor_role is null
    or v_actor_role not in ('platform_administrator', 'youth_pastor')
    or not exists (
    select 1
    from public.student_document_submissions as submissions
    join public.document_template_versions as versions
      on versions.id = submissions.template_version_id
    join public.document_templates as templates
      on templates.id = versions.template_id
    where submissions.id = p_submission_id
      and templates.document_kind = 'medical_release'
      and submissions.content_type is not null
      and submissions.lifecycle_status not in ('superseded', 'archived')
      and (
        p_action = 'medical_verification_revoked'
        or (
          p_action = 'medical_verified'
          and submissions.digital_status = 'accepted'
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
    raise exception 'Medical authorization denied.' using errcode = '42501';
  end if;

  if p_action = 'medical_verified'
    and v_actor_role = 'platform_administrator'
    and (v_reason is null or length(v_reason) not between 5 and 1000) then
    raise exception 'Backup authorization note is required.' using errcode = '22023';
  end if;

  if p_action = 'medical_verification_revoked'
    and (v_reason is null or length(v_reason) not between 5 and 1000) then
    raise exception 'Revocation reason is required.' using errcode = '22023';
  end if;

  if p_action = 'medical_verified'
    and v_actor_role = 'youth_pastor'
    and v_reason is not null
    and length(v_reason) not between 5 and 1000 then
    raise exception 'Reason is invalid.' using errcode = '22023';
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
      when p_action = 'medical_verified' then 'medical_release.authorized'
      else 'forms.medical_verification_revoked'
    end,
    'student_document_submission',
    p_submission_id,
    'success',
    'web',
    case
      when p_action = 'medical_verified' then jsonb_strip_nulls(
        jsonb_build_object(
          'submissionId', p_submission_id,
          'approvalMethod', case
            when v_actor_role = 'youth_pastor' then 'youth_pastor'
            else 'platform_administrator_backup'
          end,
          'backupAuthorizationNote', case
            when v_actor_role = 'platform_administrator' then v_reason
            else null
          end
        )
      )
      else jsonb_build_object('verificationAction', p_action)
    end
  );
end;
$$;

revoke all on function private.record_medical_verification(
  uuid,
  public.document_review_action,
  text
) from public, anon, authenticated;

revoke all on function public.verify_medical_document(uuid, text)
  from public, anon, authenticated;
revoke all on function public.revoke_medical_verification(uuid, text)
  from public, anon, authenticated;

grant execute on function public.verify_medical_document(uuid, text)
  to authenticated;
grant execute on function public.revoke_medical_verification(uuid, text)
  to authenticated;

commit;
