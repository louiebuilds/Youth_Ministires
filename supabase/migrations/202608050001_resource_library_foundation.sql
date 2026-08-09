begin;

create type public.library_resource_type as enum (
  'document',
  'image',
  'video',
  'other'
);

create type public.library_resource_status as enum (
  'draft',
  'published',
  'archived'
);

create type public.library_resource_audience as enum (
  'ministry',
  'volunteer',
  'family',
  'all_authenticated'
);

create table public.resource_categories (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 100),
  description text check (
    description is null or length(btrim(description)) between 1 and 1000
  ),
  archived_at timestamp with time zone,
  created_by_profile_id uuid not null
    references public.profiles(id) on delete restrict,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create unique index resource_categories_active_name_key
  on public.resource_categories (lower(btrim(name)))
  where archived_at is null;

create table public.library_resources (
  id uuid primary key default extensions.gen_random_uuid(),
  category_id uuid references public.resource_categories(id) on delete restrict,
  title text not null check (length(btrim(title)) between 1 and 200),
  description text check (
    description is null or length(btrim(description)) between 1 and 4000
  ),
  resource_type public.library_resource_type not null,
  audience public.library_resource_audience not null default 'ministry',
  status public.library_resource_status not null default 'draft',
  current_version_id uuid,
  published_at timestamp with time zone,
  archived_at timestamp with time zone,
  created_by_profile_id uuid not null
    references public.profiles(id) on delete restrict,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint library_resources_lifecycle_check check (
    (status = 'draft' and published_at is null and archived_at is null)
    or (status = 'published' and published_at is not null and archived_at is null)
    or (status = 'archived' and archived_at is not null)
  )
);

create table public.library_resource_versions (
  id uuid primary key default extensions.gen_random_uuid(),
  resource_id uuid not null
    references public.library_resources(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  storage_bucket text not null check (storage_bucket = 'resource-library'),
  storage_object_path text not null
    check (length(btrim(storage_object_path)) between 1 and 500),
  original_file_name text not null
    check (length(btrim(original_file_name)) between 1 and 255),
  content_type text not null
    check (length(btrim(content_type)) between 1 and 150),
  file_size_bytes bigint not null
    check (file_size_bytes between 1 and 262144000),
  checksum_sha256 text check (
    checksum_sha256 is null or checksum_sha256 ~ '^[a-f0-9]{64}$'
  ),
  change_summary text check (
    change_summary is null or length(btrim(change_summary)) between 1 and 1000
  ),
  created_by_profile_id uuid not null
    references public.profiles(id) on delete restrict,
  created_at timestamp with time zone not null default now(),
  constraint library_resource_versions_resource_number_key
    unique (resource_id, version_number),
  constraint library_resource_versions_object_path_key
    unique (storage_bucket, storage_object_path)
);

alter table public.library_resources
  add constraint library_resources_current_version_fkey
  foreign key (current_version_id)
  references public.library_resource_versions(id) on delete restrict;

create index library_resources_search_idx
  on public.library_resources (status, audience, resource_type, category_id);
create index library_resources_title_idx
  on public.library_resources (lower(title));
create index library_resource_versions_history_idx
  on public.library_resource_versions (resource_id, version_number desc);

create trigger set_resource_categories_updated_at
before update on public.resource_categories
for each row execute function public.set_updated_at();

create trigger set_library_resources_updated_at
before update on public.library_resources
for each row execute function public.set_updated_at();

create or replace function private.reject_library_version_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Resource Library file versions are immutable.'
    using errcode = '55000';
end;
$$;

create trigger reject_library_version_update
before update or delete on public.library_resource_versions
for each row execute function private.reject_library_version_mutation();

alter table public.resource_categories enable row level security;
alter table public.resource_categories force row level security;
alter table public.library_resources enable row level security;
alter table public.library_resources force row level security;
alter table public.library_resource_versions enable row level security;
alter table public.library_resource_versions force row level security;

revoke all on table public.resource_categories
  from public, anon, authenticated;
revoke all on table public.library_resources
  from public, anon, authenticated;
revoke all on table public.library_resource_versions
  from public, anon, authenticated;

create or replace function private.can_manage_resource_library()
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

create or replace function private.can_view_library_audience(
  p_audience public.library_resource_audience
)
returns boolean
language sql stable security definer
set search_path = '' set row_security = off
as $$
  select private.current_profile_is_active() and (
    private.can_manage_resource_library()
    or p_audience = 'all_authenticated'
    or (
      p_audience = 'volunteer'
      and private.has_role(array['volunteer']::public.account_role[])
    )
    or (
      p_audience = 'family'
      and private.has_role(array['parent']::public.account_role[])
    )
  )
$$;

revoke all on function private.can_manage_resource_library()
  from public, anon, authenticated;
revoke all on function private.can_view_library_audience(
  public.library_resource_audience
) from public, anon, authenticated;
grant execute on function private.can_manage_resource_library()
  to authenticated;
grant execute on function private.can_view_library_audience(
  public.library_resource_audience
) to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'resource-library',
  'resource-library',
  false,
  262144000,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.can_access_library_storage_object(
  p_object_name text
)
returns boolean
language sql stable security definer
set search_path = '' set row_security = off
as $$
  select private.can_manage_resource_library() or exists (
    select 1
    from public.library_resources as resources
    join public.library_resource_versions as versions
      on versions.id = resources.current_version_id
    where versions.storage_bucket = 'resource-library'
      and versions.storage_object_path = p_object_name
      and resources.status = 'published'
      and private.can_view_library_audience(resources.audience)
  )
$$;

revoke all on function private.can_access_library_storage_object(text)
  from public, anon, authenticated;
grant execute on function private.can_access_library_storage_object(text)
  to authenticated;

create policy resource_library_files_select
on storage.objects for select
to authenticated
using (
  bucket_id = 'resource-library'
  and private.can_access_library_storage_object(name)
);

create policy resource_library_files_insert
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'resource-library'
  and private.can_manage_resource_library()
  and name !~ '(^|/)\.\.(/|$)'
);

revoke all on function private.reject_library_version_mutation()
  from public, anon, authenticated;

comment on table public.library_resource_versions is
  'Immutable metadata history for private Resource Library files.';
comment on column public.library_resources.current_version_id is
  'Points to the current immutable file version without overwriting history.';
comment on function private.can_view_library_audience(
  public.library_resource_audience
) is 'Enforces active-account and audience access for Resource Library records.';

commit;
