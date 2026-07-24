begin;

create table public.member_tags (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 60),
  color text not null default '#475569' check (
    color ~ '^#[0-9A-Fa-f]{6}$'
  ),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint member_tags_name_key unique (name)
);

create table public.member_tag_assignments (
  id uuid primary key default extensions.gen_random_uuid(),
  person_id uuid not null
    references public.people(id) on delete restrict,
  tag_id uuid not null
    references public.member_tags(id) on delete restrict,
  created_at timestamp with time zone not null default now(),
  constraint member_tag_assignments_person_tag_key unique (person_id, tag_id)
);

create index member_tag_assignments_tag_id_idx
  on public.member_tag_assignments (tag_id);

create trigger member_tags_set_updated_at
before update on public.member_tags
for each row execute function public.set_updated_at();

alter table public.member_tags enable row level security;
alter table public.member_tags force row level security;
alter table public.member_tag_assignments enable row level security;
alter table public.member_tag_assignments force row level security;

revoke all on table public.member_tags from anon, authenticated;
revoke all on table public.member_tag_assignments from anon, authenticated;

grant select, insert, update, delete on table public.member_tags
  to authenticated;
grant select, insert, update, delete on table public.member_tag_assignments
  to authenticated;

create policy member_tags_read_ministry
on public.member_tags
for select
to authenticated
using (
  private.has_role(
    array[
      'platform_administrator',
      'youth_pastor',
      'staff_member'
    ]::public.account_role[]
  )
);

create policy member_tags_manage_ministry
on public.member_tags
for all
to authenticated
using (
  private.has_role(
    array[
      'platform_administrator',
      'youth_pastor',
      'staff_member'
    ]::public.account_role[]
  )
)
with check (
  private.has_role(
    array[
      'platform_administrator',
      'youth_pastor',
      'staff_member'
    ]::public.account_role[]
  )
);

create policy member_tag_assignments_read_ministry
on public.member_tag_assignments
for select
to authenticated
using (
  private.has_role(
    array[
      'platform_administrator',
      'youth_pastor',
      'staff_member'
    ]::public.account_role[]
  )
);

create policy member_tag_assignments_manage_ministry
on public.member_tag_assignments
for all
to authenticated
using (
  private.has_role(
    array[
      'platform_administrator',
      'youth_pastor',
      'staff_member'
    ]::public.account_role[]
  )
)
with check (
  private.has_role(
    array[
      'platform_administrator',
      'youth_pastor',
      'staff_member'
    ]::public.account_role[]
  )
);

create or replace function public.list_member_directory(
  p_search text default null,
  p_status public.student_status default null,
  p_grade text default null,
  p_tag_id uuid default null
)
returns table (
  student_id uuid,
  display_name text,
  household_id uuid,
  household_name text,
  grade text,
  status public.student_status,
  tags jsonb
)
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
declare
  normalized_search text;
  normalized_grade text;
begin
  if not private.current_profile_is_active() then
    raise exception 'Member directory access is denied.'
      using errcode = '42501';
  end if;

  normalized_search := nullif(btrim(coalesce(p_search, '')), '');
  normalized_grade := nullif(btrim(coalesce(p_grade, '')), '');

  if normalized_search is not null and length(normalized_search) > 100 then
    raise exception 'Search must be 100 characters or fewer.'
      using errcode = '22023';
  end if;

  if normalized_grade is not null and length(normalized_grade) > 40 then
    raise exception 'Grade must be 40 characters or fewer.'
      using errcode = '22023';
  end if;

  return query
  select
    students.id,
    coalesce(
      nullif(btrim(people.preferred_name), ''),
      btrim(people.first_name)
    ) || ' ' || left(btrim(people.last_name), 1) || '.',
    households.id,
    households.name,
    students.grade,
    students.status,
    case
      when private.has_role(
        array[
          'platform_administrator',
          'youth_pastor',
          'staff_member'
        ]::public.account_role[]
      )
      then coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', member_tags.id,
            'name', member_tags.name,
            'color', member_tags.color
          )
          order by member_tags.name
        ) filter (where member_tags.id is not null),
        '[]'::jsonb
      )
      else '[]'::jsonb
    end
  from public.students
  join public.people
    on people.id = students.person_id
  join public.households
    on households.id = students.primary_household_id
  left join public.member_tag_assignments
    on member_tag_assignments.person_id = people.id
  left join public.member_tags
    on member_tags.id = member_tag_assignments.tag_id
  where private.can_view_student(students.id)
    and (
      normalized_search is null
      or lower(people.first_name) like '%' || lower(normalized_search) || '%'
      or lower(coalesce(people.preferred_name, ''))
        like '%' || lower(normalized_search) || '%'
      or lower(people.last_name) like '%' || lower(normalized_search) || '%'
      or lower(households.name) like '%' || lower(normalized_search) || '%'
    )
    and (p_status is null or students.status = p_status)
    and (
      normalized_grade is null
      or lower(students.grade) = lower(normalized_grade)
    )
    and (
      p_tag_id is null
      or exists (
        select 1
        from public.member_tag_assignments as tag_filter
        where tag_filter.person_id = people.id
          and tag_filter.tag_id = p_tag_id
      )
    )
  group by
    students.id,
    people.preferred_name,
    people.first_name,
    people.last_name,
    households.id,
    private.current_profile_role()
  order by
    lower(coalesce(people.preferred_name, people.first_name)),
    lower(people.last_name),
    students.id
  limit 100;
