begin;

create type public.communication_channel as enum (
  'in_app',
  'email',
  'sms'
);

create type public.communication_status as enum (
  'draft',
  'scheduled',
  'sending',
  'delivered',
  'failed',
  'cancelled'
);

create type public.communication_audience_type as enum (
  'ministry',
  'parents',
  'volunteers',
  'household',
  'event',
  'individual'
);

create type public.communication_delivery_status as enum (
  'pending',
  'sent',
  'delivered',
  'failed',
  'suppressed'
);

create table public.communication_templates (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 150),
  channel public.communication_channel not null,
  subject text check (
    subject is null or length(btrim(subject)) between 1 and 200
  ),
  message_body text not null
    check (length(btrim(message_body)) between 1 and 10000),
  archived_at timestamp with time zone,
  created_by_profile_id uuid not null
    references public.profiles(id) on delete restrict,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.communications (
  id uuid primary key default extensions.gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 200),
  subject text check (
    subject is null or length(btrim(subject)) between 1 and 200
  ),
  message_body text not null
    check (length(btrim(message_body)) between 1 and 10000),
  channel public.communication_channel not null,
  audience_type public.communication_audience_type not null,
  status public.communication_status not null default 'draft',
  template_id uuid references public.communication_templates(id)
    on delete restrict,
  event_id uuid references public.events(id) on delete restrict,
  household_id uuid references public.households(id) on delete restrict,
  scheduled_for timestamp with time zone,
  sent_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  failure_reason text check (
    failure_reason is null
    or length(btrim(failure_reason)) between 1 and 1000
  ),
  synthetic_delivery boolean not null default true,
  created_by_profile_id uuid not null
    references public.profiles(id) on delete restrict,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint communications_schedule_check check (
    status <> 'scheduled' or scheduled_for is not null
  ),
  constraint communications_cancelled_check check (
    (status = 'cancelled' and cancelled_at is not null)
    or (status <> 'cancelled' and cancelled_at is null)
  ),
  constraint communications_failed_check check (
    status <> 'failed' or failure_reason is not null
  ),
  constraint communications_provider_safety_check check (
    synthetic_delivery
  )
);

create table public.communication_recipients (
  id uuid primary key default extensions.gen_random_uuid(),
  communication_id uuid not null references public.communications(id)
    on delete restrict,
  recipient_profile_id uuid references public.profiles(id)
    on delete restrict,
  household_id uuid references public.households(id) on delete restrict,
  display_name text not null
    check (length(btrim(display_name)) between 1 and 150),
  destination_masked text check (
    destination_masked is null
    or length(btrim(destination_masked)) between 1 and 255
  ),
  preference_authorized boolean not null,
  suppression_reason text check (
    suppression_reason is null
    or length(btrim(suppression_reason)) between 1 and 500
  ),
  created_at timestamp with time zone not null default now(),
  constraint communication_recipients_suppression_check check (
    preference_authorized or suppression_reason is not null
  ),
  constraint communication_recipients_unique
    unique (communication_id, recipient_profile_id)
);

create table public.communication_deliveries (
  id uuid primary key default extensions.gen_random_uuid(),
  communication_recipient_id uuid not null
    references public.communication_recipients(id) on delete restrict,
  status public.communication_delivery_status not null default 'pending',
  provider_reference text check (
    provider_reference is null
    or length(btrim(provider_reference)) between 1 and 255
  ),
  failure_reason text check (
    failure_reason is null
    or length(btrim(failure_reason)) between 1 and 1000
  ),
  attempted_at timestamp with time zone,
  delivered_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint communication_deliveries_failed_check check (
    status <> 'failed' or failure_reason is not null
  ),
  constraint communication_deliveries_delivered_check check (
    status <> 'delivered' or delivered_at is not null
  )
);

create table public.announcements (
  id uuid primary key default extensions.gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 200),
  message_body text not null
    check (length(btrim(message_body)) between 1 and 10000),
  audience_type public.communication_audience_type not null,
  published_at timestamp with time zone,
  expires_at timestamp with time zone,
  archived_at timestamp with time zone,
  created_by_profile_id uuid not null
    references public.profiles(id) on delete restrict,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint announcements_expiration_check check (
    expires_at is null
    or published_at is null
    or expires_at > published_at
  )
);

create table public.in_app_notifications (
  id uuid primary key default extensions.gen_random_uuid(),
  recipient_profile_id uuid not null references public.profiles(id)
    on delete restrict,
  communication_id uuid references public.communications(id)
    on delete restrict,
  announcement_id uuid references public.announcements(id)
    on delete restrict,
  title text not null check (length(btrim(title)) between 1 and 200),
  message_body text not null
    check (length(btrim(message_body)) between 1 and 10000),
  read_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  constraint in_app_notifications_source_check check (
    num_nonnulls(communication_id, announcement_id) = 1
  )
);

create index communications_status_created_idx
  on public.communications (status, created_at desc);
create index communications_audience_idx
  on public.communications (audience_type, created_at desc);
create index communication_recipients_message_idx
  on public.communication_recipients (communication_id);
create index communication_deliveries_recipient_idx
  on public.communication_deliveries (communication_recipient_id);
create index announcements_published_idx
  on public.announcements (published_at desc, expires_at);
create index in_app_notifications_recipient_idx
  on public.in_app_notifications
  (recipient_profile_id, read_at, created_at desc);

alter table public.communication_templates enable row level security;
alter table public.communication_templates force row level security;
alter table public.communications enable row level security;
alter table public.communications force row level security;
alter table public.communication_recipients enable row level security;
alter table public.communication_recipients force row level security;
alter table public.communication_deliveries enable row level security;
alter table public.communication_deliveries force row level security;
alter table public.announcements enable row level security;
alter table public.announcements force row level security;
alter table public.in_app_notifications enable row level security;
alter table public.in_app_notifications force row level security;

revoke all on table public.communication_templates
  from public, anon, authenticated;
revoke all on table public.communications
  from public, anon, authenticated;
revoke all on table public.communication_recipients
  from public, anon, authenticated;
revoke all on table public.communication_deliveries
  from public, anon, authenticated;
revoke all on table public.announcements
  from public, anon, authenticated;
revoke all on table public.in_app_notifications
  from public, anon, authenticated;

create or replace function private.can_manage_communications()
returns boolean
language sql stable security definer
set search_path = '' set row_security = off
as $$
  select private.current_profile_is_active()
    and private.has_role(array[
      'platform_administrator',
      'youth_pastor',
      'staff_member'
    ]::public.account_role[])
$$;

create or replace function private.can_read_own_notifications(
  target_profile_id uuid
)
returns boolean
language sql stable security definer
set search_path = '' set row_security = off
as $$
  select private.current_profile_is_active()
    and target_profile_id = auth.uid()
$$;

revoke all on function private.can_manage_communications()
  from public, anon, authenticated;
revoke all on function private.can_read_own_notifications(uuid)
  from public, anon, authenticated;
grant execute on function private.can_manage_communications()
  to authenticated;
grant execute on function private.can_read_own_notifications(uuid)
  to authenticated;

comment on table public.communication_deliveries is
  'Provider-safe Milestone 11 delivery history; development delivery remains synthetic.';
comment on column public.communications.synthetic_delivery is
  'Milestone 11 safety gate. Real provider delivery requires later explicit approval.';

commit;
