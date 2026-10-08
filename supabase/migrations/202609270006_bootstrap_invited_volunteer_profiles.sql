begin;

insert into public.volunteer_profiles (profile_id)
select profiles.id
from public.profiles as profiles
where profiles.primary_role = 'volunteer'
on conflict (profile_id) do nothing;

create or replace function public.accept_account_invitation()
returns uuid
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_email text;
  v_invitation_id uuid;
  v_intended_primary_role public.account_role;
begin
  if v_user_id is null then
    raise exception 'authentication is required'
      using errcode = '42501';
  end if;

  select lower(btrim(auth_user.email::text))
  into v_email
  from auth.users as auth_user
  where auth_user.id = v_user_id;

  if v_email is null or v_email = '' then
    raise exception 'authenticated account email is unavailable'
      using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_email, 0)
  );

  select
    invitations.id,
    invitations.intended_primary_role
  into
    v_invitation_id,
    v_intended_primary_role
  from public.account_invitations as invitations
  where invitations.email = v_email
    and invitations.accepted_at is null
    and invitations.revoked_at is null
    and invitations.expires_at >= now()
  order by invitations.created_at desc, invitations.id desc
  limit 1
  for update;

  if v_invitation_id is null then
    raise exception 'no active invitation is available for this account'
      using errcode = '22023';
  end if;

  update public.profiles
  set
    primary_role = v_intended_primary_role,
    status = 'active',
    updated_at = now()
  where id = v_user_id;

  if not found then
    raise exception 'platform profile is unavailable'
      using errcode = 'P0001';
  end if;

  if v_intended_primary_role = 'volunteer' then
    insert into public.volunteer_profiles (profile_id)
    values (v_user_id)
    on conflict (profile_id) do nothing;
  end if;

  update public.account_invitations
  set accepted_at = now()
  where id = v_invitation_id
    and accepted_at is null
    and revoked_at is null
    and expires_at >= now();

  if not found then
    raise exception 'invitation is no longer available'
      using errcode = '22023';
  end if;

  return v_invitation_id;
end;
$$;

revoke all on function public.accept_account_invitation()
  from public, anon, authenticated;

grant execute on function public.accept_account_invitation()
  to authenticated;

commit;
