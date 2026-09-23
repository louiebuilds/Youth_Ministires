begin;

-- The retained Phase 1 deferred invariant executes at transaction end under
-- the RPC caller. Preserve the invariant while allowing protected workflows
-- to complete against deny-by-default tables.
create or replace function private.validate_document_submission_chain_lifecycle()
returns trigger language plpgsql security definer set search_path='' set row_security=off as $$ declare has_replacement boolean; begin
  select exists(select 1 from public.student_document_submissions where supersedes_submission_id=new.id)
    into has_replacement;
  if (new.lifecycle_status='superseded') is distinct from has_replacement then
    raise exception 'Submission lifecycle must agree with its retained replacement chain.' using errcode='23514';
  end if;
  return null;
end $$;

create or replace function private.can_parent_access_student_document(p_student_id uuid,p_household_id uuid)
returns boolean language sql stable security definer set search_path='' set row_security=off as $$
  select private.current_profile_is_active()
    and private.current_profile_role()='parent'
    and exists(select 1 from public.students where id=p_student_id and primary_household_id=p_household_id)
    and private.can_view_household(p_household_id)
$$;

create or replace function private.actor_has_forms_capability(
  p_actor_profile_id uuid,p_capability public.forms_capability)
returns boolean language sql stable security definer set search_path='' set row_security=off as $$
  select exists(
    select 1 from public.profiles p where p.id=p_actor_profile_id and p.status='active' and (
      p.primary_role in ('platform_administrator','youth_pastor')
      or (p.primary_role='staff_member' and p_capability in (
        'forms.documents.manage','forms.documents.paper_confirm',
        'custom_forms.manage','custom_forms.submit','visitor_cards.manage'))
      or (p.primary_role in ('parent','volunteer') and p_capability='custom_forms.submit')
      or (p.primary_role='staff_member' and exists(
        select 1 from public.profile_capability_grants g
        where g.profile_id=p.id and g.capability=p_capability and g.revoked_at is null
          and (g.expires_at is null or g.expires_at>now())
      ))
    )
  )
$$;

create or replace function private.actor_can_access_student_household(
  p_actor_profile_id uuid,p_student_id uuid,p_household_id uuid)
returns boolean language sql stable security definer set search_path='' set row_security=off as $$
  select exists(
    select 1 from public.profiles p
    join public.students s on s.id=p_student_id and s.primary_household_id=p_household_id
    where p.id=p_actor_profile_id and p.status='active' and p.primary_role='parent'
      and (
        exists(select 1 from public.household_memberships hm
          where hm.person_id=p.person_id and hm.household_id=p_household_id)
        or exists(select 1 from public.student_relationships sr
          where sr.person_id=p.person_id and sr.student_id=p_student_id
            and sr.may_view_student_information)
      )
  )
$$;

create or replace function private.can_manage_submission(p_submission_id uuid,p_require_content boolean default false)
returns boolean language sql stable security definer set search_path='' set row_security=off as $$
  select exists(
    select 1 from public.student_document_submissions s
    join public.document_template_versions v on v.id=s.template_version_id
    join public.document_templates t on t.id=v.template_id
    where s.id=p_submission_id and (
      private.can_parent_access_student_document(s.student_id,s.household_id)
      or (private.has_forms_capability('forms.documents.manage') and
        (not p_require_content or t.document_kind='permission_slip'
          or private.has_forms_capability('forms.medical.view')))
    )
  )
$$;

create or replace function public.authorize_document_template_master_download(p_version_id uuid)
returns jsonb language plpgsql security definer set search_path='' set row_security=off as $$ declare selected record; begin
  select v.template_id,v.version_number,v.status,v.blank_storage_bucket,v.blank_storage_object_path,v.original_file_name
  into selected from public.document_template_versions v where v.id=p_version_id
    and v.status='published' and v.content_type='application/pdf' and v.file_size_bytes is not null;
  if not found or not private.current_profile_is_active() or not (
    private.has_forms_capability('forms.documents.manage') or
    (private.current_profile_role()='parent' and exists(
      select 1 from public.students s where s.status<>'archived'
        and private.can_parent_access_student_document(s.id,s.primary_household_id)
    ))
  ) then raise exception 'Blank master download is denied.' using errcode='42501'; end if;
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata)
  values(auth.uid(),'forms.template_master_download_authorized','document_template_version',p_version_id,'success','web',
    jsonb_build_object('templateId',selected.template_id,'versionNumber',selected.version_number,'status',selected.status));
  return jsonb_build_object('bucket',selected.blank_storage_bucket,'objectPath',selected.blank_storage_object_path,
    'fileName',selected.original_file_name);
