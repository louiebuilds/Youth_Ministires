begin;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('student-documents','student-documents',false,20971520,
  array['application/pdf','image/jpeg','image/png'])
on conflict(id) do update set public=false,file_size_limit=20971520,
  allowed_mime_types=array['application/pdf','image/jpeg','image/png'];

create or replace function private.can_insert_student_document(p_object_name text)
returns boolean language sql stable security definer set search_path='' set row_security=off as $$
  select private.current_profile_is_active() and exists(
    select 1 from public.student_document_submissions submissions
    join public.students students
      on students.id=submissions.student_id
      and students.primary_household_id=submissions.household_id
      and students.status<>'archived'
    where submissions.submitted_by_profile_id=auth.uid()
      and submissions.storage_bucket='student-documents'
      and submissions.storage_object_path=p_object_name
      and submissions.content_type is null and submissions.file_size_bytes is null
      and submissions.digital_status='missing'
      and submissions.lifecycle_status='digital_received'
      and (
        (submissions.upload_source='parent'
          and private.current_profile_role()='parent'
          and private.can_view_household(submissions.household_id))
        or
        (submissions.upload_source='staff'
          and private.has_forms_capability('forms.documents.manage'))
      )
      and p_object_name ~ ('^submissions/'||submissions.student_id::text||'/'||submissions.id::text||
        '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(pdf|jpg|png)$')
  )
$$;

create policy student_documents_insert on storage.objects for insert to authenticated
with check(bucket_id='student-documents' and private.can_insert_student_document(name));

revoke all on function private.can_insert_student_document(text) from public,anon,authenticated;
grant execute on function private.can_insert_student_document(text) to authenticated;

commit;
