begin;

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
set row_security = off
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_actor_role public.account_role;
  v_display_name text := btrim(p_display_name);
  v_previous_profile public.profiles%rowtype;
  v_revoked_grant record;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('admin_update_account.lifecycle', 0)
  );

  select profiles.primary_role
  into v_actor_role
  from public.profiles as profiles
  where profiles.id = v_actor_id
    and profiles.status = 'active';

  if v_actor_id is null
    or v_actor_role not in ('platform_administrator', 'youth_pastor') then
    raise exception 'account management access is denied'
      using errcode = '42501';
  end if;

  if p_profile_id is null then
    raise exception 'profile identifier is required' using errcode = '22023';
  end if;

  if v_display_name is null or length(v_display_name) not between 1 and 150 then
    raise exception 'invalid display name' using errcode = '22023';
  end if;

  if p_primary_role is null or p_status is null then
    raise exception 'account role and status are required'
      using errcode = '22023';
  end if;

  select profiles.*
  into v_previous_profile
  from public.profiles as profiles
  where profiles.id = p_profile_id
  for update;

  if not found then
    raise exception 'profile not found' using errcode = '22023';
  end if;

  if p_status <> v_previous_profile.status
    and not (
      (v_previous_profile.status = 'invited' and p_status = 'active')
      or (
        v_previous_profile.status = 'active'
        and p_status in ('suspended', 'disabled', 'archived')
      )
      or (
        v_previous_profile.status = 'suspended'
        and p_status in ('active', 'disabled', 'archived')
      )
      or (
        v_previous_profile.status = 'disabled'
        and p_status in ('active', 'archived')
      )
    ) then
    raise exception 'invalid account status transition'
      using errcode = '22023';
  end if;

  if p_profile_id = v_actor_id
    and (
      p_primary_role <> v_previous_profile.primary_role
      or p_status <> 'active'
    ) then
    raise exception 'administrators cannot remove their own active management access'
      using errcode = '42501';
  end if;

  if v_actor_role = 'youth_pastor'
    and (
      v_previous_profile.primary_role = 'platform_administrator'
      or p_primary_role = 'platform_administrator'
    ) then
    raise exception 'youth pastors cannot manage platform administrator accounts'
      using errcode = '42501';
  end if;

  if v_previous_profile.primary_role = 'platform_administrator'
    and v_previous_profile.status = 'active'
    and (
      p_primary_role <> 'platform_administrator'
      or p_status <> 'active'
    )
    and not exists (
      select 1
      from public.profiles as profiles
      where profiles.id <> p_profile_id
        and profiles.primary_role = 'platform_administrator'
        and profiles.status = 'active'
    ) then
    raise exception 'the final active platform administrator must remain active'
      using errcode = '42501';
  end if;

  if v_previous_profile.primary_role = 'staff_member'
    and p_primary_role <> 'staff_member' then
    for v_revoked_grant in
      update public.profile_capability_grants
      set revoked_by_profile_id = v_actor_id,
          revoked_at = now(),
          revocation_reason = 'Automatically revoked because the permanent role changed away from Staff Member.'
      where profile_id = p_profile_id
        and revoked_at is null
        and (expires_at is null or expires_at > now())
      returning id, capability
    loop
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
        'forms.sensitive_capability_role_invalidated',
        'profile_capability_grant',
        v_revoked_grant.id,
        'success',
        'web',
        jsonb_build_object(
          'profileId', p_profile_id,
          'capability', v_revoked_grant.capability,
          'previousRole', v_previous_profile.primary_role,
          'newRole', p_primary_role
        )
      );
    end loop;
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

revoke all on function public.admin_update_account(
  uuid,
  text,
  public.account_role,
  public.account_status
) from public, anon, authenticated;

grant execute on function public.admin_update_account(
  uuid,
  text,
  public.account_role,
  public.account_status
) to authenticated;

commit;
