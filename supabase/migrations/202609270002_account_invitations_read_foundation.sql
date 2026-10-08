begin;

create table public.account_invitations (
  id uuid primary key default extensions.gen_random_uuid(),
  email text not null check (
    email = lower(btrim(email))
    and length(email) between 3 and 320
    and position('@' in email) > 1
  ),
  intended_primary_role public.account_role not null,
  invited_by_profile_id uuid not null
    references public.profiles(id) on delete restrict,
  created_at timestamp with time zone not null default now(),
  expires_at timestamp with time zone not null,
  accepted_at timestamp with time zone,
  revoked_at timestamp with time zone,
  constraint account_invitations_expiration_check check (
    expires_at > created_at
  ),
  constraint account_invitations_completion_check check (
    not (accepted_at is not null and revoked_at is not null)
  ),
  constraint account_invitations_accepted_at_check check (
    accepted_at is null or accepted_at >= created_at
  ),
  constraint account_invitations_revoked_at_check check (
    revoked_at is null or revoked_at >= created_at
  )
);

alter table public.account_invitations enable row level security;
alter table public.account_invitations force row level security;

revoke all on table public.account_invitations
  from public, anon, authenticated;

create or replace function public.list_managed_invitations()
returns table (
  id uuid,
  email text,
  intended_primary_role public.account_role,
  lifecycle_status text,
  invited_at timestamp with time zone,
  expires_at timestamp with time zone,
  accepted_at timestamp with time zone
)
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
begin
  if not private.has_role(
    array[
      'platform_administrator',
      'youth_pastor'
    ]::public.account_role[]
  ) then
    raise exception 'invitation management access is denied'
      using errcode = '42501';
  end if;

  return query
  select
    invitations.id,
    invitations.email,
    invitations.intended_primary_role,
    case
      when invitations.accepted_at is not null then 'accepted'
      when invitations.revoked_at is not null then 'revoked'
      when invitations.expires_at < now() then 'expired'
      else 'pending'
    end,
    invitations.created_at,
    invitations.expires_at,
    invitations.accepted_at
  from public.account_invitations as invitations
  order by invitations.created_at desc, invitations.id;
end;
$$;

revoke all on function public.list_managed_invitations()
  from public, anon, authenticated;
grant execute on function public.list_managed_invitations()
  to authenticated;

commit;
