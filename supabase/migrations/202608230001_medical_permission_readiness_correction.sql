begin;

alter table public.event_document_requirements drop constraint if exists event_document_requirements_event_id_template_id_key;
create unique index if not exists event_document_requirements_active_template on public.event_document_requirements(event_id,template_id) where archived_at is null;

create table public.school_year_medical_requirements (
  id uuid primary key default extensions.gen_random_uuid(),
  school_year_start date not null,
  school_year_end date not null,
  template_version_id uuid not null references public.document_template_versions(id),
  created_at timestamptz not null default now(),
  created_by_profile_id uuid not null references public.profiles(id),
  archived_at timestamptz,
  archived_by_profile_id uuid references public.profiles(id),
  constraint school_year_medical_requirement_dates check (
    school_year_start=make_date(extract(year from school_year_start)::integer,8,1)
    and school_year_end=(school_year_start+interval '1 year'-interval '1 day')::date
  ),
  constraint school_year_medical_requirement_archive check (
    (archived_at is null and archived_by_profile_id is null)
    or (archived_at is not null and archived_by_profile_id is not null)
  )
);
alter table public.school_year_medical_requirements enable row level security;
alter table public.school_year_medical_requirements force row level security;
revoke all on table public.school_year_medical_requirements from public,anon,authenticated;
create unique index school_year_medical_requirements_active_year
on public.school_year_medical_requirements(school_year_start) where archived_at is null;

create or replace function private.is_medical_forms_manager()
returns boolean language sql stable security definer set search_path='' set row_security=off as $$
  select private.current_profile_is_active()
    and private.current_profile_role() in ('platform_administrator','youth_pastor')
$$;

create or replace function private.is_document_forms_manager()
returns boolean language sql stable security definer set search_path='' set row_security=off as $$
  select private.is_medical_forms_manager()
$$;

create or replace function private.actor_is_document_forms_manager(p_profile_id uuid)
returns boolean language sql stable security definer set search_path='' set row_security=off as $$
  select exists(select 1 from public.profiles p where p.id=p_profile_id and p.status='active'
    and p.primary_role in ('platform_administrator','youth_pastor'))
$$;
create or replace function private.school_year_start_for(p_on date)
returns date language sql immutable set search_path='' as $$
  select make_date((extract(year from p_on)::integer-case when extract(month from p_on)<8 then 1 else 0 end),8,1)
$$;

create or replace function private.event_school_year_start(p_event_id uuid)
returns date language sql stable security definer set search_path='' set row_security=off as $$
  select private.school_year_start_for((e.starts_at at time zone e.timezone)::date)
  from public.events e where e.id=p_event_id
$$;

create or replace function private.validate_school_year_medical_requirement()
returns trigger language plpgsql security definer set search_path='' set row_security=off as $$
begin
  if not exists(
    select 1 from public.document_template_versions v
    join public.document_templates t on t.id=v.template_id
    where v.id=new.template_version_id and v.status='published'
      and t.document_kind='medical_release' and t.status='active'
  ) then raise exception 'The school-year medical form must pin an active published Medical Release version.' using errcode='23514'; end if;
  return new;
end $$;
create trigger school_year_medical_requirement_integrity before insert or update on public.school_year_medical_requirements
for each row execute function private.validate_school_year_medical_requirement();

create or replace function public.set_school_year_medical_requirement(p_school_year_start date,p_template_version_id uuid)
returns uuid language plpgsql security definer set search_path='' set row_security=off as $$
declare result uuid; prior uuid; begin
  if not private.is_medical_forms_manager() then raise exception 'Medical form configuration is denied.' using errcode='42501'; end if;
  if p_school_year_start<>private.school_year_start_for(p_school_year_start) then raise exception 'School year must begin August 1.' using errcode='22023'; end if;
  select id into prior from public.school_year_medical_requirements where school_year_start=p_school_year_start and archived_at is null for update;
  if prior is not null then
    update public.school_year_medical_requirements set archived_at=now(),archived_by_profile_id=auth.uid() where id=prior;
  end if;
  insert into public.school_year_medical_requirements(school_year_start,school_year_end,template_version_id,created_by_profile_id)
  values(p_school_year_start,(p_school_year_start+interval '1 year'-interval '1 day')::date,p_template_version_id,auth.uid()) returning id into result;
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata)
  values(auth.uid(),'forms.school_year_medical_requirement_set','school_year_medical_requirement',result,'success','web',
    jsonb_build_object('schoolYearStart',p_school_year_start,'templateVersionId',p_template_version_id,'replacedRequirement',prior is not null));
  return result;
