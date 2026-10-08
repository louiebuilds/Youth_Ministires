begin;

create or replace function public.list_managed_audit_events(
  p_search text default null,
  p_action text default null,
  p_result public.audit_result default null,
  p_date_from date default null,
  p_date_to date default null,
  p_limit integer default 100
)
returns table (
  id bigint,
  occurred_at timestamp with time zone,
  action text,
  actor_profile_id uuid,
  actor_display_name text,
  entity_type text,
  entity_id uuid,
  result public.audit_result,
  source public.audit_source,
  request_id text,
  metadata jsonb
)
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
declare
  v_search text := nullif(btrim(p_search), '');
  v_action text := nullif(btrim(p_action), '');
begin
  if (select auth.uid()) is null then
    raise exception 'authentication is required'
      using errcode = '42501';
  end if;

  if not private.has_role(
    array[
      'platform_administrator',
      'youth_pastor'
    ]::public.account_role[]
  ) then
    raise exception 'audit log access is denied'
      using errcode = '42501';
  end if;

  if v_search is not null and length(v_search) > 100 then
    raise exception 'search value is too long' using errcode = '22023';
  end if;

  if v_action is not null and length(v_action) > 100 then
    raise exception 'action value is too long' using errcode = '22023';
  end if;

  if p_date_from is not null
    and p_date_to is not null
    and p_date_from > p_date_to then
    raise exception 'date range is invalid' using errcode = '22023';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 200 then
    raise exception 'result limit must be between 1 and 200'
      using errcode = '22023';
  end if;

  return query
  select
    events.id,
    events.occurred_at,
    events.action,
    events.actor_profile_id,
    profiles.display_name,
    events.entity_type,
    events.entity_id,
    events.result,
    events.source,
    events.request_id,
    events.metadata
  from public.audit_events as events
  left join public.profiles as profiles
    on profiles.id = events.actor_profile_id
  where (v_search is null
      or events.action ilike '%' || v_search || '%'
      or events.entity_type ilike '%' || v_search || '%'
      or events.entity_id::text ilike '%' || v_search || '%'
      or profiles.display_name ilike '%' || v_search || '%')
    and (v_action is null or events.action = v_action)
    and (p_result is null or events.result = p_result)
    and (p_date_from is null or events.occurred_at >= p_date_from)
    and (p_date_to is null or events.occurred_at < p_date_to + 1)
  order by events.occurred_at desc, events.id desc
  limit p_limit;
end;
$$;

revoke all on function public.list_managed_audit_events(
  text,
  text,
  public.audit_result,
  date,
  date,
  integer
) from public, anon, authenticated;

grant execute on function public.list_managed_audit_events(
  text,
  text,
  public.audit_result,
  date,
  date,
  integer
) to authenticated;

commit;
