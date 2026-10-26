begin;

-- Forward correction; requires 202610250001 and its prior chat dependencies.

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

  -- Automatic owner membership must obey the same student exclusion as invitations.
  if v_parent_managed and exists (
    select 1 from public.profiles p
    join public.students s on s.person_id = p.person_id
    where p.id = auth.uid()
  ) then
    raise exception 'Students cannot create private chat groups.' using errcode = '42501';
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

  -- This invariant applies to official rooms as well as private groups.
  -- Archived student records still identify a student; do not filter their status.
  if exists (
    select 1 from public.profiles p
    join public.students s on s.person_id = p.person_id
    where p.id = p_profile_id
  ) then
    raise exception 'Students cannot be chat members.' using errcode = '42501';
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

  if exists (select 1 from public.chat_rooms where id = p_room_id and is_parent_managed)
    and not exists (select 1 from public.list_private_chat_adults(p_room_id) c where c.profile_id = p_profile_id) then
    raise exception 'Eligible adult account required.' using errcode = '42501';
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

-- Preserve the existing authenticated RPC boundary explicitly.
revoke all on function public.create_chat_room(text, public.chat_room_type, public.chat_source_access, uuid, uuid) from public, anon, authenticated;
revoke all on function public.add_chat_room_member(uuid, uuid) from public, anon, authenticated;
grant execute on function public.create_chat_room(text, public.chat_room_type, public.chat_source_access, uuid, uuid) to authenticated;
grant execute on function public.add_chat_room_member(uuid, uuid) to authenticated;

commit;