end $$;

create or replace function public.prepare_document_submission_upload(
  p_student_id uuid,p_template_version_id uuid,p_object_id uuid,p_extension text,
  p_supersedes_submission_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' set row_security=off as $$
declare selected record; prior record; submission_id uuid:=extensions.gen_random_uuid(); source public.document_upload_source; object_path text; begin
  if not private.current_profile_is_active() or p_extension not in ('pdf','jpg','png') then
    raise exception 'Document upload is denied.' using errcode='42501';
  end if;
  select s.primary_household_id household_id,v.id version_id,v.status version_status,v.validity_policy,v.valid_for,v.explicit_expires_on
  into selected from public.students s join public.document_template_versions v on v.id=p_template_version_id
  where s.id=p_student_id and s.status<>'archived' and v.status in ('published','retired');
  if not found then raise exception 'Student or published template version not found.' using errcode='P0002'; end if;
  if selected.version_status='retired' and p_supersedes_submission_id is null then
    raise exception 'Retired versions may only receive a retained replacement.' using errcode='22023'; end if;
  if private.current_profile_role()='parent' then
    if not private.can_parent_access_student_document(p_student_id,selected.household_id) then
      raise exception 'Parent document upload is denied.' using errcode='42501';
    end if; source:='parent';
  elsif private.has_forms_capability('forms.documents.manage') then source:='staff';
  else raise exception 'Document upload is denied.' using errcode='42501'; end if;
  if p_supersedes_submission_id is not null then
    select * into prior from public.student_document_submissions where id=p_supersedes_submission_id for update;
    if not found or prior.student_id<>p_student_id or prior.household_id<>selected.household_id
      or prior.template_version_id<>p_template_version_id or prior.lifecycle_status='superseded'
      or (source='parent' and prior.digital_status<>'needs_replacement' and prior.lifecycle_status<>'rejected') then
      raise exception 'Document replacement is invalid.' using errcode='22023';
    end if;
  end if;
  object_path:='submissions/'||p_student_id::text||'/'||submission_id::text||'/'||p_object_id::text||'.'||p_extension;
  if p_supersedes_submission_id is not null then
    update public.student_document_submissions set lifecycle_status='superseded',superseded_at=now()
    where id=p_supersedes_submission_id;
  end if;
  insert into public.student_document_submissions(id,student_id,household_id,template_version_id,upload_source,
    submitted_by_profile_id,storage_bucket,storage_object_path,valid_from,expires_on,supersedes_submission_id)
  values(submission_id,p_student_id,selected.household_id,p_template_version_id,source,auth.uid(),
    'student-documents',object_path,current_date,
    case when selected.validity_policy='explicit_expiration' then selected.explicit_expires_on
      when selected.validity_policy='fixed_interval' then (current_date+selected.valid_for)::date else null end,
    p_supersedes_submission_id);
  return jsonb_build_object('submissionId',submission_id,'bucket','student-documents','objectPath',object_path);
end $$;

create or replace function public.authorize_document_submission_finalization(p_submission_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' set row_security=off as $$ declare selected record; begin
  select * into selected from public.student_document_submissions where id=p_submission_id;
  if not found or selected.submitted_by_profile_id<>auth.uid() or selected.digital_status<>'missing'
    or selected.content_type is not null or not private.can_manage_submission(p_submission_id,false) then
    raise exception 'Document finalization is denied.' using errcode='42501';
  end if;
  return jsonb_build_object('bucket',selected.storage_bucket,'objectPath',selected.storage_object_path,
    'actorProfileId',auth.uid());
end $$;

create or replace function public.finalize_document_submission_upload(
  p_submission_id uuid,p_actor_profile_id uuid,p_original_file_name text,p_content_type text,
  p_file_size_bytes bigint,p_checksum_sha256 text)
returns void language plpgsql security definer set search_path='' set row_security=off as $$ declare selected record; stored record; action_name text; begin
  if auth.role()<>'service_role' then raise exception 'Trusted finalization required.' using errcode='42501'; end if;
  select * into selected from public.student_document_submissions where id=p_submission_id for update;
  if not found or selected.submitted_by_profile_id<>p_actor_profile_id or selected.digital_status<>'missing'
    or selected.lifecycle_status<>'digital_received' or selected.storage_bucket<>'student-documents'
    or selected.storage_object_path is null or selected.content_type is not null
    or p_content_type not in ('application/pdf','image/jpeg','image/png')
    or p_file_size_bytes not between 1 and 20971520 or p_checksum_sha256 !~ '^[0-9a-f]{64}$'
    or p_original_file_name is distinct from btrim(p_original_file_name)
    or length(p_original_file_name) not between 5 and 160
    or p_original_file_name ~ '[[:cntrl:]/\\]'
    or (p_content_type='application/pdf' and p_original_file_name !~ '^[[:alnum:] _().-]+\.pdf$')
    or (p_content_type='image/jpeg' and p_original_file_name !~ '^[[:alnum:] _().-]+\.jpg$')
    or (p_content_type='image/png' and p_original_file_name !~ '^[[:alnum:] _().-]+\.png$') then
    raise exception 'Completed document metadata is invalid.' using errcode='22023';
  end if;
  if (p_content_type='application/pdf' and selected.storage_object_path !~ '\.pdf$')
    or (p_content_type='image/jpeg' and selected.storage_object_path !~ '\.jpg$')
    or (p_content_type='image/png' and selected.storage_object_path !~ '\.png$') then
    raise exception 'Completed document path does not match validated content.' using errcode='22023'; end if;
  if not (
    (selected.upload_source='staff' and private.actor_has_forms_capability(
      p_actor_profile_id,'forms.documents.manage'))
    or (selected.upload_source='parent' and private.actor_can_access_student_household(
      p_actor_profile_id,selected.student_id,selected.household_id))
  ) then raise exception 'Document actor authorization is no longer valid.' using errcode='42501'; end if;
  select metadata into stored from storage.objects where bucket_id='student-documents' and name=selected.storage_object_path;
  if not found or coalesce(stored.metadata->>'mimetype','')<>p_content_type
    or coalesce((stored.metadata->>'size')::bigint,0)<>p_file_size_bytes then
    raise exception 'Uploaded completed document could not be verified.' using errcode='22023'; end if;
  update public.student_document_submissions set original_file_name=p_original_file_name,content_type=p_content_type,
    file_size_bytes=p_file_size_bytes,checksum_sha256=p_checksum_sha256,digital_status='uploaded'
  where id=p_submission_id;
  action_name:=case when selected.supersedes_submission_id is not null then 'forms.document_replacement_uploaded'
    when selected.upload_source='parent' then 'forms.parent_document_uploaded' else 'forms.staff_document_uploaded' end;
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata)
  values(p_actor_profile_id,action_name,'student_document_submission',p_submission_id,'success','web',
    jsonb_build_object('studentId',selected.student_id,'templateVersionId',selected.template_version_id,
      'mimeCategory',case when p_content_type='application/pdf' then 'pdf' else 'image' end,'byteCount',p_file_size_bytes));
end $$;

create or replace function public.authorize_document_submission_download(p_submission_id uuid)
returns jsonb language plpgsql security definer set search_path='' set row_security=off as $$ declare selected record; begin
  select s.*,t.document_kind into selected from public.student_document_submissions s
  join public.document_template_versions v on v.id=s.template_version_id join public.document_templates t on t.id=v.template_id
  where s.id=p_submission_id and s.content_type is not null and s.file_size_bytes is not null;
  if not found or not private.current_profile_is_active() or not (
    private.can_parent_access_student_document(selected.student_id,selected.household_id)
    or (selected.document_kind='permission_slip' and private.has_forms_capability('forms.documents.manage'))
    or (selected.document_kind='medical_release' and private.has_forms_capability('forms.medical.view'))
  ) then raise exception 'Document download is denied.' using errcode='42501'; end if;
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata)
  values(auth.uid(),'forms.document_download_authorized','student_document_submission',p_submission_id,'success','web',
    jsonb_build_object('studentId',selected.student_id,'templateVersionId',selected.template_version_id,
      'documentKind',selected.document_kind));
  return jsonb_build_object('bucket',selected.storage_bucket,'objectPath',selected.storage_object_path,
    'fileName',selected.original_file_name,'contentType',selected.content_type);
