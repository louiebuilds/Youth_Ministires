begin;

create or replace function public.list_lesson_teaching_resources(
  p_lesson_id uuid
)
returns table (
  teaching_resource_id uuid,
  title text,
  resource_type public.teaching_resource_type,
  description text,
  external_url text,
  original_file_name text,
  content_type text,
  file_size_bytes bigint,
  has_file boolean
)
language plpgsql stable security definer
set search_path = '' set row_security = off
as $$
declare can_manage boolean;
begin
  can_manage := private.can_manage_curriculum();
  if not private.can_view_curriculum() or not exists (
    select 1 from public.lessons
    where id = p_lesson_id
      and (can_manage or status = 'published')
  ) then
    raise exception 'Teaching resource access is denied.'
      using errcode = '42501';
  end if;
  return query
  select
    resources.id, resources.title, resources.resource_type,
    resources.description, resources.external_url,
    resources.original_file_name, resources.content_type,
    resources.file_size_bytes, resources.storage_object_path is not null
  from public.teaching_resources as resources
  where resources.lesson_id = p_lesson_id
    and resources.archived_at is null
  order by resources.created_at, resources.title;
end;
$$;

create or replace function public.create_teaching_resource_link(
  p_lesson_id uuid,
  p_title text,
  p_resource_type public.teaching_resource_type,
  p_description text,
  p_external_url text
)
returns uuid
language plpgsql security definer
set search_path = '' set row_security = off
as $$
declare new_id uuid;
begin
  if not private.can_manage_curriculum() then
    raise exception 'Teaching resource creation is denied.'
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.lessons
    where id = p_lesson_id and status <> 'archived'
  ) or length(btrim(coalesce(p_title, ''))) not between 1 and 200
    or p_resource_type not in ('video', 'link', 'other')
    or length(btrim(coalesce(p_external_url, ''))) not between 1 and 2000
    or btrim(p_external_url) !~ '^https://' then
    raise exception 'Teaching resource details are invalid.'
      using errcode = '22023';
  end if;
  insert into public.teaching_resources (
    lesson_id, title, resource_type, description, external_url,
    created_by_profile_id
  ) values (
    p_lesson_id, btrim(p_title), p_resource_type,
    nullif(btrim(coalesce(p_description, '')), ''),
    btrim(p_external_url), (select auth.uid())
  ) returning id into new_id;
  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    (select auth.uid()), 'curriculum.resource_link_created',
    'teaching_resource', new_id, 'success', 'web',
    jsonb_build_object(
      'lessonId', p_lesson_id, 'resourceType', p_resource_type
    )
  );
  return new_id;
end;
$$;

create or replace function public.archive_teaching_resource(
  p_teaching_resource_id uuid
)
returns void
language plpgsql security definer
set search_path = '' set row_security = off
as $$
declare selected_lesson_id uuid;
begin
  if not private.can_manage_curriculum() then
    raise exception 'Teaching resource archive is denied.'
      using errcode = '42501';
  end if;
  update public.teaching_resources as resources
  set archived_at = now(), updated_at = now()
  from public.lessons
  where resources.id = p_teaching_resource_id
    and resources.archived_at is null
    and lessons.id = resources.lesson_id
    and lessons.status <> 'archived'
  returning resources.lesson_id into selected_lesson_id;
  if not found then
    raise exception 'Teaching resource cannot be archived.'
      using errcode = '22023';
  end if;
  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    (select auth.uid()), 'curriculum.resource_archived',
    'teaching_resource', p_teaching_resource_id, 'success', 'web',
    jsonb_build_object('lessonId', selected_lesson_id)
  );
end;
$$;

revoke all on function public.list_lesson_teaching_resources(uuid)
  from public, anon, authenticated;
revoke all on function public.create_teaching_resource_link(
  uuid, text, public.teaching_resource_type, text, text
) from public, anon, authenticated;
revoke all on function public.archive_teaching_resource(uuid)
  from public, anon, authenticated;

grant execute on function public.list_lesson_teaching_resources(uuid)
  to authenticated;
grant execute on function public.create_teaching_resource_link(
  uuid, text, public.teaching_resource_type, text, text
) to authenticated;
grant execute on function public.archive_teaching_resource(uuid)
  to authenticated;

commit;
