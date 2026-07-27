begin;

create type public.check_in_status as enum (
  'expected',
  'checked_in',
  'checked_out',
  'exception'
);

create type public.visitor_check_in_status as enum (
  'checked_in',
  'checked_out'
);

create table public.check_in_records (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete restrict,
  household_id uuid not null
    references public.households(id) on delete restrict,
  status public.check_in_status not null default 'expected',
  checked_in_at timestamp with time zone,
  checked_in_by_profile_id uuid
    references public.profiles(id) on delete set null,
  checked_out_at timestamp with time zone,
  checked_out_by_profile_id uuid
    references public.profiles(id) on delete set null,
  pickup_person_id uuid references public.people(id) on delete restrict,
  exception_reason text check (
    exception_reason is null
    or length(btrim(exception_reason)) between 1 and 1000
  ),
  override_by_profile_id uuid
    references public.profiles(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint check_in_records_event_student_key
    unique (event_id, student_id),
  constraint check_in_records_checkout_order_check check (
    checked_in_at is null
    or checked_out_at is null
    or checked_out_at >= checked_in_at
  ),
  constraint check_in_records_household_matches_student_check check (
    household_id is not null
  )
);

create table public.visitor_check_ins (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  first_name text not null check (
    length(btrim(first_name)) between 1 and 100
  ),
  last_name text not null check (
    length(btrim(last_name)) between 1 and 100
  ),
  grade text check (
    grade is null or length(btrim(grade)) between 1 and 40
  ),
  guardian_name text not null check (
    length(btrim(guardian_name)) between 1 and 200
  ),
  guardian_contact text not null check (
    length(btrim(guardian_contact)) between 3 and 320
  ),
  status public.visitor_check_in_status not null default 'checked_in',
  checked_in_at timestamp with time zone not null default now(),
  checked_in_by_profile_id uuid
    references public.profiles(id) on delete set null,
  checked_out_at timestamp with time zone,
  checked_out_by_profile_id uuid
    references public.profiles(id) on delete set null,
  converted_student_id uuid references public.students(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint visitor_check_ins_checkout_order_check check (
    checked_out_at is null or checked_out_at >= checked_in_at
  )
);

create table public.family_check_in_tokens (
  id uuid primary key default extensions.gen_random_uuid(),
  household_id uuid not null
    references public.households(id) on delete restrict,
  token_hash text not null unique check (
    token_hash ~ '^[0-9a-f]{64}$'
  ),
  expires_at timestamp with time zone not null,
  used_at timestamp with time zone,
  revoked_at timestamp with time zone,
  created_by_profile_id uuid
    references public.profiles(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  constraint family_check_in_tokens_expiry_check
    check (expires_at > created_at)
);

create index check_in_records_event_status_idx
  on public.check_in_records (event_id, status);
create index check_in_records_household_id_idx
  on public.check_in_records (household_id);
create index visitor_check_ins_event_status_idx
  on public.visitor_check_ins (event_id, status);
create index family_check_in_tokens_household_expiry_idx
  on public.family_check_in_tokens (household_id, expires_at desc);

create trigger check_in_records_set_updated_at
before update on public.check_in_records
for each row execute function public.set_updated_at();

create trigger visitor_check_ins_set_updated_at
before update on public.visitor_check_ins
for each row execute function public.set_updated_at();

alter table public.check_in_records enable row level security;
alter table public.check_in_records force row level security;
alter table public.visitor_check_ins enable row level security;
alter table public.visitor_check_ins force row level security;
alter table public.family_check_in_tokens enable row level security;
alter table public.family_check_in_tokens force row level security;

revoke all on table public.check_in_records from anon, authenticated;
revoke all on table public.visitor_check_ins from anon, authenticated;
revoke all on table public.family_check_in_tokens from anon, authenticated;

grant select on table public.check_in_records to authenticated;
grant select on table public.visitor_check_ins to authenticated;

create policy check_in_records_read_authorized
on public.check_in_records
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

create policy visitor_check_ins_read_authorized
on public.visitor_check_ins
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

comment on table public.family_check_in_tokens is
  'Short-lived hashed bearer tokens identify a household; they never authorize student release.';
comment on table public.visitor_check_ins is
  'Temporary visitor custody records. Conversion to a permanent student requires an explicit later workflow.';

commit;
