begin;

create type public.prayer_request_status as enum (
  'active',
  'answered',
  'archived'
);

create type public.prayer_request_visibility as enum (
  'public',
  'leadership',
  'private'
);

create type public.care_follow_up_status as enum (
  'pending',
  'in_progress',
  'completed',
  'cancelled'
);

create type public.care_follow_up_priority as enum (
  'low',
  'normal',
  'high',
  'urgent'
);

create table public.care_categories (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null
    check (length(btrim(name)) between 1 and 100),
  description text check (
    description is null
    or length(btrim(description)) between 1 and 500
  ),
  is_active boolean not null default true,
  sort_order integer not null default 0
    check (sort_order >= 0),
  archived_at timestamp with time zone,
  created_by_profile_id uuid not null
    references public.profiles(id) on delete restrict,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint care_categories_name_unique unique (name),
  constraint care_categories_archive_check check (
    archived_at is null or not is_active
  )
);

create table public.prayer_requests (
  id uuid primary key default extensions.gen_random_uuid(),
  person_id uuid not null
    references public.people(id) on delete restrict,
  category_id uuid
    references public.care_categories(id) on delete restrict,
  title text not null
    check (length(btrim(title)) between 1 and 200),
  request_details text not null
    check (length(btrim(request_details)) between 1 and 10000),
  visibility public.prayer_request_visibility not null
    default 'leadership',
  status public.prayer_request_status not null
    default 'active',
  submitted_by_profile_id uuid not null
    references public.profiles(id) on delete restrict,
  assigned_to_profile_id uuid
    references public.profiles(id) on delete restrict,
  answered_at timestamp with time zone,
  answered_by_profile_id uuid
    references public.profiles(id) on delete restrict,
  answer_summary text check (
    answer_summary is null
    or length(btrim(answer_summary)) between 1 and 5000
  ),
  archived_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint prayer_requests_answered_check check (
    (
      status = 'answered'
      and answered_at is not null
      and answered_by_profile_id is not null
    )
    or (
      status <> 'answered'
      and answered_at is null
      and answered_by_profile_id is null
      and answer_summary is null
    )
  ),
  constraint prayer_requests_archived_check check (
    (
      status = 'archived'
      and archived_at is not null
    )
    or (
      status <> 'archived'
      and archived_at is null
    )
  )
);