end $$;

create or replace function public.set_event_permission_slip_requirement(p_event_id uuid,p_required boolean,p_template_version_id uuid default null)
returns uuid language plpgsql security definer set search_path='' set row_security=off as $$
declare result uuid; selected record; begin
  if not private.is_medical_forms_manager() then raise exception 'Permission-slip configuration is denied.' using errcode='42501'; end if;
  if not exists(select 1 from public.events where id=p_event_id and archived_at is null) then raise exception 'Event not found.' using errcode='P0002'; end if;
  if p_required then
    select v.template_id into selected from public.document_template_versions v join public.document_templates t on t.id=v.template_id
    where v.id=p_template_version_id and v.status='published' and t.status='active' and t.document_kind='permission_slip';
    if not found then raise exception 'A published Permission Slip version is required.' using errcode='22023'; end if;
  elsif p_template_version_id is not null then raise exception 'A version cannot be supplied when no permission slip is required.' using errcode='22023'; end if;
  update public.event_document_requirements r set archived_at=now(),archived_by_profile_id=auth.uid()
  where r.event_id=p_event_id and r.archived_at is null and exists(
    select 1 from public.document_templates t where t.id=r.template_id and t.document_kind='permission_slip');
  if p_required then
    insert into public.event_document_requirements(event_id,template_id,template_version_id,required,blocks_participation,created_by_profile_id)
    values(p_event_id,selected.template_id,p_template_version_id,true,true,auth.uid()) returning id into result;
  end if;
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata)
  values(auth.uid(),'forms.event_permission_requirement_changed','event',p_event_id,'success','web',
    jsonb_build_object('required',p_required,'templateVersionId',p_template_version_id));
  return result;
end $$;

