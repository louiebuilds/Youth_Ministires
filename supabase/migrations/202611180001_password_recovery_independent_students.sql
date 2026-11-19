
begin;

-- Independent students use the existing student record; only the initial family
-- association becomes optional. Existing rows and foreign keys are preserved.
alter table public.students alter column primary_household_id drop not null;

drop function public.list_member_directory(text, public.student_status, text, uuid);

create function public.list_member_directory(
  p_search text default null,
  p_status public.student_status default null,
  p_grade text default null,
  p_tag_id uuid default null,
  p_guardian_status text default null
)
returns table (
  student_id uuid, display_name text, household_id uuid, household_name text,
  grade text, status public.student_status, tags jsonb, guardian_linked boolean
)
language plpgsql stable security definer
set search_path = '' set row_security = off
as $$
declare
  normalized_search text := nullif(btrim(coalesce(p_search, '')), '');
  normalized_grade text := nullif(btrim(coalesce(p_grade, '')), '');
begin
  if not private.current_profile_is_active() then
    raise exception 'Member directory access is denied.' using errcode = '42501';
  end if;
  if p_guardian_status is not null and p_guardian_status <> 'unlinked' then
    raise exception 'Guardian filter is invalid.' using errcode = '22023';
  end if;
  return query
  select students.id,
    coalesce(nullif(btrim(people.preferred_name), ''), btrim(people.first_name))
      || ' ' || left(btrim(people.last_name), 1) || '.',
    households.id, households.name, students.grade, students.status,
    case when private.has_role(array['platform_administrator','youth_pastor','staff_member']::public.account_role[])
      then coalesce(jsonb_agg(distinct jsonb_build_object('id', member_tags.id, 'name', member_tags.name, 'color', member_tags.color))
        filter (where member_tags.id is not null), '[]'::jsonb)
      else '[]'::jsonb end,
    exists (select 1 from public.student_relationships sr
      where sr.student_id = students.id and sr.is_legal_guardian
        and sr.may_view_student_information)
  from public.students
  join public.people on people.id = students.person_id
  left join public.households on households.id = students.primary_household_id
  left join public.member_tag_assignments on member_tag_assignments.person_id = people.id
  left join public.member_tags on member_tags.id = member_tag_assignments.tag_id
  where private.can_view_student(students.id)
    and (normalized_search is null or lower(people.first_name) like '%' || lower(normalized_search) || '%'
      or lower(coalesce(people.preferred_name, '')) like '%' || lower(normalized_search) || '%'
      or lower(people.last_name) like '%' || lower(normalized_search) || '%'
      or lower(coalesce(households.name, '')) like '%' || lower(normalized_search) || '%')
    and (p_status is null or students.status = p_status)
    and (normalized_grade is null or lower(students.grade) = lower(normalized_grade))
    and (p_tag_id is null or exists (select 1 from public.member_tag_assignments mta
      where mta.person_id = people.id and mta.tag_id = p_tag_id))
    and (p_guardian_status is null or not exists (select 1 from public.student_relationships sr
      where sr.student_id = students.id and sr.is_legal_guardian
        and sr.may_view_student_information))
  group by students.id, people.preferred_name, people.first_name, people.last_name,
    households.id, households.name, private.current_profile_role()
  order by lower(coalesce(people.preferred_name, people.first_name)), lower(people.last_name)
  limit 100;
end;
$$;

