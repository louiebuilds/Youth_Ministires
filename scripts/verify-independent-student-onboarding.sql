\set ON_ERROR_STOP on

begin;

create temporary table onboarding_test_state (
  name text primary key,
  value uuid not null
) on commit drop;

select set_config('request.jwt.claim.sub', '0528dc29-043e-42c8-94c6-a78de583c545', true);

insert into onboarding_test_state(name, value)
select 'admin_student', public.create_independent_student(
  'RollbackAdmin', null, 'Student', date '2012-02-03', '8', 'active'
);

do $$
declare v_student_id uuid := (select value from onboarding_test_state where name = 'admin_student');
begin
  if not exists (
    select 1 from public.students s
    where s.id = v_student_id and s.primary_household_id is null and s.grade = '8'
  ) then raise exception 'Administrator independent-student creation failed'; end if;
  if exists (
    select 1 from public.profiles pr join public.students s on s.person_id = pr.person_id
    where s.id = v_student_id
  ) then raise exception 'Student creation unexpectedly created a login profile'; end if;
  if not exists (
    select 1 from public.list_member_directory(null, null, null, null, 'unlinked') d
    where d.student_id = v_student_id and not d.guardian_linked
  ) then raise exception 'Unlinked directory projection failed'; end if;
  if not exists (
    select 1 from public.audit_events
    where entity_id = v_student_id and action = 'student.created_without_guardian'
  ) then raise exception 'Student creation audit event missing'; end if;
end $$;

do $$
begin
  perform public.create_independent_student(
    'RollbackAdmin', null, 'Student', date '2012-02-03', '8', 'active'
  );
  raise exception 'Duplicate active student was allowed';
exception when unique_violation then null;
end $$;

select set_config('request.jwt.claim.sub', '53273663-cd5e-4eab-aa83-947bbeab0a95', true);
insert into onboarding_test_state(name, value)
select 'pastor_student', public.create_independent_student(
  'RollbackPastor', 'Pastor', 'Student', date '2010-04-05', '10', 'registered'
);

do $$
begin
  if not exists (
    select 1 from public.students
    where id = (select value from onboarding_test_state where name = 'pastor_student')
      and primary_household_id is null and grade = '10'
  ) then raise exception 'Youth Pastor independent-student creation failed'; end if;
end $$;

select set_config('request.jwt.claim.sub', '7a79cc1f-905a-4ae0-8a07-c5f40a408afa', true);
do $$
begin
  perform public.create_independent_student(
    'RollbackVolunteer', null, 'Denied', date '2011-01-01', '9', 'active'
  );
  raise exception 'Volunteer created an independent student';
exception when insufficient_privilege then null;
end $$;

select set_config('request.jwt.claim.sub', '0528dc29-043e-42c8-94c6-a78de583c545', true);

do $$
declare
  v_student_id uuid := (select value from onboarding_test_state where name = 'admin_student');
  v_parent_person_id uuid := '2cd334f4-971d-4202-9f9d-31d9e703e756';
  v_household_id uuid := '131f3721-1b80-4950-9ec8-ad59967ef90c';
begin
  if not exists (
    select 1 from public.list_available_child_relationship_adults(v_student_id) available
    where available.person_id = v_parent_person_id
      and available.household_id = v_household_id and available.household_name = 'A'
  ) then raise exception 'Household/adult selection projection failed'; end if;

  perform public.add_child_relationship(
    v_student_id, v_parent_person_id, v_household_id, 'Parent', true,
    false, false, false, false, false, false
  );

  if (select primary_household_id from public.students where id = v_student_id) <> v_household_id
  then raise exception 'Existing student was not attached to selected household'; end if;
  if not exists (
    select 1 from public.audit_events where entity_id = v_student_id
      and action = 'child.relationship_created'
      and metadata ->> 'householdId' = v_household_id::text
  ) then raise exception 'Relationship audit event missing household'; end if;
end $$;

select set_config('request.jwt.claim.sub', 'e1601922-deff-46b9-a595-817f4e3d541b', true);
do $$
begin
  if private.can_view_student((select value from onboarding_test_state where name = 'admin_student'))
  then raise exception 'Guardian without explicit view permission received access'; end if;
end $$;

