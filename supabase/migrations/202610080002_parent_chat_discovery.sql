begin;

create table public.chat_discovery_preferences (
  profile_id uuid primary key
    references public.profiles(id) on delete restrict,
  parent_discoverable boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by_profile_id uuid not null
    references public.profiles(id) on delete restrict
);

alter table public.chat_discovery_preferences enable row level security;
alter table public.chat_discovery_preferences force row level security;

revoke all on public.chat_discovery_preferences
  from public, anon, authenticated;

create or replace function public.get_my_chat_discovery_preference()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
begin
  if not private.current_profile_is_active()
    or private.current_profile_role() <> 'parent' then
    raise exception 'Chat discovery preference access denied.'
      using errcode = '42501';
  end if;

  return coalesce((
    select preferences.parent_discoverable
    from public.chat_discovery_preferences as preferences
    where preferences.profile_id = auth.uid()
  ), false);
end;
$$;

create or replace function public.set_my_chat_discovery_preference(
  p_parent_discoverable boolean
)
returns void
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
begin
  if not private.current_profile_is_active()
    or private.current_profile_role() <> 'parent' then
    raise exception 'Chat discovery preference update denied.'
      using errcode = '42501';
  end if;

  if p_parent_discoverable is null then
    raise exception 'Chat discovery preference is required.'
      using errcode = '22023';
  end if;

  insert into public.chat_discovery_preferences(
    profile_id,
    parent_discoverable,
    updated_at,
    updated_by_profile_id
  )
  values(
    auth.uid(),
    p_parent_discoverable,
    now(),
    auth.uid()
  )
  on conflict (profile_id) do update
  set
    parent_discoverable = excluded.parent_discoverable,
    updated_at = excluded.updated_at,
    updated_by_profile_id = excluded.updated_by_profile_id;

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
    'communication.chat_discovery_preference_updated',
    'profile',
    auth.uid(),
    'success',
    'web',
    jsonb_build_object('parentDiscoverable', p_parent_discoverable)
  );
end;
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
      and (
        (
          candidate.primary_role = 'parent'
          and exists (
            select 1
            from public.chat_discovery_preferences as preferences
            where preferences.profile_id = candidate.id
              and preferences.parent_discoverable
          )
        )
        or (
          candidate.primary_role <> 'parent'
          and exists (
            select 1
            from public.chat_room_members as actor_membership
            join public.chat_room_members as candidate_membership
              on candidate_membership.room_id = actor_membership.room_id
             and candidate_membership.profile_id = candidate.id
             and candidate_membership.removed_at is null
            where actor_membership.profile_id = auth.uid()
              and actor_membership.removed_at is null
              and actor_membership.room_id <> p_room_id
          )
        )
      )
  )
$$;

revoke all on function public.get_my_chat_discovery_preference()
  from public, anon, authenticated;
revoke all on function public.set_my_chat_discovery_preference(boolean)
  from public, anon, authenticated;
revoke all on function private.can_parent_invite_to_chat(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.get_my_chat_discovery_preference()
  to authenticated;
grant execute on function public.set_my_chat_discovery_preference(boolean)
  to authenticated;

commit;
