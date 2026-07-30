begin;

create or replace function public.list_lesson_library(
  p_search text default null,
  p_status public.lesson_status default null
)
returns table (
  lesson_id uuid,
  title text,
  summary text,
  scripture_references text,
  audience text,
  lesson_status public.lesson_status,
  updated_at timestamp with time zone,
  can_manage boolean
)
language plpgsql stable security definer
set search_path = '' set row_security = off
as $$
declare normalized_search text;
begin
  if not private.can_view_curriculum() then
    raise exception 'Lesson library access is denied.' using errcode = '42501';
  end if;
  normalized_search := nullif(btrim(coalesce(p_search, '')), '');
  if normalized_search is not null and length(normalized_search) > 100 then
    raise exception 'Lesson search is invalid.' using errcode = '22023';
  end if;
  return query
  select
    lessons.id, lessons.title, lessons.summary,
    lessons.scripture_references, lessons.audience, lessons.status,
    lessons.updated_at, private.can_manage_curriculum()
  from public.lessons
  where (p_status is null or lessons.status = p_status)
    and (
      private.can_manage_curriculum()
      or lessons.status = 'published'
    )
    and (
      normalized_search is null
      or lower(lessons.title) like '%' || lower(normalized_search) || '%'
      or lower(coalesce(lessons.summary, ''))
        like '%' || lower(normalized_search) || '%'
      or lower(coalesce(lessons.scripture_references, ''))
        like '%' || lower(normalized_search) || '%'
      or lower(coalesce(lessons.audience, ''))
        like '%' || lower(normalized_search) || '%'
    )
  order by lessons.updated_at desc, lessons.title;
end;
$$;

create or replace function public.get_lesson_workspace(p_lesson_id uuid)
returns jsonb
language plpgsql stable security definer
set search_path = '' set row_security = off
as $$
declare can_manage boolean;
begin
  can_manage := private.can_manage_curriculum();
  if not private.can_view_curriculum() or not exists (
    select 1 from public.lessons
    where id = p_lesson_id and (can_manage or status = 'published')
  ) then
    raise exception 'Lesson access is denied.' using errcode = '42501';
  end if;
  return (
    select jsonb_build_object(
      'lessonId', lessons.id,
      'title', lessons.title,
      'summary', lessons.summary,
      'teachingObjective', lessons.teaching_objective,
      'scriptureReferences', lessons.scripture_references,
      'lessonBody', lessons.lesson_body,
      'discussionGuide', lessons.discussion_guide,
      'preparationNotes', lessons.preparation_notes,
      'audience', lessons.audience,
      'status', lessons.status,
      'canManage', can_manage
    )
    from public.lessons where lessons.id = p_lesson_id
  );
end;
$$;

create or replace function public.create_lesson(
  p_title text,
  p_summary text,
  p_teaching_objective text,
  p_scripture_references text,
  p_lesson_body text,
  p_discussion_guide text,
  p_preparation_notes text,
  p_audience text,
  p_status public.lesson_status
)
returns uuid
language plpgsql security definer
set search_path = '' set row_security = off
as $$
declare new_id uuid;
begin
  if not private.can_manage_curriculum() then
    raise exception 'Lesson creation is denied.' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_title, ''))) not between 1 and 200
    or p_status = 'archived' then
    raise exception 'Lesson details are invalid.' using errcode = '22023';
  end if;
  insert into public.lessons (
    title, summary, teaching_objective, scripture_references, lesson_body,
    discussion_guide, preparation_notes, audience, status,
    created_by_profile_id
  ) values (
    btrim(p_title), nullif(btrim(coalesce(p_summary, '')), ''),
    nullif(btrim(coalesce(p_teaching_objective, '')), ''),
    nullif(btrim(coalesce(p_scripture_references, '')), ''),
    nullif(btrim(coalesce(p_lesson_body, '')), ''),
    nullif(btrim(coalesce(p_discussion_guide, '')), ''),
    nullif(btrim(coalesce(p_preparation_notes, '')), ''),
    nullif(btrim(coalesce(p_audience, '')), ''), p_status,
    (select auth.uid())
  ) returning id into new_id;
  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    (select auth.uid()), 'curriculum.lesson_created', 'lesson', new_id,
    'success', 'web', jsonb_build_object('status', p_status)
  );
  return new_id;