create or replace function public.get_event_permission_slip_requirement(p_event_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' set row_security=off as $$
declare r record; begin
  if not private.current_profile_is_active() or not (
    private.is_medical_forms_manager() or exists(select 1 from public.event_registrations er
      join public.students s on s.id=er.student_id where er.event_id=p_event_id and er.status in ('registered','confirmed','waitlisted')
      and private.can_parent_access_student_document(s.id,s.primary_household_id))
  ) then raise exception 'Permission-slip requirement access is denied.' using errcode='42501'; end if;
  select edr.id,edr.template_version_id,t.name,v.version_number into r from public.event_document_requirements edr
  join public.document_templates t on t.id=edr.template_id join public.document_template_versions v on v.id=edr.template_version_id
  where edr.event_id=p_event_id and edr.archived_at is null and t.document_kind='permission_slip' limit 1;
  return jsonb_build_object('required',found,'requirementId',r.id,'templateVersionId',r.template_version_id,'templateName',r.name,'versionNumber',r.version_number);
end $$;

create or replace function private.submission_operational_state(p_student_id uuid,p_version_id uuid,p_school_start date default null)
returns jsonb language sql stable security definer set search_path='' set row_security=off as $$
with candidate as (
 select s.* from public.student_document_submissions s where s.student_id=p_student_id and s.template_version_id=p_version_id
 and s.lifecycle_status not in ('superseded','archived')
 and (p_school_start is null or (s.valid_from>=p_school_start and s.valid_from<=p_school_start+interval '1 year'-interval '1 day'))
 order by s.created_at desc limit 1
), state as (select c.*,
 coalesce((select e.action='confirmed_on_file' from public.document_paper_evidence_events e where e.submission_id=c.id order by e.occurred_at desc,e.id desc limit 1),false) paper,
 coalesce((select e.action='medical_verified' from public.document_review_events e where e.submission_id=c.id and e.action in ('medical_verified','medical_verification_revoked') order by e.occurred_at desc,e.id desc limit 1),false) verified
 from candidate c)
select jsonb_build_object('submissionId',id,'digitalStatus',digital_status,'lifecycleStatus',lifecycle_status,'paperCopyOnFile',paper,
 'medicalVerified',verified,'ready',digital_status='accepted' and paper and verified and (expires_on is null or expires_on>=current_date)) from state
$$;

create or replace function public.get_student_current_medical_form_status(p_student_id uuid,p_on date default current_date)
returns jsonb language plpgsql stable security definer set search_path='' set row_security=off as $$
declare req record; state jsonb; begin
  if not private.is_medical_forms_manager() then raise exception 'Medical form status access is denied.' using errcode='42501'; end if;
  select * into req from public.school_year_medical_requirements where school_year_start=private.school_year_start_for(p_on) and archived_at is null;
  if not found then return jsonb_build_object('studentId',p_student_id,'schoolYearStart',private.school_year_start_for(p_on),'configured',false,'ready',false); end if;
  state:=private.submission_operational_state(p_student_id,req.template_version_id,req.school_year_start);
  return jsonb_build_object('studentId',p_student_id,'schoolYearStart',req.school_year_start,'schoolYearEnd',req.school_year_end,
    'configured',true,'requirementId',req.id,'templateVersionId',req.template_version_id,'state',state,'ready',coalesce((state->>'ready')::boolean,false));
end $$;

create or replace function public.list_current_medical_form_status(p_on date default current_date)
returns table(student_id uuid,student_name text,household_id uuid,school_year_start date,school_year_end date,template_version_id uuid,submission_id uuid,ready boolean,state jsonb)
language plpgsql stable security definer set search_path='' set row_security=off as $$ begin
  if not private.is_medical_forms_manager() then raise exception 'Medical Forms workspace access is denied.' using errcode='42501'; end if;
  return query select s.id,concat_ws(' ',p.first_name,p.last_name),s.primary_household_id,r.school_year_start,r.school_year_end,r.template_version_id,
    nullif(st->>'submissionId','')::uuid,coalesce((st->>'ready')::boolean,false),st
  from public.students s join public.people p on p.id=s.person_id
  join public.school_year_medical_requirements r on r.school_year_start=private.school_year_start_for(p_on) and r.archived_at is null
  left join lateral private.submission_operational_state(s.id,r.template_version_id,r.school_year_start) st on true
  where s.status='active' order by p.last_name,p.first_name;
end $$;

create or replace function private.parent_may_use_document_version(p_student_id uuid,p_version_id uuid)
returns boolean language sql stable security definer set search_path='' set row_security=off as $$
 select private.can_parent_access_student_document(p_student_id,s.primary_household_id) and (
   exists(select 1 from public.school_year_medical_requirements r join public.document_template_versions v on v.id=r.template_version_id
     where r.template_version_id=p_version_id and r.archived_at is null and (r.school_year_start=private.school_year_start_for(current_date) or exists(select 1 from public.event_registrations medical_registration where medical_registration.student_id=p_student_id and medical_registration.status in ('registered','confirmed','waitlisted') and r.school_year_start=private.event_school_year_start(medical_registration.event_id))))
   or exists(select 1 from public.event_document_requirements r join public.document_templates t on t.id=r.template_id
     join public.event_registrations er on er.event_id=r.event_id and er.student_id=p_student_id and er.status in ('registered','confirmed','waitlisted')
     where r.template_version_id=p_version_id and r.archived_at is null and t.document_kind='permission_slip')
 ) from public.students s where s.id=p_student_id and s.status='active'
$$;

create or replace function private.require_document_template_manager()
returns void language plpgsql security definer set search_path='' set row_security=off as $$ begin
  if not private.is_document_forms_manager() then raise exception 'Document template management is denied.' using errcode='42501'; end if;
end $$;

create or replace function private.can_insert_form_template_master(p_object_name text)
returns boolean language sql stable security definer set search_path='' set row_security=off as $$
  select private.is_document_forms_manager() and exists(
    select 1 from public.document_template_versions v where v.status='draft'
      and v.blank_storage_bucket='form-template-masters' and v.blank_storage_object_path=p_object_name
      and v.content_type is null and v.file_size_bytes is null
      and p_object_name ~ ('^templates/'||v.template_id::text||'/'||v.id::text||'/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.pdf$'))
$$;

create or replace function private.can_manage_submission(p_submission_id uuid,p_require_content boolean default false)
returns boolean language sql stable security definer set search_path='' set row_security=off as $$
  select exists(
    select 1
    from public.student_document_submissions s
    join public.document_template_versions v on v.id=s.template_version_id
    join public.document_templates t on t.id=v.template_id
    where s.id=p_submission_id and (
      (private.current_profile_role()='parent'
        and private.can_parent_access_student_document(s.student_id,s.household_id)
        and private.parent_may_use_document_version(s.student_id,s.template_version_id))
      or (private.is_document_forms_manager() and
        (not p_require_content or t.document_kind='permission_slip'
          or private.is_medical_forms_manager()))
    )
  )
$$;

create or replace function private.can_insert_student_document(p_object_name text)
returns boolean language sql stable security definer set search_path='' set row_security=off as $$
  select private.current_profile_is_active() and exists(
    select 1 from public.student_document_submissions s join public.students student
      on student.id=s.student_id and student.primary_household_id=s.household_id and student.status<>'archived'
    where s.submitted_by_profile_id=auth.uid() and s.storage_bucket='student-documents' and s.storage_object_path=p_object_name
      and s.content_type is null and s.file_size_bytes is null and s.digital_status='missing' and s.lifecycle_status='digital_received'
      and ((s.upload_source='parent' and private.current_profile_role()='parent'
        and private.can_parent_access_student_document(s.student_id,s.household_id)
        and private.parent_may_use_document_version(s.student_id,s.template_version_id))
        or (s.upload_source='staff' and private.is_document_forms_manager()))
      and p_object_name ~ ('^submissions/'||s.student_id::text||'/'||s.id::text||'/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(pdf|jpg|png)$'))
$$;

create or replace function private.enforce_document_finalization_actor()
returns trigger language plpgsql security definer set search_path='' set row_security=off as $$ begin
  if old.digital_status='missing' and new.digital_status='uploaded' and new.upload_source='staff'
    and not private.actor_is_document_forms_manager(new.submitted_by_profile_id) then
    raise exception 'Document finalization actor is no longer authorized.' using errcode='42501'; end if;
  return new;
end $$;
create trigger document_finalization_actor_authority before update of digital_status on public.student_document_submissions
for each row execute function private.enforce_document_finalization_actor();
create or replace function private.enforce_document_submission_operational_authority()
returns trigger language plpgsql security definer set search_path='' set row_security=off as $$
declare kind public.document_kind; begin
 if auth.uid() is null or auth.role()='service_role' then return new; end if;
 select t.document_kind into kind from public.document_template_versions v join public.document_templates t on t.id=v.template_id where v.id=new.template_version_id;
 if kind in ('medical_release','permission_slip') and not (
   (new.upload_source='staff' and private.is_document_forms_manager())
   or (new.upload_source='parent' and private.parent_may_use_document_version(new.student_id,new.template_version_id))
 ) then raise exception 'Document upload is denied.' using errcode='42501'; end if;
 return new;
end $$;
create trigger document_submission_operational_authority before insert on public.student_document_submissions
for each row execute function private.enforce_document_submission_operational_authority();

create or replace function public.authorize_document_template_master_download(p_version_id uuid)
returns jsonb language plpgsql security definer set search_path='' set row_security=off as $$ declare selected record; begin
 select v.template_id,v.version_number,v.status,v.blank_storage_bucket,v.blank_storage_object_path,v.original_file_name,t.document_kind
 into selected from public.document_template_versions v join public.document_templates t on t.id=v.template_id
 where v.id=p_version_id and v.status='published' and v.content_type='application/pdf' and v.file_size_bytes is not null;
 if not found or not private.current_profile_is_active() or not (
   private.is_medical_forms_manager()
  
   or (private.current_profile_role()='parent' and exists(select 1 from public.students s where private.parent_may_use_document_version(s.id,p_version_id)))
 ) then raise exception 'Blank master download is denied.' using errcode='42501'; end if;
 insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata)
 values(auth.uid(),'forms.template_master_download_authorized','document_template_version',p_version_id,'success','web',
 jsonb_build_object('templateId',selected.template_id,'versionNumber',selected.version_number,'documentKind',selected.document_kind));
 return jsonb_build_object('bucket',selected.blank_storage_bucket,'objectPath',selected.blank_storage_object_path,'fileName',selected.original_file_name);
