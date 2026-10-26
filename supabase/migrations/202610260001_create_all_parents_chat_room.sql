
begin;

-- One-time eligible Parent / Guardian count.
-- Only active Platform Administrators and Youth Pastors may request it.
create or replace function public.count_all_parents_chat_candidates()
returns integer
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
declare
  v_count integer;
begin
  if not private.can_manage_chat() then
    raise exception 'Chat management denied.'
      using errcode = '42501';
  end if;

  select count(*)::integer
  into v_count
  from public.profiles p
  where p.status = 'active'
    and p.primary_role = 'parent'
    and not exists (
      select 1
      from public.students s
      where s.person_id = p.person_id
    )
    and (
      p.person_id is null
      or exists (
        select 1
        from public.people pe
        where pe.id = p.person_id
          and pe.status = 'active'
      )
    );

  return v_count;
end;
$$;

revoke all on function public.count_all_parents_chat_candidates()
  from public, anon, authenticated;

grant execute on function public.count_all_parents_chat_candidates()
  to authenticated;


-- Create an official Parent room and populate its initial membership.
-- All operations occur in the caller's single database transaction.
-- No dynamic membership rule is created.
create or replace function public.create_all_parents_chat_room(
  p_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  v_room_id uuid;
  v_profile_id uuid;
  v_count integer;
begin
  if not private.can_manage_chat() then
    raise exception 'Chat management denied.'
      using errcode = '42501';
  end if;

  if length(btrim(coalesce(p_name, ''))) not between 1 and 150 then
    raise exception 'Invalid room name.'
      using errcode = '22023';
  end if;

  -- Recheck eligibility when the actual creation request occurs.
  v_count := public.count_all_parents_chat_candidates();

  if v_count = 0 then
    raise exception 'No eligible Parent accounts are available.'
      using errcode = '22023';
  end if;

  -- Preserve existing creation authorization and audit behavior.
  v_room_id := public.create_chat_room(
    p_name,
    'parent'::public.chat_room_type,
    'explicit'::public.chat_source_access,
    null,
    null
  );

  -- Snapshot current eligible adults.
  -- Newly registered parents are not added automatically.
  for v_profile_id in
    select p.id
    from public.profiles p
    where p.status = 'active'
      and p.primary_role = 'parent'
      and not exists (
        select 1
        from public.students s
        where s.person_id = p.person_id
      )
      and (
        p.person_id is null
        or exists (
          select 1
          from public.people pe
          where pe.id = p.person_id
            and pe.status = 'active'
        )
      )
    order by p.id
  loop
    -- Preserve existing room eligibility, membership and audit rules.
    perform public.add_chat_room_member(
      v_room_id,
      v_profile_id
    );
  end loop;

  return v_room_id;
end;
$$;

revoke all on function public.create_all_parents_chat_room(text)
  from public, anon, authenticated;

grant execute on function public.create_all_parents_chat_room(text)
  to authenticated;

commit;
