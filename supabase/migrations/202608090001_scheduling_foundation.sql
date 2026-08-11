begin;

create type public.ministry_schedule_status as enum ('draft', 'published', 'cancelled', 'completed');
create type public.schedule_assignment_status as enum ('assigned', 'confirmed', 'declined', 'cancelled');
create type public.schedule_rotation_status as enum ('active', 'paused', 'ended');
create type public.schedule_recurrence_pattern as enum ('weekly', 'biweekly', 'monthly');

create or replace function private.can_manage_scheduling()
returns boolean language sql stable security definer
set search_path = '' set row_security = off
as $$ select private.has_role(array['platform_administrator','youth_pastor','staff_member']::public.account_role[]) $$;

create table public.ministry_schedules (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 200),
  ministry_context text check (ministry_context is null or length(btrim(ministry_context)) between 1 and 200),
  event_id uuid references public.events(id) on delete restrict,
  status public.ministry_schedule_status not null default 'draft',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null default 'America/Chicago' check (length(btrim(timezone)) between 1 and 100),
  notes text check (notes is null or length(notes) <= 4000),
  allow_unfilled_on_publish boolean not null default false,
  published_at timestamptz,
  cancelled_at timestamptz,
  completed_at timestamptz,
  rotation_id uuid,
  occurrence_date date,
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ministry_schedule_window_check check (ends_at > starts_at),
  constraint ministry_schedule_rotation_occurrence_key unique (rotation_id, occurrence_date)
);

create table public.schedule_locations (
  id uuid primary key default extensions.gen_random_uuid(),
  schedule_id uuid not null references public.ministry_schedules(id) on delete restrict,
  name text not null check (length(btrim(name)) between 1 and 150),
  notes text check (notes is null or length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (schedule_id, name),
  unique (id, schedule_id)
);

create table public.schedule_positions (
  id uuid primary key default extensions.gen_random_uuid(),
  schedule_id uuid not null references public.ministry_schedules(id) on delete restrict,
  location_id uuid,
  responsibility text not null check (length(btrim(responsibility)) between 1 and 150),
  required_count integer not null default 1 check (required_count between 1 and 50),
  starts_at timestamptz,
  ends_at timestamptz,
  notes text check (notes is null or length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_position_location_fk foreign key (location_id, schedule_id) references public.schedule_locations(id, schedule_id) on delete restrict,
  constraint schedule_position_window_check check ((starts_at is null) = (ends_at is null) and (starts_at is null or ends_at > starts_at)),
  unique (id, schedule_id)
);

create table public.schedule_assignments (
  id uuid primary key default extensions.gen_random_uuid(),
  schedule_id uuid not null references public.ministry_schedules(id) on delete restrict,
  position_id uuid not null,
  profile_id uuid not null references public.volunteer_profiles(profile_id) on delete restrict,
  location_id uuid,
  responsibility text not null check (length(btrim(responsibility)) between 1 and 150),
  status public.schedule_assignment_status not null default 'assigned',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  conflict_codes text[] not null default '{}',
  conflict_overridden boolean not null default false,
  override_reason text check (override_reason is null or length(btrim(override_reason)) between 1 and 1000),
  assigned_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  rotation_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_assignment_position_fk foreign key (position_id, schedule_id) references public.schedule_positions(id, schedule_id) on delete restrict,
  constraint schedule_assignment_location_fk foreign key (location_id, schedule_id) references public.schedule_locations(id, schedule_id) on delete restrict,
  constraint schedule_assignment_window_check check (ends_at > starts_at),
  constraint schedule_assignment_override_check check (not conflict_overridden or override_reason is not null)
);

create table public.schedule_rotations (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 200),
  recurrence_pattern public.schedule_recurrence_pattern not null,
  weekday smallint check (weekday is null or weekday between 0 and 6),
  monthly_ordinal smallint check (monthly_ordinal is null or monthly_ordinal between 1 and 5),
  starts_on date not null,
  ends_on date,
  starts_at time not null,
  ends_at time not null,
  timezone text not null default 'America/Chicago' check (length(btrim(timezone)) between 1 and 100),
  schedule_name text not null check (length(btrim(schedule_name)) between 1 and 200),
  ministry_context text,
  responsibility text not null check (length(btrim(responsibility)) between 1 and 150),
  location_name text,
  profile_id uuid references public.volunteer_profiles(profile_id) on delete restrict,
  status public.schedule_rotation_status not null default 'active',
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_rotation_window_check check (ends_at > starts_at),
  constraint schedule_rotation_dates_check check (ends_on is null or ends_on >= starts_on),
  constraint schedule_rotation_monthly_check check (recurrence_pattern <> 'monthly' or monthly_ordinal is not null)
);

alter table public.ministry_schedules add constraint ministry_schedule_rotation_fk foreign key (rotation_id) references public.schedule_rotations(id) on delete restrict;
alter table public.schedule_assignments add constraint schedule_assignment_rotation_fk foreign key (rotation_id) references public.schedule_rotations(id) on delete restrict;

create index ministry_schedules_window_idx on public.ministry_schedules(starts_at, ends_at);
create index schedule_positions_schedule_idx on public.schedule_positions(schedule_id);
create index schedule_assignments_profile_window_idx on public.schedule_assignments(profile_id, starts_at, ends_at) where status <> 'cancelled';
create index schedule_rotations_status_idx on public.schedule_rotations(status, starts_on);

create trigger ministry_schedules_set_updated_at before update on public.ministry_schedules for each row execute function public.set_updated_at();
create trigger schedule_locations_set_updated_at before update on public.schedule_locations for each row execute function public.set_updated_at();
create trigger schedule_positions_set_updated_at before update on public.schedule_positions for each row execute function public.set_updated_at();
create trigger schedule_assignments_set_updated_at before update on public.schedule_assignments for each row execute function public.set_updated_at();
create trigger schedule_rotations_set_updated_at before update on public.schedule_rotations for each row execute function public.set_updated_at();

alter table public.ministry_schedules enable row level security;
alter table public.schedule_locations enable row level security;
alter table public.schedule_positions enable row level security;
alter table public.schedule_assignments enable row level security;
alter table public.schedule_rotations enable row level security;
revoke all on public.ministry_schedules, public.schedule_locations, public.schedule_positions, public.schedule_assignments, public.schedule_rotations from public, anon, authenticated;
revoke all on function private.can_manage_scheduling() from public, anon, authenticated;

commit;
