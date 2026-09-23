begin;

-- Preserve every archived assignment while refusing to conceal live-test duplicates.
-- An operator must archive duplicate active rows through the established workflow
-- before this migration can add the authoritative uniqueness index.
do $$
begin
  if exists (
    select 1
    from public.custom_form_assignments
    where archived_at is null
    group by version_id, assignment_type, event_id, student_id,
      household_id, volunteer_profile_id
    having count(*) > 1
  ) then
    raise exception 'Duplicate active Custom Form assignments must be archived through the established lifecycle before applying this migration.'
      using errcode = '23505';
  end if;
end
$$;

create unique index custom_form_assignments_one_active_target
  on public.custom_form_assignments (
    version_id,
    assignment_type,
    event_id,
    student_id,
    household_id,
    volunteer_profile_id
  ) nulls not distinct
  where archived_at is null;

comment on index public.custom_form_assignments_one_active_target is
  'Allows at most one active assignment for a Custom Form version, assignment type, and authoritative target; archived history remains retained.';

create or replace function public.create_custom_form_assignment(
  p_version_id uuid,
  p_assignment_type public.custom_form_assignment_type,
  p_event_id uuid default null,
  p_student_id uuid default null,
  p_household_id uuid default null,
  p_volunteer_profile_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  result uuid;
begin
  if not private.has_forms_capability('custom_forms.manage') then
    raise exception 'Custom Form assignment is denied.' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.custom_form_assignments assignments
    where assignments.version_id = p_version_id
      and assignments.assignment_type = p_assignment_type
      and assignments.event_id is not distinct from p_event_id
      and assignments.student_id is not distinct from p_student_id
      and assignments.household_id is not distinct from p_household_id
      and assignments.volunteer_profile_id is not distinct from p_volunteer_profile_id
      and assignments.archived_at is null
  ) then
    raise exception 'This form is already assigned to that target.' using errcode = '23505';
  end if;

  begin
    insert into public.custom_form_assignments(
      version_id,
      assignment_type,
      event_id,
      student_id,
      household_id,
      volunteer_profile_id,
      is_general_ministry,
      assigned_by_profile_id
    ) values (
      p_version_id,
      p_assignment_type,
      p_event_id,
      p_student_id,
      p_household_id,
      p_volunteer_profile_id,
      p_assignment_type = 'general_ministry',
      auth.uid()
    ) returning id into result;
  exception
    when unique_violation then
      raise exception 'This form is already assigned to that target.' using errcode = '23505';
  end;

  insert into public.audit_events(
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    auth.uid(),
    'custom_forms.assignment_created',
    'custom_form_assignment',
    result,
    'success',
    'web',
    jsonb_build_object('versionId', p_version_id, 'assignmentType', p_assignment_type)
  );

  return result;
end
$$;

commit;