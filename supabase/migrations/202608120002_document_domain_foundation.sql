begin;

create type public.document_kind as enum ('permission_slip','medical_release');
create type public.document_template_status as enum ('draft','active','archived');
create type public.document_template_version_status as enum ('draft','published','retired');
create type public.document_validity_policy as enum ('event_specific','fixed_interval','explicit_expiration');
create type public.document_upload_source as enum ('parent','staff');
create type public.document_digital_status as enum ('missing','uploaded','accepted','needs_replacement');
create type public.document_lifecycle_status as enum (
  'digital_received','paper_required','under_review','complete','rejected','expired','superseded','archived'
);
create type public.paper_evidence_action as enum ('confirmed_on_file','confirmation_revoked');
create type public.document_review_action as enum (
  'accepted','rejected','replacement_requested','medical_verified','medical_verification_revoked'
);

create table public.document_templates (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check(length(btrim(name)) between 1 and 200),
  description text check(description is null or length(btrim(description)) between 1 and 2000),
  document_kind public.document_kind not null,
  status public.document_template_status not null default 'draft',
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  archived_at timestamptz, archived_by_profile_id uuid references public.profiles(id) on delete restrict,
  constraint document_templates_archive_check check (
    (status='archived' and archived_at is not null and archived_by_profile_id is not null)
    or (status<>'archived' and archived_at is null and archived_by_profile_id is null)
  )
);

create table public.document_template_versions (
  id uuid primary key default extensions.gen_random_uuid(),
  template_id uuid not null references public.document_templates(id) on delete restrict,
  version_number integer not null check(version_number>0),
  status public.document_template_version_status not null default 'draft',
  validity_policy public.document_validity_policy not null,
  valid_for interval, explicit_expires_on date,
  effective_from date, effective_to date,
  blank_storage_bucket text,
  blank_storage_object_path text,
  original_file_name text check(original_file_name is null or length(btrim(original_file_name)) between 1 and 255),
  content_type text check(content_type is null or content_type='application/pdf'),
  file_size_bytes bigint check(file_size_bytes is null or file_size_bytes between 1 and 15728640),
  checksum_sha256 text check(checksum_sha256 is null or checksum_sha256 ~ '^[0-9a-f]{64}$'),
  published_at timestamptz,published_by_profile_id uuid references public.profiles(id) on delete restrict,
  supersedes_version_id uuid references public.document_template_versions(id) on delete restrict,
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique(template_id,version_number), unique(id,template_id),
  constraint document_template_versions_validity_check check (
    (validity_policy='fixed_interval' and valid_for is not null and explicit_expires_on is null)
    or (validity_policy='explicit_expiration' and explicit_expires_on is not null and valid_for is null)
    or (validity_policy='event_specific' and valid_for is null and explicit_expires_on is null)
  ),
  constraint document_template_versions_effective_check check(effective_to is null or effective_from is null or effective_to>=effective_from),
  constraint document_template_versions_publish_check check (
    (status='draft' and published_at is null and published_by_profile_id is null)
    or (status in ('published','retired') and published_at is not null and published_by_profile_id is not null
      and blank_storage_bucket is not null and blank_storage_object_path is not null
      and original_file_name is not null and content_type='application/pdf' and file_size_bytes is not null)
  ),
  constraint document_template_versions_not_self_superseding check(supersedes_version_id is null or supersedes_version_id<>id)
);

create table public.student_document_submissions (
  id uuid primary key default extensions.gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  household_id uuid not null references public.households(id) on delete restrict,
  template_version_id uuid not null references public.document_template_versions(id) on delete restrict,
  upload_source public.document_upload_source not null,
  submitted_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  storage_bucket text,storage_object_path text,
  original_file_name text check(original_file_name is null or length(btrim(original_file_name)) between 1 and 255),
  content_type text check(content_type is null or content_type in ('application/pdf','image/jpeg','image/png')),
  file_size_bytes bigint check(file_size_bytes is null or file_size_bytes between 1 and 20971520),
  checksum_sha256 text check(checksum_sha256 is null or checksum_sha256 ~ '^[0-9a-f]{64}$'),
  digital_status public.document_digital_status not null default 'missing',
  lifecycle_status public.document_lifecycle_status not null default 'digital_received',
  valid_from date,expires_on date,
  supersedes_submission_id uuid references public.student_document_submissions(id) on delete restrict,
  superseded_at timestamptz,
  created_at timestamptz not null default now(),
  archived_at timestamptz,archived_by_profile_id uuid references public.profiles(id) on delete restrict,
  constraint student_document_submissions_validity_check check(expires_on is null or valid_from is null or expires_on>=valid_from),
  constraint student_document_submissions_not_self_superseding check(supersedes_submission_id is null or supersedes_submission_id<>id),
  constraint student_document_submissions_superseded_check check (
    (lifecycle_status='superseded' and superseded_at is not null) or
    (lifecycle_status<>'superseded' and superseded_at is null)
  ),
  constraint student_document_submissions_archive_check check (
    (lifecycle_status='archived' and archived_at is not null and archived_by_profile_id is not null)
    or (lifecycle_status<>'archived' and archived_at is null and archived_by_profile_id is null)
  )
);

