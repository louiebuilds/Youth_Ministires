begin;

create type public.forms_capability as enum (
  'forms.documents.manage',
  'forms.documents.paper_confirm',
  'forms.medical.view',
  'forms.medical.verify',
  'forms.participation.override',
  'custom_forms.manage',
  'custom_forms.submit',
  'visitor_cards.manage'
);

create table public.profile_capability_grants (
  id uuid primary key default extensions.gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete restrict,
  capability public.forms_capability not null check (capability in (
    'forms.medical.view', 'forms.medical.verify',
    'forms.participation.override'
  )),
  granted_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  granted_at timestamptz not null default now(),
  grant_reason text not null check (length(btrim(grant_reason)) between 5 and 1000),
  expires_at timestamptz,
  revoked_by_profile_id uuid references public.profiles(id) on delete restrict,
  revoked_at timestamptz,
  revocation_reason text check (
    revocation_reason is null or length(btrim(revocation_reason)) between 5 and 1000
  ),
  constraint profile_capability_grants_expiration_check
    check (expires_at is null or expires_at > granted_at),
  constraint profile_capability_grants_revocation_check check (
    (revoked_at is null and revoked_by_profile_id is null and revocation_reason is null)
    or (revoked_at is not null and revoked_by_profile_id is not null and revocation_reason is not null
      and revoked_at >= granted_at)
  )
);

create index profile_capability_grants_effective_idx
  on public.profile_capability_grants(profile_id, capability, expires_at)
  where revoked_at is null;
create index profile_capability_grants_profile_idx
  on public.profile_capability_grants(profile_id, granted_at desc);

alter table public.profile_capability_grants enable row level security;
alter table public.profile_capability_grants force row level security;
revoke all on table public.profile_capability_grants from public, anon, authenticated;

create or replace function private.has_forms_capability(p_capability public.forms_capability)
returns boolean language sql stable security definer
set search_path = '' set row_security = off
as $$
  select private.current_profile_is_active() and (
    private.current_profile_role() in ('platform_administrator', 'youth_pastor')
    or (private.current_profile_role() = 'staff_member' and p_capability in (
      'forms.documents.manage', 'forms.documents.paper_confirm',
      'custom_forms.manage', 'custom_forms.submit', 'visitor_cards.manage'
    ))
    or (private.current_profile_role() in ('parent', 'volunteer')
      and p_capability = 'custom_forms.submit')
    or (private.current_profile_role() = 'staff_member' and exists (
      select 1 from public.profile_capability_grants grants
      where grants.profile_id = auth.uid()
        and grants.capability = p_capability
        and grants.revoked_at is null
        and (grants.expires_at is null or grants.expires_at > now())
    ))
  )
$$;

create or replace function public.grant_sensitive_forms_capability(
  p_profile_id uuid,
  p_capability public.forms_capability,
  p_reason text,
  p_expires_at timestamptz default null
) returns uuid language plpgsql security definer
set search_path = '' set row_security = off
as $$
declare grant_id uuid; actor_role public.account_role; target_role public.account_role;
begin
  if not private.current_profile_is_active() then
    raise exception 'Sensitive Forms capability administration requires an active profile.' using errcode='42501';
  end if;
  actor_role := private.current_profile_role();
  select primary_role into target_role from public.profiles
    where id = p_profile_id and status = 'active' for update;
  if target_role is distinct from 'staff_member' then
    raise exception 'Sensitive Forms grants apply only to active Staff Members.' using errcode='42501';
  end if;
  if length(btrim(coalesce(p_reason,''))) not between 5 and 1000 then
    raise exception 'An explicit grant reason is required.' using errcode='22023';
  end if;
  if p_expires_at is not null and p_expires_at <= now() then
    raise exception 'Grant expiration must be in the future.' using errcode='22023';
  end if;
  if p_capability not in ('forms.medical.view','forms.medical.verify','forms.participation.override') then
    raise exception 'This capability is not individually grantable.' using errcode='42501';
  end if;
  if not (actor_role = 'platform_administrator' or
    (actor_role = 'youth_pastor' and p_capability in ('forms.medical.view','forms.medical.verify'))) then
    raise exception 'Sensitive Forms capability grant is denied.' using errcode='42501';
  end if;
  if exists (
    select 1 from public.profile_capability_grants grants
    where grants.profile_id=p_profile_id and grants.capability=p_capability
      and grants.revoked_at is null
      and (grants.expires_at is null or grants.expires_at>now())
  ) then
    raise exception 'An effective grant already exists for this profile and capability.' using errcode='23505';
  end if;
  insert into public.profile_capability_grants(
    profile_id,capability,granted_by_profile_id,grant_reason,expires_at
  ) values (p_profile_id,p_capability,auth.uid(),btrim(p_reason),p_expires_at)
  returning id into grant_id;
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata)
  values(auth.uid(),'forms.sensitive_capability_granted','profile_capability_grant',grant_id,
    'success','web',jsonb_build_object('profileId',p_profile_id,'capability',p_capability));
  return grant_id;
end $$;