create or replace function public.get_child_workspace(p_student_id uuid)
returns jsonb language plpgsql stable security definer
set search_path = '' set row_security = off
as $$
declare can_manage boolean; can_view_medical boolean; workspace jsonb;
begin
  if p_student_id is null or not private.can_view_student(p_student_id) then
    raise exception 'Child access is denied.' using errcode = '42501';
  end if;
  can_manage := private.has_role(array['platform_administrator','youth_pastor','staff_member']::public.account_role[]);
  can_view_medical := can_manage or exists (
    select 1 from public.profiles join public.student_relationships
      on student_relationships.person_id = profiles.person_id
    where profiles.id = (select auth.uid()) and profiles.status = 'active'
      and student_relationships.student_id = p_student_id
      and student_relationships.is_legal_guardian
      and student_relationships.may_view_student_information);
  select jsonb_build_object(
    'id', students.id, 'personId', people.id,
    'displayName', coalesce(nullif(btrim(people.preferred_name), ''), btrim(people.first_name)) || ' ' || left(btrim(people.last_name), 1) || '.',
    'firstName', case when can_manage then people.first_name else null end,
    'preferredName', case when can_manage then people.preferred_name else null end,
    'lastName', case when can_manage then people.last_name else null end,
    'birthDate', students.birth_date, 'grade', students.grade, 'status', students.status,
    'householdId', households.id, 'householdName', households.name,
    'canManage', can_manage, 'canViewMedical', can_view_medical,
    'medicalSummary', case when can_view_medical then students.medical_summary else null end,
    'allergySummary', case when can_view_medical then students.allergy_summary else null end,
    'dietarySummary', case when can_view_medical then students.dietary_summary else null end,
    'relationships', case when can_manage then coalesce((select jsonb_agg(jsonb_build_object(
      'personId', rp.id, 'displayName', coalesce(nullif(btrim(rp.preferred_name), ''), btrim(rp.first_name)) || ' ' || btrim(rp.last_name),
      'relationshipType', sr.relationship_type, 'isLegalGuardian', sr.is_legal_guardian,
      'isEmergencyContact', sr.is_emergency_contact, 'isAuthorizedPickup', sr.is_authorized_pickup,
      'maySignPermissionForms', sr.may_sign_permission_forms,
      'mayViewStudentInformation', sr.may_view_student_information,
      'receiveEmail', sr.receive_email, 'receiveSms', sr.receive_sms)
      order by lower(rp.last_name), lower(rp.first_name))
      from public.student_relationships sr join public.people rp on rp.id = sr.person_id
      where sr.student_id = students.id), '[]'::jsonb) else '[]'::jsonb end,
    'tags', case when can_manage then coalesce((select jsonb_agg(jsonb_build_object(
      'id', mt.id, 'name', mt.name, 'color', mt.color) order by mt.name)
      from public.member_tag_assignments mta join public.member_tags mt on mt.id = mta.tag_id
      where mta.person_id = people.id), '[]'::jsonb) else '[]'::jsonb end)
  into workspace from public.students join public.people on people.id = students.person_id
  left join public.households on households.id = students.primary_household_id
  where students.id = p_student_id;
  if workspace is null then raise exception 'Child was not found.' using errcode = '22023'; end if;
  return workspace;
end;
$$;

create function public.create_independent_student(
  p_first_name text, p_preferred_name text, p_last_name text,
  p_birth_date date, p_grade text, p_status public.student_status
) returns uuid language plpgsql security definer
set search_path = '' set row_security = off
as $$
declare new_person_id uuid; new_student_id uuid;
begin
  if not private.has_role(array['platform_administrator','youth_pastor']::public.account_role[]) then
    raise exception 'Independent student creation is denied.' using errcode = '42501';
  end if;
  if p_birth_date is null or p_birth_date > current_date
    or length(btrim(coalesce(p_first_name,''))) not between 1 and 100
    or length(btrim(coalesce(p_last_name,''))) not between 1 and 100
    or btrim(coalesce(p_grade,'')) not in ('6','7','8','9','10','11','12')
    or p_status = 'archived' then
    raise exception 'Student details are invalid.' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    lower(btrim(p_first_name)) || '|' || lower(btrim(p_last_name)) || '|' || p_birth_date::text,
    0
  ));
  if exists (select 1 from public.students s join public.people p on p.id = s.person_id
    where lower(btrim(p.first_name)) = lower(btrim(p_first_name))
      and lower(btrim(p.last_name)) = lower(btrim(p_last_name))
      and s.birth_date = p_birth_date and s.status <> 'archived') then
    raise exception 'A matching student already exists.' using errcode = '23505';
  end if;
  insert into public.people(first_name, preferred_name, last_name)
    values (btrim(p_first_name), nullif(btrim(coalesce(p_preferred_name,'')),''), btrim(p_last_name))
    returning id into new_person_id;
  insert into public.students(person_id, primary_household_id, birth_date, grade, status)
    values (new_person_id, null, p_birth_date, btrim(p_grade), p_status)
    returning id into new_student_id;
  insert into public.audit_events(actor_profile_id, action, entity_type, entity_id, result, source, metadata)
    values ((select auth.uid()), 'student.created_without_guardian', 'student', new_student_id,
      'success', 'web', jsonb_build_object('guardianLinked', false, 'permissionsGranted', false));
  return new_student_id;
