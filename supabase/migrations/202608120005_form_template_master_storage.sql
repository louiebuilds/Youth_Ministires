begin;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('form-template-masters','form-template-masters',false,15728640,array['application/pdf'])
on conflict(id) do update set public=false,file_size_limit=15728640,
  allowed_mime_types=array['application/pdf'];

create or replace function private.can_insert_form_template_master(p_object_name text)
returns boolean language sql stable security definer set search_path='' set row_security=off as $$
  select private.has_forms_capability('forms.documents.manage') and exists(
    select 1 from public.document_template_versions versions
    where versions.status='draft'
      and versions.blank_storage_bucket='form-template-masters'
      and versions.blank_storage_object_path=p_object_name
      and versions.content_type is null and versions.file_size_bytes is null
      and p_object_name ~ ('^templates/'||versions.template_id::text||'/'||versions.id::text||'/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.pdf$')
  )
$$;

create policy form_template_masters_insert on storage.objects for insert to authenticated
with check(bucket_id='form-template-masters' and private.can_insert_form_template_master(name));

revoke all on function private.can_insert_form_template_master(text) from public,anon,authenticated;
grant execute on function private.can_insert_form_template_master(text) to authenticated;

commit;
