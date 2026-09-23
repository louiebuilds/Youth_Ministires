begin;

create unique index custom_form_submission_student_once_idx on public.custom_form_submissions(assignment_id,subject_student_id)
  where subject_student_id is not null;
create unique index custom_form_submission_household_once_idx on public.custom_form_submissions(assignment_id,subject_household_id)
  where subject_household_id is not null and subject_student_id is null;
create unique index custom_form_submission_volunteer_once_idx on public.custom_form_submissions(assignment_id,subject_volunteer_profile_id)
  where subject_volunteer_profile_id is not null;
create unique index custom_form_submission_general_once_idx on public.custom_form_submissions(assignment_id,submitted_by_profile_id)
  where subject_student_id is null and subject_household_id is null and subject_volunteer_profile_id is null;

create or replace function private.prevent_completed_custom_form_answer_delete()
returns trigger language plpgsql security definer set search_path='' set row_security=off as $$ begin
  if exists(select 1 from public.custom_form_submissions where id=old.submission_id and status<>'draft') then
    raise exception 'Answers for completed Custom Forms are immutable.' using errcode='55000'; end if;
  return old;
end $$;
create trigger custom_form_answers_delete_immutable before delete on public.custom_form_answers
for each row execute function private.prevent_completed_custom_form_answer_delete();

create or replace function private.can_respond_to_custom_form_assignment(p_assignment_id uuid,p_subject_student_id uuid default null)
returns boolean language sql stable security definer set search_path='' set row_security=off as $$
  select private.has_forms_capability('custom_forms.submit') and exists(
    select 1 from public.custom_form_assignments a
    join public.custom_form_versions v on v.id=a.version_id and v.status='published'
    join public.custom_form_templates t on t.id=v.template_id and t.status<>'archived'
    where a.id=p_assignment_id and a.archived_at is null and (
      (a.assignment_type='student' and private.can_view_student(a.student_id))
      or (a.assignment_type='household' and private.can_view_household(a.household_id))
      or (a.assignment_type='volunteer' and a.volunteer_profile_id=auth.uid())
      or (a.assignment_type='event' and p_subject_student_id is not null and private.can_view_student(p_subject_student_id)
        and exists(select 1 from public.event_registrations r where r.event_id=a.event_id
          and r.student_id=p_subject_student_id and r.status in ('registered','waitlisted','confirmed','completed')))
      or a.assignment_type='general_ministry'
      or private.has_forms_capability('custom_forms.manage')
    )
  )
$$;

create or replace function public.create_custom_form_template(p_name text,p_description text default null)
returns uuid language plpgsql security definer set search_path='' set row_security=off as $$ declare result uuid; begin
  if not private.has_forms_capability('custom_forms.manage') then raise exception 'Custom Form management is denied.' using errcode='42501'; end if;
  insert into public.custom_form_templates(name,description,created_by_profile_id)
  values(btrim(p_name),nullif(btrim(coalesce(p_description,'')),''),auth.uid()) returning id into result;
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata)
  values(auth.uid(),'custom_forms.template_created','custom_form_template',result,'success','web',jsonb_build_object('status','draft'));
  return result;
end $$;

create or replace function public.create_custom_form_version(p_template_id uuid,p_title text,p_instructions text default null)
returns uuid language plpgsql security definer set search_path='' set row_security=off as $$ declare result uuid; next_version integer; begin
  if not private.has_forms_capability('custom_forms.manage') or not exists(select 1 from public.custom_form_templates where id=p_template_id and status<>'archived') then
    raise exception 'Custom Form version creation is denied.' using errcode='42501'; end if;
  select coalesce(max(version_number),0)+1 into next_version from public.custom_form_versions where template_id=p_template_id;
  insert into public.custom_form_versions(template_id,version_number,title,instructions,created_by_profile_id)
  values(p_template_id,next_version,btrim(p_title),nullif(btrim(coalesce(p_instructions,'')),''),auth.uid()) returning id into result;
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata)
  values(auth.uid(),'custom_forms.version_created','custom_form_version',result,'success','web',jsonb_build_object('templateId',p_template_id,'versionNumber',next_version,'status','draft'));
  return result;
end $$;

