begin;
-- Subject-targeted assignments retain one authoritative submission per assignment
-- and subject. General Ministry remains respondent-owned. Existing indexes stay unchanged.
create or replace function public.open_custom_form_assignment(p_assignment_id uuid,p_subject_student_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' set row_security=off as $$
declare a record; submission_id uuid; subject_household uuid; subject_student uuid; subject_volunteer uuid; begin
 select * into a from public.custom_form_assignments where id=p_assignment_id;
 if not found or not private.can_respond_to_custom_form_assignment(p_assignment_id,p_subject_student_id) then raise exception 'Custom Form access is denied.' using errcode='42501'; end if;
 subject_student:=case when a.assignment_type='student' then a.student_id when a.assignment_type='event' then p_subject_student_id else null end;
 if a.assignment_type='household' then subject_household:=a.household_id;
 elsif a.assignment_type='event' then select household_id into subject_household from public.event_registrations where event_id=a.event_id and student_id=p_subject_student_id and status in ('registered','waitlisted','confirmed','completed') order by created_at desc limit 1; end if;
 if a.assignment_type='volunteer' then subject_volunteer:=a.volunteer_profile_id; end if;
 select s.id into submission_id from public.custom_form_submissions s where s.assignment_id=a.id and (
  (a.assignment_type in ('student','event') and s.subject_student_id=subject_student)
  or (a.assignment_type='household' and s.subject_household_id=subject_household and s.subject_student_id is null)
  or (a.assignment_type='volunteer' and s.subject_volunteer_profile_id=subject_volunteer)
  or (a.assignment_type='general_ministry' and s.submitted_by_profile_id=auth.uid() and s.subject_student_id is null and s.subject_household_id is null and s.subject_volunteer_profile_id is null)
 ) order by s.id limit 1;
 if submission_id is null then
  insert into public.custom_form_submissions(assignment_id,version_id,submitted_by_profile_id,subject_student_id,subject_household_id,subject_volunteer_profile_id)
  values(a.id,a.version_id,auth.uid(),subject_student,subject_household,subject_volunteer) on conflict do nothing returning id into submission_id;
  if submission_id is null then
   select s.id into submission_id from public.custom_form_submissions s where s.assignment_id=a.id and (
    (a.assignment_type in ('student','event') and s.subject_student_id=subject_student)
    or (a.assignment_type='household' and s.subject_household_id=subject_household and s.subject_student_id is null)
    or (a.assignment_type='volunteer' and s.subject_volunteer_profile_id=subject_volunteer)
    or (a.assignment_type='general_ministry' and s.submitted_by_profile_id=auth.uid() and s.subject_student_id is null and s.subject_household_id is null and s.subject_volunteer_profile_id is null)
   ) order by s.id limit 1;
  else
   insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata) values(auth.uid(),'custom_forms.submission_draft_opened','custom_form_submission',submission_id,'success','web',jsonb_build_object('assignmentId',a.id,'versionId',a.version_id));
  end if;
 end if;
 return (select jsonb_build_object('submissionId',s.id,'assignmentId',a.id,'versionId',v.id,'title',v.title,'instructions',v.instructions,'status',s.status,'assignmentType',a.assignment_type,'fields',coalesce((select jsonb_agg(jsonb_build_object(
  'fieldId',f.id,'fieldKey',f.field_key,'fieldType',f.field_type,'label',f.label,'helpText',f.help_text,'required',f.is_required,'displayOrder',f.display_order,'choiceOptions',f.choice_options,
  'textValue',answer.text_value,'booleanValue',answer.boolean_value,'dateValue',answer.date_value,'choiceValue',answer.choice_value,'multipleChoiceValue',answer.multiple_choice_value) order by f.display_order)
  from public.custom_form_fields f left join public.custom_form_answers answer on answer.field_id=f.id and answer.submission_id=s.id where f.version_id=v.id),'[]'::jsonb))
  from public.custom_form_submissions s join public.custom_form_versions v on v.id=s.version_id where s.id=submission_id);
end $$;
create or replace function public.list_my_custom_forms()
returns table(assignment_id uuid,assignment_type public.custom_form_assignment_type,subject_student_id uuid,title text,version_number integer,submission_id uuid,submission_status public.custom_form_submission_status,assigned_at timestamptz)
language plpgsql stable security definer set search_path='' set row_security=off as $$ begin
 if not private.has_forms_capability('custom_forms.submit') then raise exception 'Custom Forms access is denied.' using errcode='42501'; end if;
 return query select a.id,a.assignment_type,case when a.assignment_type='student' then a.student_id else r.student_id end,v.title,v.version_number,s.id,s.status,a.assigned_at
 from public.custom_form_assignments a join public.custom_form_versions v on v.id=a.version_id join public.custom_form_templates t on t.id=v.template_id
 left join lateral (select registration.student_id from public.event_registrations registration where a.assignment_type='event' and registration.event_id=a.event_id and registration.status in ('registered','waitlisted','confirmed','completed') and private.can_view_student(registration.student_id)) r on true
 left join public.custom_form_submissions s on s.assignment_id=a.id and (
  (a.assignment_type='student' and s.subject_student_id=a.student_id)
  or (a.assignment_type='household' and s.subject_household_id=a.household_id and s.subject_student_id is null)
  or (a.assignment_type='volunteer' and s.subject_volunteer_profile_id=a.volunteer_profile_id)
  or (a.assignment_type='event' and s.subject_student_id=r.student_id)
  or (a.assignment_type='general_ministry' and s.submitted_by_profile_id=auth.uid() and s.subject_student_id is null and s.subject_household_id is null and s.subject_volunteer_profile_id is null))
 where a.archived_at is null and v.status='published' and t.status<>'archived' and (
  (a.assignment_type='student' and private.can_view_student(a.student_id)) or (a.assignment_type='household' and private.can_view_household(a.household_id))
  or (a.assignment_type='volunteer' and a.volunteer_profile_id=auth.uid()) or (a.assignment_type='event' and r.student_id is not null) or a.assignment_type='general_ministry')
 order by a.assigned_at desc;