end;
$$;

create or replace function public.list_accessible_families(
  p_search text default null
)
returns table (
  household_id uuid,
  household_name text,
  status public.household_status,
  city text,
  region text,
  adult_count bigint,
  student_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
declare
  normalized_search text;
begin
  if not private.current_profile_is_active() then
    raise exception 'Family access is denied.'
      using errcode = '42501';
  end if;

  normalized_search := nullif(btrim(coalesce(p_search, '')), '');

  if normalized_search is not null and length(normalized_search) > 100 then
    raise exception 'Search must be 100 characters or fewer.'
      using errcode = '22023';
  end if;

  return query
  select
    households.id,
    households.name,
    households.status,
    households.city,
    households.region,
    (
      select count(*)
      from public.household_memberships
      where household_memberships.household_id = households.id
    ),
    (
      select count(*)
      from public.students
      where students.primary_household_id = households.id
        and students.status <> 'archived'
    )
  from public.households
  where private.can_view_household(households.id)
    and (
      normalized_search is null
      or lower(households.name) like '%' || lower(normalized_search) || '%'
      or lower(coalesce(households.address_line_1, ''))
        like '%' || lower(normalized_search) || '%'
      or lower(coalesce(households.city, ''))
        like '%' || lower(normalized_search) || '%'
      or lower(coalesce(households.region, ''))
        like '%' || lower(normalized_search) || '%'
      or lower(coalesce(households.postal_code, ''))
        like '%' || lower(normalized_search) || '%'
      or lower(households.status::text)
        like '%' || lower(normalized_search) || '%'
      or exists (
        select 1
        from public.household_memberships
        join public.people
          on people.id = household_memberships.person_id
        where household_memberships.household_id = households.id
          and (
            lower(people.first_name)
              like '%' || lower(normalized_search) || '%'
            or lower(coalesce(people.preferred_name, ''))
              like '%' || lower(normalized_search) || '%'
            or lower(people.last_name)
              like '%' || lower(normalized_search) || '%'
          )
      )
      or exists (
        select 1
        from public.students
        join public.people
          on people.id = students.person_id
        where students.primary_household_id = households.id
          and (
            lower(people.first_name)
              like '%' || lower(normalized_search) || '%'
            or lower(coalesce(people.preferred_name, ''))
              like '%' || lower(normalized_search) || '%'
            or lower(people.last_name)
              like '%' || lower(normalized_search) || '%'
          )
      )
    )
  order by lower(households.name), households.id
  limit 100;
end;
$$;

create or replace function public.get_family_workspace(
  p_household_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
declare
  workspace jsonb;
begin
  if p_household_id is null
    or not private.can_view_household(p_household_id) then
    raise exception 'Family access is denied.'
      using errcode = '42501';
  end if;

  select jsonb_build_object(
    'id', households.id,
    'name', households.name,
    'status', households.status,
    'addressLine1', households.address_line_1,
    'addressLine2', households.address_line_2,
    'city', households.city,
    'region', households.region,
    'postalCode', households.postal_code,
    'countryCode', households.country_code,
    'adults', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', people.id,
            'firstName', people.first_name,
            'preferredName', people.preferred_name,
            'lastName', people.last_name,
            'email', people.email,
            'phone', people.phone,
            'relationshipLabel',
              household_memberships.relationship_label,
            'isResponsibleAdult',
              household_memberships.is_responsible_adult,
            'isPrimaryContact',
              household_memberships.is_primary_contact,
            'receiveEmail', household_memberships.receive_email,
            'receiveSms', household_memberships.receive_sms,
            'receiveEmergencyNotifications',
              household_memberships.receive_emergency_notifications
          )
          order by
            household_memberships.is_primary_contact desc,
            lower(people.last_name),
            lower(people.first_name)
        )
        from public.household_memberships
        join public.people
          on people.id = household_memberships.person_id
        where household_memberships.household_id = households.id
          and people.status <> 'archived'
      ),
      '[]'::jsonb
    ),
    'children', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', students.id,
            'displayName',
              coalesce(
                nullif(btrim(people.preferred_name), ''),
                btrim(people.first_name)
              ) || ' ' || left(btrim(people.last_name), 1) || '.',
            'grade', students.grade,
            'status', students.status
          )
          order by
            lower(coalesce(people.preferred_name, people.first_name)),
            lower(people.last_name)
        )
        from public.students
        join public.people
          on people.id = students.person_id
        where students.primary_household_id = households.id
          and students.status <> 'archived'
      ),
      '[]'::jsonb
    )
  )
  into workspace
  from public.households
  where households.id = p_household_id;

  if workspace is null then
    raise exception 'Family was not found.'
      using errcode = '22023';
  end if;

  return workspace;