end $$;

create or replace function private.record_document_paper_event(p_submission_id uuid,p_action public.paper_evidence_action,p_reason text)
returns void language plpgsql security definer set search_path='' set row_security=off as $$ begin
  if not private.has_forms_capability('forms.documents.paper_confirm') then raise exception 'Paper confirmation denied.' using errcode='42501'; end if;
  if p_reason is not null and length(btrim(p_reason)) not between 5 and 1000 then raise exception 'Reason is invalid.' using errcode='22023'; end if;
  if not exists(select 1 from public.student_document_submissions where id=p_submission_id and lifecycle_status not in ('superseded','archived')) then raise exception 'Submission not found.' using errcode='P0002'; end if;
  insert into public.document_paper_evidence_events(submission_id,action,actor_profile_id,reason)
  values(p_submission_id,p_action,auth.uid(),nullif(btrim(coalesce(p_reason,'')),''));
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata)
  values(auth.uid(),case when p_action='confirmed_on_file' then 'forms.paper_copy_confirmed' else 'forms.paper_confirmation_revoked' end,
    'student_document_submission',p_submission_id,'success','web',jsonb_build_object('paperState',p_action));
end $$;
create or replace function public.confirm_document_paper_copy(p_submission_id uuid,p_reason text default null)
returns void language sql security definer set search_path='' as $$select private.record_document_paper_event(p_submission_id,'confirmed_on_file',p_reason)$$;
create or replace function public.revoke_document_paper_confirmation(p_submission_id uuid,p_reason text)
returns void language sql security definer set search_path='' as $$select private.record_document_paper_event(p_submission_id,'confirmation_revoked',p_reason)$$;

