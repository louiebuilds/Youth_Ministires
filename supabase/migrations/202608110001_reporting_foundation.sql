begin;

create table public.report_saved_configurations (
  id uuid primary key default extensions.gen_random_uuid(),
  creator_profile_id uuid not null references public.profiles(id) on delete restrict,
  name text not null check (length(btrim(name)) between 1 and 120),
  report_type text not null check (report_type in (
    'overview','attendance','events','volunteers','growth','ministry_health'
  )),
  configuration jsonb not null default '{}'::jsonb check (
    jsonb_typeof(configuration) = 'object'
    and pg_column_size(configuration) <= 16384
  ),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index report_saved_configurations_creator_name_active_key
  on public.report_saved_configurations (
    creator_profile_id, lower(name)
  ) where archived_at is null;

create index report_saved_configurations_creator_updated_idx
  on public.report_saved_configurations (creator_profile_id, updated_at desc);

create trigger report_saved_configurations_set_updated_at
before update on public.report_saved_configurations
for each row execute function public.set_updated_at();

alter table public.report_saved_configurations enable row level security;
alter table public.report_saved_configurations force row level security;
revoke all on table public.report_saved_configurations from public, anon, authenticated;

comment on table public.report_saved_configurations is
  'Creator-private Reporting configurations only. Results and export files are never stored.';

commit;
