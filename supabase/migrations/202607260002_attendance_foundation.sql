begin;

create type public.attendance_status as enum (
  'pending',
  'present',
  'absent',
  'excused'
);

create table public.attendance_sessions (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  session_date date not null,
  class_name text not null check (
    length(btrim(class_name)) between 1 and 100
  ),
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  finalized_at timestamp with time zone,
  finalized_by_profile_id uuid
    references public.profiles(id) on delete set null,
  created_by_profile_id uuid
    references public.profiles(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint attendance_sessions_time_order_check check (
    starts_at is null or ends_at is null or ends_at > starts_at
  ),
  constraint attendance_sessions_event_date_class_key
    unique (event_id, session_date, class_name)
);

create table public.attendance_records (
  id uuid primary key default extensions.gen_random_uuid(),
  session_id uuid not null
    references public.attendance_sessions(id) on delete restrict,
  student_id uuid not null
    references public.students(id) on delete restrict,
  status public.attendance_status not null default 'pending',
  notes text check (
    notes is null or length(btrim(notes)) between 1 and 1000
  ),
  recorded_by_profile_id uuid
    references public.profiles(id) on delete set null,
  corrected_at timestamp with time zone,
  corrected_by_profile_id uuid
    references public.profiles(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint attendance_records_session_student_key
    unique (session_id, student_id)
);

create index attendance_sessions_event_date_idx
  on public.attendance_sessions (event_id, session_date);
create index attendance_records_student_id_idx
  on public.attendance_records (student_id);
create index attendance_records_session_status_idx
  on public.attendance_records (session_id, status);

create trigger attendance_sessions_set_updated_at
before update on public.attendance_sessions
for each row execute function public.set_updated_at();

create trigger attendance_records_set_updated_at
before update on public.attendance_records
for each row execute function public.set_updated_at();

alter table public.attendance_sessions enable row level security;
alter table public.attendance_sessions force row level security;
alter table public.attendance_records enable row level security;
alter table public.attendance_records force row level security;

revoke all on table public.attendance_sessions from anon, authenticated;
revoke all on table public.attendance_records from anon, authenticated;
grant select on table public.attendance_sessions to authenticated;
grant select on table public.attendance_records to authenticated;

create policy attendance_sessions_read_authorized
on public.attendance_sessions
for select
to authenticated
using (
  private.has_role(array[
    'platform_administrator',
    'youth_pastor',
    'staff_member'
  ]::public.account_role[])
  or (
    private.current_profile_is_active()
    and private.is_assigned_to_event(event_id)
  )
);

create policy attendance_records_read_authorized
on public.attendance_records
for select
to authenticated
using (
  exists (
    select 1
    from public.attendance_sessions
    where attendance_sessions.id = attendance_records.session_id
  )
);

comment on table public.attendance_sessions is
  'An attendance occurrence or class roster tied to an existing event.';
comment on column public.attendance_records.corrected_at is
  'Set by audited correction workflows; original changes remain in audit_events.';

commit;