end $$;

create or replace function private.standing_medical_requirement_state(p_event_id uuid,p_student_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' set row_security=off as $$
declare school_start date; requirement record; state jsonb; begin
  school_start:=private.event_school_year_start(p_event_id);
  select r.*,t.name into requirement from public.school_year_medical_requirements r
  join public.document_template_versions v on v.id=r.template_version_id
  join public.document_templates t on t.id=v.template_id
  where r.school_year_start=school_start and r.archived_at is null;
  if not found then
    return jsonb_build_object('requirementId',null,'eventId',p_event_id,'templateVersionId',null,
      'templateName','Current school-year Medical Form','documentKind','medical_release','configured',false,
      'schoolYearStart',school_start,'required',true,'blocksParticipation',true,'ready',false,
      'missing',jsonb_build_array('medical_requirement_not_configured'));
  end if;
  state:=private.submission_operational_state(p_student_id,requirement.template_version_id,requirement.school_year_start);
  return jsonb_build_object('requirementId',requirement.id,'eventId',p_event_id,
    'templateVersionId',requirement.template_version_id,'templateName',requirement.name,
    'documentKind','medical_release','configured',true,'schoolYearStart',requirement.school_year_start,
    'required',true,'blocksParticipation',true,'ready',coalesce((state->>'ready')::boolean,false),
    'missing',case when state is null then jsonb_build_array('digital_copy_missing','paper_copy_missing','medical_verification_missing')
      else to_jsonb(array_remove(array[
        case when state->>'digitalStatus'='needs_replacement' then 'replacement_required'
          when state->>'digitalStatus'<>'accepted' then 'digital_copy_not_accepted' end,
        case when not coalesce((state->>'paperCopyOnFile')::boolean,false) then 'paper_copy_missing' end,
        case when not coalesce((state->>'medicalVerified')::boolean,false) then 'medical_verification_missing' end],null)) end);
end $$;

create or replace function public.authorize_document_submission_download(p_submission_id uuid)
returns jsonb language plpgsql security definer set search_path='' set row_security=off as $$ declare selected record; begin
 select s.*,t.document_kind into selected from public.student_document_submissions s join public.document_template_versions v on v.id=s.template_version_id join public.document_templates t on t.id=v.template_id where s.id=p_submission_id and s.content_type is not null and s.file_size_bytes is not null;
 if not found or not private.current_profile_is_active() or not (private.is_document_forms_manager() or (private.current_profile_role()='parent' and private.can_parent_access_student_document(selected.student_id,selected.household_id) and private.parent_may_use_document_version(selected.student_id,selected.template_version_id))) then raise exception 'Document download is denied.' using errcode='42501'; end if;
 insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata) values(auth.uid(),'forms.document_download_authorized','student_document_submission',p_submission_id,'success','web',jsonb_build_object('studentId',selected.student_id,'templateVersionId',selected.template_version_id,'documentKind',selected.document_kind));
 return jsonb_build_object('bucket',selected.storage_bucket,'objectPath',selected.storage_object_path,'fileName',selected.original_file_name,'contentType',selected.content_type);
