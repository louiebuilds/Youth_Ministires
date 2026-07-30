begin;

create or replace function public.list_curriculum_plans(
  p_search text default null,
  p_status public.curriculum_status default null
)
returns table (
  curriculum_plan_id uuid,
  title text,
  summary text,
  audience text,
  curriculum_status public.curriculum_status,
  starts_on date,
  ends_on date,
  lesson_count bigint,
  can_manage boolean
)
language plpgsql stable security definer
set search_path = '' set row_security = off
as $$
declare normalized_search text;
begin
  if not private.can_view_curriculum() then
    raise exception 'Curriculum plan access is denied.' using errcode = '42501';
  end if;
  normalized_search := nullif(btrim(coalesce(p_search, '')), '');
  if normalized_search is not null and length(normalized_search) > 100 then
    raise exception 'Curriculum search is invalid.' using errcode = '22023';
  end if;
  return query
  select
    plans.id, plans.title, plans.summary, plans.audience, plans.status,
    plans.starts_on, plans.ends_on,
    (
      select count(*)
      from public.curriculum_plan_lessons
      join public.lessons
        on lessons.id = curriculum_plan_lessons.lesson_id
      where curriculum_plan_lessons.curriculum_plan_id = plans.id
        and (private.can_manage_curriculum() or lessons.status = 'published')
    ),
    private.can_manage_curriculum()
  from public.curriculum_plans as plans
  where (p_status is null or plans.status = p_status)
    and (private.can_manage_curriculum() or plans.status = 'published')
    and (
      normalized_search is null
      or lower(plans.title) like '%' || lower(normalized_search) || '%'
      or lower(coalesce(plans.summary, ''))
        like '%' || lower(normalized_search) || '%'
      or lower(coalesce(plans.audience, ''))
        like '%' || lower(normalized_search) || '%'
    )
  order by plans.updated_at desc, plans.title;
end;
$$;

create or replace function public.get_curriculum_plan_workspace(
  p_curriculum_plan_id uuid
)
returns jsonb
language plpgsql stable security definer
set search_path = '' set row_security = off
as $$
declare can_manage boolean;
begin
  can_manage := private.can_manage_curriculum();
  if not private.can_view_curriculum() or not exists (
    select 1 from public.curriculum_plans
    where id = p_curriculum_plan_id
      and (can_manage or status = 'published')
  ) then
    raise exception 'Curriculum plan access is denied.' using errcode = '42501';
  end if;
  return (
    select jsonb_build_object(
      'curriculumPlanId', plans.id,
      'title', plans.title,
      'summary', plans.summary,
      'audience', plans.audience,
      'status', plans.status,
      'startsOn', plans.starts_on,
      'endsOn', plans.ends_on,
      'canManage', can_manage
    )
    from public.curriculum_plans as plans
    where plans.id = p_curriculum_plan_id
  );
end;
$$;

create or replace function public.list_curriculum_plan_lessons(
  p_curriculum_plan_id uuid
)
returns table (
  plan_lesson_id uuid,
  lesson_id uuid,
  lesson_title text,
  lesson_status public.lesson_status,
  scripture_references text,
  audience text,
  sequence_number integer
)
language plpgsql stable security definer
set search_path = '' set row_security = off
as $$
declare can_manage boolean;
begin
  can_manage := private.can_manage_curriculum();
  if not private.can_view_curriculum() or not exists (
    select 1 from public.curriculum_plans
    where id = p_curriculum_plan_id
      and (can_manage or status = 'published')
  ) then
    raise exception 'Curriculum plan access is denied.' using errcode = '42501';
  end if;
  return query
  select
    plan_lessons.id, lessons.id, lessons.title, lessons.status,
    lessons.scripture_references, lessons.audience,
    plan_lessons.sequence_number
  from public.curriculum_plan_lessons as plan_lessons
  join public.lessons on lessons.id = plan_lessons.lesson_id
  where plan_lessons.curriculum_plan_id = p_curriculum_plan_id
    and (can_manage or lessons.status = 'published')
  order by plan_lessons.sequence_number;
end;
$$;

