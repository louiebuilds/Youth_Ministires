begin;

create or replace function public.update_own_profile(
  p_display_name text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_previous_display_name text;
  v_display_name text := btrim(p_display_name);
begin
  if v_actor_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if v_display_name is null or length(v_display_name) not between 1 and 150 then
    raise exception 'invalid display name' using errcode = '22023';
  end if;

  select profiles.display_name
  into v_previous_display_name
  from public.profiles
  where profiles.id = v_actor_id
    and profiles.status = 'active';

  if not found then
    raise exception 'active profile required' using errcode = '42501';
  end if;

  update public.profiles
  set display_name = v_display_name,
      updated_at = now()
  where id = v_actor_id;

  insert into public.audit_events (
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    result,
    source,
    metadata
  )
  values (
    v_actor_id,
    'profile.display_name_updated',
    'profile',
    v_actor_id,
    'success',
    'web',
    jsonb_build_object(
      'previous_display_name', v_previous_display_name,
      'new_display_name', v_display_name
    )
  );
end;
$$;

create or replace function public.list_managed_accounts(
  p_search text default null
)
returns table (
  id uuid,
  email text,
  display_name text,
  primary_role public.account_role,
  status public.account_status,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_search text := nullif(btrim(p_search), '');
begin
  if not private.has_role(
    array['platform_administrator']::public.account_role[]
  ) then
    raise exception 'account management requires platform administrator'
      using errcode = '42501';
  end if;

  if v_search is not null and length(v_search) > 100 then
    raise exception 'search value is too long' using errcode = '22023';
  end if;

  return query
  select
    profiles.id,
    auth_users.email,
    profiles.display_name,
    profiles.primary_role,
    profiles.status,
    profiles.created_at,
    profiles.updated_at
  from public.profiles as profiles
  join auth.users as auth_users
    on auth_users.id = profiles.id
  where v_search is null
    or profiles.display_name ilike '%' || v_search || '%'
    or auth_users.email ilike '%' || v_search || '%'
  order by profiles.display_name, auth_users.email
  limit 100;
end;
$$;

create or replace function public.admin_update_account(
  p_profile_id uuid,
  p_display_name text,
  p_primary_role public.account_role,
  p_status public.account_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_display_name text := btrim(p_display_name);
  v_previous_profile public.profiles%rowtype;
begin
  if v_actor_id is null or not private.has_role(
    array['platform_administrator']::public.account_role[]
  ) then
    raise exception 'account management requires platform administrator'
      using errcode = '42501';
  end if;

  if p_profile_id is null then
    raise exception 'profile identifier is required' using errcode = '22023';
  end if;

  if v_display_name is null or length(v_display_name) not between 1 and 150 then
    raise exception 'invalid display name' using errcode = '22023';
  end if;

  select profiles.*
  into v_previous_profile
  from public.profiles as profiles
  where profiles.id = p_profile_id
  for update;

  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  if p_profile_id = v_actor_id
    and (
      p_primary_role <> 'platform_administrator'
      or p_status <> 'active'
    ) then
    raise exception 'administrators cannot remove their own active administrator access'
      using errcode = '42501';
  end if;

  update public.profiles
  set display_name = v_display_name,
      primary_role = p_primary_role,
      status = p_status,
      updated_at = now()
  where id = p_profile_id;

  insert into public.audit_events (
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    result,
    source,
    metadata
  )
  values (
    v_actor_id,
    'account.updated',
    'profile',
    p_profile_id,
    'success',
    'web',
    jsonb_build_object(
      'previous_display_name', v_previous_profile.display_name,
      'new_display_name', v_display_name,
      'previous_role', v_previous_profile.primary_role,
      'new_role', p_primary_role,
      'previous_status', v_previous_profile.status,
      'new_status', p_status
    )
  );
end;
$$;

revoke insert, update, delete on public.profiles from authenticated;

revoke all on function public.update_own_profile(text) from public;
revoke all on function public.list_managed_accounts(text) from public;
revoke all on function public.admin_update_account(
  uuid,
  text,
  public.account_role,
  public.account_status
) from public;

grant execute on function public.update_own_profile(text) to authenticated;
grant execute on function public.list_managed_accounts(text) to authenticated;
grant execute on function public.admin_update_account(
  uuid,
  text,
  public.account_role,
  public.account_status
) to authenticated;

commit;