create or replace function public.update_custom_form_version_draft(p_version_id uuid,p_title text,p_instructions text default null)
returns void language plpgsql security definer set search_path='' set row_security=off as $$ begin
  if not private.has_forms_capability('custom_forms.manage') then raise exception 'Custom Form management is denied.' using errcode='42501'; end if;
  update public.custom_form_versions set title=btrim(p_title),instructions=nullif(btrim(coalesce(p_instructions,'')),'') where id=p_version_id and status='draft';
  if not found then raise exception 'Editable Custom Form draft not found.' using errcode='P0002'; end if;
end $$;

create or replace function public.save_custom_form_field(
  p_version_id uuid,p_field_id uuid,p_field_key text,p_field_type public.custom_form_field_type,p_label text,p_help_text text,
  p_is_required boolean,p_display_order integer,p_minimum_length integer,p_maximum_length integer,
  p_minimum_date date,p_maximum_date date,p_choice_options jsonb)
returns uuid language plpgsql security definer set search_path='' set row_security=off as $$ declare result uuid; begin
  if not private.has_forms_capability('custom_forms.manage') or not exists(select 1 from public.custom_form_versions where id=p_version_id and status='draft') then
    raise exception 'Custom Form field editing is denied.' using errcode='42501'; end if;
  if p_field_id is null then
    insert into public.custom_form_fields(version_id,field_key,field_type,label,help_text,is_required,display_order,
      minimum_length,maximum_length,minimum_date,maximum_date,choice_options)
    values(p_version_id,btrim(p_field_key),p_field_type,btrim(p_label),nullif(btrim(coalesce(p_help_text,'')),''),p_is_required,p_display_order,
      p_minimum_length,p_maximum_length,p_minimum_date,p_maximum_date,p_choice_options) returning id into result;
  else
    update public.custom_form_fields set field_key=btrim(p_field_key),field_type=p_field_type,label=btrim(p_label),
      help_text=nullif(btrim(coalesce(p_help_text,'')),''),is_required=p_is_required,display_order=p_display_order,
      minimum_length=p_minimum_length,maximum_length=p_maximum_length,minimum_date=p_minimum_date,
      maximum_date=p_maximum_date,choice_options=p_choice_options
    where id=p_field_id and version_id=p_version_id returning id into result;
    if not found then raise exception 'Custom Form draft field not found.' using errcode='P0002'; end if;
  end if;
  return result;
end $$;

create or replace function public.delete_custom_form_field(p_field_id uuid)
returns void language plpgsql security definer set search_path='' set row_security=off as $$ begin
  if not private.has_forms_capability('custom_forms.manage') then raise exception 'Custom Form management is denied.' using errcode='42501'; end if;
  delete from public.custom_form_fields f using public.custom_form_versions v where f.id=p_field_id and v.id=f.version_id and v.status='draft';
  if not found then raise exception 'Editable Custom Form field not found.' using errcode='P0002'; end if;
end $$;

create or replace function public.publish_custom_form_version(p_version_id uuid)
returns void language plpgsql security definer set search_path='' set row_security=off as $$ declare template_id uuid; begin
  if not private.has_forms_capability('custom_forms.manage') then raise exception 'Custom Form publication is denied.' using errcode='42501'; end if;
  update public.custom_form_versions v set status='published',published_at=now(),published_by_profile_id=auth.uid()
  where v.id=p_version_id and v.status='draft' and exists(select 1 from public.custom_form_fields f where f.version_id=v.id)
  returning v.template_id into template_id;
  if not found then raise exception 'Publishable Custom Form draft not found.' using errcode='22023'; end if;
  update public.custom_form_templates set status='active',updated_at=now() where id=template_id and status='draft';
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata)
  values(auth.uid(),'custom_forms.version_published','custom_form_version',p_version_id,'success','web',jsonb_build_object('templateId',template_id,'status','published'));
end $$;

create or replace function public.retire_custom_form_version(p_version_id uuid)
returns void language plpgsql security definer set search_path='' set row_security=off as $$ begin
  if not private.has_forms_capability('custom_forms.manage') then raise exception 'Custom Form retirement is denied.' using errcode='42501'; end if;
  update public.custom_form_versions set status='retired' where id=p_version_id and status='published';
  if not found then raise exception 'Published Custom Form version not found.' using errcode='P0002'; end if;
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata)
  values(auth.uid(),'custom_forms.version_retired','custom_form_version',p_version_id,'success','web',jsonb_build_object('status','retired'));
