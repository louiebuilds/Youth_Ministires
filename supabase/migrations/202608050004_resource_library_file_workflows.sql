begin;

create or replace function public.create_library_resource_version(
  p_version_id uuid,
  p_resource_id uuid,
  p_storage_object_path text,
  p_original_file_name text,
  p_content_type text,
  p_file_size_bytes bigint,
  p_checksum_sha256 text default null,
  p_change_summary text default null
)
returns integer
language plpgsql security definer
set search_path = '' set row_security = off
as $$
declare
  resource_record record;
  normalized_name text;
  next_version integer;
  maximum_size bigint;
begin
  if not private.can_manage_resource_library() then
    raise exception 'Resource Library upload is denied.' using errcode = '42501';
  end if;

  select id, resource_type
  into resource_record
  from public.library_resources
  where id = p_resource_id and status <> 'archived'
  for update;
  if not found then
    raise exception 'Active resource not found.' using errcode = 'P0002';
  end if;

  normalized_name := lower(btrim(coalesce(p_original_file_name, '')));
  maximum_size := case
    when resource_record.resource_type = 'video' then 262144000
    when resource_record.resource_type = 'image' then 15728640
    else 26214400
  end;

  if p_version_id is null
    or p_file_size_bytes not between 1 and maximum_size
    or length(btrim(coalesce(p_original_file_name, ''))) not between 1 and 255
    or length(btrim(coalesce(p_content_type, ''))) not between 1 and 150
    or length(btrim(coalesce(p_change_summary, ''))) > 1000
    or (
      p_checksum_sha256 is not null
      and p_checksum_sha256 !~ '^[a-f0-9]{64}$'
    )
    or p_storage_object_path !~ (
      '^' || p_resource_id::text || '/' || p_version_id::text ||
      '/[A-Za-z0-9._-]+$'
    )
    or p_storage_object_path like '%..%'
    or not (
      (resource_record.resource_type = 'document' and (
        (p_content_type = 'application/pdf' and normalized_name ~ '\.pdf$')
        or (p_content_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' and normalized_name ~ '\.docx$')
        or (p_content_type = 'application/vnd.openxmlformats-officedocument.presentationml.presentation' and normalized_name ~ '\.pptx$')
        or (p_content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' and normalized_name ~ '\.xlsx$')
        or (p_content_type = 'text/plain' and normalized_name ~ '\.txt$')
      ))
      or (resource_record.resource_type = 'image' and (
        (p_content_type = 'image/jpeg' and normalized_name ~ '\.(jpg|jpeg)$')
        or (p_content_type = 'image/png' and normalized_name ~ '\.png$')
        or (p_content_type = 'image/webp' and normalized_name ~ '\.webp$')
      ))
      or (
        resource_record.resource_type = 'video'
        and p_content_type = 'video/mp4'
        and normalized_name ~ '\.mp4$'
      )
      or (resource_record.resource_type = 'other' and (
        (p_content_type = 'application/pdf' and normalized_name ~ '\.pdf$')
        or (p_content_type = 'text/plain' and normalized_name ~ '\.txt$')
      ))
    ) then
    raise exception 'Resource file details are invalid.' using errcode = '22023';
  end if;

  if not exists (
    select 1 from storage.objects
    where bucket_id = 'resource-library' and name = p_storage_object_path
  ) then
    raise exception 'The uploaded Resource Library file could not be verified.'
      using errcode = '22023';
  end if;

  select coalesce(max(version_number), 0) + 1
  into next_version
  from public.library_resource_versions
  where resource_id = p_resource_id;

  insert into public.library_resource_versions (
    id, resource_id, version_number, storage_bucket, storage_object_path,
    original_file_name, content_type, file_size_bytes, checksum_sha256,
    change_summary, created_by_profile_id
  ) values (
    p_version_id, p_resource_id, next_version, 'resource-library',
    p_storage_object_path, btrim(p_original_file_name), p_content_type,
    p_file_size_bytes, p_checksum_sha256,
    nullif(btrim(coalesce(p_change_summary, '')), ''), auth.uid()
  );

  update public.library_resources
  set current_version_id = p_version_id
  where id = p_resource_id;

  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    auth.uid(), 'resource_library.version_created', 'library_resource',
    p_resource_id, 'success', 'web', jsonb_build_object(
      'versionId', p_version_id,
      'versionNumber', next_version,
      'contentType', p_content_type,
      'fileSizeBytes', p_file_size_bytes
    )
  );
  return next_version;
end;
$$;

create or replace function public.list_library_resource_versions(
  p_resource_id uuid
)
returns table (
  version_id uuid,
  version_number integer,
  is_current boolean,
  original_file_name text,
  content_type text,
  file_size_bytes bigint,
  checksum_sha256 text,
  change_summary text,
  created_by_profile_id uuid,
  created_at timestamp with time zone
)
language plpgsql stable security definer
set search_path = '' set row_security = off
as $$
begin
  if not private.can_manage_resource_library() then
    raise exception 'Resource version history is denied.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.library_resources where id = p_resource_id) then
    raise exception 'Resource not found.' using errcode = 'P0002';
  end if;

  return query
  select
    versions.id,
    versions.version_number,
    resources.current_version_id = versions.id,
    versions.original_file_name,
    versions.content_type,
    versions.file_size_bytes,
    versions.checksum_sha256,
    versions.change_summary,
    versions.created_by_profile_id,
    versions.created_at
  from public.library_resource_versions as versions
  join public.library_resources as resources on resources.id = versions.resource_id
  where versions.resource_id = p_resource_id
  order by versions.version_number desc;
end;
$$;

create or replace function public.authorize_library_resource_download(
  p_resource_id uuid,
  p_version_id uuid default null
)
returns jsonb
language plpgsql security definer
set search_path = '' set row_security = off
as $$
declare
  resource_record record;
  version_record record;
  can_manage boolean := private.can_manage_resource_library();
begin
  if not private.current_profile_is_active() then
    raise exception 'Resource download is denied.' using errcode = '42501';
  end if;

  select id, status, audience, current_version_id
  into resource_record
  from public.library_resources
  where id = p_resource_id
    and (
      can_manage
      or (
        status = 'published'
        and private.can_view_library_audience(audience)
      )
    );
  if not found then
    raise exception 'Resource download is denied.' using errcode = '42501';
  end if;

  if not can_manage and p_version_id is not null
    and p_version_id <> resource_record.current_version_id then
    raise exception 'Historical resource download is denied.' using errcode = '42501';
  end if;

  select
    id, version_number, storage_bucket, storage_object_path,
    original_file_name, content_type, file_size_bytes
  into version_record
  from public.library_resource_versions
  where resource_id = p_resource_id
    and id = coalesce(p_version_id, resource_record.current_version_id);
  if not found then
    raise exception 'Resource file version not found.' using errcode = 'P0002';
  end if;

  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    auth.uid(), 'resource_library.download_authorized', 'library_resource',
    p_resource_id, 'success', 'web', jsonb_build_object(
      'versionId', version_record.id,
      'versionNumber', version_record.version_number,
      'resourceStatus', resource_record.status,
      'audience', resource_record.audience
    )
  );

  return jsonb_build_object(
    'bucket', version_record.storage_bucket,
    'objectPath', version_record.storage_object_path,
    'fileName', version_record.original_file_name,
    'contentType', version_record.content_type,
    'fileSizeBytes', version_record.file_size_bytes,
    'versionId', version_record.id,
    'versionNumber', version_record.version_number
  );
end;
$$;

revoke all on function public.create_library_resource_version(
  uuid, uuid, text, text, text, bigint, text, text
) from public, anon, authenticated;
revoke all on function public.list_library_resource_versions(uuid)
  from public, anon, authenticated;
revoke all on function public.authorize_library_resource_download(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.create_library_resource_version(
  uuid, uuid, text, text, text, bigint, text, text
) to authenticated;
grant execute on function public.list_library_resource_versions(uuid)
  to authenticated;
grant execute on function public.authorize_library_resource_download(uuid, uuid)
  to authenticated;

comment on function public.create_library_resource_version(
  uuid, uuid, text, text, text, bigint, text, text
) is 'Registers one verified private file as the next immutable Resource Library version.';
comment on function public.authorize_library_resource_download(uuid, uuid) is
  'Authorizes and audits a current audience-scoped or manager historical download.';

commit;
