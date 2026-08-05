begin;

create or replace function public.list_prayer_care_people(
  p_search text default null
)
returns table (
  person_id uuid,
  display_name text
)
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
begin
  if not private.can_manage_care() then
    raise exception 'Prayer and Care person access denied.'
      using errcode = '42501';
  end if;

  if p_search is not null and length(btrim(p_search)) > 100 then
    raise exception 'Search must not exceed 100 characters.'
      using errcode = '22023';
  end if;

  return query
  select
    p.id,
    concat_ws(
      ' ',
      coalesce(nullif(p.preferred_name, ''), p.first_name),
      p.last_name
    )
  from public.people p
  where p.status <> 'archived'
    and (
      nullif(btrim(p_search), '') is null
      or concat_ws(
        ' ',
        coalesce(nullif(p.preferred_name, ''), p.first_name),
        p.last_name
      ) ilike '%' || btrim(p_search) || '%'
    )
  order by p.last_name, p.first_name
  limit 100;
end;
$$;

revoke all on function public.list_prayer_care_people(text)
  from public, anon;
grant execute on function public.list_prayer_care_people(text)
  to authenticated;

comment on function public.list_prayer_care_people(text) is
  'Returns a minimal active-person picker to Prayer and Care oversight roles; it exposes no contact, household, medical, or care data.';

commit;
