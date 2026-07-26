begin;

create or replace function public.list_volunteer_directory(
  p_search text default null
)
returns table (
  profile_id uuid,
  display_name text,
  primary_role public.account_role,
  ministry_title text,
  background_check_status public.background_check_status,
  background_check_expires_at date,
  is_active boolean,
  skills jsonb
)
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
declare
  normalized_search text;
begin
  if not private.has_role(array[
    'platform_administrator', 'youth_pastor', 'staff_member'
  ]::public.account_role[]) then
    raise exception 'Volunteer directory access is denied.'
      using errcode = '42501';
  end if;

  normalized_search := nullif(btrim(coalesce(p_search, '')), '');
  if normalized_search is not null and length(normalized_search) > 100 then
    raise exception 'Search must be 100 characters or fewer.'
      using errcode = '22023';
  end if;

  return query
  select
    profiles.id,
    profiles.display_name,
    profiles.primary_role,
    volunteer_profiles.ministry_title,
    volunteer_profiles.background_check_status,
    volunteer_profiles.background_check_expires_at,
    volunteer_profiles.is_active,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', volunteer_skills.id,
          'name', volunteer_skills.name,
          'level', volunteer_skill_assignments.skill_level
        )
        order by volunteer_skills.name
      ) filter (where volunteer_skills.id is not null),
      '[]'::jsonb
    )
  from public.volunteer_profiles
  join public.profiles on profiles.id = volunteer_profiles.profile_id
  left join public.volunteer_skill_assignments
    on volunteer_skill_assignments.profile_id = profiles.id
  left join public.volunteer_skills
    on volunteer_skills.id = volunteer_skill_assignments.skill_id
  where normalized_search is null
    or lower(profiles.display_name) like '%' || lower(normalized_search) || '%'
    or lower(coalesce(volunteer_profiles.ministry_title, ''))
      like '%' || lower(normalized_search) || '%'
  group by
    profiles.id,
    profiles.display_name,
    profiles.primary_role,
    volunteer_profiles.ministry_title,
    volunteer_profiles.background_check_status,
    volunteer_profiles.background_check_expires_at,
    volunteer_profiles.is_active
  order by profiles.display_name;
end;
$$;

create or replace function public.save_volunteer_certification(
  p_id uuid, p_profile_id uuid, p_name text, p_issuer text,
  p_issued_at date, p_expires_at date,
  p_status public.volunteer_certification_status, p_reference text
)
returns uuid
language plpgsql security definer
set search_path = '' set row_security = off
as $$
declare certification_id uuid;
begin
  if not private.has_role(array[
    'platform_administrator', 'youth_pastor', 'staff_member'
  ]::public.account_role[]) then
    raise exception 'Certification management is denied.'
      using errcode = '42501';
  end if;
  if not exists (
      select 1 from public.volunteer_profiles where profile_id = p_profile_id
    ) or length(btrim(coalesce(p_name, ''))) not between 1 and 100
    or (p_issued_at is not null and p_expires_at is not null
      and p_expires_at < p_issued_at) then
    raise exception 'Certification details are invalid.'
      using errcode = '22023';
  end if;

  certification_id := coalesce(p_id, extensions.gen_random_uuid());
  insert into public.volunteer_certifications (
    id, profile_id, name, issuer, issued_at, expires_at, status, reference
  ) values (
    certification_id, p_profile_id, btrim(p_name),
    nullif(btrim(coalesce(p_issuer, '')), ''), p_issued_at, p_expires_at,
    p_status, nullif(btrim(coalesce(p_reference, '')), '')
  )
  on conflict (id) do update set
    name = excluded.name, issuer = excluded.issuer,
    issued_at = excluded.issued_at, expires_at = excluded.expires_at,
    status = excluded.status, reference = excluded.reference
  where volunteer_certifications.profile_id = p_profile_id;

  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    (select auth.uid()), 'volunteer.certification_saved',
    'volunteer_certification', certification_id, 'success', 'web',
    jsonb_build_object('profileId', p_profile_id, 'status', p_status)
  );
  return certification_id;
end;
$$;

create or replace function public.list_volunteer_candidates()
returns table (
  profile_id uuid,
  display_name text,
  primary_role public.account_role
)
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
begin
  if not private.has_role(array[
    'platform_administrator', 'youth_pastor', 'staff_member'
  ]::public.account_role[]) then
    raise exception 'Volunteer candidate access is denied.'
      using errcode = '42501';
  end if;

  return query
  select profiles.id, profiles.display_name, profiles.primary_role
  from public.profiles
  where profiles.status = 'active'
    and not exists (
      select 1
      from public.volunteer_profiles
      where volunteer_profiles.profile_id = profiles.id
    )
  order by profiles.display_name
  limit 200;
end;
$$;