create or replace function public.create_curriculum_plan(
  p_title text,
  p_summary text,
  p_audience text,
  p_status public.curriculum_status,
  p_starts_on date,
  p_ends_on date
)
returns uuid
language plpgsql security definer
set search_path = '' set row_security = off
as $$
declare new_id uuid;
begin
  if not private.can_manage_curriculum() then
    raise exception 'Curriculum plan creation is denied.' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_title, ''))) not between 1 and 200
    or p_status = 'archived'
    or (p_starts_on is not null and p_ends_on is not null
      and p_ends_on < p_starts_on) then
    raise exception 'Curriculum plan details are invalid.' using errcode = '22023';
  end if;
  insert into public.curriculum_plans (
    title, summary, audience, status, starts_on, ends_on,
    created_by_profile_id
  ) values (
    btrim(p_title), nullif(btrim(coalesce(p_summary, '')), ''),
    nullif(btrim(coalesce(p_audience, '')), ''), p_status,
    p_starts_on, p_ends_on, (select auth.uid())
  ) returning id into new_id;
  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    (select auth.uid()), 'curriculum.plan_created', 'curriculum_plan', new_id,
    'success', 'web', jsonb_build_object('status', p_status)
  );
  return new_id;
end;
$$;

create or replace function public.update_curriculum_plan(
  p_curriculum_plan_id uuid,
  p_title text,
  p_summary text,
  p_audience text,
  p_status public.curriculum_status,
  p_starts_on date,
  p_ends_on date
)
returns void
language plpgsql security definer
set search_path = '' set row_security = off
as $$
declare prior_status public.curriculum_status;
begin
  if not private.can_manage_curriculum() then
    raise exception 'Curriculum plan update is denied.' using errcode = '42501';
  end if;
  select status into prior_status from public.curriculum_plans
  where id = p_curriculum_plan_id for update;
  if prior_status is null or prior_status = 'archived'
    or p_status = 'archived'
    or length(btrim(coalesce(p_title, ''))) not between 1 and 200
    or (p_starts_on is not null and p_ends_on is not null
      and p_ends_on < p_starts_on) then
    raise exception 'Curriculum plan details are invalid.' using errcode = '22023';
  end if;
  update public.curriculum_plans set
    title = btrim(p_title),
    summary = nullif(btrim(coalesce(p_summary, '')), ''),
    audience = nullif(btrim(coalesce(p_audience, '')), ''),
    status = p_status, starts_on = p_starts_on, ends_on = p_ends_on,
    updated_at = now()
  where id = p_curriculum_plan_id;
  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    (select auth.uid()), 'curriculum.plan_updated', 'curriculum_plan',
    p_curriculum_plan_id, 'success', 'web',
    jsonb_build_object('priorStatus', prior_status, 'status', p_status)
  );
end;
$$;

create or replace function public.archive_curriculum_plan(
  p_curriculum_plan_id uuid
)
returns void
language plpgsql security definer
set search_path = '' set row_security = off
as $$
begin
  if not private.can_manage_curriculum() then
    raise exception 'Curriculum plan archive is denied.' using errcode = '42501';
  end if;
  update public.curriculum_plans set
    status = 'archived', archived_at = now(), updated_at = now()
  where id = p_curriculum_plan_id and status <> 'archived';
  if not found then
    raise exception 'Curriculum plan cannot be archived.' using errcode = '22023';
  end if;
  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    (select auth.uid()), 'curriculum.plan_archived', 'curriculum_plan',
    p_curriculum_plan_id, 'success', 'web', '{}'::jsonb
  );
end;
$$;

