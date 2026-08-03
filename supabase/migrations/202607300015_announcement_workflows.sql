begin;

create or replace function private.can_view_announcement_audience(
  target_audience public.communication_audience_type
)
returns boolean
language sql stable security definer
set search_path = '' set row_security = off
as $$
  select private.current_profile_is_active()
    and (
      target_audience = 'ministry'
      or (
        target_audience = 'parents'
        and private.has_role(array['parent']::public.account_role[])
      )
      or (
        target_audience = 'volunteers'
        and private.has_role(array['volunteer']::public.account_role[])
      )
    )
$$;

create or replace function public.list_announcements(
  p_search text default null,
  p_include_archived boolean default false
)
returns table (
  announcement_id uuid,
  title text,
  message_body text,
  audience_type public.communication_audience_type,
  published_at timestamp with time zone,
  expires_at timestamp with time zone,
  archived_at timestamp with time zone,
  can_manage boolean
)
language plpgsql stable security definer
set search_path = '' set row_security = off
as $$
declare
  normalized_search text;
  manager boolean := private.can_manage_communications();
begin
  if not private.current_profile_is_active() then
    raise exception 'Announcement access is denied.' using errcode = '42501';
  end if;
  normalized_search := nullif(btrim(coalesce(p_search, '')), '');
  if normalized_search is not null and length(normalized_search) > 100 then
    raise exception 'Announcement search is invalid.' using errcode = '22023';
  end if;
  return query
  select
    a.id, a.title, a.message_body, a.audience_type, a.published_at,
    a.expires_at, a.archived_at, manager
  from public.announcements a
  where (
      manager
      or (
        a.published_at is not null
        and a.published_at <= now()
        and a.archived_at is null
        and (a.expires_at is null or a.expires_at > now())
        and private.can_view_announcement_audience(a.audience_type)
      )
    )
    and (p_include_archived or a.archived_at is null)
    and (
      normalized_search is null
      or lower(a.title) like '%' || lower(normalized_search) || '%'
      or lower(a.message_body) like '%' || lower(normalized_search) || '%'
    )
  order by coalesce(a.published_at, a.created_at) desc, a.title;
end;
$$;

create or replace function public.create_announcement(
  p_title text,
  p_message_body text,
  p_audience_type public.communication_audience_type,
  p_expires_at timestamp with time zone default null
)
returns uuid
language plpgsql security definer
set search_path = '' set row_security = off
as $$
declare new_id uuid;
begin
  if not private.can_manage_communications() then
    raise exception 'Announcement creation is denied.' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_title, ''))) not between 1 and 200
    or length(btrim(coalesce(p_message_body, ''))) not between 1 and 10000
    or p_audience_type not in ('ministry', 'parents', 'volunteers')
    or (p_expires_at is not null and p_expires_at <= now()) then
    raise exception 'Announcement details are invalid.' using errcode = '22023';
  end if;
  insert into public.announcements (
    title, message_body, audience_type, expires_at, created_by_profile_id
  ) values (
    btrim(p_title), btrim(p_message_body), p_audience_type, p_expires_at,
    (select auth.uid())
  ) returning id into new_id;
  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    (select auth.uid()), 'communication.announcement_created',
    'announcement', new_id, 'success', 'web',
    jsonb_build_object('audienceType', p_audience_type)
  );
  return new_id;
end;
$$;

create or replace function public.update_announcement(
  p_announcement_id uuid,
  p_title text,
  p_message_body text,
  p_audience_type public.communication_audience_type,
  p_expires_at timestamp with time zone default null
)
returns void
language plpgsql security definer
set search_path = '' set row_security = off
as $$
begin
  if not private.can_manage_communications() then
    raise exception 'Announcement update is denied.' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_title, ''))) not between 1 and 200
    or length(btrim(coalesce(p_message_body, ''))) not between 1 and 10000
    or p_audience_type not in ('ministry', 'parents', 'volunteers')
    or (p_expires_at is not null and p_expires_at <= now()) then
    raise exception 'Announcement details are invalid.' using errcode = '22023';
  end if;
  update public.announcements set
    title = btrim(p_title),
    message_body = btrim(p_message_body),
    audience_type = p_audience_type,
    expires_at = p_expires_at,
    updated_at = now()
  where id = p_announcement_id and archived_at is null;
  if not found then
    raise exception 'Announcement cannot be updated.' using errcode = '22023';
  end if;
  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    (select auth.uid()), 'communication.announcement_updated',
    'announcement', p_announcement_id, 'success', 'web',
    jsonb_build_object('audienceType', p_audience_type)
  );
end;
$$;

create or replace function public.publish_announcement(p_announcement_id uuid)
returns void
language plpgsql security definer
set search_path = '' set row_security = off
as $$
begin
  if not private.can_manage_communications() then
    raise exception 'Announcement publication is denied.' using errcode = '42501';
  end if;
  update public.announcements set published_at = now(), updated_at = now()
  where id = p_announcement_id
    and published_at is null
    and archived_at is null
    and (expires_at is null or expires_at > now());
  if not found then
    raise exception 'Announcement cannot be published.' using errcode = '22023';
  end if;
  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    (select auth.uid()), 'communication.announcement_published',
    'announcement', p_announcement_id, 'success', 'web', '{}'::jsonb
  );
end;
$$;

create or replace function public.archive_announcement(p_announcement_id uuid)
returns void
language plpgsql security definer
set search_path = '' set row_security = off
as $$
begin
  if not private.can_manage_communications() then
    raise exception 'Announcement archive is denied.' using errcode = '42501';
  end if;
  update public.announcements
  set archived_at = now(), updated_at = now()
  where id = p_announcement_id and archived_at is null;
  if not found then
    raise exception 'Announcement cannot be archived.' using errcode = '22023';
  end if;
  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    (select auth.uid()), 'communication.announcement_archived',
    'announcement', p_announcement_id, 'success', 'web', '{}'::jsonb
  );
end;
$$;

revoke all on function private.can_view_announcement_audience(
  public.communication_audience_type
) from public, anon, authenticated;
grant execute on function private.can_view_announcement_audience(
  public.communication_audience_type
) to authenticated;

revoke all on function public.list_announcements(text, boolean)
  from public, anon, authenticated;
revoke all on function public.create_announcement(
  text, text, public.communication_audience_type, timestamp with time zone
) from public, anon, authenticated;
revoke all on function public.update_announcement(
  uuid, text, text, public.communication_audience_type,
  timestamp with time zone
) from public, anon, authenticated;
revoke all on function public.publish_announcement(uuid)
  from public, anon, authenticated;
revoke all on function public.archive_announcement(uuid)
  from public, anon, authenticated;

grant execute on function public.list_announcements(text, boolean)
  to authenticated;
grant execute on function public.create_announcement(
  text, text, public.communication_audience_type, timestamp with time zone
) to authenticated;
grant execute on function public.update_announcement(
  uuid, text, text, public.communication_audience_type,
  timestamp with time zone
) to authenticated;
grant execute on function public.publish_announcement(uuid) to authenticated;
grant execute on function public.archive_announcement(uuid) to authenticated;

commit;
