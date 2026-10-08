begin;

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
set row_security = off
as $$
declare
  v_search text := nullif(btrim(p_search), '');
begin
  if not private.current_profile_is_active()
    or private.current_profile_role() not in (
      'platform_administrator',
      'youth_pastor'
    ) then
    raise exception 'account management access is denied'
      using errcode = '42501';
  end if;

  if v_search is not null and length(v_search) > 100 then
    raise exception 'search value is too long' using errcode = '22023';
  end if;

  return query
  select
    profiles.id,
    auth_users.email::text,
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

revoke all on function public.list_managed_accounts(text)
  from public, anon, authenticated;

grant execute on function public.list_managed_accounts(text)
  to authenticated;

commit;