create table public.document_paper_evidence_events (
  id uuid primary key default extensions.gen_random_uuid(),
  submission_id uuid not null references public.student_document_submissions(id) on delete restrict,
  action public.paper_evidence_action not null,
  actor_profile_id uuid not null references public.profiles(id) on delete restrict,
  reason text check(reason is null or length(btrim(reason)) between 5 and 1000),
  occurred_at timestamptz not null default now()
);
create table public.document_review_events (
  id uuid primary key default extensions.gen_random_uuid(),
  submission_id uuid not null references public.student_document_submissions(id) on delete restrict,
  action public.document_review_action not null,
  actor_profile_id uuid not null references public.profiles(id) on delete restrict,
  reason text check(reason is null or length(btrim(reason)) between 5 and 1000),
  occurred_at timestamptz not null default now()
);

create table public.event_document_requirements (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  template_id uuid not null references public.document_templates(id) on delete restrict,
  template_version_id uuid not null,
  required boolean not null default true,blocks_participation boolean not null default true,
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),archived_at timestamptz,
  archived_by_profile_id uuid references public.profiles(id) on delete restrict,
  foreign key(template_version_id,template_id) references public.document_template_versions(id,template_id) on delete restrict,
  unique(event_id,template_id),
  constraint event_document_requirements_archive_check check (
    (archived_at is null and archived_by_profile_id is null) or
    (archived_at is not null and archived_by_profile_id is not null)
  )
);

create table public.event_participation_overrides (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  registration_id uuid not null references public.event_registrations(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete restrict,
  reason text not null check(length(btrim(reason)) between 5 and 2000),
  unmet_requirement_ids uuid[] not null check(cardinality(unmet_requirement_ids)>0),
  evidence jsonb not null default '{}'::jsonb check(jsonb_typeof(evidence)='object' and pg_column_size(evidence)<=16384),
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),expires_at timestamptz,
  revoked_at timestamptz,revoked_by_profile_id uuid references public.profiles(id) on delete restrict,
  revocation_reason text check(revocation_reason is null or length(btrim(revocation_reason)) between 5 and 1000),
  constraint event_participation_overrides_expiry_check check(expires_at is null or expires_at>created_at),
  constraint event_participation_overrides_revocation_check check (
    (revoked_at is null and revoked_by_profile_id is null and revocation_reason is null) or
    (revoked_at is not null and revoked_by_profile_id is not null and revocation_reason is not null)
  )
);

create or replace function private.prevent_published_document_version_change()
returns trigger language plpgsql set search_path='' as $$ begin
  if old.status in ('published','retired') and (
    tg_op='DELETE' or
    to_jsonb(new)-'status' is distinct from to_jsonb(old)-'status' or
    not (old.status='published' and new.status='retired')
  ) then
    raise exception 'Published document versions are immutable.' using errcode='55000';
  end if; return new;
end $$;
create trigger document_template_versions_immutable before update or delete on public.document_template_versions
for each row execute function private.prevent_published_document_version_change();

