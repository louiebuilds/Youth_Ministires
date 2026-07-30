begin;

create type public.curriculum_status as enum (
  'draft',
  'published',
  'completed',
  'archived'
);

create type public.lesson_status as enum (
  'draft',
  'published',
  'archived'
);

create type public.teaching_resource_type as enum (
  'document',
  'pdf',
  'video',
  'link',
  'other'
);

create table public.curriculum_plans (
  id uuid primary key default extensions.gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 200),
  summary text check (
    summary is null or length(btrim(summary)) between 1 and 4000
  ),
  audience text check (
    audience is null or length(btrim(audience)) between 1 and 150
  ),
  status public.curriculum_status not null default 'draft',
  starts_on date,
  ends_on date,
  archived_at timestamp with time zone,
  created_by_profile_id uuid not null
    references public.profiles(id) on delete restrict,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint curriculum_plans_date_order_check check (
    starts_on is null or ends_on is null or ends_on >= starts_on
  ),
  constraint curriculum_plans_archive_state_check check (
    (status = 'archived' and archived_at is not null)
    or (status <> 'archived' and archived_at is null)
  )
);

create table public.lessons (
  id uuid primary key default extensions.gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 200),
  summary text check (
    summary is null or length(btrim(summary)) between 1 and 4000
  ),
  teaching_objective text check (
    teaching_objective is null
    or length(btrim(teaching_objective)) between 1 and 2000
  ),
  scripture_references text check (
    scripture_references is null
    or length(btrim(scripture_references)) between 1 and 1000
  ),
  lesson_body text check (
    lesson_body is null or length(btrim(lesson_body)) between 1 and 50000
  ),
  discussion_guide text check (
    discussion_guide is null
    or length(btrim(discussion_guide)) between 1 and 20000
  ),
  preparation_notes text check (
    preparation_notes is null
    or length(btrim(preparation_notes)) between 1 and 10000
  ),
  audience text check (
    audience is null or length(btrim(audience)) between 1 and 150
  ),
  status public.lesson_status not null default 'draft',
  archived_at timestamp with time zone,
  created_by_profile_id uuid not null
    references public.profiles(id) on delete restrict,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint lessons_archive_state_check check (
    (status = 'archived' and archived_at is not null)
    or (status <> 'archived' and archived_at is null)
  )
);

create table public.curriculum_plan_lessons (
  id uuid primary key default extensions.gen_random_uuid(),
  curriculum_plan_id uuid not null
    references public.curriculum_plans(id) on delete restrict,
  lesson_id uuid not null references public.lessons(id) on delete restrict,
  sequence_number integer not null check (sequence_number > 0),
  created_by_profile_id uuid not null
    references public.profiles(id) on delete restrict,
  created_at timestamp with time zone not null default now(),
  constraint curriculum_plan_lessons_plan_lesson_key
    unique (curriculum_plan_id, lesson_id),
  constraint curriculum_plan_lessons_plan_sequence_key
    unique (curriculum_plan_id, sequence_number)
);

create table public.teaching_resources (
  id uuid primary key default extensions.gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete restrict,
  title text not null check (length(btrim(title)) between 1 and 200),
  resource_type public.teaching_resource_type not null,
  description text check (
    description is null or length(btrim(description)) between 1 and 2000
  ),
  external_url text check (
    external_url is null
    or (
      length(btrim(external_url)) between 1 and 2000
      and external_url ~ '^https://'
    )
  ),
  storage_bucket text check (
    storage_bucket is null
    or length(btrim(storage_bucket)) between 1 and 100
  ),
  storage_object_path text check (
    storage_object_path is null
    or length(btrim(storage_object_path)) between 1 and 500
  ),
  original_file_name text check (
    original_file_name is null
    or length(btrim(original_file_name)) between 1 and 255
  ),
  content_type text check (
    content_type is null or length(btrim(content_type)) between 1 and 150
  ),
  file_size_bytes bigint check (
    file_size_bytes is null or file_size_bytes between 1 and 262144000
  ),
  created_by_profile_id uuid not null
    references public.profiles(id) on delete restrict,
  archived_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint teaching_resources_source_check check (
    (
      external_url is not null
      and storage_bucket is null
      and storage_object_path is null
      and original_file_name is null
      and content_type is null
      and file_size_bytes is null
    )
    or (
      external_url is null
      and storage_bucket is not null
      and storage_object_path is not null
      and original_file_name is not null
      and content_type is not null
      and file_size_bytes is not null
    )
  )
);

create index curriculum_plans_status_title_idx
  on public.curriculum_plans (status, title);
create index lessons_status_title_idx on public.lessons (status, title);
create index curriculum_plan_lessons_plan_sequence_idx
  on public.curriculum_plan_lessons (curriculum_plan_id, sequence_number);
create index teaching_resources_lesson_idx
  on public.teaching_resources (lesson_id, archived_at, title);

alter table public.curriculum_plans enable row level security;
alter table public.curriculum_plans force row level security;
alter table public.lessons enable row level security;
alter table public.lessons force row level security;
alter table public.curriculum_plan_lessons enable row level security;
alter table public.curriculum_plan_lessons force row level security;
alter table public.teaching_resources enable row level security;
alter table public.teaching_resources force row level security;

revoke all on table public.curriculum_plans
  from public, anon, authenticated;
revoke all on table public.lessons
  from public, anon, authenticated;
revoke all on table public.curriculum_plan_lessons
  from public, anon, authenticated;
revoke all on table public.teaching_resources
  from public, anon, authenticated;

create or replace function private.can_manage_curriculum()
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

create or replace function private.can_view_curriculum()
returns boolean
language sql stable security definer
set search_path = '' set row_security = off
as $$
  select private.current_profile_is_active()
    and private.has_role(array[
      'platform_administrator',
      'youth_pastor',
      'staff_member',
      'volunteer'
    ]::public.account_role[])
$$;

revoke all on function private.can_manage_curriculum()
  from public, anon, authenticated;
revoke all on function private.can_view_curriculum()
  from public, anon, authenticated;
grant execute on function private.can_manage_curriculum() to authenticated;
grant execute on function private.can_view_curriculum() to authenticated;

commit;
