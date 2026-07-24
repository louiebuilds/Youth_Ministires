begin;

create extension if not exists pgcrypto with schema extensions;

create type public.account_role as enum (
  'platform_administrator',
  'youth_pastor',
  'staff_member',
  'volunteer',
  'parent'
);

create type public.account_status as enum (
  'invited',
  'active',
  'suspended',
  'disabled',
  'archived'
);

create type public.person_status as enum (
  'active',
  'inactive',
  'archived'
);

create type public.household_status as enum (
  'prospect',
  'active',
  'inactive',
  'archived'
);

create type public.student_status as enum (
  'prospective',
  'registered',
  'active',
  'inactive',
  'archived'
);

create type public.event_status as enum (
  'draft',
  'published',
  'active',
  'completed',
  'archived'
);

create type public.volunteer_assignment_status as enum (
  'assigned',
  'confirmed',
  'declined',
  'cancelled',
  'completed'
);

create type public.audit_result as enum (
  'success',
  'failure',
  'denied'
);

create type public.audit_source as enum (
  'web',
  'api',
  'system',
  'migration'
);

create table public.people (
  id uuid primary key default extensions.gen_random_uuid(),
  first_name text not null check (length(btrim(first_name)) between 1 and 100),
  preferred_name text check (
    preferred_name is null
    or length(btrim(preferred_name)) between 1 and 100
  ),
  last_name text not null check (length(btrim(last_name)) between 1 and 100),
  email text check (
    email is null
    or (
      email = lower(btrim(email))
      and length(email) between 3 and 320
      and position('@' in email) > 1
    )
  ),
  phone text check (
    phone is null
    or length(btrim(phone)) between 7 and 40
  ),
  status public.person_status not null default 'active',
  archived_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint people_archive_state_check check (
    (status = 'archived' and archived_at is not null)
    or (status <> 'archived' and archived_at is null)
  )
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  person_id uuid references public.people(id) on delete set null,
  primary_role public.account_role not null default 'parent',
  status public.account_status not null default 'active',
  display_name text not null check (
    length(btrim(display_name)) between 1 and 150
  ),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

comment on column public.profiles.primary_role is
  'The account permanent role. Temporary event service belongs in event_volunteer_assignments.';

create table public.households (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 150),
  status public.household_status not null default 'prospect',
  address_line_1 text check (
    address_line_1 is null
    or length(btrim(address_line_1)) between 1 and 200
  ),
  address_line_2 text check (
    address_line_2 is null
    or length(btrim(address_line_2)) between 1 and 200
  ),
  city text check (
    city is null
    or length(btrim(city)) between 1 and 100
  ),
  region text check (
    region is null
    or length(btrim(region)) between 1 and 100
  ),
  postal_code text check (
    postal_code is null
    or length(btrim(postal_code)) between 1 and 20
  ),
  country_code text not null default 'US' check (
    country_code = upper(country_code)
    and country_code ~ '^[A-Z]{2}$'
  ),
  archived_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint households_archive_state_check check (
    (status = 'archived' and archived_at is not null)
    or (status <> 'archived' and archived_at is null)
  )
);

create table public.household_memberships (
  id uuid primary key default extensions.gen_random_uuid(),
  household_id uuid not null
    references public.households(id) on delete restrict,
  person_id uuid not null
    references public.people(id) on delete restrict,
  relationship_label text not null check (
    length(btrim(relationship_label)) between 1 and 80
  ),
  is_responsible_adult boolean not null default false,
  is_primary_contact boolean not null default false,
  receive_email boolean not null default false,
  receive_sms boolean not null default false,
  receive_emergency_notifications boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint household_memberships_household_person_key
    unique (household_id, person_id)
);

create unique index household_memberships_one_primary_contact_idx
  on public.household_memberships (household_id)
  where is_primary_contact;

create table public.students (
  id uuid primary key default extensions.gen_random_uuid(),
  person_id uuid not null unique
    references public.people(id) on delete restrict,
  primary_household_id uuid not null
    references public.households(id) on delete restrict,
  birth_date date not null check (birth_date <= current_date),
  grade text not null check (length(btrim(grade)) between 1 and 40),
  status public.student_status not null default 'prospective',
  medical_summary text check (
    medical_summary is null
    or length(medical_summary) <= 4000
  ),
  allergy_summary text check (
    allergy_summary is null
    or length(allergy_summary) <= 4000
  ),
  dietary_summary text check (
    dietary_summary is null
    or length(dietary_summary) <= 2000
  ),
  archived_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint students_archive_state_check check (
    (status = 'archived' and archived_at is not null)
    or (status <> 'archived' and archived_at is null)
  )
);

create table public.student_relationships (
  id uuid primary key default extensions.gen_random_uuid(),
  student_id uuid not null
    references public.students(id) on delete restrict,
  person_id uuid not null
    references public.people(id) on delete restrict,
  relationship_type text not null check (
    length(btrim(relationship_type)) between 1 and 80
  ),
  is_legal_guardian boolean not null default false,
  is_emergency_contact boolean not null default false,
  is_authorized_pickup boolean not null default false,
  may_sign_permission_forms boolean not null default false,
  may_view_student_information boolean not null default false,
  receive_email boolean not null default false,
  receive_sms boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint student_relationships_student_person_key
    unique (student_id, person_id)
);