create or replace function public.create_volunteer_skill(
  p_name text, p_description text
)
returns uuid
language plpgsql security definer
set search_path = '' set row_security = off
as $$
declare skill_id uuid;
begin
  if not private.has_role(array[
    'platform_administrator', 'youth_pastor', 'staff_member'
  ]::public.account_role[]) then
    raise exception 'Skill creation is denied.' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_name, ''))) not between 1 and 60 then
    raise exception 'Skill name is invalid.' using errcode = '22023';
  end if;
  insert into public.volunteer_skills (name, description)
  values (btrim(p_name), nullif(btrim(coalesce(p_description, '')), ''))
  returning id into skill_id;
  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    (select auth.uid()), 'volunteer.skill_created', 'volunteer_skill',
    skill_id, 'success', 'web', '{}'::jsonb
  );
  return skill_id;
end;
$$;

create or replace function public.save_volunteer_skill_assignment(
  p_profile_id uuid, p_skill_id uuid,
  p_skill_level public.volunteer_skill_level, p_notes text
)
returns void
language plpgsql security definer
set search_path = '' set row_security = off
as $$
begin
  if not private.has_role(array[
      'platform_administrator', 'youth_pastor', 'staff_member'
    ]::public.account_role[])
    and (not private.current_profile_is_active()
      or p_profile_id <> (select auth.uid())) then
    raise exception 'Skill assignment is denied.' using errcode = '42501';
  end if;
  if not exists (
      select 1 from public.volunteer_profiles
      where profile_id = p_profile_id and is_active
    ) or not exists (
      select 1 from public.volunteer_skills where id = p_skill_id
    ) then
    raise exception 'Skill assignment is invalid.' using errcode = '22023';
  end if;
  insert into public.volunteer_skill_assignments (
    profile_id, skill_id, skill_level, notes
  ) values (
    p_profile_id, p_skill_id, p_skill_level,
    nullif(btrim(coalesce(p_notes, '')), '')
  )
  on conflict (profile_id, skill_id) do update set
    skill_level = excluded.skill_level, notes = excluded.notes;
  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  )
  select (select auth.uid()), 'volunteer.skill_assigned',
    'volunteer_skill_assignment', id, 'success', 'web',
    jsonb_build_object('profileId', p_profile_id, 'skillId', p_skill_id)
  from public.volunteer_skill_assignments
  where profile_id = p_profile_id and skill_id = p_skill_id;
end;
$$;

create or replace function public.get_volunteer_workspace(
  p_profile_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
declare
  can_manage boolean;
begin
  can_manage := private.has_role(array[
    'platform_administrator', 'youth_pastor', 'staff_member'
  ]::public.account_role[]);

  if p_profile_id is null
    or not exists (
      select 1 from public.volunteer_profiles
      where profile_id = p_profile_id
    )
    or (not can_manage and p_profile_id <> (select auth.uid())) then
    raise exception 'Volunteer workspace access is denied.'
      using errcode = '42501';
  end if;

  return (
    select jsonb_build_object(
    'profileId', profiles.id,
    'displayName', profiles.display_name,
    'primaryRole', profiles.primary_role,
    'ministryTitle', volunteer_profiles.ministry_title,
    'backgroundCheckStatus', volunteer_profiles.background_check_status,
    'backgroundCheckCompletedAt',
      volunteer_profiles.background_check_completed_at,
    'backgroundCheckExpiresAt', volunteer_profiles.background_check_expires_at,
    'backgroundCheckReference',
      case when can_manage then volunteer_profiles.background_check_reference
        else null end,
    'isActive', volunteer_profiles.is_active,
    'canManage', can_manage
    )
    from public.volunteer_profiles
    join public.profiles on profiles.id = volunteer_profiles.profile_id
    where volunteer_profiles.profile_id = p_profile_id
  );
end;
$$;

create or replace function public.save_volunteer_availability(
  p_id uuid, p_profile_id uuid, p_day_of_week smallint,
  p_starts_at time without time zone, p_ends_at time without time zone,
  p_timezone text, p_effective_from date, p_effective_until date, p_notes text
)
returns uuid
language plpgsql security definer
set search_path = '' set row_security = off
as $$
declare availability_id uuid;
begin
  if not private.has_role(array[
      'platform_administrator', 'youth_pastor', 'staff_member'
    ]::public.account_role[])
    and (not private.current_profile_is_active()
      or p_profile_id <> (select auth.uid())) then
    raise exception 'Availability management is denied.'
      using errcode = '42501';
  end if;
  if not exists (
      select 1 from public.volunteer_profiles
      where profile_id = p_profile_id and is_active
    ) or p_day_of_week not between 0 and 6 or p_ends_at <= p_starts_at
    or length(btrim(coalesce(p_timezone, ''))) not between 1 and 100
    or (p_effective_until is not null
      and p_effective_until < p_effective_from) then
    raise exception 'Availability details are invalid.'
      using errcode = '22023';
  end if;
  availability_id := coalesce(p_id, extensions.gen_random_uuid());
  insert into public.volunteer_availability (
    id, profile_id, day_of_week, starts_at, ends_at, timezone,
    effective_from, effective_until, notes
  ) values (
    availability_id, p_profile_id, p_day_of_week, p_starts_at, p_ends_at,
    btrim(p_timezone), p_effective_from, p_effective_until,
    nullif(btrim(coalesce(p_notes, '')), '')
  )
  on conflict (id) do update set
    day_of_week = excluded.day_of_week, starts_at = excluded.starts_at,
    ends_at = excluded.ends_at, timezone = excluded.timezone,
    effective_from = excluded.effective_from,
    effective_until = excluded.effective_until, notes = excluded.notes
  where volunteer_availability.profile_id = p_profile_id;
  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    (select auth.uid()), 'volunteer.availability_saved',
    'volunteer_availability', availability_id, 'success', 'web',
    jsonb_build_object('profileId', p_profile_id, 'dayOfWeek', p_day_of_week)
  );
  return availability_id;