end $$;

create or replace function private.record_document_review(p_submission_id uuid,p_action public.document_review_action,p_reason text)
returns void language plpgsql security definer set search_path='' set row_security=off as $$ declare kind public.document_kind; audit_action text; begin
 select t.document_kind into kind from public.student_document_submissions s join public.document_template_versions v on v.id=s.template_version_id join public.document_templates t on t.id=v.template_id where s.id=p_submission_id and s.content_type is not null and s.lifecycle_status not in ('superseded','archived');
 if not found or not private.is_document_forms_manager() then raise exception 'Document review denied.' using errcode='42501'; end if;
 if p_action in ('rejected','replacement_requested') and length(btrim(coalesce(p_reason,''))) not between 5 and 1000 then raise exception 'Review reason is required.' using errcode='22023'; end if;
 insert into public.document_review_events(submission_id,action,actor_profile_id,reason) values(p_submission_id,p_action,auth.uid(),nullif(btrim(coalesce(p_reason,'')),''));
 update public.student_document_submissions set digital_status=case when p_action='accepted' then 'accepted'::public.document_digital_status else 'needs_replacement'::public.document_digital_status end,lifecycle_status=case when p_action='accepted' then 'under_review'::public.document_lifecycle_status else 'rejected'::public.document_lifecycle_status end where id=p_submission_id and lifecycle_status not in ('superseded','archived');
 audit_action:=case p_action when 'accepted' then 'forms.document_accepted' when 'rejected' then 'forms.document_rejected' else 'forms.document_replacement_requested' end;
 insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata) values(auth.uid(),audit_action,'student_document_submission',p_submission_id,'success','web',jsonb_build_object('reviewAction',p_action));
