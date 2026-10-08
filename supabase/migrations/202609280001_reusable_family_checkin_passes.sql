begin;

-- Family check-in passes are now persistent household identifiers.
-- A pass remains valid until it is explicitly revoked/replaced.
--
-- Existing short-lived passes are revoked during this migration so that
-- no legacy one-use token unexpectedly becomes a permanent family pass.

update public.family_check_in_tokens
set revoked_at = now()
where revoked_at is null;

alter table public.family_check_in_tokens
  drop constraint if exists family_check_in_tokens_expiry_check;

alter table public.family_check_in_tokens
  alter column expires_at drop not null;

alter table public.family_check_in_tokens
  add constraint family_check_in_tokens_expiry_check
  check (
    expires_at is null
    or expires_at > created_at
  );

drop index if exists public.family_check_in_tokens_household_expiry_idx;

create index family_check_in_tokens_household_created_idx
  on public.family_check_in_tokens (
    household_id,
    created_at desc
  );

create unique index family_check_in_tokens_one_active_household_idx
  on public.family_check_in_tokens (household_id)
  where revoked_at is null;

comment on table public.family_check_in_tokens is
  'Hashed bearer passes identify a household for check-in lookup. '
  'Passes remain valid until revoked or replaced and never authorize student release.';

comment on column public.family_check_in_tokens.used_at is
  'Legacy usage timestamp retained for historical short-lived passes. '
  'Reusable family passes are not invalidated by use.';

create or replace function public.issue_family_checkin_token(
  p_household_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  raw_token text;
  hashed_token text;
begin
  if not private.current_profile_is_active()
    or not private.can_view_household(p_household_id) then
    raise exception 'Family check-in token access is denied.'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.households
    where id = p_household_id
      and status = 'active'
  ) then
    raise exception 'Family check-in token access is denied.'
      using errcode = '42501';
  end if;

  raw_token :=
    extensions.gen_random_uuid()::text
    || extensions.gen_random_uuid()::text;

  hashed_token := encode(
    extensions.digest(
      convert_to(raw_token, 'UTF8'),
      'sha256'
    ),
    'hex'
  );

  -- Issuing a new pass replaces any currently active pass
  -- for this household.
  update public.family_check_in_tokens
  set revoked_at = now()
  where household_id = p_household_id
    and revoked_at is null;

  insert into public.family_check_in_tokens (
    household_id,
    token_hash,
    expires_at,
    used_at,
    revoked_at,
    created_by_profile_id
  )
  values (
    p_household_id,
    hashed_token,
    null,
    null,
    null,
    (select auth.uid())
  );

  return raw_token;
end;
$$;

create or replace function public.resolve_family_checkin_token(
  p_event_id uuid,
  p_token text
)
returns uuid
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  target_household_id uuid;
  hashed_token text;
begin
  if not private.can_manage_event_checkin(p_event_id)
    or length(coalesce(p_token, '')) < 70 then
    raise exception 'Family QR token is invalid.'
      using errcode = '42501';
  end if;

  hashed_token := encode(
    extensions.digest(
      convert_to(p_token, 'UTF8'),
      'sha256'
    ),
    'hex'
  );

  select tokens.household_id
  into target_household_id
  from public.family_check_in_tokens as tokens
  join public.households as households
    on households.id = tokens.household_id
  where tokens.token_hash = hashed_token
    and tokens.revoked_at is null
    and households.status = 'active'
  limit 1;

  if target_household_id is null then
    raise exception 'Family QR token is invalid or revoked.'
      using errcode = '42501';
  end if;

  return target_household_id;
end;
$$;

revoke all on function
  public.issue_family_checkin_token(uuid)
from public, anon, authenticated;

revoke all on function
  public.resolve_family_checkin_token(uuid, text)
from public, anon, authenticated;

grant execute on function
  public.issue_family_checkin_token(uuid)
to authenticated;

grant execute on function
  public.resolve_family_checkin_token(uuid, text)
to authenticated;

commit;