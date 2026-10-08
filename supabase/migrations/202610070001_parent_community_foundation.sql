begin;

-- Parent Community
--
-- Community is intentionally separate from:
--   * Communications: official announcements and private messages
--   * Chat: real-time group conversation
--
-- Community is an organized parent/guardian discussion area.
--
-- Access:
--   Parent                -> view + participate
--   Youth Pastor          -> view + participate + moderate
--   Platform Administrator-> view + participate + moderate
--   Staff Member          -> no access
--   Volunteer             -> no access

create or replace function private.can_view_parent_community()
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select
    private.current_profile_is_active()
    and private.current_profile_role() in (
      'parent',
      'youth_pastor',
      'platform_administrator'
    );
$$;

create or replace function private.can_participate_in_parent_community()
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select
    private.current_profile_is_active()
    and private.current_profile_role() in (
      'parent',
      'youth_pastor',
      'platform_administrator'
    );
$$;

create or replace function private.can_moderate_parent_community()
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select
    private.current_profile_is_active()
    and private.current_profile_role() in (
      'youth_pastor',
      'platform_administrator'
    );
$$;

create table public.community_categories (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null,
  name text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),

  constraint community_categories_slug_check
    check (
      length(btrim(slug)) between 1 and 50
      and slug = lower(slug)
    ),

  constraint community_categories_name_check
    check (
      length(btrim(name)) between 1 and 100
    ),

  constraint community_categories_description_check
    check (
      description is null
      or length(description) <= 500
    ),

  constraint community_categories_slug_key
    unique (slug)
);

create table public.community_posts (
  id uuid primary key default extensions.gen_random_uuid(),

  author_profile_id uuid not null
    references public.profiles(id)
    on delete restrict,

  category_id uuid not null
    references public.community_categories(id)
    on delete restrict,

  event_id uuid
    references public.events(id)
    on delete set null,

  title text not null,
  body text not null,

  lifecycle_status text not null default 'published',

  is_pinned boolean not null default false,
  is_locked boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  moderated_at timestamptz,
  moderated_by_profile_id uuid
    references public.profiles(id)
    on delete set null,
  moderation_reason text,

  constraint community_posts_title_check
    check (
      length(btrim(title)) between 1 and 160
    ),

  constraint community_posts_body_check
    check (
      length(btrim(body)) between 1 and 5000
    ),

  constraint community_posts_lifecycle_status_check
    check (
      lifecycle_status in (
        'published',
        'hidden',
        'removed'
      )
    ),

  constraint community_posts_moderation_reason_check
    check (
      moderation_reason is null
      or length(btrim(moderation_reason)) between 1 and 500
    )
);

create table public.community_comments (
  id uuid primary key default extensions.gen_random_uuid(),

  post_id uuid not null
    references public.community_posts(id)
    on delete cascade,

  author_profile_id uuid not null
    references public.profiles(id)
    on delete restrict,

  body text not null,

  lifecycle_status text not null default 'published',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  moderated_at timestamptz,
  moderated_by_profile_id uuid
    references public.profiles(id)
    on delete set null,
  moderation_reason text,

  constraint community_comments_body_check
    check (
      length(btrim(body)) between 1 and 3000
    ),

  constraint community_comments_lifecycle_status_check
    check (
      lifecycle_status in (
        'published',
        'hidden',
        'removed'
      )
    ),

  constraint community_comments_moderation_reason_check
    check (
      moderation_reason is null
      or length(btrim(moderation_reason)) between 1 and 500
    )
);

create index community_categories_active_sort_idx
  on public.community_categories (
    is_active,
    sort_order,
    name
  );

create index community_posts_feed_idx
  on public.community_posts (
    lifecycle_status,
    is_pinned desc,
    created_at desc
  );

create index community_posts_category_feed_idx
  on public.community_posts (
    category_id,
    lifecycle_status,
    is_pinned desc,
    created_at desc
  );

create index community_posts_author_idx
  on public.community_posts (
    author_profile_id,
    created_at desc
  );

create index community_posts_event_idx
  on public.community_posts (
    event_id,
    created_at desc
  )
  where event_id is not null;

create index community_comments_post_idx
  on public.community_comments (
    post_id,
    lifecycle_status,
    created_at asc
  );

create index community_comments_author_idx
  on public.community_comments (
    author_profile_id,
    created_at desc
  );

insert into public.community_categories (
  slug,
  name,
  description,
  sort_order
)
values
  (
    'general',
    'General',
    'General parent and guardian conversations about youth ministry.',
    10
  ),
  (
    'events',
    'Events',
    'Discussion about ministry events, activities, camps, and trips.',
    20
  ),
  (
    'rides-transportation',
    'Rides & Transportation',
    'Transportation questions and family ride coordination.',
    30
  ),
  (
    'questions',
    'Questions',
    'General questions for other parents and ministry leaders.',
    40
  );

alter table public.community_categories
  enable row level security;

alter table public.community_posts
  enable row level security;

alter table public.community_comments
  enable row level security;

-- Category visibility.
--
-- Only users who may access Parent Community can read active categories.

create policy community_categories_select
on public.community_categories
for select
to authenticated
using (
  private.can_view_parent_community()
  and is_active
);

-- Post visibility.
--
-- Parents see published posts.
-- Youth Pastors and Platform Administrators may also see moderated rows so
-- moderation history can be presented in the administrative UI later.

create policy community_posts_select
on public.community_posts
for select
to authenticated
using (
  private.can_view_parent_community()
  and (
    lifecycle_status = 'published'
    or private.can_moderate_parent_community()
  )
);

-- Comment visibility follows the parent post.
--
-- Parents see published comments on published posts.
-- Moderators may inspect hidden/removed posts and comments.

create policy community_comments_select
on public.community_comments
for select
to authenticated
using (
  private.can_view_parent_community()
  and (
    private.can_moderate_parent_community()
    or (
      lifecycle_status = 'published'
      and exists (
        select 1
        from public.community_posts
        where community_posts.id = community_comments.post_id
          and community_posts.lifecycle_status = 'published'
      )
    )
  )
);

-- Mutations will be performed through controlled SECURITY DEFINER RPCs.
-- Do not permit direct browser writes to Community tables.

revoke all on table public.community_categories
  from public, anon, authenticated;

revoke all on table public.community_posts
  from public, anon, authenticated;

revoke all on table public.community_comments
  from public, anon, authenticated;

grant select on table public.community_categories
  to authenticated;

grant select on table public.community_posts
  to authenticated;

grant select on table public.community_comments
  to authenticated;

comment on table public.community_categories is
  'Parent Community discussion categories. Community is separate from official Communications and real-time Chat.';

comment on table public.community_posts is
  'Organized Parent Community discussion posts visible only to authorized Parent Community users.';

comment on column public.community_posts.event_id is
  'Optional related ministry event. Linking a discussion to an event does not change event permissions.';

comment on column public.community_posts.is_pinned is
  'Moderator-controlled flag for keeping an important discussion near the top of the Community feed.';

comment on column public.community_posts.is_locked is
  'Moderator-controlled flag preventing new comments while retaining the discussion for reading.';

comment on table public.community_comments is
  'Replies within Parent Community discussion posts.';

commit;