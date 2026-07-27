begin;

create or replace function public.list_available_child_relationship_adults(
  p_student_id uuid
)
returns table (
  person_id uuid, display_name text, household_relationship text
)
language plpgsql stable security definer
set search_path = '' set row_security = off
as $$
begin
  if not private.has_role(array[
    'platform_administrator', 'youth_pastor', 'staff_member'
  ]::public.account_role[]) then
    raise exception 'Available relationship access is denied.'
      using errcode = '42501';
  end if;
  return query
  select people.id,
    coalesce(nullif(btrim(people.preferred_name), ''), btrim(people.first_name))
      || ' ' || btrim(people.last_name),
    household_memberships.relationship_label
  from public.students
  join public.household_memberships
    on household_memberships.household_id = students.primary_household_id
  join public.people on people.id = household_memberships.person_id
  where students.id = p_student_id
    and students.status <> 'archived'
    and people.status = 'active'
    and not exists (
      select 1 from public.student_relationships
      where student_relationships.student_id = students.id
        and student_relationships.person_id = people.id
    )
  order by people.last_name, people.first_name;
end;
$$;

create or replace function public.add_child_relationship(
  p_student_id uuid,
  p_person_id uuid,
  p_relationship_type text,
  p_is_legal_guardian boolean,
  p_is_emergency_contact boolean,
  p_is_authorized_pickup boolean,
  p_may_sign_permission_forms boolean,
  p_may_view_student_information boolean,
  p_receive_email boolean,
  p_receive_sms boolean
)
returns void
language plpgsql security definer
set search_path = '' set row_security = off
as $$
begin
  if not private.has_role(array[
    'platform_administrator', 'youth_pastor', 'staff_member'
  ]::public.account_role[]) then
    raise exception 'Relationship creation is denied.' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_relationship_type, ''))) not between 1 and 80
    or not exists (
      select 1 from public.students
      join public.household_memberships
        on household_memberships.household_id =
          students.primary_household_id
      join public.people on people.id = household_memberships.person_id
      where students.id = p_student_id
        and household_memberships.person_id = p_person_id
        and students.status <> 'archived'
        and people.status = 'active'
    )
    or exists (
      select 1 from public.student_relationships
      where student_id = p_student_id and person_id = p_person_id
    ) then
    raise exception 'Child relationship is invalid.' using errcode = '22023';
  end if;
  insert into public.student_relationships (
    student_id, person_id, relationship_type,
    is_legal_guardian, is_emergency_contact, is_authorized_pickup,
    may_sign_permission_forms, may_view_student_information,
    receive_email, receive_sms
  ) values (
    p_student_id, p_person_id, btrim(p_relationship_type),
    p_is_legal_guardian, p_is_emergency_contact, p_is_authorized_pickup,
    p_may_sign_permission_forms, p_may_view_student_information,
    p_receive_email, p_receive_sms
  );
  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    (select auth.uid()), 'child.relationship_created', 'student',
    p_student_id, 'success', 'web',
    jsonb_build_object(
      'relatedPersonId', p_person_id, 'permissionsReviewed', true
    )
  );
end;
$$;

revoke all on function public.list_available_child_relationship_adults(uuid)
  from public, anon, authenticated;
revoke all on function public.add_child_relationship(
  uuid, uuid, text, boolean, boolean, boolean, boolean, boolean, boolean, boolean
) from public, anon, authenticated;
grant execute on function public.list_available_child_relationship_adults(uuid)
  to authenticated;
grant execute on function public.add_child_relationship(
  uuid, uuid, text, boolean, boolean, boolean, boolean, boolean, boolean, boolean
) to authenticated;

commit;
