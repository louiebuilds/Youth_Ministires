begin;

create or replace function public.create_managed_invitation(
  p_email text,
  p_intended_primary_role public.account_role,
  p_expires_at timestamp with time zone
)
returns uuid
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_email text := lower(btrim(p_email));
  v_invitation_id uuid;
begin
  if v_actor_id is null then
    raise exception 'authentication is required'
      using errcode = '42501';
  end if;

  if not private.has_role(
    array['platform_administrator', 'youth_pastor']::public.account_role[]
  ) then
    raise exception 'invitation management access is denied'
      using errcode = '42501';
  end if;

  if p_intended_primary_role = 'platform_administrator'
    and not private.has_role(
      array['platform_administrator']::public.account_role[]
    ) then
    raise exception 'platform administrator invitations require platform administrator access'
      using errcode = '42501';
  end if;

  if v_email is null
    or length(v_email) not between 3 and 320
    or position('@' in v_email) <= 1 then
    raise exception 'invitation email is invalid' using errcode = '22023';
  end if;

  if p_intended_primary_role is null then
    raise exception 'invitation role is required' using errcode = '22023';
  end if;

  if p_expires_at is null or p_expires_at <= now() then
    raise exception 'invitation expiration must be in the future'
      using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_email, 0)
  );

  if exists (
    select 1
    from public.account_invitations as invitations
    where invitations.email = v_email
      and invitations.accepted_at is null
      and invitations.revoked_at is null
      and invitations.expires_at >= now()
  ) then
    raise exception 'a pending invitation already exists'
      using errcode = '23505';
  end if;

  insert into public.account_invitations (
    email,
    intended_primary_role,
    invited_by_profile_id,
    expires_at
  )
  values (v_email, p_intended_primary_role, v_actor_id, p_expires_at)
  returning id into v_invitation_id;

  return v_invitation_id;
end;
$$;

revoke all on function public.create_managed_invitation(
  text,
  public.account_role,
  timestamp with time zone
) from public, anon, authenticated;
grant execute on function public.create_managed_invitation(
  text,
  public.account_role,
  timestamp with time zone
) to authenticated;

create or replace function public.revoke_managed_invitation(
  p_invitation_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_intended_primary_role public.account_role;
  v_expires_at timestamp with time zone;
  v_accepted_at timestamp with time zone;
  v_revoked_at timestamp with time zone;
begin
  if v_actor_id is null then
    raise exception 'authentication is required'
      using errcode = '42501';
  end if;

  if not private.has_role(
    array['platform_administrator', 'youth_pastor']::public.account_role[]
  ) then
    raise exception 'invitation management access is denied'
      using errcode = '42501';
  end if;

  select
    invitations.intended_primary_role,
    invitations.expires_at,
    invitations.accepted_at,
    invitations.revoked_at
  into
    v_intended_primary_role,
    v_expires_at,
    v_accepted_at,
    v_revoked_at
  from public.account_invitations as invitations
  where invitations.id = p_invitation_id
  for update;

  if not found then
    raise exception 'invitation is unavailable'
      using errcode = '22023';
  end if;

  if v_intended_primary_role = 'platform_administrator'
    and not private.has_role(
      array['platform_administrator']::public.account_role[]
    ) then
    raise exception 'platform administrator invitations require platform administrator access'
      using errcode = '42501';
  end if;

  if v_accepted_at is not null
    or v_revoked_at is not null
    or v_expires_at <= now() then
    raise exception 'invitation is no longer pending'
      using errcode = '22023';
  end if;

  update public.account_invitations
  set revoked_at = now()
  where id = p_invitation_id;
end;
$$;

revoke all on function public.revoke_managed_invitation(uuid)
  from public, anon, authenticated;
grant execute on function public.revoke_managed_invitation(uuid)
  to authenticated;

commit;
