
begin;

-- Family visibility and invitation eligibility are independent requirements.
create or replace function public.list_private_chat_adults(p_room_id uuid)
returns table(profile_id uuid, display_name text, primary_role public.account_role, is_member boolean)
language plpgsql stable security definer set search_path = '' set row_security = off
as $$
begin
  if not private.can_manage_chat_room(p_room_id) or not exists (
    select 1 from public.chat_rooms where id = p_room_id and is_parent_managed
  ) then
    raise exception 'Private group management denied.' using errcode = '42501';
  end if;
  return query select c.* from public.list_chat_member_candidates(p_room_id) c
  join public.profiles p on p.id = c.profile_id
  where not exists (select 1 from public.students s where s.person_id = p.person_id)
    and (p.person_id is null or exists (
      select 1 from public.people pe where pe.id = p.person_id and pe.status = 'active'
    ));
end;
$$;

create or replace function public.list_private_chat_families(p_room_id uuid)
returns table(family_id uuid, family_name text, adults jsonb)
language plpgsql stable security definer set search_path = '' set row_security = off
as $$
begin
  -- Invoke the same authorization even when there are no visible households.
  perform 1 from public.list_private_chat_adults(p_room_id);
  return query
  select h.id, h.name, coalesce((
    select jsonb_agg(jsonb_build_object('profileId', c.profile_id,
      'displayName', c.display_name, 'isMember', c.is_member) order by c.display_name)
    from public.household_memberships hm
    join public.profiles p on p.person_id = hm.person_id
    join public.list_private_chat_adults(p_room_id) c on c.profile_id = p.id
    where hm.household_id = h.id and hm.is_responsible_adult
  ), '[]'::jsonb)
  from public.households h
  where h.archived_at is null and private.can_view_household(h.id)
  order by h.name, h.id;
end;
$$;

create or replace function public.add_private_chat_adults(
  p_room_id uuid, p_profile_ids uuid[], p_family_ids uuid[] default '{}'
)
returns void
language plpgsql security definer set search_path = '' set row_security = off
as $$
declare v_profile uuid;
begin
  -- Serialize concurrent requests for the same room before checking membership.
  perform 1 from public.chat_rooms where id = p_room_id for update;
  perform 1 from public.list_private_chat_adults(p_room_id);
  if not exists (select 1 from public.chat_rooms where id = p_room_id and archived_at is null)
    or coalesce(cardinality(p_profile_ids), 0) not between 1 and 100
    or coalesce(cardinality(p_family_ids), 0) > 100 then
    raise exception 'Invalid adult selection.' using errcode = '22023';
  end if;
  if exists (
    select 1 from unnest(p_family_ids) f(id) where not exists (
      select 1 from public.list_private_chat_families(p_room_id) visible where visible.family_id = f.id
    )
  ) or exists (
    select 1 from unnest(p_profile_ids) selected(id) where not exists (
      select 1 from public.list_private_chat_adults(p_room_id) c where c.profile_id = selected.id
    )
  ) then
    raise exception 'Adult or family selection is no longer available.' using errcode = '42501';
  end if;
  for v_profile in select distinct id from unnest(p_profile_ids) selected(id) order by id loop
    if not exists (select 1 from public.chat_room_members
      where room_id = p_room_id and profile_id = v_profile and removed_at is null) then
      -- Retain existing role checks, ownership checks and audit events.
      perform public.add_chat_room_member(p_room_id, v_profile);
    end if;
  end loop;
end;
$$;

revoke all on function public.list_private_chat_adults(uuid) from public, anon, authenticated;
revoke all on function public.list_private_chat_families(uuid) from public, anon, authenticated;
revoke all on function public.add_private_chat_adults(uuid, uuid[], uuid[]) from public, anon, authenticated;
grant execute on function public.list_private_chat_adults(uuid) to authenticated;
grant execute on function public.list_private_chat_families(uuid) to authenticated;
grant execute on function public.add_private_chat_adults(uuid, uuid[], uuid[]) to authenticated;

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

commit;