create or replace function private.record_document_review(p_submission_id uuid,p_action public.document_review_action,p_reason text)
returns void language plpgsql security definer set search_path='' set row_security=off as $$ declare kind public.document_kind; audit_action text; begin
  select t.document_kind into kind from public.student_document_submissions s join public.document_template_versions v on v.id=s.template_version_id
  join public.document_templates t on t.id=v.template_id where s.id=p_submission_id
    and s.content_type is not null and s.lifecycle_status not in ('superseded','archived');
  if not found or not private.has_forms_capability('forms.documents.manage') or
    (kind='medical_release' and not private.has_forms_capability('forms.medical.view')) then
    raise exception 'Document review denied.' using errcode='42501'; end if;
  if p_action in ('rejected','replacement_requested') and length(btrim(coalesce(p_reason,''))) not between 5 and 1000 then
    raise exception 'Review reason is required.' using errcode='22023'; end if;
  insert into public.document_review_events(submission_id,action,actor_profile_id,reason)
  values(p_submission_id,p_action,auth.uid(),nullif(btrim(coalesce(p_reason,'')),''));
  update public.student_document_submissions set
    digital_status=case when p_action='accepted' then 'accepted'::public.document_digital_status else 'needs_replacement'::public.document_digital_status end,
    lifecycle_status=case when p_action='accepted' then 'under_review'::public.document_lifecycle_status else 'rejected'::public.document_lifecycle_status end
  where id=p_submission_id and lifecycle_status not in ('superseded','archived');
  audit_action:=case p_action when 'accepted' then 'forms.document_accepted' when 'rejected' then 'forms.document_rejected' else 'forms.document_replacement_requested' end;
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata)
  values(auth.uid(),audit_action,'student_document_submission',p_submission_id,'success','web',jsonb_build_object('reviewAction',p_action));
