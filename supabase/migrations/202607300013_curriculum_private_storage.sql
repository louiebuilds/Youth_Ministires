begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'curriculum-files',
  'curriculum-files',
  false,
  262144000,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'video/mp4'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.can_access_curriculum_storage_object(
  p_object_name text
)
returns boolean
language sql stable security definer
set search_path = '' set row_security = off
as $$
  select private.can_manage_curriculum() or (
    private.can_view_curriculum()
    and exists (
      select 1
      from public.teaching_resources
      join public.lessons
        on lessons.id = teaching_resources.lesson_id
      where teaching_resources.storage_bucket = 'curriculum-files'
        and teaching_resources.storage_object_path = p_object_name
        and teaching_resources.archived_at is null
        and lessons.status = 'published'
    )
  )
$$;

revoke all on function private.can_access_curriculum_storage_object(text)
  from public, anon, authenticated;
grant execute on function private.can_access_curriculum_storage_object(text)
  to authenticated;

create policy curriculum_files_select
on storage.objects for select
to authenticated
using (
  bucket_id = 'curriculum-files'
  and private.can_access_curriculum_storage_object(name)
);

create policy curriculum_files_insert
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'curriculum-files'
  and private.can_manage_curriculum()
);

create policy curriculum_files_update
on storage.objects for update
to authenticated
using (
  bucket_id = 'curriculum-files'
  and private.can_manage_curriculum()
)
with check (
  bucket_id = 'curriculum-files'
  and private.can_manage_curriculum()
);

create policy curriculum_files_delete
on storage.objects for delete
to authenticated
using (
  bucket_id = 'curriculum-files'
  and private.can_manage_curriculum()
);

create or replace function public.create_teaching_resource_file(
  p_teaching_resource_id uuid,
  p_lesson_id uuid,
  p_title text,
  p_resource_type public.teaching_resource_type,
  p_description text,
  p_storage_object_path text,
  p_original_file_name text,
  p_content_type text,
  p_file_size_bytes bigint
)
returns uuid
language plpgsql security definer
set search_path = '' set row_security = off
as $$
declare normalized_name text; maximum_size bigint;
begin
  if not private.can_manage_curriculum() then
    raise exception 'Teaching resource upload is denied.'
      using errcode = '42501';
  end if;
  normalized_name := lower(btrim(coalesce(p_original_file_name, '')));
  maximum_size := case
    when p_resource_type = 'video' then 262144000
    when p_resource_type = 'pdf' then 26214400
    else 15728640
  end;
  if not exists (
    select 1 from public.lessons
    where id = p_lesson_id and status <> 'archived'
  ) or length(btrim(coalesce(p_title, ''))) not between 1 and 200
    or p_resource_type not in ('document', 'pdf', 'video', 'other')
    or p_file_size_bytes not between 1 and maximum_size
    or p_storage_object_path !~ (
      '^' || p_lesson_id::text || '/' ||
      p_teaching_resource_id::text || '/[A-Za-z0-9._-]+$'
    )
    or p_storage_object_path like '%..%'
    or not (
      (p_resource_type = 'pdf'
        and p_content_type = 'application/pdf'
        and normalized_name ~ '\.pdf$')
      or (p_resource_type = 'video'
        and p_content_type = 'video/mp4'
        and normalized_name ~ '\.mp4$')
      or (p_resource_type in ('document', 'other') and (
        (p_content_type =
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          and normalized_name ~ '\.docx$')
        or (p_content_type =
          'application/vnd.openxmlformats-officedocument.presentationml.presentation'
          and normalized_name ~ '\.pptx$')
        or (p_content_type = 'text/plain' and normalized_name ~ '\.txt$')
      ))
    ) then
    raise exception 'Teaching resource file details are invalid.'
      using errcode = '22023';
  end if;
  if not exists (
    select 1 from storage.objects
    where bucket_id = 'curriculum-files'
      and name = p_storage_object_path
  ) then
    raise exception 'The uploaded file could not be verified.'
      using errcode = '22023';
  end if;
  insert into public.teaching_resources (
    id, lesson_id, title, resource_type, description,
    storage_bucket, storage_object_path, original_file_name,
    content_type, file_size_bytes, created_by_profile_id
  ) values (
    p_teaching_resource_id, p_lesson_id, btrim(p_title), p_resource_type,
    nullif(btrim(coalesce(p_description, '')), ''), 'curriculum-files',
    p_storage_object_path, btrim(p_original_file_name), p_content_type,
    p_file_size_bytes, (select auth.uid())
  );
  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    (select auth.uid()), 'curriculum.resource_file_created',
    'teaching_resource', p_teaching_resource_id, 'success', 'web',
    jsonb_build_object(
      'lessonId', p_lesson_id,
      'resourceType', p_resource_type,
      'contentType', p_content_type,
      'fileSizeBytes', p_file_size_bytes
    )
  );
  return p_teaching_resource_id;
end;
$$;

create or replace function public.authorize_curriculum_resource_download(
  p_teaching_resource_id uuid
)
returns jsonb
language plpgsql security definer
set search_path = '' set row_security = off
as $$
declare resource_record record;
begin
  if not private.can_view_curriculum() then
    raise exception 'Teaching resource download is denied.'
      using errcode = '42501';
  end if;
  select
    resources.storage_bucket,
    resources.storage_object_path,
    resources.original_file_name,
    lessons.status as lesson_status
  into resource_record
  from public.teaching_resources as resources
  join public.lessons on lessons.id = resources.lesson_id
  where resources.id = p_teaching_resource_id
    and resources.archived_at is null
    and resources.storage_object_path is not null
    and (
      private.can_manage_curriculum()
      or lessons.status = 'published'
    );
  if not found then
    raise exception 'Teaching resource download is denied.'
      using errcode = '42501';
  end if;
  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    (select auth.uid()), 'curriculum.resource_download_authorized',
    'teaching_resource', p_teaching_resource_id, 'success', 'web',
    jsonb_build_object('lessonStatus', resource_record.lesson_status)
  );
  return jsonb_build_object(
    'bucket', resource_record.storage_bucket,
    'objectPath', resource_record.storage_object_path,
    'fileName', resource_record.original_file_name
  );
end;
$$;

revoke all on function public.create_teaching_resource_file(
  uuid, uuid, text, public.teaching_resource_type, text, text, text, text,
  bigint
) from public, anon, authenticated;
revoke all on function public.authorize_curriculum_resource_download(uuid)
  from public, anon, authenticated;

grant execute on function public.create_teaching_resource_file(
  uuid, uuid, text, public.teaching_resource_type, text, text, text, text,
  bigint
) to authenticated;
grant execute on function public.authorize_curriculum_resource_download(uuid)
  to authenticated;

commit;
