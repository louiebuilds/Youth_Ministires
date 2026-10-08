    begin;

-- Parent Community controlled actions.
--
-- Direct table writes remain disabled.
-- All Community mutations go through SECURITY DEFINER RPCs so that:
--
--   Parent:
--     - create posts
--     - edit/remove own published posts
--     - create comments
--     - edit/remove own published comments
--
--   Youth Pastor / Platform Administrator:
--     - all participant actions
--     - pin/unpin posts
--     - lock/unlock posts
--     - hide/remove posts
--     - hide/remove comments
--
-- Event linking is intentionally deferred from create/edit RPCs until the
-- existing event-visibility rules are reviewed.

create or replace function public.create_community_post(
  p_category_id uuid,
  p_title text,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_post_id uuid;
begin
  if v_user_id is null
    or not private.can_participate_in_parent_community() then
    raise exception 'Parent Community participation is denied.'
      using errcode = '42501';
  end if;

  if length(btrim(coalesce(p_title, ''))) < 1
    or length(btrim(p_title)) > 160 then
    raise exception 'Community post title is invalid.'
      using errcode = '22023';
  end if;

  if length(btrim(coalesce(p_body, ''))) < 1
    or length(btrim(p_body)) > 5000 then
    raise exception 'Community post body is invalid.'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.community_categories
    where id = p_category_id
      and is_active
  ) then
    raise exception 'Community category is invalid.'
      using errcode = '22023';
  end if;

  insert into public.community_posts (
    author_profile_id,
    category_id,
    event_id,
    title,
    body,
    lifecycle_status,
    is_pinned,
    is_locked
  )
  values (
    v_user_id,
    p_category_id,
    null,
    btrim(p_title),
    btrim(p_body),
    'published',
    false,
    false
  )
  returning id into v_post_id;

  insert into public.audit_events (
    action,
    actor_profile_id,
    entity_id,
    entity_type,
    metadata,
    result,
    source
  )
  values (
    'community.post_created',
    v_user_id,
    v_post_id,
    'community_post',
    jsonb_build_object(
      'categoryId',
      p_category_id
    ),
    'success',
    'web'
  );

  return v_post_id;
end;
$$;

create or replace function public.update_community_post(
  p_post_id uuid,
  p_category_id uuid,
  p_title text,
  p_body text
)
returns void
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null
    or not private.can_participate_in_parent_community() then
    raise exception 'Parent Community participation is denied.'
      using errcode = '42501';
  end if;

  if length(btrim(coalesce(p_title, ''))) < 1
    or length(btrim(p_title)) > 160 then
    raise exception 'Community post title is invalid.'
      using errcode = '22023';
  end if;

  if length(btrim(coalesce(p_body, ''))) < 1
    or length(btrim(p_body)) > 5000 then
    raise exception 'Community post body is invalid.'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.community_categories
    where id = p_category_id
      and is_active
  ) then
    raise exception 'Community category is invalid.'
      using errcode = '22023';
  end if;

  update public.community_posts
  set
    category_id = p_category_id,
    title = btrim(p_title),
    body = btrim(p_body),
    updated_at = now()
  where id = p_post_id
    and author_profile_id = v_user_id
    and lifecycle_status = 'published';

  if not found then
    raise exception 'Community post is unavailable or cannot be edited.'
      using errcode = '42501';
  end if;

  insert into public.audit_events (
    action,
    actor_profile_id,
    entity_id,
    entity_type,
    metadata,
    result,
    source
  )
  values (
    'community.post_updated',
    v_user_id,
    p_post_id,
    'community_post',
    jsonb_build_object(
      'categoryId',
      p_category_id
    ),
    'success',
    'web'
  );
end;
$$;