end;
$$;

create or replace function public.update_family_details(
  p_household_id uuid,
  p_name text,
  p_status public.household_status,
  p_address_line_1 text,
  p_address_line_2 text,
  p_city text,
  p_region text,
  p_postal_code text,
  p_country_code text
)
returns void
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  existing_status public.household_status;
  normalized_name text;
  normalized_country_code text;
begin
  if not private.has_role(
    array[
      'platform_administrator',
      'youth_pastor',
      'staff_member'
    ]::public.account_role[]
  ) then
    raise exception 'Family updates are denied.'
      using errcode = '42501';
  end if;

  normalized_name := btrim(coalesce(p_name, ''));
  normalized_country_code := upper(btrim(coalesce(p_country_code, '')));

  if length(normalized_name) not between 1 and 150
    or normalized_country_code !~ '^[A-Z]{2}$' then
    raise exception 'Family details are invalid.'
      using errcode = '22023';
  end if;

  select status
  into existing_status
  from public.households
  where id = p_household_id
  for update;

  if existing_status is null then
    raise exception 'Family was not found.'
      using errcode = '22023';
  end if;

  update public.households
  set
    name = normalized_name,
    status = p_status,
    address_line_1 = nullif(btrim(coalesce(p_address_line_1, '')), ''),
    address_line_2 = nullif(btrim(coalesce(p_address_line_2, '')), ''),
    city = nullif(btrim(coalesce(p_city, '')), ''),
    region = nullif(btrim(coalesce(p_region, '')), ''),
    postal_code = nullif(btrim(coalesce(p_postal_code, '')), ''),
    country_code = normalized_country_code,
    archived_at = case
      when p_status = 'archived' and existing_status <> 'archived' then now()
      when p_status <> 'archived' then null
      else archived_at
    end
  where id = p_household_id;

  insert into public.audit_events (
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    result,
    source,
    metadata
  )
  values (
    (select auth.uid()),
    'family.updated',
    'household',
    p_household_id,
    'success',
    'web',
    jsonb_build_object(
      'statusChanged', existing_status <> p_status,
      'addressReviewed', true
    )
  );
end;
$$;

create or replace function public.update_family_adult(
  p_household_id uuid,
  p_person_id uuid,
  p_first_name text,
  p_preferred_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_relationship_label text,
  p_is_responsible_adult boolean,
  p_is_primary_contact boolean,
  p_receive_email boolean,
  p_receive_sms boolean,
  p_receive_emergency_notifications boolean
)
returns void
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  normalized_first_name text;
  normalized_last_name text;
  normalized_email text;
  normalized_relationship text;