select set_config('request.jwt.claim.sub', 'ac954e88-dc5d-4287-8fe8-3d67f63fdba8', true);
do $$
begin
  if private.can_view_student((select value from onboarding_test_state where name = 'admin_student'))
  then raise exception 'Unrelated parent received student access'; end if;
  begin
    perform public.add_child_relationship(
      (select value from onboarding_test_state where name = 'admin_student'),
      '9b8502be-392a-4ff3-b683-282c08c0ff4d',
      'ef268544-2542-49fa-ab2e-2bf1bf0fbc64', 'Parent', true,
      false, false, false, true, false, false
    );
    raise exception 'Parent claimed an arbitrary student';
  exception when insufficient_privilege then null;
  end;
end $$;

select set_config('request.jwt.claim.sub', '0528dc29-043e-42c8-94c6-a78de583c545', true);
select public.update_child_relationship(
  (select value from onboarding_test_state where name = 'admin_student'),
  '2cd334f4-971d-4202-9f9d-31d9e703e756', 'Parent', true,
  false, false, false, true, false, false
);

select set_config('request.jwt.claim.sub', '53273663-cd5e-4eab-aa83-947bbeab0a95', true);
select public.add_child_relationship(
  (select value from onboarding_test_state where name = 'pastor_student'),
  '2cd334f4-971d-4202-9f9d-31d9e703e756',
  '131f3721-1b80-4950-9ec8-ad59967ef90c', 'Parent', true,
  false, false, false, true, false, false
);
select set_config('request.jwt.claim.sub', '0528dc29-043e-42c8-94c6-a78de583c545', true);

-- The legacy signature remains callable for an existing household, but cannot
-- choose or attach a household for an independent student.
insert into public.people(first_name, last_name)
values ('RollbackLegacy', 'Guardian') returning id as legacy_guardian_id \gset
insert into public.household_memberships(
  household_id, person_id, relationship_label, is_responsible_adult
) values (
  '131f3721-1b80-4950-9ec8-ad59967ef90c', :'legacy_guardian_id', 'Guardian', true
);
select public.add_child_relationship(
  (select value from onboarding_test_state where name = 'pastor_student'),
  :'legacy_guardian_id', 'Guardian', true,
  false, false, false, true, false, false
);

insert into onboarding_test_state(name, value)
select 'legacy_independent', public.create_independent_student(
  'RollbackLegacy', null, 'Independent', date '2011-06-07', '9', 'active'
);
do $$
begin
  begin
    perform public.add_child_relationship(
      (select value from onboarding_test_state where name = 'legacy_independent'),
      '2cd334f4-971d-4202-9f9d-31d9e703e756', 'Parent', true,
      false, false, false, true, false, false
    );
    raise exception 'Legacy signature attached an independent student';
  exception when invalid_parameter_value then null;
  end;
end $$;

insert into public.people(first_name, last_name)
values ('RollbackSecond', 'Guardian') returning id as second_guardian_id \gset
insert into public.household_memberships(
  household_id, person_id, relationship_label, is_responsible_adult
) values (
  '131f3721-1b80-4950-9ec8-ad59967ef90c', :'second_guardian_id', 'Guardian', true
);
select public.add_child_relationship(
  (select value from onboarding_test_state where name = 'admin_student'),
  :'second_guardian_id', '131f3721-1b80-4950-9ec8-ad59967ef90c', 'Guardian', true,
  false, false, false, true, false, false
);

select set_config('request.jwt.claim.sub', 'e1601922-deff-46b9-a595-817f4e3d541b', true);
do $$
begin
  if not private.can_view_student((select value from onboarding_test_state where name = 'admin_student'))
  then raise exception 'Approved guardian with view permission was denied'; end if;
end $$;

select set_config('request.jwt.claim.sub', '0528dc29-043e-42c8-94c6-a78de583c545', true);
do $$
declare
  first_student uuid := (select value from onboarding_test_state where name = 'admin_student');
  sibling uuid := (select value from onboarding_test_state where name = 'pastor_student');
begin
  if first_student = sibling then raise exception 'Sibling records were not distinct'; end if;
  if (select primary_household_id from public.students where id = first_student)
     <> (select primary_household_id from public.students where id = sibling)
  then raise exception 'Sibling household linking failed'; end if;
  if (select count(*) from public.student_relationships where student_id = first_student) <> 2
  then raise exception 'Multiple guardian relationships failed'; end if;
  if (select count(*) from public.student_relationships where student_id = sibling) <> 2
  then raise exception 'Legacy and explicit relationship signatures did not coexist'; end if;
  if not exists (
    select 1 from public.audit_events where entity_id = first_student
      and action = 'child.relationship_updated'
  ) then raise exception 'Permission-change audit event missing'; end if;
end $$;

rollback;

select 'independent student onboarding database verification passed' as result;