end $$;

create or replace function private.record_medical_verification(p_submission_id uuid,p_action public.document_review_action,p_reason text)
returns void language plpgsql security definer set search_path='' set row_security=off as $$ begin
 if not private.is_medical_forms_manager() or not exists(select 1 from public.student_document_submissions s join public.document_template_versions v on v.id=s.template_version_id join public.document_templates t on t.id=v.template_id where s.id=p_submission_id and t.document_kind='medical_release' and s.content_type is not null and s.lifecycle_status not in ('superseded','archived') and (p_action='medical_verification_revoked' or (s.digital_status='accepted' and s.lifecycle_status='under_review' and (select e.action from public.document_review_events e where e.submission_id=s.id and e.action in ('accepted','rejected','replacement_requested') order by e.occurred_at desc,e.id desc limit 1)='accepted'))) then raise exception 'Medical verification denied.' using errcode='42501'; end if;
 if p_reason is not null and length(btrim(p_reason)) not between 5 and 1000 then raise exception 'Reason is invalid.' using errcode='22023'; end if;
 insert into public.document_review_events(submission_id,action,actor_profile_id,reason) values(p_submission_id,p_action,auth.uid(),nullif(btrim(coalesce(p_reason,'')),''));
 insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata) values(auth.uid(),case when p_action='medical_verified' then 'forms.medical_document_verified' else 'forms.medical_verification_revoked' end,'student_document_submission',p_submission_id,'success','web',jsonb_build_object('verificationAction',p_action));
end $$;
create or replace function public.list_available_document_versions()
returns table(student_id uuid,student_name text,household_id uuid,template_version_id uuid,template_name text,version_number integer,document_kind public.document_kind)
language plpgsql stable security definer set search_path='' set row_security=off as $$ begin
 if not private.current_profile_is_active() or not (private.current_profile_role()='parent' or private.is_document_forms_manager()) then raise exception 'Document upload options are denied.' using errcode='42501'; end if;
 return query select s.id,btrim(coalesce(p.preferred_name,p.first_name)||' '||p.last_name),s.primary_household_id,v.id,t.name,v.version_number,t.document_kind
 from public.students s join public.people p on p.id=s.person_id cross join public.document_templates t join public.document_template_versions v on v.template_id=t.id
 where s.status<>'archived' and t.status='active' and v.status='published' and ((t.document_kind='medical_release' and private.is_medical_forms_manager()) or (t.document_kind='permission_slip' and private.is_document_forms_manager()) or (private.current_profile_role()='parent' and private.parent_may_use_document_version(s.id,v.id)))
 order by p.last_name,p.first_name,t.name,v.version_number desc;
end $$;