begin
  if not private.has_role(
    array[
      'platform_administrator',
      'youth_pastor',
      'staff_member'
    ]::public.account_role[]
  ) then
    raise exception 'Family contact updates are denied.'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.household_memberships
    where household_id = p_household_id
      and person_id = p_person_id
  ) then
    raise exception 'Family contact was not found.'
      using errcode = '22023';
  end if;

  normalized_first_name := btrim(coalesce(p_first_name, ''));
  normalized_last_name := btrim(coalesce(p_last_name, ''));
  normalized_email := nullif(lower(btrim(coalesce(p_email, ''))), '');
  normalized_relationship := btrim(coalesce(p_relationship_label, ''));

  if length(normalized_first_name) not between 1 and 100
    or length(normalized_last_name) not between 1 and 100
    or length(normalized_relationship) not between 1 and 80
    or (
      normalized_email is not null
      and (
        length(normalized_email) not between 3 and 320
        or position('@' in normalized_email) <= 1
      )
    ) then
    raise exception 'Family contact details are invalid.'
      using errcode = '22023';
  end if;

  update public.people
  set
    first_name = normalized_first_name,
    preferred_name = nullif(btrim(coalesce(p_preferred_name, '')), ''),
    last_name = normalized_last_name,
    email = normalized_email,
    phone = nullif(btrim(coalesce(p_phone, '')), '')
  where id = p_person_id;

  if p_is_primary_contact then
    update public.household_memberships
    set is_primary_contact = false
    where household_id = p_household_id
      and person_id <> p_person_id
      and is_primary_contact;
  end if;

  update public.household_memberships
  set
    relationship_label = normalized_relationship,
    is_responsible_adult = p_is_responsible_adult,
    is_primary_contact = p_is_primary_contact,
    receive_email = p_receive_email,
    receive_sms = p_receive_sms,
    receive_emergency_notifications = p_receive_emergency_notifications
  where household_id = p_household_id
    and person_id = p_person_id;

  insert into public.audit_events (
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    result,
    source,
    metadata
  )
  values (
    (select auth.uid()),
    'family.contact_updated',
    'person',
    p_person_id,
    'success',
    'web',
    jsonb_build_object(
      'householdId', p_household_id,
      'communicationPreferencesReviewed', true,
      'primaryContact', p_is_primary_contact
    )
  );
end;
$$;

create or replace function public.add_family_adult(
  p_household_id uuid,
  p_first_name text,
  p_preferred_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_relationship_label text,
  p_is_responsible_adult boolean,
  p_is_primary_contact boolean,
  p_receive_email boolean,
  p_receive_sms boolean,
  p_receive_emergency_notifications boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  new_person_id uuid;
  normalized_email text;
begin
  if not private.has_role(
    array[
      'platform_administrator',
      'youth_pastor',
      'staff_member'
    ]::public.account_role[]
  ) then
    raise exception 'Family contact creation is denied.'
      using errcode = '42501';
  end if;

  normalized_email := nullif(lower(btrim(coalesce(p_email, ''))), '');

  if not exists (
      select 1 from public.households where id = p_household_id
    )
    or length(btrim(coalesce(p_first_name, ''))) not between 1 and 100
    or length(btrim(coalesce(p_last_name, ''))) not between 1 and 100
    or length(btrim(coalesce(p_relationship_label, ''))) not between 1 and 80
    or (
      normalized_email is null
      and nullif(btrim(coalesce(p_phone, '')), '') is null
    ) then
    raise exception 'New family contact details are invalid.'
      using errcode = '22023';
  end if;

  insert into public.people (
    first_name,
    preferred_name,
    last_name,
    email,
    phone
  )
  values (
    btrim(p_first_name),
    nullif(btrim(coalesce(p_preferred_name, '')), ''),
    btrim(p_last_name),
    normalized_email,
    nullif(btrim(coalesce(p_phone, '')), '')
  )
  returning id into new_person_id;

  if p_is_primary_contact then
    update public.household_memberships
    set is_primary_contact = false
    where household_id = p_household_id
      and is_primary_contact;
  end if;

  insert into public.household_memberships (
    household_id,
    person_id,
    relationship_label,
    is_responsible_adult,
    is_primary_contact,
    receive_email,
    receive_sms,
    receive_emergency_notifications
  )
  values (
    p_household_id,
    new_person_id,
    btrim(p_relationship_label),
    p_is_responsible_adult,
    p_is_primary_contact,
    p_receive_email,
    p_receive_sms,
    p_receive_emergency_notifications
  );

  insert into public.audit_events (
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    result,
    source,
    metadata
  )
  values (
    (select auth.uid()),
    'family.contact_created',
    'person',
    new_person_id,
    'success',
    'web',
    jsonb_build_object(
      'householdId', p_household_id,
      'responsibleAdult', p_is_responsible_adult,
      'primaryContact', p_is_primary_contact
    )
  );

  return new_person_id;
end;
$$;

create or replace function public.get_child_workspace(
  p_student_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
declare
  can_manage boolean;
  can_view_medical boolean;
  workspace jsonb;
begin
  if p_student_id is null
    or not private.can_view_student(p_student_id) then
    raise exception 'Child access is denied.'
      using errcode = '42501';
  end if;

  can_manage := private.has_role(
    array[
      'platform_administrator',
      'youth_pastor',
      'staff_member'
    ]::public.account_role[]
  );

  can_view_medical := can_manage or exists (
    select 1
    from public.profiles
    join public.student_relationships
      on student_relationships.person_id = profiles.person_id
    where profiles.id = (select auth.uid())
      and profiles.status = 'active'
      and student_relationships.student_id = p_student_id
      and student_relationships.is_legal_guardian
      and student_relationships.may_view_student_information
  );

  select jsonb_build_object(
    'id', students.id,
    'personId', people.id,
    'displayName',
      coalesce(
        nullif(btrim(people.preferred_name), ''),
        btrim(people.first_name)
      ) || ' ' || left(btrim(people.last_name), 1) || '.',
    'firstName', case when can_manage then people.first_name else null end,
    'preferredName',
      case when can_manage then people.preferred_name else null end,
    'lastName', case when can_manage then people.last_name else null end,
    'birthDate', students.birth_date,
    'grade', students.grade,
    'status', students.status,
    'householdId', households.id,
    'householdName', households.name,
    'canManage', can_manage,
    'canViewMedical', can_view_medical,
    'medicalSummary',
      case when can_view_medical then students.medical_summary else null end,
    'allergySummary',
      case when can_view_medical then students.allergy_summary else null end,
    'dietarySummary',
      case when can_view_medical then students.dietary_summary else null end,
    'relationships', case
      when can_manage then coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'personId', people.id,
              'displayName',
                coalesce(
                  nullif(btrim(people.preferred_name), ''),
                  btrim(people.first_name)
                ) || ' ' || btrim(people.last_name),
              'relationshipType',
                student_relationships.relationship_type,
              'isLegalGuardian',
                student_relationships.is_legal_guardian,
              'isEmergencyContact',
                student_relationships.is_emergency_contact,
              'isAuthorizedPickup',
                student_relationships.is_authorized_pickup,
              'maySignPermissionForms',
                student_relationships.may_sign_permission_forms,
              'mayViewStudentInformation',
                student_relationships.may_view_student_information,
              'receiveEmail', student_relationships.receive_email,
              'receiveSms', student_relationships.receive_sms
            )
            order by lower(people.last_name), lower(people.first_name)
          )
          from public.student_relationships
          join public.people
            on people.id = student_relationships.person_id
          where student_relationships.student_id = students.id
        ),
        '[]'::jsonb
      )
      else '[]'::jsonb
    end,
    'tags', case
      when can_manage then coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', member_tags.id,
              'name', member_tags.name,
              'color', member_tags.color
            )
            order by member_tags.name
          )
          from public.member_tag_assignments
          join public.member_tags
            on member_tags.id = member_tag_assignments.tag_id
          where member_tag_assignments.person_id = people.id
        ),
        '[]'::jsonb
      )
      else '[]'::jsonb
    end
  )
  into workspace
  from public.students
  join public.people
    on people.id = students.person_id
  join public.households
    on households.id = students.primary_household_id
  where students.id = p_student_id;

  if workspace is null then
    raise exception 'Child was not found.'
      using errcode = '22023';
  end if;

  return workspace;
