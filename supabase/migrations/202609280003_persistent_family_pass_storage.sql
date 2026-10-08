begin;

alter table public.family_check_in_tokens
  add column if not exists token_ciphertext text,
  add column if not exists token_iv text,
  add column if not exists token_auth_tag text;

alter table public.family_check_in_tokens
  drop constraint if exists family_check_in_tokens_encrypted_secret_check;

alter table public.family_check_in_tokens
  add constraint family_check_in_tokens_encrypted_secret_check
  check (
    (
      token_ciphertext is null
      and token_iv is null
      and token_auth_tag is null
    )
    or
    (
      token_ciphertext is not null
      and token_iv is not null
      and token_auth_tag is not null
    )
  );

comment on column public.family_check_in_tokens.token_ciphertext is
  'AES-256-GCM encrypted family pass secret. Never expose directly to clients.';

comment on column public.family_check_in_tokens.token_iv is
  'Initialization vector used to encrypt the family pass secret.';

comment on column public.family_check_in_tokens.token_auth_tag is
  'AES-GCM authentication tag for the encrypted family pass secret.';


create or replace function public.store_family_checkin_pass(
  p_household_id uuid,
  p_token_hash text,
  p_token_ciphertext text,
  p_token_iv text,
  p_token_auth_tag text
)
returns uuid
language plpgsql
security definer
set search_path=''
set row_security=off
as $$
declare
  pass_id uuid;
begin
  if not private.current_profile_is_active()
    or not private.has_role(array[
      'platform_administrator',
      'youth_pastor',
      'staff_member'
    ]::public.account_role[])
  then
    raise exception
      'Family pass management is denied.'
      using errcode='42501';
  end if;

  if not exists (
    select 1
    from public.households
    where id=p_household_id
      and status='active'
  ) then
    raise exception
      'Family is unavailable.'
      using errcode='22023';
  end if;

  if p_token_hash is null
    or p_token_hash !~ '^[0-9a-f]{64}$'
    or nullif(btrim(p_token_ciphertext),'') is null
    or nullif(btrim(p_token_iv),'') is null
    or nullif(btrim(p_token_auth_tag),'') is null
  then
    raise exception
      'Family pass payload is invalid.'
      using errcode='22023';
  end if;

  update public.family_check_in_tokens
  set revoked_at=now()
  where household_id=p_household_id
    and revoked_at is null;

  insert into public.family_check_in_tokens(
    household_id,
    token_hash,
    expires_at,
    used_at,
    revoked_at,
    created_by_profile_id,
    token_ciphertext,
    token_iv,
    token_auth_tag
  )
  values(
    p_household_id,
    p_token_hash,
    null,
    null,
    null,
    auth.uid(),
    p_token_ciphertext,
    p_token_iv,
    p_token_auth_tag
  )
  returning id into pass_id;

  return pass_id;
end;
$$;


create or replace function public.get_family_checkin_pass(
  p_household_id uuid
)
returns table(
  pass_id uuid,
  token_ciphertext text,
  token_iv text,
  token_auth_tag text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path=''
set row_security=off
as $$
begin
  if not private.current_profile_is_active()
    or not private.can_view_household(p_household_id)
  then
    raise exception
      'Family pass access is denied.'
      using errcode='42501';
  end if;

  return query
  select
    tokens.id,
    tokens.token_ciphertext,
    tokens.token_iv,
    tokens.token_auth_tag,
    tokens.created_at
  from public.family_check_in_tokens as tokens
  where tokens.household_id=p_household_id
    and tokens.revoked_at is null
    and tokens.token_ciphertext is not null
    and tokens.token_iv is not null
    and tokens.token_auth_tag is not null
  order by tokens.created_at desc
  limit 1;
end;
$$;


revoke all on function
  public.store_family_checkin_pass(
    uuid,
    text,
    text,
    text,
    text
  )
from public, anon, authenticated;

revoke all on function
  public.get_family_checkin_pass(uuid)
from public, anon, authenticated;

grant execute on function
  public.store_family_checkin_pass(
    uuid,
    text,
    text,
    text,
    text
  )
to authenticated;

grant execute on function
  public.get_family_checkin_pass(uuid)
to authenticated;

commit;