create or replace function public.list_document_submissions()
returns table(submission_id uuid,student_id uuid,student_name text,household_id uuid,template_version_id uuid,template_name text,version_number integer,document_kind public.document_kind,upload_source public.document_upload_source,digital_status public.document_digital_status,lifecycle_status public.document_lifecycle_status,paper_copy_on_file boolean,review_state public.document_review_action,medical_verified boolean,expires_on date,supersedes_submission_id uuid,is_superseded boolean,original_file_name text)
language plpgsql stable security definer set search_path='' set row_security=off as $$ begin
 if not private.current_profile_is_active() or not (private.current_profile_role()='parent' or private.is_document_forms_manager()) then raise exception 'Submission listing denied.' using errcode='42501'; end if;
 return query select s.id,s.student_id,btrim(coalesce(p.preferred_name,p.first_name)||' '||p.last_name),s.household_id,s.template_version_id,t.name,v.version_number,t.document_kind,s.upload_source,s.digital_status,s.lifecycle_status,
 coalesce((select e.action='confirmed_on_file' from public.document_paper_evidence_events e where e.submission_id=s.id order by e.occurred_at desc,e.id desc limit 1),false),
 (select e.action from public.document_review_events e where e.submission_id=s.id and e.action in ('accepted','rejected','replacement_requested') order by e.occurred_at desc,e.id desc limit 1),
 case when t.document_kind='medical_release' and private.is_medical_forms_manager() then s.digital_status='accepted' and coalesce((select e.action='accepted' from public.document_review_events e where e.submission_id=s.id and e.action in ('accepted','rejected','replacement_requested') order by e.occurred_at desc,e.id desc limit 1),false) and coalesce((select e.action='medical_verified' from public.document_review_events e where e.submission_id=s.id and e.action in ('medical_verified','medical_verification_revoked') order by e.occurred_at desc,e.id desc limit 1),false) else false end,
 s.expires_on,s.supersedes_submission_id,s.lifecycle_status='superseded',s.original_file_name
 from public.student_document_submissions s join public.students st on st.id=s.student_id join public.people p on p.id=st.person_id join public.document_template_versions v on v.id=s.template_version_id join public.document_templates t on t.id=v.template_id
 where (t.document_kind='medical_release' and private.is_medical_forms_manager()) or (t.document_kind='permission_slip' and private.is_document_forms_manager()) or (private.current_profile_role()='parent' and private.can_parent_access_student_document(s.student_id,s.household_id) and private.parent_may_use_document_version(s.student_id,s.template_version_id))
 order by s.created_at desc;
end $$;

create or replace function private.record_document_paper_event(p_submission_id uuid,p_action public.paper_evidence_action,p_reason text)
returns void language plpgsql security definer set search_path='' set row_security=off as $$ declare kind public.document_kind; begin
 select t.document_kind into kind from public.student_document_submissions s join public.document_template_versions v on v.id=s.template_version_id join public.document_templates t on t.id=v.template_id where s.id=p_submission_id and s.lifecycle_status not in ('superseded','archived');
 if not found or not private.is_document_forms_manager() then raise exception 'Paper confirmation denied.' using errcode='42501'; end if;
 if p_reason is not null and length(btrim(p_reason)) not between 5 and 1000 then raise exception 'Reason is invalid.' using errcode='22023'; end if;
 insert into public.document_paper_evidence_events(submission_id,action,actor_profile_id,reason) values(p_submission_id,p_action,auth.uid(),nullif(btrim(coalesce(p_reason,'')),''));
 insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata) values(auth.uid(),case when p_action='confirmed_on_file' then 'forms.paper_copy_confirmed' else 'forms.paper_confirmation_revoked' end,'student_document_submission',p_submission_id,'success','web',jsonb_build_object('paperState',p_action));
end $$;

