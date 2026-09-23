begin;

-- Parent account identity is linked explicitly by a narrowly authorized manager.
-- Contact email is decision support only and never causes an automatic link.
create or replace function public.list_parent_account_link_candidates(
  p_person_id uuid
)
returns table (
  profile_id uuid,
  account_email text,
  display_name text,
  account_role public.account_role,
  account_status public.account_status,
  linked_person_id uuid,
  linked_person_name text,
  linked_households text[],
  email_matches boolean,
  matching_active_people_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
declare
  target_email text;
begin
  if (select auth.uid()) is null
    or not private.has_role(array[
      'platform_administrator', 'youth_pastor'
    ]::public.account_role[]) then
    raise exception 'Parent account linking is denied.' using errcode = '42501';
  end if;

  select people.email into target_email
  from public.people
  where people.id = p_person_id
    and people.status = 'active'
    and exists (
      select 1
      from public.household_memberships
      join public.households
        on households.id = household_memberships.household_id
      where household_memberships.person_id = people.id
        and household_memberships.is_responsible_adult
        and households.status = 'active'
    );

  if not found then
    raise exception 'The selected Person is not an active responsible adult.'
      using errcode = '22023';
  end if;

  return query
  select
    profiles.id,
    auth_users.email::text,
    profiles.display_name,
    profiles.primary_role,
    profiles.status,
    profiles.person_id,
    case when linked_people.id is null then null else
      concat_ws(' ',
        coalesce(nullif(btrim(linked_people.preferred_name), ''), linked_people.first_name),
        linked_people.last_name
      )
    end,
    coalesce((
      select array_agg(households.name order by lower(households.name))
      from public.household_memberships
      join public.households
        on households.id = household_memberships.household_id
      where household_memberships.person_id = profiles.person_id
        and households.status <> 'archived'
    ), array[]::text[]),
    target_email is not null
      and lower(btrim(auth_users.email)) = lower(btrim(target_email)),
    case when auth_users.email is null then 0 else (
      select count(*)
      from public.people
      where people.status = 'active'
        and people.email = lower(btrim(auth_users.email))
    ) end
  from public.profiles
  join auth.users as auth_users on auth_users.id = profiles.id
  left join public.people as linked_people on linked_people.id = profiles.person_id
  where profiles.primary_role = 'parent'
    and auth_users.email_confirmed_at is not null
    and auth_users.deleted_at is null
  order by
    (target_email is not null and lower(btrim(auth_users.email)) = lower(btrim(target_email))) desc,
    profiles.status = 'active' desc,
    lower(profiles.display_name),
    profiles.id;
end;
$$;

create or replace function public.link_parent_account_to_person(
  p_profile_id uuid,
  p_person_id uuid,
  p_confirm_relink boolean,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  actor_id uuid := (select auth.uid());
  old_person_id uuid;
  normalized_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if actor_id is null
    or not private.has_role(array[
      'platform_administrator', 'youth_pastor'
    ]::public.account_role[]) then
    raise exception 'Parent account linking is denied.' using errcode = '42501';
  end if;

  if p_profile_id is null or p_person_id is null
    or normalized_reason is null
    or length(normalized_reason) > 1000 then
    raise exception 'A target account, Person, and bounded reason are required.'
      using errcode = '22023';
  end if;

  select profiles.person_id into old_person_id
  from public.profiles
  join auth.users as auth_users on auth_users.id = profiles.id
  where profiles.id = p_profile_id
    and profiles.status = 'active'
    and profiles.primary_role = 'parent'
    and auth_users.email_confirmed_at is not null
    and auth_users.deleted_at is null
  for update of profiles;

  if not found then
    raise exception 'The target must be an active Parent with a verified account.'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.people
    join public.household_memberships
      on household_memberships.person_id = people.id
    join public.households
      on households.id = household_memberships.household_id
    where people.id = p_person_id
      and people.status = 'active'
      and household_memberships.is_responsible_adult
      and households.status = 'active'
  ) then
    raise exception 'The selected Person is not an active responsible adult.'
      using errcode = '22023';
  end if;

  if old_person_id = p_person_id then
    raise exception 'This Parent account is already linked to the selected Person.'
      using errcode = '22023';
  end if;

  if exists (
    select 1 from public.profiles
    where profiles.person_id = p_person_id
      and profiles.id <> p_profile_id
      and profiles.status = 'active'
  ) then
    raise exception 'The selected Person is already linked to another active account.'
      using errcode = '22023';
  end if;

  if old_person_id is not null and not coalesce(p_confirm_relink, false) then
    raise exception 'Relinking requires explicit confirmation.'
      using errcode = '22023';
  end if;

  update public.profiles
  set person_id = p_person_id, updated_at = now()
  where id = p_profile_id;

  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    actor_id,
    case when old_person_id is null
      then 'account.person_linked'
      else 'account.person_relinked'
    end,
    'profile', p_profile_id, 'success', 'web',
    jsonb_build_object(
      'targetProfileId', p_profile_id,
      'previousPersonId', old_person_id,
      'newPersonId', p_person_id,
      'reason', normalized_reason
    )
  );
end;
$$;

revoke all on function public.list_parent_account_link_candidates(uuid)
  from public, anon, authenticated;
revoke all on function public.link_parent_account_to_person(uuid, uuid, boolean, text)
  from public, anon, authenticated;

grant execute on function public.list_parent_account_link_candidates(uuid)
  to authenticated;
grant execute on function public.link_parent_account_to_person(uuid, uuid, boolean, text)
  to authenticated;

commit;
