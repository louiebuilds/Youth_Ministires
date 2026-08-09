begin;

create or replace function public.list_library_resources(
  p_search text default null,
  p_category_id uuid default null,
  p_resource_type public.library_resource_type default null,
  p_audience public.library_resource_audience default null,
  p_status public.library_resource_status default null,
  p_include_archived boolean default false
)
returns table (
  resource_id uuid,
  category_id uuid,
  category_name text,
  title text,
  description text,
  resource_type public.library_resource_type,
  audience public.library_resource_audience,
  resource_status public.library_resource_status,
  current_version_id uuid,
  current_version_number integer,
  original_file_name text,
  content_type text,
  file_size_bytes bigint,
  published_at timestamp with time zone,
  archived_at timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
language plpgsql stable security definer
set search_path = '' set row_security = off
as $$
declare can_manage boolean := private.can_manage_resource_library();
begin
  if not private.current_profile_is_active() then
    raise exception 'Resource Library access is denied.' using errcode = '42501';
  end if;

  return query
  select
    resources.id,
    resources.category_id,
    categories.name,
    resources.title,
    resources.description,
    resources.resource_type,
    resources.audience,
    resources.status,
    resources.current_version_id,
    versions.version_number,
    versions.original_file_name,
    versions.content_type,
    versions.file_size_bytes,
    resources.published_at,
    resources.archived_at,
    resources.created_at,
    resources.updated_at
  from public.library_resources as resources
  left join public.resource_categories as categories
    on categories.id = resources.category_id
  left join public.library_resource_versions as versions
    on versions.id = resources.current_version_id
  where (
      (can_manage and (p_include_archived or resources.status <> 'archived'))
      or (
        not can_manage
        and resources.status = 'published'
        and private.can_view_library_audience(resources.audience)
      )
    )
    and (p_category_id is null or resources.category_id = p_category_id)
    and (p_resource_type is null or resources.resource_type = p_resource_type)
    and (p_audience is null or resources.audience = p_audience)
    and (p_status is null or resources.status = p_status)
    and (
      nullif(btrim(coalesce(p_search, '')), '') is null
      or resources.title ilike '%' || btrim(p_search) || '%'
      or coalesce(resources.description, '') ilike '%' || btrim(p_search) || '%'
      or coalesce(categories.name, '') ilike '%' || btrim(p_search) || '%'
    )
  order by resources.updated_at desc, lower(resources.title);
end;
$$;

create or replace function public.create_library_resource(
  p_category_id uuid,
  p_title text,
  p_description text,
  p_resource_type public.library_resource_type,
  p_audience public.library_resource_audience
)
returns uuid
language plpgsql security definer
set search_path = '' set row_security = off
as $$
declare new_id uuid;
begin
  if not private.can_manage_resource_library() then
    raise exception 'Resource Library management is denied.' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_title, ''))) not between 1 and 200
    or length(btrim(coalesce(p_description, ''))) > 4000 then
    raise exception 'Resource details are invalid.' using errcode = '22023';
  end if;
  if p_category_id is not null and not exists (
    select 1 from public.resource_categories
    where id = p_category_id and archived_at is null
  ) then
    raise exception 'Active resource category not found.' using errcode = '22023';
  end if;

  insert into public.library_resources (
    category_id, title, description, resource_type, audience,
    created_by_profile_id
  ) values (
    p_category_id, btrim(p_title),
    nullif(btrim(coalesce(p_description, '')), ''),
    p_resource_type, p_audience, auth.uid()
  ) returning id into new_id;

  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    auth.uid(), 'resource_library.resource_created', 'library_resource',
    new_id, 'success', 'web', jsonb_build_object(
      'resourceType', p_resource_type,
      'audience', p_audience
    )
  );
  return new_id;
end;
$$;