end $$;

create or replace function public.archive_custom_form_template(p_template_id uuid)
returns void language plpgsql security definer set search_path='' set row_security=off as $$ begin
  if not private.has_forms_capability('custom_forms.manage') then raise exception 'Custom Form archival is denied.' using errcode='42501'; end if;
  update public.custom_form_templates set status='archived',archived_at=now(),archived_by_profile_id=auth.uid(),updated_at=now()
  where id=p_template_id and status<>'archived'; if not found then raise exception 'Custom Form template not found.' using errcode='P0002'; end if;
  update public.custom_form_assignments set archived_at=now(),archived_by_profile_id=auth.uid()
  where version_id in(select id from public.custom_form_versions where template_id=p_template_id) and archived_at is null;
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata)
  values(auth.uid(),'custom_forms.template_archived','custom_form_template',p_template_id,'success','web',jsonb_build_object('status','archived'));
end $$;

create or replace function public.create_custom_form_assignment(p_version_id uuid,p_assignment_type public.custom_form_assignment_type,
  p_event_id uuid default null,p_student_id uuid default null,p_household_id uuid default null,p_volunteer_profile_id uuid default null)
returns uuid language plpgsql security definer set search_path='' set row_security=off as $$ declare result uuid; begin
  if not private.has_forms_capability('custom_forms.manage') then raise exception 'Custom Form assignment is denied.' using errcode='42501'; end if;
  insert into public.custom_form_assignments(version_id,assignment_type,event_id,student_id,household_id,volunteer_profile_id,
    is_general_ministry,assigned_by_profile_id)
  values(p_version_id,p_assignment_type,p_event_id,p_student_id,p_household_id,p_volunteer_profile_id,
    p_assignment_type='general_ministry',auth.uid()) returning id into result;
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata)
  values(auth.uid(),'custom_forms.assignment_created','custom_form_assignment',result,'success','web',
    jsonb_build_object('versionId',p_version_id,'assignmentType',p_assignment_type));
  return result;
end $$;

create or replace function public.archive_custom_form_assignment(p_assignment_id uuid)
returns void language plpgsql security definer set search_path='' set row_security=off as $$ begin
  if not private.has_forms_capability('custom_forms.manage') then raise exception 'Custom Form assignment archival is denied.' using errcode='42501'; end if;
  update public.custom_form_assignments set archived_at=now(),archived_by_profile_id=auth.uid() where id=p_assignment_id and archived_at is null;
  if not found then raise exception 'Active Custom Form assignment not found.' using errcode='P0002'; end if;
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata)
  values(auth.uid(),'custom_forms.assignment_archived','custom_form_assignment',p_assignment_id,'success','web',jsonb_build_object('status','archived'));
end $$;

create or replace function public.list_custom_form_assignments()
returns table(assignment_id uuid,version_id uuid,title text,version_number integer,assignment_type public.custom_form_assignment_type,
  event_id uuid,student_id uuid,household_id uuid,volunteer_profile_id uuid,assigned_at timestamptz)
language plpgsql stable security definer set search_path='' set row_security=off as $$ begin
  if not private.has_forms_capability('custom_forms.manage') then raise exception 'Custom Form assignment oversight is denied.' using errcode='42501'; end if;
  return query select a.id,v.id,v.title,v.version_number,a.assignment_type,a.event_id,a.student_id,a.household_id,
    a.volunteer_profile_id,a.assigned_at from public.custom_form_assignments a
    join public.custom_form_versions v on v.id=a.version_id where a.archived_at is null order by a.assigned_at desc,a.id;
end $$;

create or replace function public.list_custom_form_templates()
returns table(template_id uuid,name text,description text,template_status public.custom_form_status,version_id uuid,version_number integer,
  version_title text,version_status public.custom_form_version_status,field_count bigint,assignment_count bigint)
language plpgsql stable security definer set search_path='' set row_security=off as $$ begin
  if not private.has_forms_capability('custom_forms.manage') then raise exception 'Custom Form management is denied.' using errcode='42501'; end if;
  return query select t.id,t.name,t.description,t.status,v.id,v.version_number,v.title,v.status,
    (select count(*) from public.custom_form_fields f where f.version_id=v.id),
    (select count(*) from public.custom_form_assignments a where a.version_id=v.id and a.archived_at is null)
  from public.custom_form_templates t left join public.custom_form_versions v on v.template_id=t.id order by t.created_at desc,v.version_number desc;
