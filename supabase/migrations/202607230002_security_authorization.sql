begin;

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.current_profile_is_active()
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and status = 'active'
  )
$$;

create or replace function private.current_profile_role()
returns public.account_role
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select primary_role
  from public.profiles
  where id = (select auth.uid())
    and status = 'active'
$$;

create or replace function private.has_role(
  allowed_roles public.account_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select coalesce(
    (
      select primary_role = any(allowed_roles)
      from public.profiles
      where id = (select auth.uid())
        and status = 'active'
    ),
    false
  )
$$;

create or replace function private.can_view_student(
  requested_student_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select
    private.has_role(
      array[
        'platform_administrator',
        'youth_pastor',
        'staff_member'
      ]::public.account_role[]
    )
    or exists (
      select 1
      from public.profiles
      join public.student_relationships
        on student_relationships.person_id = profiles.person_id
      where profiles.id = (select auth.uid())
        and profiles.status = 'active'
        and profiles.primary_role = 'parent'
        and student_relationships.student_id = requested_student_id
        and student_relationships.may_view_student_information
    )
$$;

create or replace function private.can_view_household(
  requested_household_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select
    private.has_role(
      array[
        'platform_administrator',
        'youth_pastor',
        'staff_member'
      ]::public.account_role[]
    )
    or exists (
      select 1
      from public.profiles
      join public.household_memberships
        on household_memberships.person_id = profiles.person_id
      where profiles.id = (select auth.uid())
        and profiles.status = 'active'
        and profiles.primary_role = 'parent'
        and household_memberships.household_id = requested_household_id
    )
    or exists (
      select 1
      from public.profiles
      join public.student_relationships
        on student_relationships.person_id = profiles.person_id
      join public.students
        on students.id = student_relationships.student_id
      where profiles.id = (select auth.uid())
        and profiles.status = 'active'
        and profiles.primary_role = 'parent'
        and student_relationships.may_view_student_information
        and students.primary_household_id = requested_household_id
    )
$$;

create or replace function private.can_view_person(
  requested_person_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select
    private.has_role(
      array[
        'platform_administrator',
        'youth_pastor',
        'staff_member'
      ]::public.account_role[]
    )
    or exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.status = 'active'
        and profiles.primary_role = 'parent'
        and profiles.person_id = requested_person_id
    )
    or exists (
      select 1
      from public.profiles
      join public.household_memberships own_membership
        on own_membership.person_id = profiles.person_id
      join public.household_memberships related_membership
        on related_membership.household_id = own_membership.household_id
      where profiles.id = (select auth.uid())
        and profiles.status = 'active'
        and profiles.primary_role = 'parent'
        and related_membership.person_id = requested_person_id
    )
    or exists (
      select 1
      from public.profiles
      join public.student_relationships
        on student_relationships.person_id = profiles.person_id
      join public.students
        on students.id = student_relationships.student_id
      where profiles.id = (select auth.uid())
        and profiles.status = 'active'
        and profiles.primary_role = 'parent'
        and student_relationships.may_view_student_information
        and students.person_id = requested_person_id
    )
$$;

create or replace function private.is_assigned_to_event(
  requested_event_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select exists (
    select 1
    from public.profiles
    join public.event_volunteer_assignments
      on event_volunteer_assignments.profile_id = profiles.id
    where profiles.id = (select auth.uid())
      and profiles.status = 'active'
      and event_volunteer_assignments.event_id = requested_event_id
      and event_volunteer_assignments.status in (
        'assigned',
        'confirmed',
        'completed'
      )
  )
$$;

revoke all on function private.current_profile_is_active()
  from public, anon, authenticated;
revoke all on function private.current_profile_role()
  from public, anon, authenticated;
revoke all on function private.has_role(public.account_role[])
  from public, anon, authenticated;
revoke all on function private.can_view_student(uuid)
  from public, anon, authenticated;
revoke all on function private.can_view_household(uuid)
  from public, anon, authenticated;
revoke all on function private.can_view_person(uuid)
  from public, anon, authenticated;
revoke all on function private.is_assigned_to_event(uuid)
  from public, anon, authenticated;

grant execute on function private.current_profile_is_active()
  to authenticated;
grant execute on function private.current_profile_role()
  to authenticated;
grant execute on function private.has_role(public.account_role[])
  to authenticated;
grant execute on function private.can_view_student(uuid)
  to authenticated;
grant execute on function private.can_view_household(uuid)
  to authenticated;
grant execute on function private.can_view_person(uuid)
  to authenticated;
grant execute on function private.is_assigned_to_event(uuid)
  to authenticated;

grant select on table public.people to authenticated;
grant select on table public.households to authenticated;
grant select on table public.household_memberships to authenticated;
grant select on table public.students to authenticated;
grant select on table public.student_relationships to authenticated;
grant select on table public.events to authenticated;
grant select on table public.event_volunteer_assignments to authenticated;
grant select on table public.audit_events to authenticated;

grant insert, update, delete on table public.people to authenticated;
grant insert, update, delete on table public.households to authenticated;
grant insert, update, delete on table public.household_memberships
  to authenticated;
grant insert, update, delete on table public.students to authenticated;
grant insert, update, delete on table public.student_relationships
  to authenticated;
grant insert, update, delete on table public.events to authenticated;
grant insert, update, delete on table public.event_volunteer_assignments
  to authenticated;

create policy profiles_read_active_authorized
on public.profiles
for select
to authenticated
using (
  private.current_profile_is_active()
  and (
    id = (select auth.uid())
    or private.has_role(
      array[
        'platform_administrator',
        'youth_pastor',
        'staff_member'
      ]::public.account_role[]
    )
  )
);

drop policy profiles_read_own on public.profiles;

grant insert, update, delete on table public.profiles to authenticated;

create policy profiles_admin_insert
on public.profiles
for insert
to authenticated
with check (
  private.has_role(
    array['platform_administrator']::public.account_role[]
  )
);

create policy profiles_admin_update
on public.profiles
for update
to authenticated
using (
  private.has_role(
    array['platform_administrator']::public.account_role[]
  )
)
with check (
  private.has_role(
    array['platform_administrator']::public.account_role[]
  )
);

create policy profiles_admin_delete
on public.profiles
for delete
to authenticated
using (
  private.has_role(
    array['platform_administrator']::public.account_role[]
  )
);

create policy people_read_authorized
on public.people
for select
to authenticated
using (private.can_view_person(id));

create policy people_manage_ministry
on public.people
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

create policy households_read_authorized
on public.households
for select
to authenticated
using (private.can_view_household(id));

create policy households_manage_ministry
on public.households
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

create policy household_memberships_read_authorized
on public.household_memberships
for select
to authenticated
using (private.can_view_household(household_id));

create policy household_memberships_manage_ministry
on public.household_memberships
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

create policy students_read_authorized
on public.students
for select
to authenticated
using (private.can_view_student(id));

create policy students_manage_ministry
on public.students
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

create policy student_relationships_read_authorized
on public.student_relationships
for select
to authenticated
using (private.can_view_student(student_id));

create policy student_relationships_manage_ministry
on public.student_relationships
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

create policy events_read_authorized
on public.events
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
  or (
    private.has_role(array['parent']::public.account_role[])
    and status in ('published', 'active')
  )
  or private.is_assigned_to_event(id)
);

create policy events_manage_ministry
on public.events
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

create policy event_assignments_read_authorized
on public.event_volunteer_assignments
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
  or (
    private.current_profile_is_active()
    and profile_id = (select auth.uid())
  )
);

create policy event_assignments_manage_ministry
on public.event_volunteer_assignments
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

create policy audit_events_read_oversight
on public.audit_events
for select
to authenticated
using (
  private.has_role(
    array[
      'platform_administrator',
      'youth_pastor'
    ]::public.account_role[]
  )
);

commit;