create or replace function public.add_lesson_to_curriculum_plan(
  p_curriculum_plan_id uuid,
  p_lesson_id uuid
)
returns uuid
language plpgsql security definer
set search_path = '' set row_security = off
as $$
declare next_sequence integer; new_id uuid;
begin
  if not private.can_manage_curriculum() then
    raise exception 'Curriculum plan lesson update is denied.'
      using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.curriculum_plans
    where id = p_curriculum_plan_id and status <> 'archived'
  ) or not exists (
    select 1 from public.lessons
    where id = p_lesson_id and status <> 'archived'
  ) then
    raise exception 'Curriculum plan or lesson is unavailable.'
      using errcode = '22023';
  end if;
  select coalesce(max(sequence_number), 0) + 1 into next_sequence
  from public.curriculum_plan_lessons
  where curriculum_plan_id = p_curriculum_plan_id;
  insert into public.curriculum_plan_lessons (
    curriculum_plan_id, lesson_id, sequence_number, created_by_profile_id
  ) values (
    p_curriculum_plan_id, p_lesson_id, next_sequence, (select auth.uid())
  ) returning id into new_id;
  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    (select auth.uid()), 'curriculum.plan_lesson_added',
    'curriculum_plan_lesson', new_id, 'success', 'web',
    jsonb_build_object(
      'curriculumPlanId', p_curriculum_plan_id, 'lessonId', p_lesson_id
    )
  );
  return new_id;
exception when unique_violation then
  raise exception 'This lesson is already in the curriculum plan.'
    using errcode = '22023';
end;
$$;

create or replace function public.remove_lesson_from_curriculum_plan(
  p_plan_lesson_id uuid
)
returns void
language plpgsql security definer
set search_path = '' set row_security = off
as $$
declare selected_plan_id uuid; removed_sequence integer;
begin
  if not private.can_manage_curriculum() then
    raise exception 'Curriculum plan lesson update is denied.'
      using errcode = '42501';
  end if;
  delete from public.curriculum_plan_lessons as plan_lessons
  using public.curriculum_plans
  where plan_lessons.id = p_plan_lesson_id
    and curriculum_plans.id = plan_lessons.curriculum_plan_id
    and curriculum_plans.status <> 'archived'
  returning plan_lessons.curriculum_plan_id, plan_lessons.sequence_number
  into selected_plan_id, removed_sequence;
  if not found then
    raise exception 'Curriculum plan lesson is unavailable.'
      using errcode = '22023';
  end if;
  update public.curriculum_plan_lessons
  set sequence_number = sequence_number + 100000
  where curriculum_plan_id = selected_plan_id
    and sequence_number > removed_sequence;
  update public.curriculum_plan_lessons
  set sequence_number = sequence_number - 100001
  where curriculum_plan_id = selected_plan_id
    and sequence_number > 100000 + removed_sequence;
  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    (select auth.uid()), 'curriculum.plan_lesson_removed',
    'curriculum_plan_lesson', p_plan_lesson_id, 'success', 'web',
    jsonb_build_object('curriculumPlanId', selected_plan_id)
  );
end;
$$;

revoke all on function public.list_curriculum_plans(
  text, public.curriculum_status
) from public, anon, authenticated;
revoke all on function public.get_curriculum_plan_workspace(uuid)
  from public, anon, authenticated;
revoke all on function public.list_curriculum_plan_lessons(uuid)
  from public, anon, authenticated;
revoke all on function public.create_curriculum_plan(
  text, text, text, public.curriculum_status, date, date
) from public, anon, authenticated;
revoke all on function public.update_curriculum_plan(
  uuid, text, text, text, public.curriculum_status, date, date
) from public, anon, authenticated;
revoke all on function public.archive_curriculum_plan(uuid)
  from public, anon, authenticated;
revoke all on function public.add_lesson_to_curriculum_plan(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.remove_lesson_from_curriculum_plan(uuid)
  from public, anon, authenticated;

grant execute on function public.list_curriculum_plans(
  text, public.curriculum_status
) to authenticated;
grant execute on function public.get_curriculum_plan_workspace(uuid)
  to authenticated;
grant execute on function public.list_curriculum_plan_lessons(uuid)
  to authenticated;
grant execute on function public.create_curriculum_plan(
  text, text, text, public.curriculum_status, date, date
) to authenticated;
grant execute on function public.update_curriculum_plan(
  uuid, text, text, text, public.curriculum_status, date, date
) to authenticated;
grant execute on function public.archive_curriculum_plan(uuid)
  to authenticated;
grant execute on function public.add_lesson_to_curriculum_plan(uuid, uuid)
  to authenticated;
grant execute on function public.remove_lesson_from_curriculum_plan(uuid)
  to authenticated;

commit;