end $$;

create or replace function public.open_custom_form_assignment(p_assignment_id uuid,p_subject_student_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' set row_security=off as $$
declare a record; submission_id uuid; subject_household uuid; subject_student uuid; subject_volunteer uuid; begin
  select * into a from public.custom_form_assignments where id=p_assignment_id;
  if not found or not private.can_respond_to_custom_form_assignment(p_assignment_id,p_subject_student_id) then
    raise exception 'Custom Form access is denied.' using errcode='42501'; end if;
  subject_student:=case when a.assignment_type='student' then a.student_id when a.assignment_type='event' then p_subject_student_id else null end;
  if a.assignment_type='household' then subject_household:=a.household_id;
  elsif a.assignment_type='event' then select household_id into subject_household from public.event_registrations
    where event_id=a.event_id and student_id=p_subject_student_id and status in ('registered','waitlisted','confirmed','completed') order by created_at desc limit 1;
  end if;
  if a.assignment_type='volunteer' then subject_volunteer:=a.volunteer_profile_id; end if;
  select s.id into submission_id from public.custom_form_submissions s where s.assignment_id=a.id
    and s.submitted_by_profile_id=auth.uid() and s.subject_student_id is not distinct from subject_student
    and s.subject_household_id is not distinct from subject_household
    and s.subject_volunteer_profile_id is not distinct from subject_volunteer order by s.submitted_at desc nulls first,s.id limit 1;
  if submission_id is null then
    insert into public.custom_form_submissions(assignment_id,version_id,submitted_by_profile_id,subject_student_id,subject_household_id,subject_volunteer_profile_id)
    values(a.id,a.version_id,auth.uid(),subject_student,subject_household,subject_volunteer) returning id into submission_id;
    insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata)
    values(auth.uid(),'custom_forms.submission_draft_opened','custom_form_submission',submission_id,'success','web',jsonb_build_object('assignmentId',a.id,'versionId',a.version_id));
  end if;
  return (select jsonb_build_object('submissionId',s.id,'assignmentId',a.id,'versionId',v.id,'title',v.title,'instructions',v.instructions,
    'status',s.status,'assignmentType',a.assignment_type,'fields',coalesce((select jsonb_agg(jsonb_build_object(
      'fieldId',f.id,'fieldKey',f.field_key,'fieldType',f.field_type,'label',f.label,'helpText',f.help_text,
      'required',f.is_required,'displayOrder',f.display_order,'choiceOptions',f.choice_options,
      'textValue',answer.text_value,'booleanValue',answer.boolean_value,'dateValue',answer.date_value,
      'choiceValue',answer.choice_value,'multipleChoiceValue',answer.multiple_choice_value) order by f.display_order)
      from public.custom_form_fields f left join public.custom_form_answers answer on answer.field_id=f.id and answer.submission_id=s.id
      where f.version_id=v.id),'[]'::jsonb))
    from public.custom_form_submissions s join public.custom_form_versions v on v.id=s.version_id where s.id=submission_id);
end $$;

create or replace function public.list_my_custom_forms()
returns table(assignment_id uuid,assignment_type public.custom_form_assignment_type,subject_student_id uuid,title text,version_number integer,
  submission_id uuid,submission_status public.custom_form_submission_status,assigned_at timestamptz)
language plpgsql stable security definer set search_path='' set row_security=off as $$ begin
  if not private.has_forms_capability('custom_forms.submit') then raise exception 'Custom Forms access is denied.' using errcode='42501'; end if;
  return query
  select a.id,a.assignment_type,case when a.assignment_type='student' then a.student_id else r.student_id end,v.title,v.version_number,s.id,s.status,a.assigned_at
  from public.custom_form_assignments a join public.custom_form_versions v on v.id=a.version_id
  join public.custom_form_templates t on t.id=v.template_id
  left join lateral (select registration.student_id from public.event_registrations registration where a.assignment_type='event'
    and registration.event_id=a.event_id and registration.status in ('registered','waitlisted','confirmed','completed')
    and private.can_view_student(registration.student_id)) r on true
  left join public.custom_form_submissions s on s.assignment_id=a.id and s.submitted_by_profile_id=auth.uid()
    and (a.assignment_type<>'event' or s.subject_student_id=r.student_id)
  where a.archived_at is null and v.status='published' and t.status<>'archived' and (
    (a.assignment_type='student' and private.can_view_student(a.student_id))
    or (a.assignment_type='household' and private.can_view_household(a.household_id))
    or (a.assignment_type='volunteer' and a.volunteer_profile_id=auth.uid())
    or (a.assignment_type='event' and r.student_id is not null)
    or a.assignment_type='general_ministry') order by a.assigned_at desc;
