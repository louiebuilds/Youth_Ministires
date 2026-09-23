begin;

create type public.visitor_card_source as enum ('staff','self_service');
create type public.visitor_card_status as enum (
  'new','under_review','possible_duplicate','linked_existing','conversion_started','converted','closed','archived'
);
create type public.visitor_card_review_action as enum (
  'review_started','duplicate_flagged','duplicate_cleared','closed','reopened','archived'
);
create type public.visitor_card_link_type as enum ('person','student','household','conversion');

create table public.visitor_cards (
  id uuid primary key default extensions.gen_random_uuid(),
  source public.visitor_card_source not null,
  event_id uuid references public.events(id) on delete restrict,
  visit_date date not null default current_date,
  youth_first_name text not null check(length(btrim(youth_first_name)) between 1 and 100),
  youth_last_name text not null check(length(btrim(youth_last_name)) between 1 and 100),
  guardian_name text check(guardian_name is null or length(btrim(guardian_name)) between 1 and 200),
  email text check(email is null or length(btrim(email)) between 3 and 320),
  phone text check(phone is null or length(btrim(phone)) between 3 and 40),
  grade_or_age_group text check(grade_or_age_group is null or length(btrim(grade_or_age_group)) between 1 and 80),
  invited_by text check(invited_by is null or length(btrim(invited_by)) between 1 and 200),
  how_heard text check(how_heard is null or length(btrim(how_heard)) between 1 and 300),
  follow_up_email boolean not null default false,follow_up_phone boolean not null default false,
  follow_up_notes text check(follow_up_notes is null or length(btrim(follow_up_notes)) between 1 and 2000),
  privacy_acknowledgment_version text check(
    privacy_acknowledgment_version is null or length(btrim(privacy_acknowledgment_version)) between 1 and 50
  ),
  privacy_acknowledged_at timestamptz,
  status public.visitor_card_status not null default 'new',
  submitted_by_profile_id uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  archived_at timestamptz,archived_by_profile_id uuid references public.profiles(id) on delete restrict,
  constraint visitor_cards_contact_check check(email is not null or phone is not null),
  constraint visitor_cards_source_check check (
    (source='staff' and submitted_by_profile_id is not null) or
    (source='self_service' and submitted_by_profile_id is null)
  ),
  constraint visitor_cards_privacy_acknowledgment_check check (
    (source='self_service' and privacy_acknowledgment_version is not null and privacy_acknowledged_at is not null)
    or (source='staff' and (
      (privacy_acknowledgment_version is null and privacy_acknowledged_at is null)
      or (privacy_acknowledgment_version is not null and privacy_acknowledged_at is not null)
    ))
  ),
  constraint visitor_cards_archive_check check (
    (status='archived' and archived_at is not null and archived_by_profile_id is not null)
    or (status<>'archived' and archived_at is null and archived_by_profile_id is null)
  )
);
create table public.visitor_card_review_events (
  id uuid primary key default extensions.gen_random_uuid(),
  visitor_card_id uuid not null references public.visitor_cards(id) on delete restrict,
  action public.visitor_card_review_action not null,
  actor_profile_id uuid not null references public.profiles(id) on delete restrict,
  reason text check(reason is null or length(btrim(reason)) between 5 and 1000),
  occurred_at timestamptz not null default now()
);
create table public.visitor_card_links (
  id uuid primary key default extensions.gen_random_uuid(),
  visitor_card_id uuid not null references public.visitor_cards(id) on delete restrict,
  link_type public.visitor_card_link_type not null,
  person_id uuid references public.people(id) on delete restrict,
  student_id uuid references public.students(id) on delete restrict,
  household_id uuid references public.households(id) on delete restrict,
  linked_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  link_reason text not null check(length(btrim(link_reason)) between 5 and 1000),
  linked_at timestamptz not null default now(),
  constraint visitor_card_links_target_check check (
    (link_type='person' and person_id is not null and student_id is null and household_id is null)
    or (link_type='student' and person_id is null and student_id is not null and household_id is null)
    or (link_type='household' and person_id is null and student_id is null and household_id is not null)
    or (link_type='conversion' and num_nonnulls(person_id,student_id,household_id)>=1)
  )
);
create table public.visitor_card_rate_limits (
  fingerprint_hash text not null check(fingerprint_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null default 1 check(request_count between 1 and 1000),
  expires_at timestamptz not null,
  primary key(fingerprint_hash,window_started_at),
  constraint visitor_card_rate_limits_expiry_check check(expires_at>window_started_at)
);

create or replace function private.validate_visitor_card_conversion_link()
returns trigger language plpgsql set search_path='' as $$ declare student_record record; begin
  if new.link_type='conversion' then
    if new.student_id is not null then
      select person_id,primary_household_id into student_record
      from public.students where id=new.student_id;
      if (new.person_id is not null and new.person_id is distinct from student_record.person_id)
        or (new.household_id is not null and new.household_id is distinct from student_record.primary_household_id) then
        raise exception 'Visitor conversion identifiers do not represent the same Student relationship.' using errcode='23514';
      end if;
    elsif new.person_id is not null and new.household_id is not null and not exists (
      select 1 from public.household_memberships memberships
      where memberships.person_id=new.person_id and memberships.household_id=new.household_id
    ) then
      raise exception 'Visitor conversion Person and Household are unrelated.' using errcode='23514';
    end if;
  end if;
  return new;
end $$;
create trigger visitor_card_links_relationship before insert or update on public.visitor_card_links
for each row execute function private.validate_visitor_card_conversion_link();

create index visitor_cards_status_visit_idx on public.visitor_cards(status,visit_date desc);
create index visitor_cards_email_idx on public.visitor_cards(lower(email)) where email is not null and archived_at is null;
create index visitor_cards_phone_idx on public.visitor_cards(phone) where phone is not null and archived_at is null;
create index visitor_card_review_events_card_idx on public.visitor_card_review_events(visitor_card_id,occurred_at desc);
create index visitor_card_links_card_idx on public.visitor_card_links(visitor_card_id,linked_at desc);
create index visitor_card_rate_limits_expiry_idx on public.visitor_card_rate_limits(expires_at);

create trigger visitor_cards_set_updated_at before update on public.visitor_cards
for each row execute function public.set_updated_at();

do $$ declare table_name text; begin foreach table_name in array array[
  'visitor_cards','visitor_card_review_events','visitor_card_links','visitor_card_rate_limits'
] loop execute format('alter table public.%I enable row level security',table_name);
  execute format('alter table public.%I force row level security',table_name);
  execute format('revoke all on table public.%I from public, anon, authenticated',table_name);
end loop; end $$;

comment on table public.visitor_cards is
  'Retained visitor intake records only. They contain no medical fields and never create or merge Member records automatically.';
comment on table public.visitor_card_rate_limits is
  'Server-managed anonymous intake rate-limit counters keyed only by a non-reversible server-generated fingerprint hash.';

commit;
