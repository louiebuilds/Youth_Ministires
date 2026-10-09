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
    coalesce(
      nullif(
        concat_ws(
          ' ',
          coalesce(nullif(people.preferred_name, ''), people.first_name),
          people.last_name
        ),
        ''
      ),
      profiles.display_name
    ),
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
  left join public.people on people.id = profiles.person_id
  left join public.volunteer_skill_assignments
    on volunteer_skill_assignments.profile_id = profiles.id
  left join public.volunteer_skills
    on volunteer_skills.id = volunteer_skill_assignments.skill_id
  where volunteer_profiles.is_active
    and (
      normalized_search is null
      or lower(coalesce(
        nullif(
          concat_ws(
            ' ',
            coalesce(nullif(people.preferred_name, ''), people.first_name),
            people.last_name
          ),
          ''
        ),
        profiles.display_name
      )) like '%' || lower(normalized_search) || '%'
      or lower(coalesce(volunteer_profiles.ministry_title, ''))
        like '%' || lower(normalized_search) || '%'
    )
  group by
    profiles.id,
    people.id,
    profiles.display_name,
    profiles.primary_role,
    volunteer_profiles.ministry_title,
    volunteer_profiles.background_check_status,
    volunteer_profiles.background_check_expires_at,
    volunteer_profiles.is_active
  order by 2;
end;
$$;

revoke all on function public.list_volunteer_directory(text)
  from public, anon, authenticated;
grant execute on function public.list_volunteer_directory(text)
  to authenticated;

comment on function public.list_volunteer_directory(text) is
  'Lists active volunteer profiles regardless of the linked account primary role.';

commit;
