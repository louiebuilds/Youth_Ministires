
begin;

create function public.list_current_month_dashboard_birthdays()
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
declare
  local_today date := (now() at time zone 'America/Chicago')::date;
  local_year integer;
  local_month integer;
  month_last_day integer;
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

  local_year := extract(year from local_today)::integer;
  local_month := extract(month from local_today)::integer;

  month_last_day := extract(day from (
    date_trunc('month', local_today::timestamp)
    + interval '1 month - 1 day'
  ))::integer;

  return query
  select
    students.id,
    coalesce(
      nullif(btrim(people.preferred_name), ''),
      btrim(people.first_name)
    ) || ' ' || left(btrim(people.last_name), 1) || '.',
    make_date(
      local_year,
      local_month,
      least(
        extract(day from students.birth_date)::integer,
        month_last_day
      )
    )
  from public.students
  join public.people
    on people.id = students.person_id
  where students.status = 'active'
    and extract(month from students.birth_date)::integer = local_month
  order by 3, 2;
end;
$$;

revoke all on function public.list_current_month_dashboard_birthdays()
  from public, anon, authenticated;

grant execute on function public.list_current_month_dashboard_birthdays()
  to authenticated;

comment on function public.list_current_month_dashboard_birthdays() is
  'Returns active student birthdays for the current America/Chicago calendar month, using minimized names and existing ministry authorization.';

commit;