end $$;

create or replace function public.save_custom_form_answer(p_submission_id uuid,p_field_id uuid,p_text_value text,p_boolean_value boolean,
  p_date_value date,p_choice_value text,p_multiple_choice_value jsonb)
returns void language plpgsql security definer set search_path='' set row_security=off as $$ begin
  if not exists(select 1 from public.custom_form_submissions s where s.id=p_submission_id and s.submitted_by_profile_id=auth.uid()
    and s.status='draft' and private.can_respond_to_custom_form_assignment(s.assignment_id,s.subject_student_id)) then
    raise exception 'Custom Form draft editing is denied.' using errcode='42501'; end if;
  if num_nonnulls(p_text_value,p_boolean_value,p_date_value,p_choice_value,p_multiple_choice_value)=0 then
    delete from public.custom_form_answers where submission_id=p_submission_id and field_id=p_field_id; return; end if;
  insert into public.custom_form_answers(submission_id,field_id,text_value,boolean_value,date_value,choice_value,multiple_choice_value)
  values(p_submission_id,p_field_id,p_text_value,p_boolean_value,p_date_value,p_choice_value,p_multiple_choice_value)
  on conflict(submission_id,field_id) do update set text_value=excluded.text_value,boolean_value=excluded.boolean_value,
    date_value=excluded.date_value,choice_value=excluded.choice_value,multiple_choice_value=excluded.multiple_choice_value;
end $$;

create or replace function public.submit_custom_form(p_submission_id uuid)
returns void language plpgsql security definer set search_path='' set row_security=off as $$ declare selected record; begin
  select assignment_id,subject_student_id,version_id into selected from public.custom_form_submissions
  where id=p_submission_id and submitted_by_profile_id=auth.uid() and status='draft' for update;
  if not found or not private.can_respond_to_custom_form_assignment(selected.assignment_id,selected.subject_student_id) then
    raise exception 'Custom Form submission is denied.' using errcode='42501'; end if;
  update public.custom_form_submissions set status='submitted',submitted_at=now() where id=p_submission_id;
  set constraints public.custom_form_submissions_complete immediate;
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata)
  values(auth.uid(),'custom_forms.submission_submitted','custom_form_submission',p_submission_id,'success','web',
    jsonb_build_object('assignmentId',selected.assignment_id,'versionId',selected.version_id,'status','submitted'));
end $$;

create or replace function public.list_custom_form_submissions(p_template_id uuid default null)
returns table(submission_id uuid,template_id uuid,version_id uuid,version_number integer,title text,assignment_type public.custom_form_assignment_type,
  submission_status public.custom_form_submission_status,submitted_by_profile_id uuid,submitted_at timestamptz,subject_student_id uuid,
  subject_household_id uuid,subject_volunteer_profile_id uuid)
language plpgsql stable security definer set search_path='' set row_security=off as $$ begin
  if not private.has_forms_capability('custom_forms.manage') then raise exception 'Custom Form oversight is denied.' using errcode='42501'; end if;
  return query select s.id,v.template_id,v.id,v.version_number,v.title,a.assignment_type,s.status,s.submitted_by_profile_id,s.submitted_at,
    s.subject_student_id,s.subject_household_id,s.subject_volunteer_profile_id
  from public.custom_form_submissions s join public.custom_form_assignments a on a.id=s.assignment_id
  join public.custom_form_versions v on v.id=s.version_id where p_template_id is null or v.template_id=p_template_id order by s.submitted_at desc nulls first,s.id;
end $$;