end $$;
create or replace function public.accept_document_submission(p_submission_id uuid,p_reason text default null)
returns void language sql security definer set search_path='' as $$select private.record_document_review(p_submission_id,'accepted',p_reason)$$;
create or replace function public.reject_document_submission(p_submission_id uuid,p_reason text)
returns void language sql security definer set search_path='' as $$select private.record_document_review(p_submission_id,'rejected',p_reason)$$;
create or replace function public.request_document_replacement(p_submission_id uuid,p_reason text)
returns void language sql security definer set search_path='' as $$select private.record_document_review(p_submission_id,'replacement_requested',p_reason)$$;

create or replace function private.record_medical_verification(p_submission_id uuid,p_action public.document_review_action,p_reason text)
returns void language plpgsql security definer set search_path='' set row_security=off as $$ begin
  if not private.has_forms_capability('forms.medical.verify') or not exists(
    select 1 from public.student_document_submissions s join public.document_template_versions v on v.id=s.template_version_id
    join public.document_templates t on t.id=v.template_id where s.id=p_submission_id and t.document_kind='medical_release'
      and s.content_type is not null and s.lifecycle_status not in ('superseded','archived')
      and (p_action='medical_verification_revoked' or (
        s.digital_status='accepted' and s.lifecycle_status='under_review'
        and (select e.action from public.document_review_events e
          where e.submission_id=s.id and e.action in ('accepted','rejected','replacement_requested')
          order by e.occurred_at desc,e.id desc limit 1)='accepted'
      ))) then
    raise exception 'Medical verification denied.' using errcode='42501'; end if;
  if p_reason is not null and length(btrim(p_reason)) not between 5 and 1000 then raise exception 'Reason is invalid.' using errcode='22023'; end if;
  insert into public.document_review_events(submission_id,action,actor_profile_id,reason)
  values(p_submission_id,p_action,auth.uid(),nullif(btrim(coalesce(p_reason,'')),''));
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata)
  values(auth.uid(),case when p_action='medical_verified' then 'forms.medical_document_verified' else 'forms.medical_verification_revoked' end,
    'student_document_submission',p_submission_id,'success','web',jsonb_build_object('verificationAction',p_action));
end $$;
create or replace function public.verify_medical_document(p_submission_id uuid,p_reason text default null)
returns void language sql security definer set search_path='' as $$select private.record_medical_verification(p_submission_id,'medical_verified',p_reason)$$;
create or replace function public.revoke_medical_verification(p_submission_id uuid,p_reason text)
returns void language sql security definer set search_path='' as $$select private.record_medical_verification(p_submission_id,'medical_verification_revoked',p_reason)$$;

create or replace function public.list_document_submissions()
returns table(submission_id uuid,student_id uuid,student_name text,household_id uuid,template_version_id uuid,template_name text,version_number integer,
  document_kind public.document_kind,upload_source public.document_upload_source,digital_status public.document_digital_status,
  lifecycle_status public.document_lifecycle_status,paper_copy_on_file boolean,review_state public.document_review_action,
  medical_verified boolean,expires_on date,supersedes_submission_id uuid,is_superseded boolean,original_file_name text)
language plpgsql stable security definer set search_path='' set row_security=off as $$ begin
  if not private.current_profile_is_active() or not (
    private.current_profile_role()='parent' or private.has_forms_capability('forms.documents.manage')) then
    raise exception 'Submission listing denied.' using errcode='42501'; end if;
  return query select s.id,s.student_id,btrim(coalesce(p.preferred_name,p.first_name)||' '||p.last_name),s.household_id,s.template_version_id,t.name,v.version_number,t.document_kind,s.upload_source,
    s.digital_status,s.lifecycle_status,
    coalesce((select e.action='confirmed_on_file' from public.document_paper_evidence_events e where e.submission_id=s.id order by e.occurred_at desc,e.id desc limit 1),false),
    (select e.action from public.document_review_events e where e.submission_id=s.id and e.action in ('accepted','rejected','replacement_requested') order by e.occurred_at desc,e.id desc limit 1),
    case when private.has_forms_capability('forms.medical.view') then
      s.digital_status='accepted' and s.lifecycle_status='under_review'
      and coalesce((select e.action='accepted' from public.document_review_events e
        where e.submission_id=s.id and e.action in ('accepted','rejected','replacement_requested')
        order by e.occurred_at desc,e.id desc limit 1),false)
      and coalesce((select e.action='medical_verified' from public.document_review_events e
        where e.submission_id=s.id and e.action in ('medical_verified','medical_verification_revoked')
        order by e.occurred_at desc,e.id desc limit 1),false)
      else false end,
    s.expires_on,s.supersedes_submission_id,s.lifecycle_status='superseded',
    case when t.document_kind='permission_slip' or private.has_forms_capability('forms.medical.view')
      or private.can_parent_access_student_document(s.student_id,s.household_id) then s.original_file_name else null end
  from public.student_document_submissions s join public.students st on st.id=s.student_id join public.people p on p.id=st.person_id
  join public.document_template_versions v on v.id=s.template_version_id
  join public.document_templates t on t.id=v.template_id
  where private.has_forms_capability('forms.documents.manage') or private.can_parent_access_student_document(s.student_id,s.household_id)
  order by s.created_at desc;
