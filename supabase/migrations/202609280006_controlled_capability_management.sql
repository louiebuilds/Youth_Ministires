begin;

create or replace function public.grant_sensitive_forms_capability(
  p_profile_id uuid,
  p_capability public.forms_capability,
  p_reason text,
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  v_actor_role public.account_role;
  v_grant_id uuid;
  v_target_role public.account_role;
begin
  if not private.current_profile_is_active() then
    raise exception 'Capability management requires an active profile.' using errcode = '42501';
  end if;
  v_actor_role := private.current_profile_role();
  if v_actor_role not in ('platform_administrator', 'youth_pastor') then
    raise exception 'Capability grant is denied.' using errcode = '42501';
  end if;

  select profiles.primary_role into v_target_role
  from public.profiles as profiles
  where profiles.id = p_profile_id and profiles.status = 'active'
  for update;
  if v_target_role is distinct from 'staff_member' then
    raise exception 'Capability target must be an active Staff Member.' using errcode = '22023';
  end if;
  if length(btrim(coalesce(p_reason, ''))) not between 5 and 1000 then
    raise exception 'A capability grant reason is required.' using errcode = '22023';
  end if;
  if p_expires_at is not null and p_expires_at <= now() then
    raise exception 'Capability expiration must be in the future.' using errcode = '22023';
  end if;
  if p_capability not in (
    'forms.medical.view',
    'forms.medical.verify',
    'forms.participation.override'
  ) then
    raise exception 'Capability is not individually grantable.' using errcode = '22023';
  end if;
  if v_actor_role = 'youth_pastor' and p_capability not in (
    'forms.medical.view', 'forms.medical.verify'
  ) then
    raise exception 'Capability grant is denied.' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.profile_capability_grants as grants
    where grants.profile_id = p_profile_id
      and grants.capability = p_capability
      and grants.revoked_at is null
      and (grants.expires_at is null or grants.expires_at > now())
  ) then
    raise exception 'An active capability grant already exists.' using errcode = '23505';
  end if;

  insert into public.profile_capability_grants (
    profile_id, capability, granted_by_profile_id, grant_reason, expires_at
  ) values (
    p_profile_id, p_capability, auth.uid(), btrim(p_reason), p_expires_at
  ) returning id into v_grant_id;

  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    auth.uid(), 'account.capability_granted', 'profile_capability_grant',
    v_grant_id, 'success', 'web', jsonb_build_object(
      'targetProfileId', p_profile_id,
      'capability', p_capability,
      'reason', btrim(p_reason),
      'expiresAt', p_expires_at
    )
  );
  return v_grant_id;
end
$$;

create or replace function public.revoke_sensitive_forms_capability(
  p_grant_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  v_actor_role public.account_role;
  v_selected record;
begin
  if not private.current_profile_is_active() then
    raise exception 'Capability management requires an active profile.' using errcode = '42501';
  end if;
  v_actor_role := private.current_profile_role();
  if v_actor_role not in ('platform_administrator', 'youth_pastor') then
    raise exception 'Capability revocation is denied.' using errcode = '42501';
  end if;

  select grants.capability, grants.profile_id, profiles.primary_role, profiles.status
  into v_selected
  from public.profile_capability_grants as grants
  join public.profiles as profiles on profiles.id = grants.profile_id
  where grants.id = p_grant_id
    and grants.revoked_at is null
    and (grants.expires_at is null or grants.expires_at > now())
  for update of grants;
  if not found or v_selected.primary_role <> 'staff_member' or v_selected.status <> 'active' then
    raise exception 'Active Staff capability grant is unavailable.' using errcode = '22023';
  end if;
  if length(btrim(coalesce(p_reason, ''))) not between 5 and 1000 then
    raise exception 'A capability revocation reason is required.' using errcode = '22023';
  end if;
  if v_actor_role = 'youth_pastor' and v_selected.capability not in (
    'forms.medical.view', 'forms.medical.verify'
  ) then
    raise exception 'Capability revocation is denied.' using errcode = '42501';
  end if;

  update public.profile_capability_grants
  set revoked_by_profile_id = auth.uid(),
      revoked_at = now(),
      revocation_reason = btrim(p_reason)
  where id = p_grant_id;

  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    auth.uid(), 'account.capability_revoked', 'profile_capability_grant',
    p_grant_id, 'success', 'web', jsonb_build_object(
      'targetProfileId', v_selected.profile_id,
      'capability', v_selected.capability,
      'reason', btrim(p_reason)
    )
  );
end
$$;

revoke all on function public.grant_sensitive_forms_capability(
  uuid, public.forms_capability, text, timestamptz
) from public, anon, authenticated;
revoke all on function public.revoke_sensitive_forms_capability(uuid, text)
  from public, anon, authenticated;
grant execute on function public.grant_sensitive_forms_capability(
  uuid, public.forms_capability, text, timestamptz
) to authenticated;
grant execute on function public.revoke_sensitive_forms_capability(uuid, text)
  to authenticated;

commit;