create or replace function public.remove_community_post(
  p_post_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null
    or not private.can_participate_in_parent_community() then
    raise exception 'Parent Community participation is denied.'
      using errcode = '42501';
  end if;

  update public.community_posts
  set
    lifecycle_status = 'removed',
    updated_at = now()
  where id = p_post_id
    and author_profile_id = v_user_id
    and lifecycle_status = 'published';

  if not found then
    raise exception 'Community post is unavailable or cannot be removed.'
      using errcode = '42501';
  end if;

  insert into public.audit_events (
    action,
    actor_profile_id,
    entity_id,
    entity_type,
    metadata,
    result,
    source
  )
  values (
    'community.post_removed_by_author',
    v_user_id,
    p_post_id,
    'community_post',
    '{}'::jsonb,
    'success',
    'web'
  );
end;
$$;

create or replace function public.create_community_comment(
  p_post_id uuid,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_comment_id uuid;
begin
  if v_user_id is null
    or not private.can_participate_in_parent_community() then
    raise exception 'Parent Community participation is denied.'
      using errcode = '42501';
  end if;

  if length(btrim(coalesce(p_body, ''))) < 1
    or length(btrim(p_body)) > 3000 then
    raise exception 'Community comment is invalid.'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.community_posts
    where id = p_post_id
      and lifecycle_status = 'published'
      and not is_locked
  ) then
    raise exception 'Community discussion is unavailable or locked.'
      using errcode = '22023';
  end if;

  insert into public.community_comments (
    post_id,
    author_profile_id,
    body,
    lifecycle_status
  )
  values (
    p_post_id,
    v_user_id,
    btrim(p_body),
    'published'
  )
  returning id into v_comment_id;

  insert into public.audit_events (
    action,
    actor_profile_id,
    entity_id,
    entity_type,
    metadata,
    result,
    source
  )
  values (
    'community.comment_created',
    v_user_id,
    v_comment_id,
    'community_comment',
    jsonb_build_object(
      'postId',
      p_post_id
    ),
    'success',
    'web'
  );

  return v_comment_id;
end;
$$;

create or replace function public.update_community_comment(
  p_comment_id uuid,
  p_body text
)
returns void
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null
    or not private.can_participate_in_parent_community() then
    raise exception 'Parent Community participation is denied.'
      using errcode = '42501';
  end if;

  if length(btrim(coalesce(p_body, ''))) < 1
    or length(btrim(p_body)) > 3000 then
    raise exception 'Community comment is invalid.'
      using errcode = '22023';
  end if;

  update public.community_comments as comments
  set
    body = btrim(p_body),
    updated_at = now()
  where comments.id = p_comment_id
    and comments.author_profile_id = v_user_id
    and comments.lifecycle_status = 'published'
    and exists (
      select 1
      from public.community_posts as posts
      where posts.id = comments.post_id
        and posts.lifecycle_status = 'published'
        and not posts.is_locked
    );

  if not found then
    raise exception 'Community comment is unavailable or cannot be edited.'
      using errcode = '42501';
  end if;

  insert into public.audit_events (
    action,
    actor_profile_id,
    entity_id,
    entity_type,
    metadata,
    result,
    source
  )
  values (
    'community.comment_updated',
    v_user_id,
    p_comment_id,
    'community_comment',
    '{}'::jsonb,
    'success',
    'web'
  );
end;
$$;

create or replace function public.remove_community_comment(
  p_comment_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null
    or not private.can_participate_in_parent_community() then
    raise exception 'Parent Community participation is denied.'
      using errcode = '42501';
  end if;

  update public.community_comments
  set
    lifecycle_status = 'removed',
    updated_at = now()
  where id = p_comment_id
    and author_profile_id = v_user_id
    and lifecycle_status = 'published';

  if not found then
    raise exception 'Community comment is unavailable or cannot be removed.'
      using errcode = '42501';
  end if;

  insert into public.audit_events (
    action,
    actor_profile_id,
    entity_id,
    entity_type,
    metadata,
    result,
    source
  )
  values (
    'community.comment_removed_by_author',
    v_user_id,
    p_comment_id,
    'community_comment',
    '{}'::jsonb,
    'success',
    'web'
  );
end;
$$;

create or replace function public.set_community_post_pinned(
  p_post_id uuid,
  p_is_pinned boolean
)
returns void
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null
    or not private.can_moderate_parent_community() then
    raise exception 'Parent Community moderation is denied.'
      using errcode = '42501';
  end if;

  update public.community_posts
  set
    is_pinned = p_is_pinned,
    updated_at = now()
  where id = p_post_id
    and lifecycle_status = 'published';

  if not found then
    raise exception 'Community post is unavailable.'
      using errcode = '22023';
  end if;

  insert into public.audit_events (
    action,
    actor_profile_id,
    entity_id,
    entity_type,
    metadata,
    result,
    source
  )
  values (
    case
      when p_is_pinned
        then 'community.post_pinned'
      else 'community.post_unpinned'
    end,
    v_user_id,
    p_post_id,
    'community_post',
    jsonb_build_object(
      'isPinned',
      p_is_pinned
    ),
    'success',
    'web'
  );
end;
$$;

create or replace function public.set_community_post_locked(
  p_post_id uuid,
  p_is_locked boolean
)
returns void
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null
    or not private.can_moderate_parent_community() then
    raise exception 'Parent Community moderation is denied.'
      using errcode = '42501';
  end if;

  update public.community_posts
  set
    is_locked = p_is_locked,
    updated_at = now()
  where id = p_post_id
    and lifecycle_status = 'published';

  if not found then
    raise exception 'Community post is unavailable.'
      using errcode = '22023';
  end if;

  insert into public.audit_events (
    action,
    actor_profile_id,
    entity_id,
    entity_type,
    metadata,
    result,
    source
  )
  values (
    case
      when p_is_locked
        then 'community.post_locked'
      else 'community.post_unlocked'
    end,
    v_user_id,
    p_post_id,
    'community_post',
    jsonb_build_object(
      'isLocked',
      p_is_locked
    ),
    'success',
    'web'
  );
end;
$$;

create or replace function public.moderate_community_post(
  p_post_id uuid,
  p_status text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null
    or not private.can_moderate_parent_community() then
    raise exception 'Parent Community moderation is denied.'
      using errcode = '42501';
  end if;

  if p_status not in ('published', 'hidden', 'removed') then
    raise exception 'Community moderation status is invalid.'
      using errcode = '22023';
  end if;

  if p_status <> 'published'
    and length(btrim(coalesce(p_reason, ''))) < 1 then
    raise exception 'A moderation reason is required.'
      using errcode = '22023';
  end if;

  if p_reason is not null
    and length(btrim(p_reason)) > 500 then
    raise exception 'Moderation reason is too long.'
      using errcode = '22023';
  end if;

  update public.community_posts
  set
    lifecycle_status = p_status,
    moderated_at =
      case
        when p_status = 'published' then null
        else now()
      end,
    moderated_by_profile_id =
      case
        when p_status = 'published' then null
        else v_user_id
      end,
    moderation_reason =
      case
        when p_status = 'published' then null
        else btrim(p_reason)
      end,
    updated_at = now()
  where id = p_post_id;

  if not found then
    raise exception 'Community post is unavailable.'
      using errcode = '22023';
  end if;

  insert into public.audit_events (
    action,
    actor_profile_id,
    entity_id,
    entity_type,
    metadata,
    result,
    source
  )
  values (
    'community.post_moderated',
    v_user_id,
    p_post_id,
    'community_post',
    jsonb_build_object(
      'status',
      p_status,
      'reason',
      case
        when p_status = 'published' then null
        else btrim(p_reason)
      end
    ),
    'success',
    'web'
  );
end;
$$;

create or replace function public.moderate_community_comment(
  p_comment_id uuid,
  p_status text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null
    or not private.can_moderate_parent_community() then
    raise exception 'Parent Community moderation is denied.'
      using errcode = '42501';
  end if;

  if p_status not in ('published', 'hidden', 'removed') then
    raise exception 'Community moderation status is invalid.'
      using errcode = '22023';
  end if;

  if p_status <> 'published'
    and length(btrim(coalesce(p_reason, ''))) < 1 then
    raise exception 'A moderation reason is required.'
      using errcode = '22023';
  end if;

  if p_reason is not null
    and length(btrim(p_reason)) > 500 then
    raise exception 'Moderation reason is too long.'
      using errcode = '22023';
  end if;

  update public.community_comments
  set
    lifecycle_status = p_status,
    moderated_at =
      case
        when p_status = 'published' then null
        else now()
      end,
    moderated_by_profile_id =
      case
        when p_status = 'published' then null
        else v_user_id
      end,
    moderation_reason =
      case
        when p_status = 'published' then null
        else btrim(p_reason)
      end,
    updated_at = now()
  where id = p_comment_id;

  if not found then
    raise exception 'Community comment is unavailable.'
      using errcode = '22023';
  end if;

  insert into public.audit_events (
    action,
    actor_profile_id,
    entity_id,
    entity_type,
    metadata,
    result,
    source
  )
  values (
    'community.comment_moderated',
    v_user_id,
    p_comment_id,
    'community_comment',
    jsonb_build_object(
      'status',
      p_status,
      'reason',
      case
        when p_status = 'published' then null
        else btrim(p_reason)
      end
    ),
    'success',
    'web'
  );
end;
$$;

revoke all on function public.create_community_post(uuid, text, text)
  from public, anon, authenticated;

revoke all on function public.update_community_post(uuid, uuid, text, text)
  from public, anon, authenticated;

revoke all on function public.remove_community_post(uuid)
  from public, anon, authenticated;

revoke all on function public.create_community_comment(uuid, text)
  from public, anon, authenticated;

revoke all on function public.update_community_comment(uuid, text)
  from public, anon, authenticated;

revoke all on function public.remove_community_comment(uuid)
  from public, anon, authenticated;

revoke all on function public.set_community_post_pinned(uuid, boolean)
  from public, anon, authenticated;

revoke all on function public.set_community_post_locked(uuid, boolean)
  from public, anon, authenticated;

revoke all on function public.moderate_community_post(uuid, text, text)
  from public, anon, authenticated;

revoke all on function public.moderate_community_comment(uuid, text, text)
  from public, anon, authenticated;

grant execute on function public.create_community_post(uuid, text, text)
  to authenticated;

grant execute on function public.update_community_post(uuid, uuid, text, text)
  to authenticated;

grant execute on function public.remove_community_post(uuid)
  to authenticated;

grant execute on function public.create_community_comment(uuid, text)
  to authenticated;

grant execute on function public.update_community_comment(uuid, text)
  to authenticated;

grant execute on function public.remove_community_comment(uuid)
  to authenticated;

grant execute on function public.set_community_post_pinned(uuid, boolean)
  to authenticated;

grant execute on function public.set_community_post_locked(uuid, boolean)
  to authenticated;

grant execute on function public.moderate_community_post(uuid, text, text)
  to authenticated;

grant execute on function public.moderate_community_comment(uuid, text, text)
  to authenticated;

commit;