create or replace function public.revoke_sensitive_forms_capability(
  p_grant_id uuid, p_reason text
) returns void language plpgsql security definer
set search_path = '' set row_security = off
as $$
declare selected record; actor_role public.account_role;
begin
  if not private.current_profile_is_active() then
    raise exception 'Sensitive Forms capability administration requires an active profile.' using errcode='42501';
  end if;
  actor_role := private.current_profile_role();
  select grants.capability,profiles.primary_role as target_role into selected
  from public.profile_capability_grants grants
  join public.profiles profiles on profiles.id=grants.profile_id
  where grants.id=p_grant_id and grants.revoked_at is null for update of grants;
  if not found then raise exception 'Active capability grant not found.' using errcode='P0002'; end if;
  if length(btrim(coalesce(p_reason,''))) not between 5 and 1000 then
    raise exception 'An explicit revocation reason is required.' using errcode='22023';
  end if;
  if not (actor_role='platform_administrator' or
    (actor_role='youth_pastor' and selected.target_role='staff_member'
      and selected.capability in ('forms.medical.view','forms.medical.verify'))) then
    raise exception 'Sensitive Forms capability revocation is denied.' using errcode='42501';
  end if;
  update public.profile_capability_grants set revoked_by_profile_id=auth.uid(),
    revoked_at=now(),revocation_reason=btrim(p_reason) where id=p_grant_id;
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata)
  values(auth.uid(),'forms.sensitive_capability_revoked','profile_capability_grant',p_grant_id,
    'success','web',jsonb_build_object('capability',selected.capability));
end $$;

create or replace function public.list_sensitive_forms_capability_grants()
returns table(grant_id uuid,profile_id uuid,capability public.forms_capability,
  granted_by_profile_id uuid,granted_at timestamptz,grant_reason text,expires_at timestamptz,
  revoked_by_profile_id uuid,revoked_at timestamptz,revocation_reason text)
language plpgsql stable security definer set search_path='' set row_security=off as $$
declare actor_role public.account_role;
begin
  if not private.current_profile_is_active() then
    raise exception 'Sensitive Forms capability administration requires an active profile.' using errcode='42501';
  end if;
  actor_role:=private.current_profile_role();
  if actor_role not in ('platform_administrator','youth_pastor') then
    raise exception 'Capability grant listing is denied.' using errcode='42501';
  end if;
  return query select g.id,g.profile_id,g.capability,g.granted_by_profile_id,g.granted_at,
    g.grant_reason,g.expires_at,g.revoked_by_profile_id,g.revoked_at,g.revocation_reason
  from public.profile_capability_grants g join public.profiles p on p.id=g.profile_id
  where actor_role='platform_administrator' or
    (p.primary_role='staff_member' and g.capability in ('forms.medical.view','forms.medical.verify'))
  order by g.granted_at desc;
end $$;

-- Extend the single authoritative account-management workflow so sensitive
-- Staff grants cannot resurrect if an account later cycles back to Staff.
create or replace function public.admin_update_account(
  p_profile_id uuid,
  p_display_name text,
  p_primary_role public.account_role,
  p_status public.account_status
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_display_name text := btrim(p_display_name);
  v_previous_profile public.profiles%rowtype;
  v_revoked_grant record;
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
  select profiles.* into v_previous_profile
  from public.profiles as profiles where profiles.id = p_profile_id for update;
  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;
  if p_profile_id = v_actor_id and (
    p_primary_role <> 'platform_administrator' or p_status <> 'active'
  ) then
    raise exception 'administrators cannot remove their own active administrator access'
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
      insert into public.audit_events(
        actor_profile_id,action,entity_type,entity_id,result,source,metadata
      ) values (
        v_actor_id,'forms.sensitive_capability_role_invalidated',
        'profile_capability_grant',v_revoked_grant.id,'success','web',
        jsonb_build_object(
          'profileId',p_profile_id,
          'capability',v_revoked_grant.capability,
          'previousRole',v_previous_profile.primary_role,
          'newRole',p_primary_role
        )
      );
    end loop;
  end if;

  update public.profiles
  set display_name = v_display_name,primary_role = p_primary_role,
      status = p_status,updated_at = now()
  where id = p_profile_id;
  insert into public.audit_events(
    actor_profile_id,action,entity_type,entity_id,result,source,metadata
  ) values (
    v_actor_id,'account.updated','profile',p_profile_id,'success','web',
    jsonb_build_object(
      'previous_display_name',v_previous_profile.display_name,
      'new_display_name',v_display_name,
      'previous_role',v_previous_profile.primary_role,
      'new_role',p_primary_role,
      'previous_status',v_previous_profile.status,
      'new_status',p_status
    )
  );
end $$;

revoke all on function private.has_forms_capability(public.forms_capability) from public,anon,authenticated;
grant execute on function private.has_forms_capability(public.forms_capability) to authenticated;
revoke all on function public.grant_sensitive_forms_capability(uuid,public.forms_capability,text,timestamptz),
  public.revoke_sensitive_forms_capability(uuid,text),public.list_sensitive_forms_capability_grants()
  from public,anon,authenticated;
grant execute on function public.grant_sensitive_forms_capability(uuid,public.forms_capability,text,timestamptz),
  public.revoke_sensitive_forms_capability(uuid,text),public.list_sensitive_forms_capability_grants()
  to authenticated;

commit;