create or replace function private.validate_participation_override_scope()
returns trigger language plpgsql security definer set search_path='' set row_security=off as $$
declare selected record; valid_count integer; begin
 if tg_op='UPDATE' and new.event_id=old.event_id and new.registration_id=old.registration_id and new.student_id=old.student_id and new.unmet_requirement_ids=old.unmet_requirement_ids then return new; end if;
 select event_id,student_id into selected from public.event_registrations where id=new.registration_id;
 if selected.event_id is distinct from new.event_id or selected.student_id is distinct from new.student_id then raise exception 'Participation override must match its Event Registration and student.' using errcode='23514'; end if;
 if cardinality(new.unmet_requirement_ids) is distinct from (select count(distinct id) from unnest(new.unmet_requirement_ids) id) then raise exception 'Participation override requirement identifiers must be unique.' using errcode='23514'; end if;
 select count(*) into valid_count from unnest(new.unmet_requirement_ids) x(id) where
   exists(select 1 from public.event_document_requirements r where r.id=x.id and r.event_id=new.event_id and r.archived_at is null)
   or exists(select 1 from public.school_year_medical_requirements r where r.id=x.id and r.school_year_start=private.event_school_year_start(new.event_id) and r.archived_at is null);
 if valid_count<>cardinality(new.unmet_requirement_ids) then raise exception 'Participation override requirements must be active Event or standing medical requirements.' using errcode='23514'; end if;
 return new;
end $$;

create or replace function private.current_participation_override(p_registration_id uuid,p_unmet_ids uuid[])
returns uuid language sql stable security definer set search_path='' set row_security=off as $$
 select o.id from public.event_participation_overrides o join public.event_registrations r on r.id=o.registration_id and r.event_id=o.event_id and r.student_id=o.student_id
 where o.registration_id=p_registration_id and r.status in ('registered','confirmed') and o.revoked_at is null and (o.expires_at is null or o.expires_at>now())
 and o.unmet_requirement_ids<@p_unmet_ids and p_unmet_ids<@o.unmet_requirement_ids and not exists(
   select 1 from unnest(o.unmet_requirement_ids) x(id) where not (
     exists(select 1 from public.event_document_requirements requirement where requirement.id=x.id and requirement.archived_at is null and requirement.event_id=o.event_id)
     or exists(select 1 from public.school_year_medical_requirements medical where medical.id=x.id and medical.school_year_start=private.event_school_year_start(o.event_id) and medical.archived_at is null)))
 order by o.created_at desc limit 1
$$;
create or replace function private.registration_document_readiness(p_registration_id uuid)
returns jsonb language sql stable security definer set search_path='' set row_security=off as $$
with registration as (select id,event_id,student_id,status from public.event_registrations where id=p_registration_id),
states as (
 select private.document_requirement_state(r.id,registration.student_id) state from registration join public.event_document_requirements r on r.event_id=registration.event_id where r.archived_at is null and r.required
 union all select private.standing_medical_requirement_state(registration.event_id,registration.student_id) from registration
), filtered as (select state from states where state is not null), aggregate_state as (
 select coalesce(bool_and((state->>'ready')::boolean),true) ready,coalesce(jsonb_agg(state order by state->>'templateName'),'[]'::jsonb) requirements from filtered)
select jsonb_build_object('registrationId',registration.id,'eventId',registration.event_id,'studentId',registration.student_id,
 'registrationStatus',registration.status,'ready',aggregate_state.ready,'requirements',aggregate_state.requirements) from registration cross join aggregate_state
$$;

revoke all on function private.is_medical_forms_manager(),private.is_document_forms_manager(),private.actor_is_document_forms_manager(uuid),private.school_year_start_for(date),private.event_school_year_start(uuid),private.validate_school_year_medical_requirement(),
 private.submission_operational_state(uuid,uuid,date),private.parent_may_use_document_version(uuid,uuid),
 private.enforce_document_submission_operational_authority(),private.enforce_document_finalization_actor(),private.standing_medical_requirement_state(uuid,uuid),private.require_document_template_manager() from public,anon,authenticated;
revoke all on function public.set_school_year_medical_requirement(date,uuid),public.set_event_permission_slip_requirement(uuid,boolean,uuid),
 public.get_event_permission_slip_requirement(uuid),public.get_student_current_medical_form_status(uuid,date),public.list_current_medical_form_status(date) from public,anon,authenticated;
grant execute on function public.set_school_year_medical_requirement(date,uuid),public.set_event_permission_slip_requirement(uuid,boolean,uuid),
 public.get_event_permission_slip_requirement(uuid),public.get_student_current_medical_form_status(uuid,date),public.list_current_medical_form_status(date) to authenticated;

commit;