create or replace function public.get_custom_form_submission(p_submission_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' set row_security=off as $$ begin
  if not private.has_forms_capability('custom_forms.manage') and not exists(select 1 from public.custom_form_submissions where id=p_submission_id and submitted_by_profile_id=auth.uid()) then
    raise exception 'Custom Form submission access is denied.' using errcode='42501'; end if;
  return (select jsonb_build_object('submissionId',s.id,'status',s.status,'title',v.title,'versionNumber',v.version_number,
    'assignmentType',a.assignment_type,'submittedAt',s.submitted_at,'answers',coalesce((select jsonb_agg(jsonb_build_object(
      'fieldId',f.id,'label',f.label,'fieldType',f.field_type,'textValue',answer.text_value,'booleanValue',answer.boolean_value,
      'dateValue',answer.date_value,'choiceValue',answer.choice_value,'multipleChoiceValue',answer.multiple_choice_value) order by f.display_order)
      from public.custom_form_fields f left join public.custom_form_answers answer on answer.field_id=f.id and answer.submission_id=s.id
      where f.version_id=v.id),'[]'::jsonb)) from public.custom_form_submissions s join public.custom_form_assignments a on a.id=s.assignment_id
      join public.custom_form_versions v on v.id=s.version_id where s.id=p_submission_id);
end $$;

create or replace function public.archive_custom_form_submission(p_submission_id uuid)
returns void language plpgsql security definer set search_path='' set row_security=off as $$ begin
  if not private.has_forms_capability('custom_forms.manage') then raise exception 'Custom Form submission archival is denied.' using errcode='42501'; end if;
  update public.custom_form_submissions set status='archived',archived_at=now(),archived_by_profile_id=auth.uid()
  where id=p_submission_id and status='submitted'; if not found then raise exception 'Submitted Custom Form not found.' using errcode='P0002'; end if;
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata)
  values(auth.uid(),'custom_forms.submission_archived','custom_form_submission',p_submission_id,'success','web',jsonb_build_object('status','archived'));
end $$;

revoke all on function private.can_respond_to_custom_form_assignment(uuid,uuid),private.prevent_completed_custom_form_answer_delete() from public,anon,authenticated;
revoke all on function public.create_custom_form_template(text,text),public.create_custom_form_version(uuid,text,text),
 public.update_custom_form_version_draft(uuid,text,text),public.save_custom_form_field(uuid,uuid,text,public.custom_form_field_type,text,text,boolean,integer,integer,integer,date,date,jsonb),
 public.delete_custom_form_field(uuid),public.publish_custom_form_version(uuid),public.retire_custom_form_version(uuid),public.archive_custom_form_template(uuid),
 public.create_custom_form_assignment(uuid,public.custom_form_assignment_type,uuid,uuid,uuid,uuid),public.archive_custom_form_assignment(uuid),
 public.list_custom_form_templates(),public.list_custom_form_assignments(),public.open_custom_form_assignment(uuid,uuid),public.list_my_custom_forms(),
 public.save_custom_form_answer(uuid,uuid,text,boolean,date,text,jsonb),public.submit_custom_form(uuid),
 public.list_custom_form_submissions(uuid),public.get_custom_form_submission(uuid),public.archive_custom_form_submission(uuid)
 from public,anon,authenticated;
grant execute on function public.create_custom_form_template(text,text),public.create_custom_form_version(uuid,text,text),
 public.update_custom_form_version_draft(uuid,text,text),public.save_custom_form_field(uuid,uuid,text,public.custom_form_field_type,text,text,boolean,integer,integer,integer,date,date,jsonb),
 public.delete_custom_form_field(uuid),public.publish_custom_form_version(uuid),public.retire_custom_form_version(uuid),public.archive_custom_form_template(uuid),
 public.create_custom_form_assignment(uuid,public.custom_form_assignment_type,uuid,uuid,uuid,uuid),public.archive_custom_form_assignment(uuid),
 public.list_custom_form_templates(),public.list_custom_form_assignments(),public.open_custom_form_assignment(uuid,uuid),public.list_my_custom_forms(),
 public.save_custom_form_answer(uuid,uuid,text,boolean,date,text,jsonb),public.submit_custom_form(uuid),
 public.list_custom_form_submissions(uuid),public.get_custom_form_submission(uuid),public.archive_custom_form_submission(uuid)
 to authenticated;

commit;