end;
$$;

create or replace function public.update_lesson(
  p_lesson_id uuid,
  p_title text,
  p_summary text,
  p_teaching_objective text,
  p_scripture_references text,
  p_lesson_body text,
  p_discussion_guide text,
  p_preparation_notes text,
  p_audience text,
  p_status public.lesson_status
)
returns void
language plpgsql security definer
set search_path = '' set row_security = off
as $$
declare prior_status public.lesson_status;
begin
  if not private.can_manage_curriculum() then
    raise exception 'Lesson update is denied.' using errcode = '42501';
  end if;
  select status into prior_status from public.lessons
  where id = p_lesson_id for update;
  if prior_status is null or prior_status = 'archived'
    or p_status = 'archived'
    or length(btrim(coalesce(p_title, ''))) not between 1 and 200 then
    raise exception 'Lesson details are invalid.' using errcode = '22023';
  end if;
  update public.lessons set
    title = btrim(p_title),
    summary = nullif(btrim(coalesce(p_summary, '')), ''),
    teaching_objective =
      nullif(btrim(coalesce(p_teaching_objective, '')), ''),
    scripture_references =
      nullif(btrim(coalesce(p_scripture_references, '')), ''),
    lesson_body = nullif(btrim(coalesce(p_lesson_body, '')), ''),
    discussion_guide = nullif(btrim(coalesce(p_discussion_guide, '')), ''),
    preparation_notes = nullif(btrim(coalesce(p_preparation_notes, '')), ''),
    audience = nullif(btrim(coalesce(p_audience, '')), ''),
    status = p_status,
    updated_at = now()
  where id = p_lesson_id;
  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    (select auth.uid()), 'curriculum.lesson_updated', 'lesson', p_lesson_id,
    'success', 'web',
    jsonb_build_object(
      'priorStatus', prior_status, 'status', p_status
    )
  );
end;
$$;

create or replace function public.archive_lesson(p_lesson_id uuid)
returns void
language plpgsql security definer
set search_path = '' set row_security = off
as $$
begin
  if not private.can_manage_curriculum() then
    raise exception 'Lesson archive is denied.' using errcode = '42501';
  end if;
  update public.lessons set
    status = 'archived', archived_at = now(), updated_at = now()
  where id = p_lesson_id and status <> 'archived';
  if not found then
    raise exception 'Lesson cannot be archived.' using errcode = '22023';
  end if;
  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    (select auth.uid()), 'curriculum.lesson_archived', 'lesson', p_lesson_id,
    'success', 'web', '{}'::jsonb
  );
end;
$$;

revoke all on function public.list_lesson_library(text, public.lesson_status)
  from public, anon, authenticated;
revoke all on function public.get_lesson_workspace(uuid)
  from public, anon, authenticated;
revoke all on function public.create_lesson(
  text, text, text, text, text, text, text, text, public.lesson_status
) from public, anon, authenticated;
revoke all on function public.update_lesson(
  uuid, text, text, text, text, text, text, text, text, public.lesson_status
) from public, anon, authenticated;
revoke all on function public.archive_lesson(uuid)
  from public, anon, authenticated;

grant execute on function public.list_lesson_library(
  text, public.lesson_status
) to authenticated;
grant execute on function public.get_lesson_workspace(uuid) to authenticated;
grant execute on function public.create_lesson(
  text, text, text, text, text, text, text, text, public.lesson_status
) to authenticated;
grant execute on function public.update_lesson(
  uuid, text, text, text, text, text, text, text, text, public.lesson_status
) to authenticated;
grant execute on function public.archive_lesson(uuid) to authenticated;

commit;
