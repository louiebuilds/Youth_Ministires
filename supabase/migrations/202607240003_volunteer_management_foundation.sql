begin;

create type public.background_check_status as enum (
  'not_required',
  'pending',
  'cleared',
  'review_required',
  'expired'
);

create type public.volunteer_certification_status as enum (
  'active',
  'expired',
  'revoked'
);

create type public.volunteer_skill_level as enum (
  'interested',
  'beginner',
  'proficient',
  'advanced'
);

create table public.volunteer_profiles (
  profile_id uuid primary key
    references public.profiles(id) on delete restrict,
  ministry_title text check (
    ministry_title is null
    or length(btrim(ministry_title)) between 1 and 100
  ),
  background_check_status public.background_check_status
    not null default 'pending',
  background_check_completed_at date,
  background_check_expires_at date,
  background_check_reference text check (
    background_check_reference is null
    or length(btrim(background_check_reference)) between 1 and 100
  ),
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint volunteer_profiles_background_check_dates_check check (
    background_check_completed_at is null
    or background_check_expires_at is null
    or background_check_expires_at >= background_check_completed_at
  )
);

create table public.volunteer_certifications (
  id uuid primary key default extensions.gen_random_uuid(),
  profile_id uuid not null
    references public.volunteer_profiles(profile_id) on delete restrict,
  name text not null check (length(btrim(name)) between 1 and 100),
  issuer text check (
    issuer is null or length(btrim(issuer)) between 1 and 100
  ),
  issued_at date,
  expires_at date,
  status public.volunteer_certification_status not null default 'active',
  reference text check (
    reference is null or length(btrim(reference)) between 1 and 100
  ),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint volunteer_certifications_dates_check check (
    issued_at is null or expires_at is null or expires_at >= issued_at
  )
);

create table public.volunteer_skills (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 60),
  description text check (
    description is null or length(btrim(description)) between 1 and 300
  ),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint volunteer_skills_name_key unique (name)
);

create table public.volunteer_skill_assignments (
  id uuid primary key default extensions.gen_random_uuid(),
  profile_id uuid not null
    references public.volunteer_profiles(profile_id) on delete restrict,
  skill_id uuid not null
    references public.volunteer_skills(id) on delete restrict,
  skill_level public.volunteer_skill_level not null default 'interested',
  notes text check (
    notes is null or length(btrim(notes)) between 1 and 500
  ),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint volunteer_skill_assignments_profile_skill_key
    unique (profile_id, skill_id)
);

create table public.volunteer_availability (
  id uuid primary key default extensions.gen_random_uuid(),
  profile_id uuid not null
    references public.volunteer_profiles(profile_id) on delete restrict,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  starts_at time without time zone not null,
  ends_at time without time zone not null,
  timezone text not null default 'America/Chicago' check (
    length(btrim(timezone)) between 1 and 100
  ),
  effective_from date not null default current_date,
  effective_until date,
  notes text check (
    notes is null or length(btrim(notes)) between 1 and 500
  ),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint volunteer_availability_time_check check (ends_at > starts_at),
  constraint volunteer_availability_dates_check check (
    effective_until is null or effective_until >= effective_from
  ),
  constraint volunteer_availability_window_key unique (
    profile_id,
    day_of_week,
    starts_at,
    ends_at,
    effective_from
  )
);

create index volunteer_certifications_profile_id_idx
  on public.volunteer_certifications (profile_id);
create index volunteer_skill_assignments_profile_id_idx
  on public.volunteer_skill_assignments (profile_id);
create index volunteer_skill_assignments_skill_id_idx
  on public.volunteer_skill_assignments (skill_id);
create index volunteer_availability_profile_id_idx
  on public.volunteer_availability (profile_id);

create trigger volunteer_profiles_set_updated_at
before update on public.volunteer_profiles
for each row execute function public.set_updated_at();

create trigger volunteer_certifications_set_updated_at
before update on public.volunteer_certifications
for each row execute function public.set_updated_at();

create trigger volunteer_skills_set_updated_at
before update on public.volunteer_skills
for each row execute function public.set_updated_at();

create trigger volunteer_skill_assignments_set_updated_at
before update on public.volunteer_skill_assignments
for each row execute function public.set_updated_at();

create trigger volunteer_availability_set_updated_at
before update on public.volunteer_availability
for each row execute function public.set_updated_at();

alter table public.volunteer_profiles enable row level security;
alter table public.volunteer_profiles force row level security;
alter table public.volunteer_certifications enable row level security;
alter table public.volunteer_certifications force row level security;
alter table public.volunteer_skills enable row level security;
alter table public.volunteer_skills force row level security;
alter table public.volunteer_skill_assignments enable row level security;
alter table public.volunteer_skill_assignments force row level security;
alter table public.volunteer_availability enable row level security;
alter table public.volunteer_availability force row level security;

revoke all on table public.volunteer_profiles from anon, authenticated;
revoke all on table public.volunteer_certifications from anon, authenticated;
revoke all on table public.volunteer_skills from anon, authenticated;
revoke all on table public.volunteer_skill_assignments from anon, authenticated;
revoke all on table public.volunteer_availability from anon, authenticated;

grant select on table public.volunteer_profiles to authenticated;
grant select on table public.volunteer_certifications to authenticated;
grant select on table public.volunteer_skills to authenticated;
grant select on table public.volunteer_skill_assignments to authenticated;
grant select on table public.volunteer_availability to authenticated;

create policy volunteer_profiles_read_authorized
on public.volunteer_profiles
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

create policy volunteer_certifications_read_authorized
on public.volunteer_certifications
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

create policy volunteer_skills_read_authorized
on public.volunteer_skills
for select
to authenticated
using (
  private.has_role(
    array[
      'platform_administrator',
      'youth_pastor',
      'staff_member',
      'volunteer'
    ]::public.account_role[]
  )
  or exists (
    select 1
    from public.volunteer_profiles
    where volunteer_profiles.profile_id = (select auth.uid())
  )
);

create policy volunteer_skill_assignments_read_authorized
on public.volunteer_skill_assignments
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

create policy volunteer_availability_read_authorized
on public.volunteer_availability
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

comment on column public.volunteer_profiles.background_check_reference is
  'Non-sensitive provider reference only. Never store reports, identity documents, or government identifiers.';

commit;