end;
$$;

drop function public.list_available_child_relationship_adults(uuid);

create function public.list_available_child_relationship_adults(p_student_id uuid)
returns table(person_id uuid, display_name text, household_id uuid,
  household_name text, household_relationship text)
language plpgsql stable security definer set search_path = '' set row_security = off
as $$
begin
  if not private.has_role(array['platform_administrator','youth_pastor','staff_member']::public.account_role[]) then
    raise exception 'Available relationship access is denied.' using errcode = '42501';
  end if;
  return query select people.id,
    coalesce(nullif(btrim(people.preferred_name),''),btrim(people.first_name)) || ' ' || btrim(people.last_name),
    households.id, households.name,
    household_memberships.relationship_label
  from public.students
  join public.household_memberships on students.primary_household_id is null
    or household_memberships.household_id = students.primary_household_id
  join public.households on households.id = household_memberships.household_id
  join public.people on people.id = household_memberships.person_id
  where students.id = p_student_id
    and students.status <> 'archived'
    and households.status = 'active'
    and people.status = 'active'
    and household_memberships.is_responsible_adult
    and not exists (
      select 1
      from public.student_relationships sr
      where sr.student_id = students.id
        and sr.person_id = people.id
    )
    and (
      private.has_role(
        array['platform_administrator','youth_pastor']::public.account_role[]
      )
      or (
        students.primary_household_id is not null
        and household_memberships.household_id = students.primary_household_id
      )
    )
  order by people.last_name, people.first_name;
end;
$$;

-- Keep the deployed 10-argument signature for backward compatibility. It may
-- add a responsible adult only from the student's existing active household;
-- it cannot attach an independent student to a household.
create or replace function public.add_child_relationship(
  p_student_id uuid, p_person_id uuid, p_relationship_type text,
  p_is_legal_guardian boolean, p_is_emergency_contact boolean,
  p_is_authorized_pickup boolean, p_may_sign_permission_forms boolean,
  p_may_view_student_information boolean, p_receive_email boolean, p_receive_sms boolean
) returns void language plpgsql security definer set search_path = '' set row_security = off
as $$
declare student_household_id uuid;
begin
  if not private.has_role(array['platform_administrator','youth_pastor','staff_member']::public.account_role[]) then
    raise exception 'Relationship creation is denied.' using errcode = '42501';
  end if;
  select students.primary_household_id into student_household_id
  from public.students
  join public.households on households.id = students.primary_household_id
  where students.id = p_student_id and students.status <> 'archived'
    and households.status = 'active'
  for update of students;
  if student_household_id is null
    or length(btrim(coalesce(p_relationship_type,''))) not between 1 and 80
    or not exists (select 1 from public.household_memberships hm
      join public.people p on p.id = hm.person_id
      where hm.household_id = student_household_id and hm.person_id = p_person_id
        and hm.is_responsible_adult and p.status = 'active')
    or exists (select 1 from public.student_relationships
      where student_id = p_student_id and person_id = p_person_id) then
    raise exception 'Child relationship is invalid.' using errcode = '22023';
  end if;
  insert into public.student_relationships(student_id, person_id, relationship_type,
    is_legal_guardian, is_emergency_contact, is_authorized_pickup,
    may_sign_permission_forms, may_view_student_information, receive_email, receive_sms)
  values(p_student_id,p_person_id,btrim(p_relationship_type),p_is_legal_guardian,
    p_is_emergency_contact,p_is_authorized_pickup,p_may_sign_permission_forms,
    p_may_view_student_information,p_receive_email,p_receive_sms);
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata)
    values((select auth.uid()),'child.relationship_created','student',p_student_id,'success','web',
      jsonb_build_object('relatedPersonId',p_person_id,'householdId',student_household_id,
        'permissionsReviewed',true,'guardianAccessGranted',p_is_legal_guardian and p_may_view_student_information,
        'compatibilitySignature','legacy'));