create table public.events (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 200),
  event_type text not null check (
    length(btrim(event_type)) between 1 and 100
  ),
  status public.event_status not null default 'draft',
  starts_at timestamp with time zone not null,
  ends_at timestamp with time zone not null,
  timezone text not null default 'America/Chicago' check (
    length(btrim(timezone)) between 1 and 100
  ),
  capacity integer check (capacity is null or capacity >= 0),
  archived_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint events_time_order_check check (ends_at > starts_at),
  constraint events_archive_state_check check (
    (status = 'archived' and archived_at is not null)
    or (status <> 'archived' and archived_at is null)
  )
);

create table public.event_volunteer_assignments (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null
    references public.events(id) on delete restrict,
  profile_id uuid not null
    references public.profiles(id) on delete restrict,
  assignment_role text not null check (
    length(btrim(assignment_role)) between 1 and 100
  ),
  status public.volunteer_assignment_status not null default 'assigned',
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  assigned_by_profile_id uuid
    references public.profiles(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint event_volunteer_assignments_time_order_check check (
    starts_at is null
    or ends_at is null
    or ends_at > starts_at
  ),
  constraint event_volunteer_assignments_event_profile_role_key
    unique (event_id, profile_id, assignment_role)
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  event_id uuid not null default extensions.gen_random_uuid() unique,
  occurred_at timestamp with time zone not null default now(),
  actor_profile_id uuid
    references public.profiles(id) on delete set null,
  action text not null check (action ~ '^[a-z][a-z0-9_.-]{2,99}$'),
  entity_type text not null check (
    entity_type ~ '^[a-z][a-z0-9_.-]{1,79}$'
  ),
  entity_id uuid,
  result public.audit_result not null,
  source public.audit_source not null,
  request_id text check (
    request_id is null
    or length(btrim(request_id)) between 1 and 150
  ),
  metadata jsonb not null default '{}'::jsonb check (
    jsonb_typeof(metadata) = 'object'
  )
);

create index profiles_person_id_idx
  on public.profiles (person_id);

create index people_name_idx
  on public.people (last_name, first_name);

create index people_active_email_idx
  on public.people (email)
  where email is not null and status <> 'archived';

create index household_memberships_person_id_idx
  on public.household_memberships (person_id);

create index households_name_idx
  on public.households (name);

create index students_primary_household_id_idx
  on public.students (primary_household_id);

create index students_status_grade_idx
  on public.students (status, grade);

create index student_relationships_person_id_idx
  on public.student_relationships (person_id);

create index events_status_starts_at_idx
  on public.events (status, starts_at);

create index event_volunteer_assignments_profile_id_idx
  on public.event_volunteer_assignments (profile_id);

create index audit_events_actor_occurred_at_idx
  on public.audit_events (actor_profile_id, occurred_at desc);

create index audit_events_entity_idx
  on public.audit_events (entity_type, entity_id, occurred_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger people_set_updated_at
before update on public.people
for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger households_set_updated_at
before update on public.households
for each row execute function public.set_updated_at();

create trigger household_memberships_set_updated_at
before update on public.household_memberships
for each row execute function public.set_updated_at();

create trigger students_set_updated_at
before update on public.students
for each row execute function public.set_updated_at();

create trigger student_relationships_set_updated_at
before update on public.student_relationships
for each row execute function public.set_updated_at();

create trigger events_set_updated_at
before update on public.events
for each row execute function public.set_updated_at();

create trigger event_volunteer_assignments_set_updated_at
before update on public.event_volunteer_assignments
for each row execute function public.set_updated_at();

create or replace function public.create_profile_for_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_display_name text;
begin
  requested_display_name := nullif(
    btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')),
    ''
  );

  insert into public.profiles (
    id,
    primary_role,
    status,
    display_name
  )
  values (
    new.id,
    'parent',
    'active',
    coalesce(requested_display_name, split_part(new.email, '@', 1), 'New user')
  );

  return new;
end;
$$;

comment on function public.create_profile_for_new_auth_user() is
  'Creates a least-privilege parent profile. Registration cannot self-assign a privileged role.';

insert into public.profiles (
  id,
  primary_role,
  status,
  display_name
)
select
  auth_user.id,
  'parent',
  'active',
  coalesce(
    nullif(
      btrim(coalesce(auth_user.raw_user_meta_data ->> 'display_name', '')),
      ''
    ),
    nullif(split_part(coalesce(auth_user.email, ''), '@', 1), ''),
    'Existing user'
  )
from auth.users as auth_user
on conflict (id) do nothing;

create trigger create_profile_after_auth_user
after insert on auth.users
for each row execute function public.create_profile_for_new_auth_user();

alter table public.people enable row level security;
alter table public.people force row level security;
alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.households enable row level security;
alter table public.households force row level security;
alter table public.household_memberships enable row level security;
alter table public.household_memberships force row level security;
alter table public.students enable row level security;
alter table public.students force row level security;
alter table public.student_relationships enable row level security;
alter table public.student_relationships force row level security;
alter table public.events enable row level security;
alter table public.events force row level security;
alter table public.event_volunteer_assignments enable row level security;
alter table public.event_volunteer_assignments force row level security;
alter table public.audit_events enable row level security;
alter table public.audit_events force row level security;

revoke all on table public.people from anon, authenticated;
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.households from anon, authenticated;
revoke all on table public.household_memberships from anon, authenticated;
revoke all on table public.students from anon, authenticated;
revoke all on table public.student_relationships from anon, authenticated;
revoke all on table public.events from anon, authenticated;
revoke all on table public.event_volunteer_assignments from anon, authenticated;
revoke all on table public.audit_events from anon, authenticated;
revoke all on sequence public.audit_events_id_seq from anon, authenticated;

grant select on table public.profiles to authenticated;

create policy profiles_read_own
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.create_profile_for_new_auth_user()
  from public, anon, authenticated;

commit;