end $$;
create or replace function public.save_custom_form_answer(p_submission_id uuid,p_field_id uuid,p_text_value text,p_boolean_value boolean,p_date_value date,p_choice_value text,p_multiple_choice_value jsonb)
returns void language plpgsql security definer set search_path='' set row_security=off as $$
declare selected record; answer_operation text; begin
 select s.assignment_id,s.version_id,s.subject_student_id,a.assignment_type,s.submitted_by_profile_id into selected from public.custom_form_submissions s join public.custom_form_assignments a on a.id=s.assignment_id where s.id=p_submission_id and s.status='draft' for update;
 if not found or not private.can_respond_to_custom_form_assignment(selected.assignment_id,selected.subject_student_id) or (selected.assignment_type='general_ministry' and selected.submitted_by_profile_id<>auth.uid()) then raise exception 'Custom Form draft editing is denied.' using errcode='42501'; end if;
 if num_nonnulls(p_text_value,p_boolean_value,p_date_value,p_choice_value,p_multiple_choice_value)=0 then delete from public.custom_form_answers where submission_id=p_submission_id and field_id=p_field_id; answer_operation:='cleared';
 else insert into public.custom_form_answers(submission_id,field_id,text_value,boolean_value,date_value,choice_value,multiple_choice_value) values(p_submission_id,p_field_id,p_text_value,p_boolean_value,p_date_value,p_choice_value,p_multiple_choice_value)
 on conflict(submission_id,field_id) do update set text_value=excluded.text_value,boolean_value=excluded.boolean_value,date_value=excluded.date_value,choice_value=excluded.choice_value,multiple_choice_value=excluded.multiple_choice_value; answer_operation:='saved'; end if;
 insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata) values(auth.uid(),'custom_forms.submission_answer_saved','custom_form_submission',p_submission_id,'success','web',jsonb_build_object('assignmentId',selected.assignment_id,'versionId',selected.version_id,'fieldId',p_field_id,'operation',answer_operation));
end $$;
create or replace function public.submit_custom_form(p_submission_id uuid)
returns void language plpgsql security definer set search_path='' set row_security=off as $$ declare selected record; begin
 select s.assignment_id,s.subject_student_id,s.version_id,a.assignment_type,s.submitted_by_profile_id into selected from public.custom_form_submissions s join public.custom_form_assignments a on a.id=s.assignment_id where s.id=p_submission_id and s.status='draft' for update;
 if not found or not private.can_respond_to_custom_form_assignment(selected.assignment_id,selected.subject_student_id) or (selected.assignment_type='general_ministry' and selected.submitted_by_profile_id<>auth.uid()) then raise exception 'Custom Form submission is denied.' using errcode='42501'; end if;
 update public.custom_form_submissions set status='submitted',submitted_at=now() where id=p_submission_id;
 set constraints public.custom_form_submissions_complete immediate;
 insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata) values(auth.uid(),'custom_forms.submission_submitted','custom_form_submission',p_submission_id,'success','web',jsonb_build_object('assignmentId',selected.assignment_id,'versionId',selected.version_id,'status','submitted'));
end $$;
create or replace function public.get_custom_form_submission(p_submission_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' set row_security=off as $$
declare selected record; begin
 select s.assignment_id,s.subject_student_id,s.submitted_by_profile_id,a.assignment_type into selected from public.custom_form_submissions s join public.custom_form_assignments a on a.id=s.assignment_id where s.id=p_submission_id;
 if not found or (not private.has_forms_capability('custom_forms.manage') and (not private.can_respond_to_custom_form_assignment(selected.assignment_id,selected.subject_student_id) or (selected.assignment_type='general_ministry' and selected.submitted_by_profile_id<>auth.uid()))) then raise exception 'Custom Form submission access is denied.' using errcode='42501'; end if;
 return (select jsonb_build_object('submissionId',s.id,'status',s.status,'title',v.title,'versionNumber',v.version_number,'assignmentType',a.assignment_type,'submittedAt',s.submitted_at,'answers',coalesce((select jsonb_agg(jsonb_build_object(
  'fieldId',f.id,'label',f.label,'fieldType',f.field_type,'textValue',answer.text_value,'booleanValue',answer.boolean_value,'dateValue',answer.date_value,'choiceValue',answer.choice_value,'multipleChoiceValue',answer.multiple_choice_value) order by f.display_order)
  from public.custom_form_fields f left join public.custom_form_answers answer on answer.field_id=f.id and answer.submission_id=s.id where f.version_id=v.id),'[]'::jsonb))
  from public.custom_form_submissions s join public.custom_form_assignments a on a.id=s.assignment_id join public.custom_form_versions v on v.id=s.version_id where s.id=p_submission_id);
end $$;
commit;