end;
$$;

create function public.add_child_relationship(
  p_student_id uuid, p_person_id uuid, p_household_id uuid, p_relationship_type text,
  p_is_legal_guardian boolean, p_is_emergency_contact boolean,
  p_is_authorized_pickup boolean, p_may_sign_permission_forms boolean,
  p_may_view_student_information boolean, p_receive_email boolean, p_receive_sms boolean
) returns void language plpgsql security definer set search_path = '' set row_security = off
as $$
declare student_household_id uuid; adult_household_id uuid;
begin
  if not private.has_role(array['platform_administrator','youth_pastor']::public.account_role[]) then
    raise exception 'Relationship creation is denied.' using errcode = '42501';
  end if;
  select primary_household_id into student_household_id from public.students
    where id = p_student_id and status <> 'archived' for update;
  select hm.household_id into adult_household_id from public.household_memberships hm
    join public.households h on h.id = hm.household_id join public.people p on p.id = hm.person_id
    where hm.person_id = p_person_id and hm.is_responsible_adult
      and h.status = 'active' and p.status = 'active'
      and hm.household_id = p_household_id
      and (student_household_id is null or hm.household_id = student_household_id)
    order by hm.created_at limit 1;
  if adult_household_id is null or length(btrim(coalesce(p_relationship_type,''))) not between 1 and 80
    or exists (select 1 from public.student_relationships where student_id=p_student_id and person_id=p_person_id) then
    raise exception 'Child relationship is invalid.' using errcode = '22023';
  end if;
  if student_household_id is null then
    update public.students set primary_household_id = adult_household_id where id = p_student_id;
  end if;
  insert into public.student_relationships(student_id, person_id, relationship_type,
    is_legal_guardian, is_emergency_contact, is_authorized_pickup,
    may_sign_permission_forms, may_view_student_information, receive_email, receive_sms)
  values(p_student_id,p_person_id,btrim(p_relationship_type),p_is_legal_guardian,
    p_is_emergency_contact,p_is_authorized_pickup,p_may_sign_permission_forms,
    p_may_view_student_information,p_receive_email,p_receive_sms);
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata)
    values((select auth.uid()),'child.relationship_created','student',p_student_id,'success','web',
      jsonb_build_object('relatedPersonId',p_person_id,'householdId',adult_household_id,
        'permissionsReviewed',true,'guardianAccessGranted',p_is_legal_guardian and p_may_view_student_information));
end;
$$;

revoke all on function public.list_member_directory(text, public.student_status, text, uuid, text) from public, anon, authenticated;
revoke all on function public.create_independent_student(text,text,text,date,text,public.student_status) from public, anon, authenticated;
revoke all on function public.list_available_child_relationship_adults(uuid) from public, anon, authenticated;
revoke all on function public.add_child_relationship(uuid,uuid,text,boolean,boolean,boolean,boolean,boolean,boolean,boolean) from public, anon, authenticated;
revoke all on function public.add_child_relationship(uuid,uuid,uuid,text,boolean,boolean,boolean,boolean,boolean,boolean,boolean) from public, anon, authenticated;
grant execute on function public.list_member_directory(text, public.student_status, text, uuid, text) to authenticated;
grant execute on function public.create_independent_student(text,text,text,date,text,public.student_status) to authenticated;
grant execute on function public.list_available_child_relationship_adults(uuid) to authenticated;
grant execute on function public.add_child_relationship(uuid,uuid,text,boolean,boolean,boolean,boolean,boolean,boolean,boolean) to authenticated;
grant execute on function public.add_child_relationship(uuid,uuid,uuid,text,boolean,boolean,boolean,boolean,boolean,boolean,boolean) to authenticated;

commit;