end;
$$;

create or replace function public.update_child_details(
  p_student_id uuid,
  p_first_name text,
  p_preferred_name text,
  p_last_name text,
  p_birth_date date,
  p_grade text,
  p_status public.student_status,
  p_medical_summary text,
  p_allergy_summary text,
  p_dietary_summary text
)
returns void
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  target_person_id uuid;
  existing_status public.student_status;
begin
  if not private.has_role(
    array[
      'platform_administrator',
      'youth_pastor',
      'staff_member'
    ]::public.account_role[]
  ) then
    raise exception 'Child updates are denied.'
      using errcode = '42501';
  end if;

  if p_birth_date is null or p_birth_date > current_date
    or length(btrim(coalesce(p_first_name, ''))) not between 1 and 100
    or length(btrim(coalesce(p_last_name, ''))) not between 1 and 100
    or length(btrim(coalesce(p_grade, ''))) not between 1 and 40 then
    raise exception 'Child details are invalid.'
      using errcode = '22023';
  end if;

  select person_id, status
  into target_person_id, existing_status
  from public.students
  where id = p_student_id
  for update;

  if target_person_id is null then
    raise exception 'Child was not found.'
      using errcode = '22023';
  end if;

  update public.people
  set
    first_name = btrim(p_first_name),
    preferred_name = nullif(btrim(coalesce(p_preferred_name, '')), ''),
    last_name = btrim(p_last_name)
  where id = target_person_id;

  update public.students
  set
    birth_date = p_birth_date,
    grade = btrim(p_grade),
    status = p_status,
    medical_summary = nullif(btrim(coalesce(p_medical_summary, '')), ''),
    allergy_summary = nullif(btrim(coalesce(p_allergy_summary, '')), ''),
    dietary_summary = nullif(btrim(coalesce(p_dietary_summary, '')), ''),
    archived_at = case
      when p_status = 'archived' and existing_status <> 'archived' then now()
      when p_status <> 'archived' then null
      else archived_at
    end
  where id = p_student_id;

  insert into public.audit_events (
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    result,
    source,
    metadata
  )
  values (
    (select auth.uid()),
    'child.updated',
    'student',
    p_student_id,
    'success',
    'web',
    jsonb_build_object(
      'statusChanged', existing_status <> p_status,
      'medicalInformationReviewed', true
    )
  );