create table public.care_notes (
  id uuid primary key default extensions.gen_random_uuid(),
  person_id uuid not null
    references public.people(id) on delete restrict,
  category_id uuid
    references public.care_categories(id) on delete restrict,
  title text not null
    check (length(btrim(title)) between 1 and 200),
  note_content text not null
    check (length(btrim(note_content)) between 1 and 10000),
  occurred_at timestamp with time zone not null default now(),
  created_by_profile_id uuid not null
    references public.profiles(id) on delete restrict,
  archived_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.care_follow_ups (
  id uuid primary key default extensions.gen_random_uuid(),
  person_id uuid not null
    references public.people(id) on delete restrict,
  prayer_request_id uuid
    references public.prayer_requests(id) on delete restrict,
  care_note_id uuid
    references public.care_notes(id) on delete restrict,
  title text not null
    check (length(btrim(title)) between 1 and 200),
  instructions text check (
    instructions is null
    or length(btrim(instructions)) between 1 and 5000
  ),
  priority public.care_follow_up_priority not null
    default 'normal',
  status public.care_follow_up_status not null
    default 'pending',
  assigned_to_profile_id uuid not null
    references public.profiles(id) on delete restrict,
  created_by_profile_id uuid not null
    references public.profiles(id) on delete restrict,
  due_at timestamp with time zone,
  completed_at timestamp with time zone,
  completed_by_profile_id uuid
    references public.profiles(id) on delete restrict,
  completion_notes text check (
    completion_notes is null
    or length(btrim(completion_notes)) between 1 and 5000
  ),
  cancelled_at timestamp with time zone,
  cancelled_by_profile_id uuid
    references public.profiles(id) on delete restrict,
  cancellation_reason text check (
    cancellation_reason is null
    or length(btrim(cancellation_reason)) between 1 and 1000
  ),
  archived_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint care_follow_ups_source_check check (
    num_nonnulls(prayer_request_id, care_note_id) <= 1
  ),
  constraint care_follow_ups_completed_check check (
    (
      status = 'completed'
      and completed_at is not null
      and completed_by_profile_id is not null
    )
    or (
      status <> 'completed'
      and completed_at is null
      and completed_by_profile_id is null
      and completion_notes is null
    )
  ),
  constraint care_follow_ups_cancelled_check check (
    (
      status = 'cancelled'
      and cancelled_at is not null
      and cancelled_by_profile_id is not null
      and cancellation_reason is not null
    )
    or (
      status <> 'cancelled'
      and cancelled_at is null
      and cancelled_by_profile_id is null
      and cancellation_reason is null
    )
  )
);

create index care_categories_active_sort_idx
  on public.care_categories (
    is_active,
    sort_order,
    name
  );

create index prayer_requests_person_created_idx
  on public.prayer_requests (
    person_id,
    created_at desc
  );

create index prayer_requests_status_created_idx
  on public.prayer_requests (
    status,
    created_at desc
  );

create index prayer_requests_visibility_status_idx
  on public.prayer_requests (
    visibility,
    status,
    created_at desc
  );

create index prayer_requests_assignee_status_idx
  on public.prayer_requests (
    assigned_to_profile_id,
    status,
    created_at desc
  )
  where assigned_to_profile_id is not null;

create index prayer_requests_category_idx
  on public.prayer_requests (
    category_id,
    created_at desc
  )
  where category_id is not null;

create index care_notes_person_occurred_idx
  on public.care_notes (
    person_id,
    occurred_at desc
  );

create index care_notes_category_occurred_idx
  on public.care_notes (
    category_id,
    occurred_at desc
  )
  where category_id is not null;

create index care_notes_active_idx
  on public.care_notes (
    occurred_at desc
  )
  where archived_at is null;

create index care_follow_ups_assignee_status_due_idx
  on public.care_follow_ups (
    assigned_to_profile_id,
    status,
    due_at
  );

create index care_follow_ups_person_status_idx
  on public.care_follow_ups (
    person_id,
    status,
    created_at desc
  );

create index care_follow_ups_due_status_idx
  on public.care_follow_ups (
    due_at,
    status
  )
  where due_at is not null
    and status in ('pending', 'in_progress');

create index care_follow_ups_prayer_request_idx
  on public.care_follow_ups (
    prayer_request_id,
    created_at desc
  )
  where prayer_request_id is not null;

create index care_follow_ups_care_note_idx
  on public.care_follow_ups (
    care_note_id,
    created_at desc
  )
  where care_note_id is not null;

alter table public.care_categories enable row level security;
alter table public.care_categories force row level security;

alter table public.prayer_requests enable row level security;
alter table public.prayer_requests force row level security;

alter table public.care_notes enable row level security;
alter table public.care_notes force row level security;

alter table public.care_follow_ups enable row level security;
alter table public.care_follow_ups force row level security;

revoke all on table public.care_categories
  from public, anon, authenticated;

revoke all on table public.prayer_requests
  from public, anon, authenticated;

revoke all on table public.care_notes
  from public, anon, authenticated;

revoke all on table public.care_follow_ups
  from public, anon, authenticated;

create or replace function private.can_manage_care()
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select private.current_profile_is_active()
    and private.has_role(array[
      'platform_administrator',
      'youth_pastor',
      'staff_member'
    ]::public.account_role[])
$$;

create or replace function private.can_manage_care_categories()
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select private.current_profile_is_active()
    and private.has_role(array[
      'platform_administrator',
      'youth_pastor'
    ]::public.account_role[])
$$;

create or replace function private.is_care_follow_up_assignee(
  target_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select private.current_profile_is_active()
    and target_profile_id = auth.uid()
$$;

revoke all on function private.can_manage_care()
  from public, anon, authenticated;

revoke all on function private.can_manage_care_categories()
  from public, anon, authenticated;

revoke all on function private.is_care_follow_up_assignee(uuid)
  from public, anon, authenticated;

grant execute on function private.can_manage_care()
  to authenticated;

grant execute on function private.can_manage_care_categories()
  to authenticated;

grant execute on function private.is_care_follow_up_assignee(uuid)
  to authenticated;

insert into public.care_categories (
  name,
  description,
  sort_order,
  created_by_profile_id
)
select
  seed_category.name,
  seed_category.description,
  seed_category.sort_order,
  seed_profile.id
from (
  values
    (
      'General',
      'General prayer, encouragement, or ministry care.',
      10
    ),
    (
      'Illness',
      'Illness, medical treatment, recovery, or health concerns.',
      20
    ),
    (
      'Hospital',
      'Hospital visits, procedures, or inpatient care.',
      30
    ),
    (
      'Family',
      'Family relationships, household needs, or family transitions.',
      40
    ),
    (
      'Bereavement',
      'Grief, loss, funeral support, or bereavement care.',
      50
    ),
    (
      'Counseling',
      'Pastoral counseling, mentoring, or confidential support.',
      60
    ),
    (
      'School',
      'School, academic, social, or educational concerns.',
      70
    ),
    (
      'Celebration',
      'Answered prayer, milestone, achievement, or joyful event.',
      80
    )
) as seed_category (
  name,
  description,
  sort_order
)
cross join lateral (
  select p.id
  from public.profiles p
  where p.primary_role in (
    'platform_administrator',
    'youth_pastor'
  )
  order by
    case p.primary_role
      when 'platform_administrator' then 1
      when 'youth_pastor' then 2
      else 3
    end,
    p.created_at
  limit 1
) as seed_profile;

comment on table public.care_categories is
  'Configurable categories used by Prayer and Care records. Category administration is limited to platform administrators and youth pastors.';

comment on table public.prayer_requests is
  'Person-based prayer requests with controlled visibility, assignment, answered-prayer tracking, and non-destructive archival.';

comment on column public.prayer_requests.visibility is
  'Controls whether a prayer request is public within an approved ministry context, limited to leadership, or private.';

comment on column public.prayer_requests.request_details is
  'Sensitive prayer-request information. Applications must never expose this field in notifications or unauthorized summaries.';

comment on table public.care_notes is
  'Confidential internal pastoral and ministry care notes. These records are never parent-facing or volunteer-facing.';

comment on column public.care_notes.note_content is
  'Highly confidential pastoral-care information. Access must be enforced through approved database workflows.';

comment on table public.care_follow_ups is
  'Assignment-based care tasks connected to a person and optionally to one prayer request or one care note.';

comment on column public.care_follow_ups.instructions is
  'Potentially confidential follow-up instructions. Notification messages must not include this field.';

comment on function private.can_manage_care() is
  'Returns true when the active authenticated profile has an approved Prayer and Care management role.';

comment on function private.can_manage_care_categories() is
  'Returns true when the active authenticated profile may administer configurable care categories.';

comment on function private.is_care_follow_up_assignee(uuid) is
  'Returns true when the active authenticated profile matches the supplied follow-up assignee profile.';

commit;