end;
$$;

create or replace function public.upsert_volunteer_profile(
  p_profile_id uuid,
  p_ministry_title text,
  p_background_check_status public.background_check_status,
  p_background_check_completed_at date,
  p_background_check_expires_at date,
  p_background_check_reference text,
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
begin
  if not private.has_role(array[
    'platform_administrator', 'youth_pastor', 'staff_member'
  ]::public.account_role[]) then
    raise exception 'Volunteer profile management is denied.'
      using errcode = '42501';
  end if;

  if p_profile_id is null
    or not exists (
      select 1 from public.profiles
      where id = p_profile_id and status = 'active'
    )
    or (p_ministry_title is not null
      and length(btrim(p_ministry_title)) not between 1 and 100)
    or (p_background_check_reference is not null
      and length(btrim(p_background_check_reference)) not between 1 and 100)
    or (p_background_check_completed_at is not null
      and p_background_check_expires_at is not null
      and p_background_check_expires_at < p_background_check_completed_at)
    then
    raise exception 'Volunteer profile details are invalid.'
      using errcode = '22023';
  end if;

  insert into public.volunteer_profiles (
    profile_id, ministry_title, background_check_status,
    background_check_completed_at, background_check_expires_at,
    background_check_reference, is_active
  )
  values (
    p_profile_id,
    nullif(btrim(coalesce(p_ministry_title, '')), ''),
    p_background_check_status,
    p_background_check_completed_at,
    p_background_check_expires_at,
    nullif(btrim(coalesce(p_background_check_reference, '')), ''),
    p_is_active
  )
  on conflict (profile_id) do update set
    ministry_title = excluded.ministry_title,
    background_check_status = excluded.background_check_status,
    background_check_completed_at = excluded.background_check_completed_at,
    background_check_expires_at = excluded.background_check_expires_at,
    background_check_reference = excluded.background_check_reference,
    is_active = excluded.is_active;

  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  )
  values (
    (select auth.uid()), 'volunteer.profile_saved', 'volunteer_profile',
    p_profile_id, 'success', 'web',
    jsonb_build_object(
      'backgroundCheckStatus', p_background_check_status,
      'active', p_is_active
    )
  );
end;
$$;

revoke all on function public.list_volunteer_directory(text) from public, anon, authenticated;
revoke all on function public.list_volunteer_candidates() from public, anon, authenticated;
revoke all on function public.get_volunteer_workspace(uuid) from public, anon, authenticated;
revoke all on function public.upsert_volunteer_profile(uuid, text, public.background_check_status, date, date, text, boolean) from public, anon, authenticated;
revoke all on function public.save_volunteer_certification(uuid, uuid, text, text, date, date, public.volunteer_certification_status, text) from public, anon, authenticated;
revoke all on function public.create_volunteer_skill(text, text) from public, anon, authenticated;
revoke all on function public.save_volunteer_skill_assignment(uuid, uuid, public.volunteer_skill_level, text) from public, anon, authenticated;
revoke all on function public.save_volunteer_availability(uuid, uuid, smallint, time without time zone, time without time zone, text, date, date, text) from public, anon, authenticated;

grant execute on function public.list_volunteer_directory(text) to authenticated;
grant execute on function public.list_volunteer_candidates() to authenticated;
grant execute on function public.get_volunteer_workspace(uuid) to authenticated;
grant execute on function public.upsert_volunteer_profile(uuid, text, public.background_check_status, date, date, text, boolean) to authenticated;
grant execute on function public.save_volunteer_certification(uuid, uuid, text, text, date, date, public.volunteer_certification_status, text) to authenticated;
grant execute on function public.create_volunteer_skill(text, text) to authenticated;
grant execute on function public.save_volunteer_skill_assignment(uuid, uuid, public.volunteer_skill_level, text) to authenticated;
grant execute on function public.save_volunteer_availability(uuid, uuid, smallint, time without time zone, time without time zone, text, date, date, text) to authenticated;

commit;
