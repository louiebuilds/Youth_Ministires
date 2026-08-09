begin;

create or replace function public.list_resource_categories(
  p_include_archived boolean default false
)
returns table (
  category_id uuid,
  category_name text,
  category_description text,
  archived_at timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
language plpgsql stable security definer
set search_path = '' set row_security = off
as $$
begin
  if not private.current_profile_is_active() then
    raise exception 'Resource Library access is denied.' using errcode = '42501';
  end if;

  return query
  select
    categories.id,
    categories.name,
    categories.description,
    categories.archived_at,
    categories.created_at,
    categories.updated_at
  from public.resource_categories as categories
  where categories.archived_at is null
    or (p_include_archived and private.can_manage_resource_library())
  order by categories.archived_at nulls first, lower(categories.name);
end;
$$;

create or replace function public.create_resource_category(
  p_name text,
  p_description text default null
)
returns uuid
language plpgsql security definer
set search_path = '' set row_security = off
as $$
declare new_id uuid;
begin
  if not private.can_manage_resource_library() then
    raise exception 'Resource category management is denied.' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_name, ''))) not between 1 and 100
    or length(btrim(coalesce(p_description, ''))) > 1000 then
    raise exception 'Resource category details are invalid.' using errcode = '22023';
  end if;

  insert into public.resource_categories (
    name, description, created_by_profile_id
  ) values (
    btrim(p_name), nullif(btrim(coalesce(p_description, '')), ''), auth.uid()
  ) returning id into new_id;

  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    auth.uid(), 'resource_library.category_created', 'resource_category',
    new_id, 'success', 'web', '{}'::jsonb
  );
  return new_id;
end;
$$;

create or replace function public.update_resource_category(
  p_category_id uuid,
  p_name text,
  p_description text default null
)
returns void
language plpgsql security definer
set search_path = '' set row_security = off
as $$
begin
  if not private.can_manage_resource_library() then
    raise exception 'Resource category management is denied.' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_name, ''))) not between 1 and 100
    or length(btrim(coalesce(p_description, ''))) > 1000 then
    raise exception 'Resource category details are invalid.' using errcode = '22023';
  end if;

  update public.resource_categories
  set name = btrim(p_name),
      description = nullif(btrim(coalesce(p_description, '')), '')
  where id = p_category_id and archived_at is null;
  if not found then
    raise exception 'Active resource category not found.' using errcode = 'P0002';
  end if;

  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    auth.uid(), 'resource_library.category_updated', 'resource_category',
    p_category_id, 'success', 'web', '{}'::jsonb
  );
end;
$$;

create or replace function public.archive_resource_category(
  p_category_id uuid
)
returns void
language plpgsql security definer
set search_path = '' set row_security = off
as $$
begin
  if not private.can_manage_resource_library() then
    raise exception 'Resource category management is denied.' using errcode = '42501';
  end if;

  update public.resource_categories
  set archived_at = now()
  where id = p_category_id and archived_at is null;
  if not found then
    raise exception 'Active resource category not found.' using errcode = 'P0002';
  end if;

  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    auth.uid(), 'resource_library.category_archived', 'resource_category',
    p_category_id, 'success', 'web', '{}'::jsonb
  );
end;
$$;

revoke all on function public.list_resource_categories(boolean)
  from public, anon, authenticated;
revoke all on function public.create_resource_category(text, text)
  from public, anon, authenticated;
revoke all on function public.update_resource_category(uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.archive_resource_category(uuid)
  from public, anon, authenticated;

grant execute on function public.list_resource_categories(boolean)
  to authenticated;
grant execute on function public.create_resource_category(text, text)
  to authenticated;
grant execute on function public.update_resource_category(uuid, text, text)
  to authenticated;
grant execute on function public.archive_resource_category(uuid)
  to authenticated;

comment on function public.list_resource_categories(boolean) is
  'Lists active Resource Library categories for signed-in users and archived categories for managers.';

commit;