create or replace function public.update_library_resource(
  p_resource_id uuid,
  p_category_id uuid,
  p_title text,
  p_description text,
  p_resource_type public.library_resource_type,
  p_audience public.library_resource_audience
)
returns void
language plpgsql security definer
set search_path = '' set row_security = off
as $$
begin
  if not private.can_manage_resource_library() then
    raise exception 'Resource Library management is denied.' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_title, ''))) not between 1 and 200
    or length(btrim(coalesce(p_description, ''))) > 4000 then
    raise exception 'Resource details are invalid.' using errcode = '22023';
  end if;
  if p_category_id is not null and not exists (
    select 1 from public.resource_categories
    where id = p_category_id and archived_at is null
  ) then
    raise exception 'Active resource category not found.' using errcode = '22023';
  end if;

  update public.library_resources
  set category_id = p_category_id,
      title = btrim(p_title),
      description = nullif(btrim(coalesce(p_description, '')), ''),
      resource_type = p_resource_type,
      audience = p_audience
  where id = p_resource_id and status <> 'archived';
  if not found then
    raise exception 'Active resource not found.' using errcode = 'P0002';
  end if;

  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    auth.uid(), 'resource_library.resource_updated', 'library_resource',
    p_resource_id, 'success', 'web', jsonb_build_object(
      'resourceType', p_resource_type,
      'audience', p_audience
    )
  );
end;
$$;

create or replace function public.publish_library_resource(
  p_resource_id uuid
)
returns void
language plpgsql security definer
set search_path = '' set row_security = off
as $$
begin
  if not private.can_manage_resource_library() then
    raise exception 'Resource Library management is denied.' using errcode = '42501';
  end if;

  update public.library_resources as resources
  set status = 'published', published_at = now(), archived_at = null
  where resources.id = p_resource_id
    and resources.status = 'draft'
    and resources.current_version_id is not null
    and exists (
      select 1 from public.library_resource_versions as versions
      where versions.id = resources.current_version_id
        and versions.resource_id = resources.id
    );
  if not found then
    raise exception 'Draft resource with a current file version not found.'
      using errcode = 'P0002';
  end if;

  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    auth.uid(), 'resource_library.resource_published', 'library_resource',
    p_resource_id, 'success', 'web', '{}'::jsonb
  );
end;
$$;

create or replace function public.archive_library_resource(
  p_resource_id uuid
)
returns void
language plpgsql security definer
set search_path = '' set row_security = off
as $$
begin
  if not private.can_manage_resource_library() then
    raise exception 'Resource Library management is denied.' using errcode = '42501';
  end if;

  update public.library_resources
  set status = 'archived', archived_at = now()
  where id = p_resource_id and status <> 'archived';
  if not found then
    raise exception 'Active resource not found.' using errcode = 'P0002';
  end if;

  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    auth.uid(), 'resource_library.resource_archived', 'library_resource',
    p_resource_id, 'success', 'web', '{}'::jsonb
  );
end;
$$;

revoke all on function public.list_library_resources(
  text, uuid, public.library_resource_type,
  public.library_resource_audience, public.library_resource_status, boolean
) from public, anon, authenticated;
revoke all on function public.create_library_resource(
  uuid, text, text, public.library_resource_type,
  public.library_resource_audience
) from public, anon, authenticated;
revoke all on function public.update_library_resource(
  uuid, uuid, text, text, public.library_resource_type,
  public.library_resource_audience
) from public, anon, authenticated;
revoke all on function public.publish_library_resource(uuid)
  from public, anon, authenticated;
revoke all on function public.archive_library_resource(uuid)
  from public, anon, authenticated;

grant execute on function public.list_library_resources(
  text, uuid, public.library_resource_type,
  public.library_resource_audience, public.library_resource_status, boolean
) to authenticated;
grant execute on function public.create_library_resource(
  uuid, text, text, public.library_resource_type,
  public.library_resource_audience
) to authenticated;
grant execute on function public.update_library_resource(
  uuid, uuid, text, text, public.library_resource_type,
  public.library_resource_audience
) to authenticated;
grant execute on function public.publish_library_resource(uuid)
  to authenticated;
grant execute on function public.archive_library_resource(uuid)
  to authenticated;

commit;