create or replace function private.validate_document_submission_supersession()
returns trigger language plpgsql set search_path='' as $$ declare prior record; has_cycle boolean; begin
  if not exists (
    select 1 from public.students
    where id=new.student_id and primary_household_id=new.household_id
  ) then
    raise exception 'Document submission student and household do not match.' using errcode='23514';
  end if;
  if tg_op='UPDATE' and new.supersedes_submission_id is distinct from old.supersedes_submission_id then
    raise exception 'A submission supersession link is immutable.' using errcode='55000';
  end if;
  if new.supersedes_submission_id is not null then
    select student_id,template_version_id,lifecycle_status,superseded_at into prior from public.student_document_submissions
      where id=new.supersedes_submission_id;
    if prior.student_id is distinct from new.student_id or prior.template_version_id is distinct from new.template_version_id then
      raise exception 'Submission replacements must preserve student and template version.' using errcode='23514';
    end if;
    if prior.lifecycle_status is distinct from 'superseded' or prior.superseded_at is null then
      raise exception 'The prior submission must be marked superseded in the retained replacement transaction.' using errcode='23514';
    end if;
    with recursive chain(id,supersedes_submission_id) as (
      select id,supersedes_submission_id from public.student_document_submissions where id=new.supersedes_submission_id
      union all
      select submissions.id,submissions.supersedes_submission_id
      from public.student_document_submissions submissions join chain on submissions.id=chain.supersedes_submission_id
    ) select exists(select 1 from chain where id=new.id) into has_cycle;
    if has_cycle then raise exception 'Submission supersession cycles are forbidden.' using errcode='23514'; end if;
  end if; return new;
end $$;
create trigger student_document_submissions_supersession before insert or update on public.student_document_submissions
for each row execute function private.validate_document_submission_supersession();

create or replace function private.validate_document_submission_chain_lifecycle()
returns trigger language plpgsql set search_path='' as $$ declare has_replacement boolean; begin
  select exists(select 1 from public.student_document_submissions where supersedes_submission_id=new.id)
    into has_replacement;
  if (new.lifecycle_status='superseded') is distinct from has_replacement then
    raise exception 'Submission lifecycle must agree with its retained replacement chain.' using errcode='23514';
  end if;
  return null;
end $$;
create constraint trigger student_document_submissions_chain_lifecycle
after insert or update on public.student_document_submissions
deferrable initially deferred for each row
execute function private.validate_document_submission_chain_lifecycle();

create or replace function private.validate_participation_override_scope()
returns trigger language plpgsql set search_path='' as $$ declare selected record; requirement_count integer; begin
  select event_id,student_id into selected from public.event_registrations where id=new.registration_id;
  if selected.event_id is distinct from new.event_id or selected.student_id is distinct from new.student_id then
    raise exception 'Participation override must match its Event Registration and student.' using errcode='23514';
  end if;
  if cardinality(new.unmet_requirement_ids) is distinct from (
    select count(distinct requirement_id) from unnest(new.unmet_requirement_ids) requirement_id
  ) then
    raise exception 'Participation override requirement identifiers must be unique.' using errcode='23514';
  end if;
  select count(*) into requirement_count from public.event_document_requirements requirements
  where requirements.id=any(new.unmet_requirement_ids)
    and requirements.event_id=new.event_id and requirements.archived_at is null;
  if requirement_count<>cardinality(new.unmet_requirement_ids) then
    raise exception 'Participation override requirements must be active requirements for the same Event.' using errcode='23514';
  end if;
  return new;
end $$;
create trigger event_participation_overrides_scope before insert or update on public.event_participation_overrides
for each row execute function private.validate_participation_override_scope();

create index document_template_versions_template_idx on public.document_template_versions(template_id,version_number desc);
create index student_document_submissions_student_idx on public.student_document_submissions(student_id,template_version_id,created_at desc);
create index student_document_submissions_household_idx on public.student_document_submissions(household_id,expires_on);
create unique index student_document_submissions_single_replacement_idx
  on public.student_document_submissions(supersedes_submission_id)
  where supersedes_submission_id is not null;
create index document_paper_events_submission_idx on public.document_paper_evidence_events(submission_id,occurred_at desc);
create index document_review_events_submission_idx on public.document_review_events(submission_id,occurred_at desc);
create index event_document_requirements_event_idx on public.event_document_requirements(event_id) where archived_at is null;
create index event_participation_overrides_event_student_idx on public.event_participation_overrides(event_id,student_id,created_at desc);

do $$ declare table_name text; begin foreach table_name in array array[
  'document_templates','document_template_versions','student_document_submissions',
  'document_paper_evidence_events','document_review_events','event_document_requirements',
  'event_participation_overrides'
] loop execute format('alter table public.%I enable row level security',table_name);
  execute format('alter table public.%I force row level security',table_name);
  execute format('revoke all on table public.%I from public, anon, authenticated',table_name);
end loop; end $$;

commit;
