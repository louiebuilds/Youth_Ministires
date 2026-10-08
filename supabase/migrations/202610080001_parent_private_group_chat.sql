begin;

alter table public.chat_rooms
  add column is_parent_managed boolean not null default false;

create or replace function private.can_manage_chat_room(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select private.current_profile_is_active()
    and (
      private.can_manage_chat()
      or exists (
        select 1
        from public.chat_rooms as rooms
        where rooms.id = p_room_id
          and rooms.is_parent_managed
          and rooms.created_by_profile_id = auth.uid()
      )
    )
$$;

create or replace function private.can_parent_invite_to_chat(
  p_room_id uuid,
  p_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select exists (
    select 1
    from public.chat_rooms as owned_room
    join public.profiles as candidate
      on candidate.id = p_profile_id
    where owned_room.id = p_room_id
      and owned_room.is_parent_managed
      and owned_room.created_by_profile_id = auth.uid()
      and candidate.status = 'active'
      and candidate.primary_role in (
        'parent',
        'volunteer',
        'youth_pastor',
        'staff_member'
      )
      and exists (
        select 1
        from public.chat_room_members as actor_membership
        join public.chat_room_members as candidate_membership
          on candidate_membership.room_id = actor_membership.room_id
         and candidate_membership.profile_id = p_profile_id
         and candidate_membership.removed_at is null
        where actor_membership.profile_id = auth.uid()
          and actor_membership.removed_at is null
          and actor_membership.room_id <> p_room_id
      )
  )
$$;

drop function public.list_chat_rooms();

create function public.list_chat_rooms()
returns table(
  room_id uuid,
  room_name text,
  room_type public.chat_room_type,
  source_access public.chat_source_access,
  event_id uuid,
  schedule_id uuid,
  archived_at timestamptz,
  unread_count bigint,
  last_message_at timestamptz,
  can_manage boolean,
  is_parent_managed boolean,
  is_owner boolean,
  owner_profile_id uuid
)
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select
    rooms.id,
    rooms.name,
    rooms.room_type,
    rooms.source_access,
    rooms.event_id,
    rooms.schedule_id,
    rooms.archived_at,
    case
      when rooms.archived_at is not null then 0
      else (
        select count(*)
        from public.chat_messages as messages
        left join public.chat_read_state as read_state
          on read_state.room_id = rooms.id
         and read_state.profile_id = auth.uid()
        where messages.room_id = rooms.id
          and messages.removed_at is null
          and messages.author_profile_id <> auth.uid()
          and (
            read_state.last_read_at is null
            or messages.created_at > read_state.last_read_at
          )
          and (
            not rooms.is_parent_managed
            or private.can_manage_chat()
            or messages.created_at >= coalesce((
              select membership.joined_at
              from public.chat_room_members as membership
              where membership.room_id = rooms.id
                and membership.profile_id = auth.uid()
                and membership.removed_at is null
              order by membership.joined_at desc
              limit 1
            ), messages.created_at)
          )
      )
    end,
    (
      select max(messages.created_at)
      from public.chat_messages as messages
      where messages.room_id = rooms.id
        and (
          not rooms.is_parent_managed
          or private.can_manage_chat()
          or messages.created_at >= coalesce((
            select membership.joined_at
            from public.chat_room_members as membership
            where membership.room_id = rooms.id
              and membership.profile_id = auth.uid()
              and membership.removed_at is null
            order by membership.joined_at desc
            limit 1
          ), messages.created_at)
        )
    ),
    private.can_manage_chat_room(rooms.id),
    rooms.is_parent_managed,
    rooms.is_parent_managed
      and rooms.created_by_profile_id = auth.uid(),
    case
      when rooms.is_parent_managed then rooms.created_by_profile_id
      else null
    end
  from public.chat_rooms as rooms
  where private.can_read_chat_room(rooms.id)
  order by
    rooms.archived_at nulls first,
    coalesce((
      select max(messages.created_at)
      from public.chat_messages as messages
      where messages.room_id = rooms.id
    ), rooms.created_at) desc
$$;

create or replace function public.get_chat_room(p_room_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
declare
  v_room jsonb;
begin
  if not private.can_read_chat_room(p_room_id) then
    raise exception 'Chat room access denied.' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'room_id', rooms.id,
    'room_name', rooms.name,
    'room_type', rooms.room_type,
    'source_access', rooms.source_access,
    'event_id', rooms.event_id,
    'schedule_id', rooms.schedule_id,
    'archived_at', rooms.archived_at,
    'can_manage', private.can_manage_chat_room(rooms.id),
    'is_parent_managed', rooms.is_parent_managed,
    'is_owner', rooms.is_parent_managed
      and rooms.created_by_profile_id = auth.uid(),
    'owner_profile_id', case
      when rooms.is_parent_managed then rooms.created_by_profile_id
      else null
    end
  )
  into v_room
  from public.chat_rooms as rooms
  where rooms.id = p_room_id;

  if v_room is null then
    raise exception 'Chat room not found.' using errcode = 'P0002';
  end if;

  return v_room;
end;
$$;

create or replace function public.list_chat_messages(
  p_room_id uuid,
  p_before timestamptz default null,
  p_limit integer default 100
)
returns table(
  message_id uuid,
  author_profile_id uuid,
  author_name text,
  message_body text,
  reply_to_message_id uuid,
  reply_author_name text,
  reply_message_body text,
  removed_at timestamptz,
  created_at timestamptz,
  can_moderate boolean
)
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
declare
  v_parent_managed boolean;
  v_joined_at timestamptz;
begin
  if not private.can_read_chat_room(p_room_id) then
    raise exception 'Chat room access denied.' using errcode = '42501';
  end if;

  if p_limit not between 1 and 200 then
    raise exception 'Invalid message limit.' using errcode = '22023';
  end if;

  select rooms.is_parent_managed
  into v_parent_managed
  from public.chat_rooms as rooms
  where rooms.id = p_room_id;

  if v_parent_managed and not private.can_manage_chat() then
    select membership.joined_at
    into v_joined_at
    from public.chat_room_members as membership
    where membership.room_id = p_room_id
      and membership.profile_id = auth.uid()
      and membership.removed_at is null
    order by membership.joined_at desc
    limit 1;
  end if;

  return query
  select
    messages.id,
    messages.author_profile_id,
    author.display_name,
    case when messages.removed_at is null then messages.message_body else null end,
    messages.reply_to_message_id,
    case
      when v_joined_at is null or reply.created_at >= v_joined_at
        then reply_author.display_name
      else null
    end,
    case
      when (v_joined_at is null or reply.created_at >= v_joined_at)
        and reply.removed_at is null
        then reply.message_body
      else null
    end,
    messages.removed_at,
    messages.created_at,
    private.can_manage_chat()
  from public.chat_messages as messages
  join public.profiles as author
    on author.id = messages.author_profile_id
  left join public.chat_messages as reply
    on reply.id = messages.reply_to_message_id
  left join public.profiles as reply_author
    on reply_author.id = reply.author_profile_id
  where messages.room_id = p_room_id
    and (p_before is null or messages.created_at < p_before)
    and (v_joined_at is null or messages.created_at >= v_joined_at)
  order by messages.created_at asc
  limit p_limit;
end;
$$;

create or replace function public.create_chat_room(
  p_name text,
  p_room_type public.chat_room_type,
  p_source_access public.chat_source_access default 'explicit',
  p_event_id uuid default null,
  p_schedule_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  v_id uuid;
  v_parent_managed boolean := false;
begin
  if private.can_manage_chat() then
    v_parent_managed := false;
  elsif private.current_profile_is_active()
    and private.current_profile_role() = 'parent'
    and p_room_type = 'custom'
    and p_source_access = 'explicit'
    and p_event_id is null
    and p_schedule_id is null then
    v_parent_managed := true;
  else
    raise exception 'Chat room management denied.' using errcode = '42501';
  end if;

  if length(btrim(coalesce(p_name, ''))) not between 1 and 150 then
    raise exception 'Invalid room name.' using errcode = '22023';
  end if;

  insert into public.chat_rooms(
    name,
    room_type,
    source_access,
    event_id,
    schedule_id,
    created_by_profile_id,
    is_parent_managed
  )
  values(
    btrim(p_name),
    p_room_type,
    p_source_access,
    p_event_id,
    p_schedule_id,
    auth.uid(),
    v_parent_managed
  )
  returning id into v_id;

  if v_parent_managed then
    insert into public.chat_room_members(
      room_id,
      profile_id,
      membership_source,
      added_by_profile_id
    )
    values(v_id, auth.uid(), 'explicit', auth.uid());
  end if;

  insert into public.audit_events(
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    result,
    source,
    metadata
  )
  values(
    auth.uid(),
    'communication.chat_room_created',
    'chat_room',
    v_id,
    'success',
    'web',
    jsonb_build_object(
      'roomType', p_room_type,
      'sourceAccess', p_source_access,
      'parentManaged', v_parent_managed
    )
  );

  return v_id;
end;
$$;

create or replace function public.rename_chat_room(p_room_id uuid, p_name text)
returns void
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
begin
  if not private.can_manage_chat_room(p_room_id) then
    raise exception 'Chat room management denied.' using errcode = '42501';
  end if;

  if length(btrim(coalesce(p_name, ''))) not between 1 and 150 then
    raise exception 'Invalid room name.' using errcode = '22023';
  end if;

  update public.chat_rooms
  set name = btrim(p_name), updated_at = now()
  where id = p_room_id and archived_at is null;

  if not found then
    raise exception 'Active room not found.' using errcode = 'P0002';
  end if;

  insert into public.audit_events(
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  )
  values(
    auth.uid(), 'communication.chat_room_renamed', 'chat_room',
    p_room_id, 'success', 'web', '{}'
  );
end;
$$;

create or replace function public.archive_chat_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
begin
  if not private.can_manage_chat_room(p_room_id) then
    raise exception 'Chat room management denied.' using errcode = '42501';
  end if;

  update public.chat_rooms
  set
    archived_at = now(),
    archived_by_profile_id = auth.uid(),
    updated_at = now()
  where id = p_room_id and archived_at is null;

  if not found then
    raise exception 'Active room not found.' using errcode = 'P0002';
  end if;

  insert into public.audit_events(
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  )
  values(
    auth.uid(), 'communication.chat_room_archived', 'chat_room',
    p_room_id, 'success', 'web', '{}'
  );
end;
$$;

create or replace function public.list_chat_member_candidates(p_room_id uuid)
returns table(
  profile_id uuid,
  display_name text,
  primary_role public.account_role,
  is_member boolean
)
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
declare
  v_parent_owner boolean;
begin
  if not private.can_manage_chat_room(p_room_id) then
    raise exception 'Chat membership management denied.' using errcode = '42501';
  end if;

  select rooms.is_parent_managed
    and rooms.created_by_profile_id = auth.uid()
  into v_parent_owner
  from public.chat_rooms as rooms
  where rooms.id = p_room_id;

  return query
  select
    profiles.id,
    profiles.display_name,
    profiles.primary_role,
    exists (
      select 1
      from public.chat_room_members as membership
      where membership.room_id = p_room_id
        and membership.profile_id = profiles.id
        and membership.removed_at is null
    )
  from public.profiles as profiles
  where profiles.status = 'active'
    and private.chat_role_allowed(p_room_id, profiles.id)
    and (
      not coalesce(v_parent_owner, false)
      or exists (
        select 1
        from public.chat_room_members as membership
        where membership.room_id = p_room_id
          and membership.profile_id = profiles.id
          and membership.removed_at is null
      )
      or private.can_parent_invite_to_chat(p_room_id, profiles.id)
    )
  order by profiles.display_name;
end;
$$;

create or replace function public.add_chat_room_member(
  p_room_id uuid,
  p_profile_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  v_id uuid;
  v_parent_owner boolean;
begin
  if not private.can_manage_chat_room(p_room_id) then
    raise exception 'Chat membership management denied.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.chat_rooms
    where id = p_room_id and archived_at is null
  ) then
    raise exception 'Active room not found.' using errcode = 'P0002';
  end if;

  if not private.chat_role_allowed(p_room_id, p_profile_id) then
    raise exception 'Profile is not eligible for this room.' using errcode = '42501';
  end if;

  select rooms.is_parent_managed
    and rooms.created_by_profile_id = auth.uid()
  into v_parent_owner
  from public.chat_rooms as rooms
  where rooms.id = p_room_id;

  if coalesce(v_parent_owner, false)
    and not private.can_parent_invite_to_chat(p_room_id, p_profile_id) then
    raise exception 'Profile is not eligible for this private group.' using errcode = '42501';
  end if;

  insert into public.chat_room_members(
    room_id, profile_id, membership_source, added_by_profile_id
  )
  values(p_room_id, p_profile_id, 'explicit', auth.uid())
  returning id into v_id;

  insert into public.audit_events(
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  )
  values(
    auth.uid(), 'communication.chat_member_added', 'chat_room',
    p_room_id, 'success', 'web', jsonb_build_object('membershipId', v_id)
  );

  return v_id;
end;
$$;

create or replace function public.remove_chat_room_member(
  p_room_id uuid,
  p_profile_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
begin
  if not private.can_manage_chat_room(p_room_id) then
    raise exception 'Chat membership management denied.' using errcode = '42501';
  end if;

  if length(btrim(coalesce(p_reason, ''))) not between 1 and 500 then
    raise exception 'Removal reason required.' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.chat_rooms
    where id = p_room_id and archived_at is null
  ) then
    raise exception 'Active room not found.' using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from public.chat_rooms as rooms
    where rooms.id = p_room_id
      and rooms.is_parent_managed
      and rooms.created_by_profile_id = p_profile_id
  ) then
    raise exception 'The group owner cannot be removed. Close the group instead.'
      using errcode = '42501';
  end if;

  update public.chat_room_members
  set
    removed_at = now(),
    removed_by_profile_id = auth.uid(),
    removal_reason = btrim(p_reason)
  where room_id = p_room_id
    and profile_id = p_profile_id
    and removed_at is null;

  if not found then
    raise exception 'Active membership not found.' using errcode = 'P0002';
  end if;

  insert into public.audit_events(
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  )
  values(
    auth.uid(), 'communication.chat_member_removed', 'chat_room',
    p_room_id, 'success', 'web', jsonb_build_object('profileId', p_profile_id)
  );
end;
$$;

create function public.leave_chat_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
begin
  if not private.current_profile_is_active() then
    raise exception 'Chat room access denied.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.chat_rooms as rooms
    where rooms.id = p_room_id
      and rooms.is_parent_managed
      and rooms.archived_at is null
  ) then
    raise exception 'Active private group not found.' using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from public.chat_rooms as rooms
    where rooms.id = p_room_id
      and rooms.created_by_profile_id = auth.uid()
  ) then
    raise exception 'The group owner cannot leave. Close the group instead.'
      using errcode = '42501';
  end if;

  update public.chat_room_members
  set
    removed_at = now(),
    removed_by_profile_id = auth.uid(),
    removal_reason = 'Member left group'
  where room_id = p_room_id
    and profile_id = auth.uid()
    and removed_at is null;

  if not found then
    raise exception 'Active membership not found.' using errcode = 'P0002';
  end if;

  insert into public.audit_events(
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  )
  values(
    auth.uid(), 'communication.chat_member_left', 'chat_room',
    p_room_id, 'success', 'web', '{}'
  );
end;
$$;

revoke all on function private.can_manage_chat_room(uuid)
  from public, anon, authenticated;
revoke all on function private.can_parent_invite_to_chat(uuid, uuid)
  from public, anon, authenticated;

revoke all on function public.list_chat_rooms()
  from public, anon, authenticated;
revoke all on function public.leave_chat_room(uuid)
  from public, anon, authenticated;

grant execute on function public.list_chat_rooms()
  to authenticated;
grant execute on function public.leave_chat_room(uuid)
  to authenticated;

commit;