end $$;

create or replace function public.list_available_document_versions()
returns table(student_id uuid,student_name text,household_id uuid,template_version_id uuid,template_name text,
  version_number integer,document_kind public.document_kind)
language plpgsql stable security definer set search_path='' set row_security=off as $$ begin
  if not private.current_profile_is_active() or not (
    private.current_profile_role()='parent' or private.has_forms_capability('forms.documents.manage')) then
    raise exception 'Document upload options are denied.' using errcode='42501'; end if;
  return query select s.id,btrim(coalesce(p.preferred_name,p.first_name)||' '||p.last_name),s.primary_household_id,
    v.id,t.name,v.version_number,t.document_kind
  from public.students s join public.people p on p.id=s.person_id cross join public.document_templates t
  join public.document_template_versions v on v.template_id=t.id
  where s.status<>'archived' and t.status='active' and v.status='published'
    and (private.has_forms_capability('forms.documents.manage') or private.can_parent_access_student_document(s.id,s.primary_household_id))
  order by p.last_name,p.first_name,t.name,v.version_number desc;
end $$;

revoke all on function private.can_parent_access_student_document(uuid,uuid),
 private.actor_has_forms_capability(uuid,public.forms_capability),private.actor_can_access_student_household(uuid,uuid,uuid),
 private.can_manage_submission(uuid,boolean),
 private.record_document_paper_event(uuid,public.paper_evidence_action,text),private.record_document_review(uuid,public.document_review_action,text),
 private.record_medical_verification(uuid,public.document_review_action,text) from public,anon,authenticated;
grant execute on function private.can_parent_access_student_document(uuid,uuid),private.can_manage_submission(uuid,boolean) to authenticated;
revoke all on function public.prepare_document_submission_upload(uuid,uuid,uuid,text,uuid),public.authorize_document_submission_finalization(uuid),
 public.finalize_document_submission_upload(uuid,uuid,text,text,bigint,text),public.authorize_document_submission_download(uuid),
 public.confirm_document_paper_copy(uuid,text),public.revoke_document_paper_confirmation(uuid,text),public.accept_document_submission(uuid,text),
 public.reject_document_submission(uuid,text),public.request_document_replacement(uuid,text),public.verify_medical_document(uuid,text),
 public.revoke_medical_verification(uuid,text),public.list_document_submissions(),public.list_available_document_versions() from public,anon,authenticated;
grant execute on function public.prepare_document_submission_upload(uuid,uuid,uuid,text,uuid),public.authorize_document_submission_finalization(uuid),
 public.authorize_document_submission_download(uuid),public.confirm_document_paper_copy(uuid,text),public.revoke_document_paper_confirmation(uuid,text),
 public.accept_document_submission(uuid,text),public.reject_document_submission(uuid,text),public.request_document_replacement(uuid,text),
 public.verify_medical_document(uuid,text),public.revoke_medical_verification(uuid,text),public.list_document_submissions(),
 public.list_available_document_versions() to authenticated;
grant execute on function public.finalize_document_submission_upload(uuid,uuid,text,text,bigint,text) to service_role;

commit;
