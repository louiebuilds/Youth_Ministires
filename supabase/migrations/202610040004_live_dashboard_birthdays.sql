begin;

create or replace function public.list_upcoming_dashboard_birthdays(
  p_days integer default 14
)
returns table (
  student_id uuid,
  display_name text,
  birthday_date date
)
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
begin
  if not private.current_profile_is_active()
    or not private.has_role(array[
      'platform_administrator',
      'youth_pastor',
      'staff_member'
    ]::public.account_role[])
  then
    raise exception 'Dashboard birthday access is denied.'
      using errcode = '42501';
  end if;

  if p_days is null or p_days < 1 or p_days > 31 then
    raise exception 'Dashboard birthday range is invalid.'
      using errcode = '22023';
  end if;

  return query
  with candidates as (
    select
      students.id,
      coalesce(
        nullif(btrim(people.preferred_name), ''),
        btrim(people.first_name)
      ) || ' ' || left(btrim(people.last_name), 1) || '.' as safe_name,
      make_date(
        extract(year from current_date)::integer,
        extract(month from students.birth_date)::integer,
        least(
          extract(day from students.birth_date)::integer,
          extract(day from (
            date_trunc('month', make_date(
              extract(year from current_date)::integer,
              extract(month from students.birth_date)::integer,
              1
            )) + interval '1 month - 1 day'
          ))::integer
        )
      ) as this_year_birthday
    from public.students
    join public.people on people.id = students.person_id
    where students.status = 'active'
  ), upcoming as (
    select
      candidates.id,
      candidates.safe_name,
      case
        when candidates.this_year_birthday >= current_date
          then candidates.this_year_birthday
        else candidates.this_year_birthday + interval '1 year'
      end::date as next_birthday
    from candidates
  )
  select upcoming.id, upcoming.safe_name, upcoming.next_birthday
  from upcoming
  where upcoming.next_birthday between current_date and current_date + p_days
  order by upcoming.next_birthday, upcoming.safe_name;
end;
$$;

revoke all on function public.list_upcoming_dashboard_birthdays(integer)
  from public, anon, authenticated;
grant execute on function public.list_upcoming_dashboard_birthdays(integer)
  to authenticated;

comment on function public.list_upcoming_dashboard_birthdays(integer) is
  'Returns display-minimized upcoming active-student birthdays for authorized ministry dashboard viewers.';

create or replace function public.get_dashboard_prayer_care_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
declare
  active_count bigint;
  private_count bigint;
  follow_up_count bigint;
begin
  if not private.current_profile_is_active()
    or not private.has_role(array[
      'platform_administrator',
      'youth_pastor',
      'staff_member'
    ]::public.account_role[])
  then
    raise exception 'Dashboard Prayer & Care access is denied.'
      using errcode = '42501';
  end if;

  select
    count(*) filter (where requests.status = 'active'),
    count(*) filter (
      where requests.status = 'active'
        and requests.visibility = 'private'
    )
  into active_count, private_count
  from public.prayer_requests as requests;

  select count(*)
  into follow_up_count
  from public.care_follow_ups as follow_ups
  where follow_ups.archived_at is null
    and follow_ups.status in ('pending', 'in_progress');

  return jsonb_build_object(
    'activeCount', active_count,
    'privateCount', private_count,
    'followUpCount', follow_up_count
  );
end;
$$;

revoke all on function public.get_dashboard_prayer_care_summary()
  from public, anon, authenticated;
grant execute on function public.get_dashboard_prayer_care_summary()
  to authenticated;

comment on function public.get_dashboard_prayer_care_summary() is
  'Returns count-only Prayer & Care signals for authorized ministry dashboard viewers.';

commit;
