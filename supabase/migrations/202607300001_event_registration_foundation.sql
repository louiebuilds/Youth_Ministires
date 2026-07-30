begin;

create type public.event_registration_status as enum (
  'draft',
  'registered',
  'waitlisted',
  'confirmed',
  'cancelled',
  'completed'
);

alter table public.events
  add column registration_opens_at timestamp with time zone,
  add column registration_closes_at timestamp with time zone,
  add column waitlist_capacity integer
    check (waitlist_capacity is null or waitlist_capacity >= 0),
  add constraint events_registration_window_check check (
    registration_opens_at is null
    or registration_closes_at is null
    or registration_closes_at > registration_opens_at
  );

create table public.event_registrations (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null
    references public.events(id) on delete restrict,
  household_id uuid not null
    references public.households(id) on delete restrict,
  student_id uuid not null
    references public.students(id) on delete restrict,
  status public.event_registration_status not null default 'registered',
  waitlist_position bigint,
  notes text check (
    notes is null or length(btrim(notes)) between 1 and 2000
  ),
  created_by_profile_id uuid not null
    references public.profiles(id) on delete restrict,
  cancelled_at timestamp with time zone,
  cancelled_by_profile_id uuid
    references public.profiles(id) on delete restrict,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint event_registrations_event_student_key
    unique (event_id, student_id),
  constraint event_registrations_waitlist_state_check check (
    (status = 'waitlisted' and waitlist_position is not null)
    or (status <> 'waitlisted' and waitlist_position is null)
  ),
  constraint event_registrations_cancelled_state_check check (
    (
      status = 'cancelled'
      and cancelled_at is not null
      and cancelled_by_profile_id is not null
    )
    or (
      status <> 'cancelled'
      and cancelled_at is null
      and cancelled_by_profile_id is null
    )
  )
);

comment on table public.event_registrations is
  'Milestone 9 event registrations. Records are retained for ministry history and must not be permanently deleted.';

create index event_registrations_event_status_idx
  on public.event_registrations (event_id, status, created_at);

create index event_registrations_household_idx
  on public.event_registrations (household_id, created_at desc);

create unique index event_registrations_waitlist_position_idx
  on public.event_registrations (event_id, waitlist_position)
  where status = 'waitlisted';

alter table public.event_registrations enable row level security;
alter table public.event_registrations force row level security;

revoke all on table public.event_registrations
  from public, anon, authenticated;

commit;