end;
$$;

create or replace function public.update_child_relationship(
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
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
begin
  if not private.has_role(
    array[
      'platform_administrator',
      'youth_pastor',
      'staff_member'
    ]::public.account_role[]
  ) then
    raise exception 'Relationship updates are denied.'
      using errcode = '42501';
  end if;

  if length(btrim(coalesce(p_relationship_type, ''))) not between 1 and 80
    or not exists (
      select 1
      from public.student_relationships
      where student_id = p_student_id
        and person_id = p_person_id
    ) then
    raise exception 'Child relationship is invalid.'
      using errcode = '22023';
  end if;

  update public.student_relationships
  set
    relationship_type = btrim(p_relationship_type),
    is_legal_guardian = p_is_legal_guardian,
    is_emergency_contact = p_is_emergency_contact,
    is_authorized_pickup = p_is_authorized_pickup,
    may_sign_permission_forms = p_may_sign_permission_forms,
    may_view_student_information = p_may_view_student_information,
    receive_email = p_receive_email,
    receive_sms = p_receive_sms
  where student_id = p_student_id
    and person_id = p_person_id;

  insert into public.audit_events (
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    result,
    source,
    metadata
  )
  values (
    (select auth.uid()),
    'child.relationship_updated',
    'student',
    p_student_id,
    'success',
    'web',
    jsonb_build_object(
      'relatedPersonId', p_person_id,
      'permissionsReviewed', true
    )
  );
end;
$$;

create or replace function public.create_family(
  p_name text,
  p_status public.household_status,
  p_address_line_1 text,
  p_address_line_2 text,
  p_city text,
  p_region text,
  p_postal_code text,
  p_country_code text,
  p_adult_first_name text,
  p_adult_preferred_name text,
  p_adult_last_name text,
  p_adult_email text,
  p_adult_phone text,
  p_relationship_label text,
  p_receive_email boolean,
  p_receive_sms boolean,
  p_receive_emergency_notifications boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  new_household_id uuid;
  new_person_id uuid;
  normalized_email text;
begin
  if not private.has_role(
    array[
      'platform_administrator',
      'youth_pastor',
      'staff_member'
    ]::public.account_role[]
  ) then
    raise exception 'Family creation is denied.'
      using errcode = '42501';
  end if;

  normalized_email := nullif(lower(btrim(coalesce(p_adult_email, ''))), '');

  if length(btrim(coalesce(p_name, ''))) not between 1 and 150
    or length(btrim(coalesce(p_adult_first_name, ''))) not between 1 and 100
    or length(btrim(coalesce(p_adult_last_name, ''))) not between 1 and 100
    or length(btrim(coalesce(p_relationship_label, ''))) not between 1 and 80
    or (
      normalized_email is null
      and nullif(btrim(coalesce(p_adult_phone, '')), '') is null
    )
    or upper(btrim(coalesce(p_country_code, ''))) !~ '^[A-Z]{2}$' then
    raise exception 'New family details are invalid.'
      using errcode = '22023';
  end if;

  insert into public.households (
    name,
    status,
    address_line_1,
    address_line_2,
    city,
    region,
    postal_code,
    country_code,
    archived_at
  )
  values (
    btrim(p_name),
    p_status,
    nullif(btrim(coalesce(p_address_line_1, '')), ''),
    nullif(btrim(coalesce(p_address_line_2, '')), ''),
    nullif(btrim(coalesce(p_city, '')), ''),
    nullif(btrim(coalesce(p_region, '')), ''),
    nullif(btrim(coalesce(p_postal_code, '')), ''),
    upper(btrim(p_country_code)),
    case when p_status = 'archived' then now() else null end
  )
  returning id into new_household_id;

  insert into public.people (
    first_name,
    preferred_name,
    last_name,
    email,
    phone
  )
  values (
    btrim(p_adult_first_name),
    nullif(btrim(coalesce(p_adult_preferred_name, '')), ''),
    btrim(p_adult_last_name),
    normalized_email,
    nullif(btrim(coalesce(p_adult_phone, '')), '')
  )
  returning id into new_person_id;

  insert into public.household_memberships (
    household_id,
    person_id,
    relationship_label,
    is_responsible_adult,
    is_primary_contact,
    receive_email,
    receive_sms,
    receive_emergency_notifications
  )
  values (
    new_household_id,
    new_person_id,
    btrim(p_relationship_label),
    true,
    true,
    p_receive_email,
    p_receive_sms,
    p_receive_emergency_notifications
  );

  insert into public.audit_events (
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    result,
    source,
    metadata
  )
  values (
    (select auth.uid()),
    'family.created',
    'household',
    new_household_id,
    'success',
    'web',
    jsonb_build_object('responsibleAdultCreated', true)
  );

  return new_household_id;
end;
$$;

create or replace function public.create_child(
  p_household_id uuid,
  p_guardian_person_id uuid,
  p_first_name text,
  p_preferred_name text,
  p_last_name text,
  p_birth_date date,
  p_grade text,
  p_status public.student_status,
  p_medical_summary text,
  p_allergy_summary text,
  p_dietary_summary text
)
returns uuid
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  new_person_id uuid;
  new_student_id uuid;
  guardian_relationship text;
begin
  if not private.has_role(
    array[
      'platform_administrator',
      'youth_pastor',
      'staff_member'
    ]::public.account_role[]
  ) then
    raise exception 'Child creation is denied.'
      using errcode = '42501';
  end if;

  select relationship_label
  into guardian_relationship
  from public.household_memberships
  where household_id = p_household_id
    and person_id = p_guardian_person_id
    and is_responsible_adult;

  if guardian_relationship is null
    or p_birth_date is null
    or p_birth_date > current_date
    or length(btrim(coalesce(p_first_name, ''))) not between 1 and 100
    or length(btrim(coalesce(p_last_name, ''))) not between 1 and 100
    or length(btrim(coalesce(p_grade, ''))) not between 1 and 40 then
    raise exception 'New child details are invalid.'
      using errcode = '22023';
  end if;

  insert into public.people (
    first_name,
    preferred_name,
    last_name
  )
  values (
    btrim(p_first_name),
    nullif(btrim(coalesce(p_preferred_name, '')), ''),
    btrim(p_last_name)
  )
  returning id into new_person_id;

  insert into public.students (
    person_id,
    primary_household_id,
    birth_date,
    grade,
    status,
    medical_summary,
    allergy_summary,
    dietary_summary,
    archived_at
  )
  values (
    new_person_id,
    p_household_id,
    p_birth_date,
    btrim(p_grade),
    p_status,
    nullif(btrim(coalesce(p_medical_summary, '')), ''),
    nullif(btrim(coalesce(p_allergy_summary, '')), ''),
    nullif(btrim(coalesce(p_dietary_summary, '')), ''),
    case when p_status = 'archived' then now() else null end
  )
  returning id into new_student_id;

  insert into public.student_relationships (
    student_id,
    person_id,
    relationship_type,
    is_legal_guardian,
    is_emergency_contact,
    is_authorized_pickup,
    may_sign_permission_forms,
    may_view_student_information,
    receive_email,
    receive_sms
  )
  values (
    new_student_id,
    p_guardian_person_id,
    guardian_relationship,
    true,
    true,
    true,
    true,
    true,
    true,
    true
  );

  insert into public.audit_events (
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    result,
    source,
    metadata
  )
  values (
    (select auth.uid()),
    'child.created',
    'student',
    new_student_id,
    'success',
    'web',
    jsonb_build_object(
      'householdId', p_household_id,
      'guardianRelationshipCreated', true
    )
  );

  return new_student_id;
end;
$$;

create or replace function public.create_member_tag(
  p_name text,
  p_color text
)
returns uuid
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  new_tag_id uuid;
begin
  if not private.has_role(
    array[
      'platform_administrator',
      'youth_pastor',
      'staff_member'
    ]::public.account_role[]
  ) then
    raise exception 'Tag creation is denied.'
      using errcode = '42501';
  end if;

  if length(btrim(coalesce(p_name, ''))) not between 1 and 60
    or coalesce(p_color, '') !~ '^#[0-9A-Fa-f]{6}$' then
    raise exception 'Tag details are invalid.'
      using errcode = '22023';
  end if;

  insert into public.member_tags (name, color)
  values (btrim(p_name), upper(p_color))
  returning id into new_tag_id;

  insert into public.audit_events (
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    result,
    source,
    metadata
  )
  values (
    (select auth.uid()),
    'member_tag.created',
    'member_tag',
    new_tag_id,
    'success',
    'web',
    '{}'::jsonb
  );

  return new_tag_id;
end;
$$;

create or replace function public.set_child_tags(
  p_student_id uuid,
  p_tag_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  target_person_id uuid;
  normalized_tag_ids uuid[];
begin
  if not private.has_role(
    array[
      'platform_administrator',
      'youth_pastor',
      'staff_member'
    ]::public.account_role[]
  ) then
    raise exception 'Tag assignment is denied.'
      using errcode = '42501';
  end if;

  select person_id into target_person_id
  from public.students
  where id = p_student_id;

  if target_person_id is null then
    raise exception 'Child was not found.'
      using errcode = '22023';
  end if;

  select coalesce(array_agg(distinct tag_id), array[]::uuid[])
  into normalized_tag_ids
  from unnest(coalesce(p_tag_ids, array[]::uuid[])) as tag_id;

  if exists (
    select 1
    from unnest(normalized_tag_ids) as requested_tag_id
    where not exists (
      select 1
      from public.member_tags
      where id = requested_tag_id
    )
  ) then
    raise exception 'One or more tags are invalid.'
      using errcode = '22023';
  end if;

  delete from public.member_tag_assignments
  where person_id = target_person_id
    and tag_id <> all(normalized_tag_ids);

  insert into public.member_tag_assignments (person_id, tag_id)
  select target_person_id, tag_id
  from unnest(normalized_tag_ids) as tag_id
  on conflict (person_id, tag_id) do nothing;

  insert into public.audit_events (
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    result,
    source,
    metadata
  )
  values (
    (select auth.uid()),
    'child.tags_updated',
    'student',
    p_student_id,
    'success',
    'web',
    jsonb_build_object('tagCount', cardinality(normalized_tag_ids))
  );
end;
$$;

revoke insert, update, delete on table public.member_tags from authenticated;
revoke insert, update, delete on table public.member_tag_assignments
  from authenticated;

revoke insert, update, delete on table public.people from authenticated;
revoke insert, update, delete on table public.households from authenticated;
revoke insert, update, delete on table public.household_memberships
  from authenticated;
revoke insert, update, delete on table public.students from authenticated;
revoke insert, update, delete on table public.student_relationships
  from authenticated;

revoke all on function public.list_member_directory(
  text,
  public.student_status,
  text,
  uuid
) from public, anon;
revoke all on function public.list_accessible_families(text)
  from public, anon;
revoke all on function public.get_family_workspace(uuid)
  from public, anon;
revoke all on function public.update_family_details(
  uuid,
  text,
  public.household_status,
  text,
  text,
  text,
  text,
  text,
  text
) from public, anon;
revoke all on function public.update_family_adult(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean
) from public, anon;
revoke all on function public.add_family_adult(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean
) from public, anon;
revoke all on function public.get_child_workspace(uuid)
  from public, anon;
revoke all on function public.update_child_details(
  uuid,
  text,
  text,
  text,
  date,
  text,
  public.student_status,
  text,
  text,
  text
) from public, anon;
revoke all on function public.update_child_relationship(
  uuid,
  uuid,
  text,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean
) from public, anon;
revoke all on function public.create_family(
  text,
  public.household_status,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  boolean,
  boolean
) from public, anon;
revoke all on function public.create_child(
  uuid,
  uuid,
  text,
  text,
  text,
  date,
  text,
  public.student_status,
  text,
  text,
  text
) from public, anon;
revoke all on function public.create_member_tag(text, text)
  from public, anon;
revoke all on function public.set_child_tags(uuid, uuid[])
  from public, anon;

grant execute on function public.list_member_directory(
  text,
  public.student_status,
  text,
  uuid
) to authenticated;
grant execute on function public.list_accessible_families(text)
  to authenticated;
grant execute on function public.get_family_workspace(uuid)
  to authenticated;
grant execute on function public.update_family_details(
  uuid,
  text,
  public.household_status,
  text,
  text,
  text,
  text,
  text,
  text
) to authenticated;
grant execute on function public.update_family_adult(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean
) to authenticated;
grant execute on function public.add_family_adult(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean
) to authenticated;
grant execute on function public.get_child_workspace(uuid)
  to authenticated;
grant execute on function public.update_child_details(
  uuid,
  text,
  text,
  text,
  date,
  text,
  public.student_status,
  text,
  text,
  text
) to authenticated;
grant execute on function public.update_child_relationship(
  uuid,
  uuid,
  text,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean
) to authenticated;
grant execute on function public.create_family(
  text,
  public.household_status,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  boolean,
  boolean
) to authenticated;
grant execute on function public.create_child(
  uuid,
  uuid,
  text,
  text,
  text,
  date,
  text,
  public.student_status,
  text,
  text,
  text
) to authenticated;
grant execute on function public.create_member_tag(text, text)
  to authenticated;
grant execute on function public.set_child_tags(uuid, uuid[])
  to authenticated;

commit;
