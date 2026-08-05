begin;

create or replace function public.list_volunteer_directory(p_search text default null)
returns table (
  profile_id uuid, display_name text, primary_role public.account_role,
  ministry_title text, background_check_status public.background_check_status,
  background_check_expires_at date, is_active boolean, skills jsonb
)
language plpgsql stable security definer set search_path = '' set row_security = off
as $$
declare normalized_search text;
begin
  if not private.has_role(array['platform_administrator','youth_pastor','staff_member']::public.account_role[]) then
    raise exception 'Volunteer directory access is denied.' using errcode = '42501';
  end if;
  normalized_search := nullif(btrim(coalesce(p_search, '')), '');
  if normalized_search is not null and length(normalized_search) > 100 then
    raise exception 'Search must be 100 characters or fewer.' using errcode = '22023';
  end if;
  return query
  select profiles.id,
    coalesce(nullif(concat_ws(' ', coalesce(nullif(people.preferred_name,''), people.first_name), people.last_name), ''), profiles.display_name),
    profiles.primary_role, volunteer_profiles.ministry_title,
    volunteer_profiles.background_check_status,
    volunteer_profiles.background_check_expires_at, volunteer_profiles.is_active,
    coalesce(jsonb_agg(jsonb_build_object('id', volunteer_skills.id, 'name', volunteer_skills.name, 'level', volunteer_skill_assignments.skill_level)
      order by volunteer_skills.name) filter (where volunteer_skills.id is not null), '[]'::jsonb)
  from public.volunteer_profiles
  join public.profiles on profiles.id = volunteer_profiles.profile_id
  left join public.people on people.id = profiles.person_id
  left join public.volunteer_skill_assignments on volunteer_skill_assignments.profile_id = profiles.id
  left join public.volunteer_skills on volunteer_skills.id = volunteer_skill_assignments.skill_id
  where normalized_search is null
    or lower(coalesce(nullif(concat_ws(' ', coalesce(nullif(people.preferred_name,''), people.first_name), people.last_name), ''), profiles.display_name)) like '%' || lower(normalized_search) || '%'
    or lower(coalesce(volunteer_profiles.ministry_title, '')) like '%' || lower(normalized_search) || '%'
  group by profiles.id, people.id, profiles.display_name, profiles.primary_role,
    volunteer_profiles.ministry_title, volunteer_profiles.background_check_status,
    volunteer_profiles.background_check_expires_at, volunteer_profiles.is_active
  order by 2;
end;
$$;

create or replace function public.get_volunteer_workspace(p_profile_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' set row_security = off
as $$
declare can_manage boolean;
begin
  can_manage := private.has_role(array['platform_administrator','youth_pastor','staff_member']::public.account_role[]);
  if p_profile_id is null or not exists (select 1 from public.volunteer_profiles where profile_id = p_profile_id)
    or (not can_manage and p_profile_id <> auth.uid()) then
    raise exception 'Volunteer workspace access is denied.' using errcode = '42501';
  end if;
  return (
    select jsonb_build_object(
      'profileId', profiles.id,
      'displayName', coalesce(nullif(concat_ws(' ', coalesce(nullif(people.preferred_name,''), people.first_name), people.last_name), ''), profiles.display_name),
      'primaryRole', profiles.primary_role, 'ministryTitle', volunteer_profiles.ministry_title,
      'backgroundCheckStatus', volunteer_profiles.background_check_status,
      'backgroundCheckCompletedAt', volunteer_profiles.background_check_completed_at,
      'backgroundCheckExpiresAt', volunteer_profiles.background_check_expires_at,
      'backgroundCheckReference', case when can_manage then volunteer_profiles.background_check_reference else null end,
      'isActive', volunteer_profiles.is_active, 'canManage', can_manage)
    from public.volunteer_profiles join public.profiles on profiles.id = volunteer_profiles.profile_id
    left join public.people on people.id = profiles.person_id
    where volunteer_profiles.profile_id = p_profile_id
  );
end;
$$;

comment on function public.list_volunteer_directory(text) is
  'Lists volunteers using the linked person preferred/first and last name, with account display name only as a fallback.';

commit;
