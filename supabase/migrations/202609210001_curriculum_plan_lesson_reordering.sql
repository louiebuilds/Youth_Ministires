begin;

create or replace function public.move_curriculum_plan_lesson(
  p_plan_lesson_id uuid,
  p_direction text
)
returns integer
language plpgsql security definer
set search_path = '' set row_security = off
as $$
declare
  selected_plan_id uuid;
  selected_sequence integer;
  target_id uuid;
  target_sequence integer;
  temporary_sequence integer;
begin
  if not private.can_manage_curriculum() then
    raise exception 'Curriculum plan lesson update is denied.'
      using errcode = '42501';
  end if;
  if p_direction not in ('up', 'down') then
    raise exception 'Curriculum plan lesson direction is invalid.'
      using errcode = '22023';
  end if;

  select plan_lessons.curriculum_plan_id
  into selected_plan_id
  from public.curriculum_plan_lessons as plan_lessons
  where plan_lessons.id = p_plan_lesson_id;
  if not found then
    raise exception 'Curriculum plan lesson is unavailable.'
      using errcode = '22023';
  end if;

  perform 1
  from public.curriculum_plans
  where id = selected_plan_id and status <> 'archived'
  for update;
  if not found then
    raise exception 'Curriculum plan lesson is unavailable.'
      using errcode = '22023';
  end if;

  select plan_lessons.sequence_number
  into selected_sequence
  from public.curriculum_plan_lessons as plan_lessons
  where plan_lessons.id = p_plan_lesson_id
    and plan_lessons.curriculum_plan_id = selected_plan_id
  for update;
  if not found then
    raise exception 'Curriculum plan lesson is unavailable.'
      using errcode = '22023';
  end if;

  select plan_lessons.id, plan_lessons.sequence_number
  into target_id, target_sequence
  from public.curriculum_plan_lessons as plan_lessons
  where plan_lessons.curriculum_plan_id = selected_plan_id
    and plan_lessons.sequence_number = selected_sequence +
      case when p_direction = 'up' then -1 else 1 end
  for update;
  if not found then
    raise exception 'Curriculum plan lesson cannot move in that direction.'
      using errcode = '22023';
  end if;

  select max(sequence_number) + 1
  into temporary_sequence
  from public.curriculum_plan_lessons
  where curriculum_plan_id = selected_plan_id;

  update public.curriculum_plan_lessons
  set sequence_number = temporary_sequence
  where id = p_plan_lesson_id;
  update public.curriculum_plan_lessons
  set sequence_number = selected_sequence
  where id = target_id;
  update public.curriculum_plan_lessons
  set sequence_number = target_sequence
  where id = p_plan_lesson_id;

  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    (select auth.uid()), 'curriculum.plan_lesson_reordered',
    'curriculum_plan_lesson', p_plan_lesson_id, 'success', 'web',
    jsonb_build_object(
      'curriculumPlanId', selected_plan_id,
      'fromSequence', selected_sequence,
      'toSequence', target_sequence,
      'direction', p_direction
    )
  );

  return target_sequence;
end;
$$;

revoke all on function public.move_curriculum_plan_lesson(uuid, text)
  from public, anon, authenticated;
grant execute on function public.move_curriculum_plan_lesson(uuid, text)
  to authenticated;

commit;
