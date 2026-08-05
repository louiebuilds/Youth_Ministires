begin;

-- Milestone 12 - Prayer & Care secured RPC workflows.
-- This migration exposes the database service API used by the server-only
-- TypeScript service layer. Direct table privileges remain revoked.

create or replace function private.write_care_audit(
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language sql
volatile
security definer
set search_path = ''
set row_security = off
as $$
  insert into public.audit_events (
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    result,
    source,
    metadata
  )
  values (
    auth.uid(),
    p_action,
    p_entity_type,
    p_entity_id,
    'success',
    'api',
    coalesce(p_metadata, '{}'::jsonb)
  );
$$;

revoke all on function private.write_care_audit(text, text, uuid, jsonb)
  from public, anon, authenticated;

grant execute on function private.write_care_audit(text, text, uuid, jsonb)
  to authenticated;

create or replace function public.list_care_categories(
  p_include_archived boolean default false
)
returns table (
  category_id uuid,
  name text,
  description text,
  is_active boolean,
  sort_order integer,
  archived_at timestamp with time zone,
  can_manage boolean
)
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
begin
  if not private.can_manage_care() then
    raise exception 'Prayer and Care access denied.'
      using errcode = '42501';
  end if;

  return query
  select
    c.id,
    c.name,
    c.description,
    c.is_active,
    c.sort_order,
    c.archived_at,
    private.can_manage_care_categories()
  from public.care_categories c
  where p_include_archived or c.archived_at is null
  order by
    case when c.archived_at is null then 0 else 1 end,
    c.sort_order,
    lower(c.name);
end;
$$;

create or replace function public.create_care_category(
  p_name text,
  p_description text default null,
  p_sort_order integer default 0
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
set row_security = off
as $$
declare
  v_category_id uuid;
begin
  if not private.can_manage_care_categories() then
    raise exception 'Care category management denied.'
      using errcode = '42501';
  end if;

  if length(btrim(coalesce(p_name, ''))) not between 1 and 100 then
    raise exception 'Category name must contain between 1 and 100 characters.'
      using errcode = '22023';
  end if;

  if p_description is not null
     and length(btrim(p_description)) not between 1 and 500 then
    raise exception 'Category description must contain between 1 and 500 characters.'
      using errcode = '22023';
  end if;

  if coalesce(p_sort_order, -1) < 0 then
    raise exception 'Category sort order cannot be negative.'
      using errcode = '22023';
  end if;

  insert into public.care_categories (
    name,
    description,
    sort_order,
    created_by_profile_id
  )
  values (
    btrim(p_name),
    nullif(btrim(p_description), ''),
    p_sort_order,
    auth.uid()
  )
  returning id into v_category_id;

  perform private.write_care_audit(
    'care_category.created',
    'care_category',
    v_category_id,
    jsonb_build_object('name', btrim(p_name))
  );

  return v_category_id;
end;
$$;

create or replace function public.update_care_category(
  p_category_id uuid,
  p_name text,
  p_description text default null,
  p_sort_order integer default 0,
  p_is_active boolean default true
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
set row_security = off
as $$
begin
  if not private.can_manage_care_categories() then
    raise exception 'Care category management denied.'
      using errcode = '42501';
  end if;

  if length(btrim(coalesce(p_name, ''))) not between 1 and 100 then
    raise exception 'Category name must contain between 1 and 100 characters.'
      using errcode = '22023';
  end if;

  if p_description is not null
     and length(btrim(p_description)) not between 1 and 500 then
    raise exception 'Category description must contain between 1 and 500 characters.'
      using errcode = '22023';
  end if;

  if coalesce(p_sort_order, -1) < 0 then
    raise exception 'Category sort order cannot be negative.'
      using errcode = '22023';
  end if;

  update public.care_categories
  set
    name = btrim(p_name),
    description = nullif(btrim(p_description), ''),
    sort_order = p_sort_order,
    is_active = p_is_active,
    archived_at = case when p_is_active then null else archived_at end,
    updated_at = now()
  where id = p_category_id;

  if not found then
    raise exception 'Care category not found.'
      using errcode = 'P0002';
  end if;

  perform private.write_care_audit(
    'care_category.updated',
    'care_category',
    p_category_id,
    jsonb_build_object(
      'name', btrim(p_name),
      'is_active', p_is_active
    )
  );
end;
$$;

create or replace function public.archive_care_category(
  p_category_id uuid
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
set row_security = off
as $$
begin
  if not private.can_manage_care_categories() then
    raise exception 'Care category management denied.'
      using errcode = '42501';
  end if;

  update public.care_categories
  set
    is_active = false,
    archived_at = coalesce(archived_at, now()),
    updated_at = now()
  where id = p_category_id
    and archived_at is null;

  if not found then
    raise exception 'Active care category not found.'
      using errcode = 'P0002';
  end if;

  perform private.write_care_audit(
    'care_category.archived',
    'care_category',
    p_category_id
  );
end;
$$;

create or replace function public.list_prayer_requests(
  p_search text default null,
  p_status public.prayer_request_status default null,
  p_person_id uuid default null,
  p_assigned_to_profile_id uuid default null,
  p_include_archived boolean default false
)
returns table (
  prayer_request_id uuid,
  person_id uuid,
  person_name text,
  category_id uuid,
  category_name text,
  title text,
  request_details text,
  visibility public.prayer_request_visibility,
  prayer_status public.prayer_request_status,
  submitted_by_profile_id uuid,
  submitted_by_name text,
  assigned_to_profile_id uuid,
  assigned_to_name text,
  answered_at timestamp with time zone,
  answered_by_profile_id uuid,
  answered_by_name text,
  answer_summary text,
  archived_at timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
begin
  if not private.can_manage_care() then
    raise exception 'Prayer and Care access denied.'
      using errcode = '42501';
  end if;

  return query
  select
    r.id,
    r.person_id,
    concat_ws(' ', coalesce(nullif(p.preferred_name, ''), p.first_name), p.last_name),
    r.category_id,
    c.name,
    r.title,
    r.request_details,
    r.visibility,
    r.status,
    r.submitted_by_profile_id,
    submitter.display_name,
    r.assigned_to_profile_id,
    assignee.display_name,
    r.answered_at,
    r.answered_by_profile_id,
    answerer.display_name,
    r.answer_summary,
    r.archived_at,
    r.created_at,
    r.updated_at
  from public.prayer_requests r
  join public.people p on p.id = r.person_id
  join public.profiles submitter on submitter.id = r.submitted_by_profile_id
  left join public.care_categories c on c.id = r.category_id
  left join public.profiles assignee on assignee.id = r.assigned_to_profile_id
  left join public.profiles answerer on answerer.id = r.answered_by_profile_id
  where
    (p_include_archived or r.status <> 'archived')
    and (p_status is null or r.status = p_status)
    and (p_person_id is null or r.person_id = p_person_id)
    and (
      p_assigned_to_profile_id is null
      or r.assigned_to_profile_id = p_assigned_to_profile_id
    )
    and (
      nullif(btrim(p_search), '') is null
      or r.title ilike '%' || btrim(p_search) || '%'
      or r.request_details ilike '%' || btrim(p_search) || '%'
      or concat_ws(
        ' ',
        coalesce(nullif(p.preferred_name, ''), p.first_name),
        p.last_name
      ) ilike '%' || btrim(p_search) || '%'
    )
  order by r.created_at desc;
end;
$$;

create or replace function public.get_prayer_request(
  p_prayer_request_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
declare
  v_result jsonb;
begin
  if not private.can_manage_care() then
    raise exception 'Prayer and Care access denied.'
      using errcode = '42501';
  end if;

  select jsonb_build_object(
    'prayer_request_id', r.id,
    'person_id', r.person_id,
    'person_name', concat_ws(
      ' ',
      coalesce(nullif(p.preferred_name, ''), p.first_name),
      p.last_name
    ),
    'category_id', r.category_id,
    'category_name', c.name,
    'title', r.title,
    'request_details', r.request_details,
    'visibility', r.visibility,
    'prayer_status', r.status,
    'submitted_by_profile_id', r.submitted_by_profile_id,
    'submitted_by_name', submitter.display_name,
    'assigned_to_profile_id', r.assigned_to_profile_id,
    'assigned_to_name', assignee.display_name,
    'answered_at', r.answered_at,
    'answered_by_profile_id', r.answered_by_profile_id,
    'answered_by_name', answerer.display_name,
    'answer_summary', r.answer_summary,
    'archived_at', r.archived_at,
    'created_at', r.created_at,
    'updated_at', r.updated_at
  )
  into v_result
  from public.prayer_requests r
  join public.people p on p.id = r.person_id
  join public.profiles submitter on submitter.id = r.submitted_by_profile_id
  left join public.care_categories c on c.id = r.category_id
  left join public.profiles assignee on assignee.id = r.assigned_to_profile_id
  left join public.profiles answerer on answerer.id = r.answered_by_profile_id
  where r.id = p_prayer_request_id;

  if v_result is null then
    raise exception 'Prayer request not found.'
      using errcode = 'P0002';
  end if;

  return v_result;
end;
$$;

create or replace function public.create_prayer_request(
  p_person_id uuid,
  p_category_id uuid,
  p_title text,
  p_request_details text,
  p_visibility public.prayer_request_visibility default 'leadership',
  p_assigned_to_profile_id uuid default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
set row_security = off
as $$
declare
  v_request_id uuid;
begin
  if not private.can_manage_care() then
    raise exception 'Prayer and Care management denied.'
      using errcode = '42501';
  end if;

  if length(btrim(coalesce(p_title, ''))) not between 1 and 200 then
    raise exception 'Prayer request title must contain between 1 and 200 characters.'
      using errcode = '22023';
  end if;

  if length(btrim(coalesce(p_request_details, ''))) not between 1 and 10000 then
    raise exception 'Prayer request details must contain between 1 and 10000 characters.'
      using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.people p
    where p.id = p_person_id and p.status <> 'archived'
  ) then
    raise exception 'Person not found or archived.'
      using errcode = 'P0002';
  end if;

  if p_category_id is not null and not exists (
    select 1 from public.care_categories c
    where c.id = p_category_id and c.archived_at is null and c.is_active
  ) then
    raise exception 'Active care category not found.'
      using errcode = 'P0002';
  end if;

  if p_assigned_to_profile_id is not null and not exists (
    select 1 from public.profiles p
    where p.id = p_assigned_to_profile_id
      and p.status = 'active'
      and p.primary_role in (
        'platform_administrator',
        'youth_pastor',
        'staff_member'
      )
  ) then
    raise exception 'Eligible prayer request assignee not found.'
      using errcode = 'P0002';
  end if;

  insert into public.prayer_requests (
    person_id,
    category_id,
    title,
    request_details,
    visibility,
    submitted_by_profile_id,
    assigned_to_profile_id
  )
  values (
    p_person_id,
    p_category_id,
    btrim(p_title),
    btrim(p_request_details),
    p_visibility,
    auth.uid(),
    p_assigned_to_profile_id
  )
  returning id into v_request_id;

  perform private.write_care_audit(
    'prayer_request.created',
    'prayer_request',
    v_request_id,
    jsonb_build_object(
      'person_id', p_person_id,
      'visibility', p_visibility,
      'assigned_to_profile_id', p_assigned_to_profile_id
    )
  );

  return v_request_id;
end;
$$;

create or replace function public.update_prayer_request(
  p_prayer_request_id uuid,
  p_category_id uuid,
  p_title text,
  p_request_details text,
  p_visibility public.prayer_request_visibility
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
set row_security = off
as $$
begin
  if not private.can_manage_care() then
    raise exception 'Prayer and Care management denied.'
      using errcode = '42501';
  end if;

  if length(btrim(coalesce(p_title, ''))) not between 1 and 200 then
    raise exception 'Prayer request title must contain between 1 and 200 characters.'
      using errcode = '22023';
  end if;

  if length(btrim(coalesce(p_request_details, ''))) not between 1 and 10000 then
    raise exception 'Prayer request details must contain between 1 and 10000 characters.'
      using errcode = '22023';
  end if;

  if p_category_id is not null and not exists (
    select 1 from public.care_categories c
    where c.id = p_category_id and c.archived_at is null and c.is_active
  ) then
    raise exception 'Active care category not found.'
      using errcode = 'P0002';
  end if;

  update public.prayer_requests
  set
    category_id = p_category_id,
    title = btrim(p_title),
    request_details = btrim(p_request_details),
    visibility = p_visibility,
    updated_at = now()
  where id = p_prayer_request_id
    and status = 'active';

  if not found then
    raise exception 'Active prayer request not found.'
      using errcode = 'P0002';
  end if;

  perform private.write_care_audit(
    'prayer_request.updated',
    'prayer_request',
    p_prayer_request_id,
    jsonb_build_object('visibility', p_visibility)
  );
end;
$$;

create or replace function public.assign_prayer_request(
  p_prayer_request_id uuid,
  p_assigned_to_profile_id uuid
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
set row_security = off
as $$
begin
  if not private.can_manage_care() then
    raise exception 'Prayer and Care management denied.'
      using errcode = '42501';
  end if;

  if p_assigned_to_profile_id is not null and not exists (
    select 1 from public.profiles p
    where p.id = p_assigned_to_profile_id
      and p.status = 'active'
      and p.primary_role in (
        'platform_administrator',
        'youth_pastor',
        'staff_member'
      )
  ) then
    raise exception 'Eligible prayer request assignee not found.'
      using errcode = 'P0002';
  end if;

  update public.prayer_requests
  set
    assigned_to_profile_id = p_assigned_to_profile_id,
    updated_at = now()
  where id = p_prayer_request_id
    and status <> 'archived';

  if not found then
    raise exception 'Prayer request not found or archived.'
      using errcode = 'P0002';
  end if;

  perform private.write_care_audit(
    'prayer_request.assigned',
    'prayer_request',
    p_prayer_request_id,
    jsonb_build_object('assigned_to_profile_id', p_assigned_to_profile_id)
  );
end;
$$;

create or replace function public.answer_prayer_request(
  p_prayer_request_id uuid,
  p_answer_summary text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
set row_security = off
as $$
begin
  if not private.can_manage_care() then
    raise exception 'Prayer and Care management denied.'
      using errcode = '42501';
  end if;

  if p_answer_summary is not null
     and length(btrim(p_answer_summary)) not between 1 and 5000 then
    raise exception 'Answer summary must contain between 1 and 5000 characters.'
      using errcode = '22023';
  end if;

  update public.prayer_requests
  set
    status = 'answered',
    answered_at = now(),
    answered_by_profile_id = auth.uid(),
    answer_summary = nullif(btrim(p_answer_summary), ''),
    archived_at = null,
    updated_at = now()
  where id = p_prayer_request_id
    and status = 'active';

  if not found then
    raise exception 'Active prayer request not found.'
      using errcode = 'P0002';
  end if;

  perform private.write_care_audit(
    'prayer_request.answered',
    'prayer_request',
    p_prayer_request_id
  );
end;
$$;

create or replace function public.archive_prayer_request(
  p_prayer_request_id uuid
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
set row_security = off
as $$
begin
  if not private.can_manage_care() then
    raise exception 'Prayer and Care management denied.'
      using errcode = '42501';
  end if;

  update public.prayer_requests
  set
    status = 'archived',
    archived_at = now(),
    answered_at = null,
    answered_by_profile_id = null,
    answer_summary = null,
    updated_at = now()
  where id = p_prayer_request_id
    and status <> 'archived';

  if not found then
    raise exception 'Prayer request not found or already archived.'
      using errcode = 'P0002';
  end if;

  perform private.write_care_audit(
    'prayer_request.archived',
    'prayer_request',
    p_prayer_request_id
  );
end;
$$;

create or replace function public.list_care_notes(
  p_search text default null,
  p_person_id uuid default null,
  p_include_archived boolean default false
)
returns table (
  care_note_id uuid,
  person_id uuid,
  person_name text,
  category_id uuid,
  category_name text,
  title text,
  note_content text,
  occurred_at timestamp with time zone,
  created_by_profile_id uuid,
  created_by_name text,
  archived_at timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
begin
  if not private.can_manage_care() then
    raise exception 'Prayer and Care access denied.'
      using errcode = '42501';
  end if;

  return query
  select
    n.id,
    n.person_id,
    concat_ws(' ', coalesce(nullif(p.preferred_name, ''), p.first_name), p.last_name),
    n.category_id,
    c.name,
    n.title,
    n.note_content,
    n.occurred_at,
    n.created_by_profile_id,
    creator.display_name,
    n.archived_at,
    n.created_at,
    n.updated_at
  from public.care_notes n
  join public.people p on p.id = n.person_id
  join public.profiles creator on creator.id = n.created_by_profile_id
  left join public.care_categories c on c.id = n.category_id
  where
    (p_include_archived or n.archived_at is null)
    and (p_person_id is null or n.person_id = p_person_id)
    and (
      nullif(btrim(p_search), '') is null
      or n.title ilike '%' || btrim(p_search) || '%'
      or n.note_content ilike '%' || btrim(p_search) || '%'
      or concat_ws(
        ' ',
        coalesce(nullif(p.preferred_name, ''), p.first_name),
        p.last_name
      ) ilike '%' || btrim(p_search) || '%'
    )
  order by n.occurred_at desc, n.created_at desc;
end;
$$;

create or replace function public.get_care_note(
  p_care_note_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
declare
  v_result jsonb;
begin
  if not private.can_manage_care() then
    raise exception 'Prayer and Care access denied.'
      using errcode = '42501';
  end if;

  select jsonb_build_object(
    'care_note_id', n.id,
    'person_id', n.person_id,
    'person_name', concat_ws(
      ' ',
      coalesce(nullif(p.preferred_name, ''), p.first_name),
      p.last_name
    ),
    'category_id', n.category_id,
    'category_name', c.name,
    'title', n.title,
    'note_content', n.note_content,
    'occurred_at', n.occurred_at,
    'created_by_profile_id', n.created_by_profile_id,
    'created_by_name', creator.display_name,
    'archived_at', n.archived_at,
    'created_at', n.created_at,
    'updated_at', n.updated_at
  )
  into v_result
  from public.care_notes n
  join public.people p on p.id = n.person_id
  join public.profiles creator on creator.id = n.created_by_profile_id
  left join public.care_categories c on c.id = n.category_id
  where n.id = p_care_note_id;

  if v_result is null then
    raise exception 'Care note not found.'
      using errcode = 'P0002';
  end if;

  return v_result;
end;
$$;

create or replace function public.create_care_note(
  p_person_id uuid,
  p_category_id uuid,
  p_title text,
  p_note_content text,
  p_occurred_at timestamp with time zone default now()
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
set row_security = off
as $$
declare
  v_note_id uuid;
begin
  if not private.can_manage_care() then
    raise exception 'Prayer and Care management denied.'
      using errcode = '42501';
  end if;

  if length(btrim(coalesce(p_title, ''))) not between 1 and 200 then
    raise exception 'Care note title must contain between 1 and 200 characters.'
      using errcode = '22023';
  end if;

  if length(btrim(coalesce(p_note_content, ''))) not between 1 and 10000 then
    raise exception 'Care note content must contain between 1 and 10000 characters.'
      using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.people p
    where p.id = p_person_id and p.status <> 'archived'
  ) then
    raise exception 'Person not found or archived.'
      using errcode = 'P0002';
  end if;

  if p_category_id is not null and not exists (
    select 1 from public.care_categories c
    where c.id = p_category_id and c.archived_at is null and c.is_active
  ) then
    raise exception 'Active care category not found.'
      using errcode = 'P0002';
  end if;

  insert into public.care_notes (
    person_id,
    category_id,
    title,
    note_content,
    occurred_at,
    created_by_profile_id
  )
  values (
    p_person_id,
    p_category_id,
    btrim(p_title),
    btrim(p_note_content),
    coalesce(p_occurred_at, now()),
    auth.uid()
  )
  returning id into v_note_id;

  perform private.write_care_audit(
    'care_note.created',
    'care_note',
    v_note_id,
    jsonb_build_object('person_id', p_person_id)
  );

  return v_note_id;
end;
$$;

create or replace function public.update_care_note(
  p_care_note_id uuid,
  p_category_id uuid,
  p_title text,
  p_note_content text,
  p_occurred_at timestamp with time zone
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
set row_security = off
as $$
begin
  if not private.can_manage_care() then
    raise exception 'Prayer and Care management denied.'
      using errcode = '42501';
  end if;

  if length(btrim(coalesce(p_title, ''))) not between 1 and 200 then
    raise exception 'Care note title must contain between 1 and 200 characters.'
      using errcode = '22023';
  end if;

  if length(btrim(coalesce(p_note_content, ''))) not between 1 and 10000 then
    raise exception 'Care note content must contain between 1 and 10000 characters.'
      using errcode = '22023';
  end if;

  if p_category_id is not null and not exists (
    select 1 from public.care_categories c
    where c.id = p_category_id and c.archived_at is null and c.is_active
  ) then
    raise exception 'Active care category not found.'
      using errcode = 'P0002';
  end if;

  update public.care_notes
  set
    category_id = p_category_id,
    title = btrim(p_title),
    note_content = btrim(p_note_content),
    occurred_at = coalesce(p_occurred_at, occurred_at),
    updated_at = now()
  where id = p_care_note_id
    and archived_at is null;

  if not found then
    raise exception 'Active care note not found.'
      using errcode = 'P0002';
  end if;

  perform private.write_care_audit(
    'care_note.updated',
    'care_note',
    p_care_note_id
  );
end;
$$;

create or replace function public.archive_care_note(
  p_care_note_id uuid
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
set row_security = off
as $$
begin
  if not private.can_manage_care() then
    raise exception 'Prayer and Care management denied.'
      using errcode = '42501';
  end if;

  update public.care_notes
  set archived_at = now(), updated_at = now()
  where id = p_care_note_id and archived_at is null;

  if not found then
    raise exception 'Active care note not found.'
      using errcode = 'P0002';
  end if;

  perform private.write_care_audit(
    'care_note.archived',
    'care_note',
    p_care_note_id
  );
end;
$$;

create or replace function public.list_care_follow_ups(
  p_search text default null,
  p_status public.care_follow_up_status default null,
  p_priority public.care_follow_up_priority default null,
  p_person_id uuid default null,
  p_assigned_to_profile_id uuid default null,
  p_include_archived boolean default false
)
returns table (
  care_follow_up_id uuid,
  person_id uuid,
  person_name text,
  prayer_request_id uuid,
  prayer_request_title text,
  care_note_id uuid,
  care_note_title text,
  title text,
  instructions text,
  priority public.care_follow_up_priority,
  follow_up_status public.care_follow_up_status,
  assigned_to_profile_id uuid,
  assigned_to_name text,
  created_by_profile_id uuid,
  created_by_name text,
  due_at timestamp with time zone,
  completed_at timestamp with time zone,
  completed_by_profile_id uuid,
  completed_by_name text,
  completion_notes text,
  cancelled_at timestamp with time zone,
  cancelled_by_profile_id uuid,
  cancelled_by_name text,
  cancellation_reason text,
  archived_at timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
begin
  if not private.can_manage_care() then
    raise exception 'Prayer and Care access denied.'
      using errcode = '42501';
  end if;

  return query
  select
    f.id,
    f.person_id,
    concat_ws(' ', coalesce(nullif(p.preferred_name, ''), p.first_name), p.last_name),
    f.prayer_request_id,
    r.title,
    f.care_note_id,
    n.title,
    f.title,
    f.instructions,
    f.priority,
    f.status,
    f.assigned_to_profile_id,
    assignee.display_name,
    f.created_by_profile_id,
    creator.display_name,
    f.due_at,
    f.completed_at,
    f.completed_by_profile_id,
    completer.display_name,
    f.completion_notes,
    f.cancelled_at,
    f.cancelled_by_profile_id,
    canceller.display_name,
    f.cancellation_reason,
    f.archived_at,
    f.created_at,
    f.updated_at
  from public.care_follow_ups f
  join public.people p on p.id = f.person_id
  join public.profiles assignee on assignee.id = f.assigned_to_profile_id
  join public.profiles creator on creator.id = f.created_by_profile_id
  left join public.prayer_requests r on r.id = f.prayer_request_id
  left join public.care_notes n on n.id = f.care_note_id
  left join public.profiles completer on completer.id = f.completed_by_profile_id
  left join public.profiles canceller on canceller.id = f.cancelled_by_profile_id
  where
    (p_include_archived or f.archived_at is null)
    and (p_status is null or f.status = p_status)
    and (p_priority is null or f.priority = p_priority)
    and (p_person_id is null or f.person_id = p_person_id)
    and (
      p_assigned_to_profile_id is null
      or f.assigned_to_profile_id = p_assigned_to_profile_id
    )
    and (
      nullif(btrim(p_search), '') is null
      or f.title ilike '%' || btrim(p_search) || '%'
      or coalesce(f.instructions, '') ilike '%' || btrim(p_search) || '%'
      or concat_ws(
        ' ',
        coalesce(nullif(p.preferred_name, ''), p.first_name),
        p.last_name
      ) ilike '%' || btrim(p_search) || '%'
    )
  order by
    case f.priority
      when 'urgent' then 1
      when 'high' then 2
      when 'normal' then 3
      when 'low' then 4
    end,
    f.due_at nulls last,
    f.created_at desc;
end;
$$;

create or replace function public.get_care_follow_up(
  p_care_follow_up_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
declare
  v_result jsonb;
begin
  if not private.can_manage_care() then
    raise exception 'Prayer and Care access denied.'
      using errcode = '42501';
  end if;

  select jsonb_build_object(
    'care_follow_up_id', f.id,
    'person_id', f.person_id,
    'person_name', concat_ws(
      ' ',
      coalesce(nullif(p.preferred_name, ''), p.first_name),
      p.last_name
    ),
    'prayer_request_id', f.prayer_request_id,
    'prayer_request_title', r.title,
    'care_note_id', f.care_note_id,
    'care_note_title', n.title,
    'title', f.title,
    'instructions', f.instructions,
    'priority', f.priority,
    'follow_up_status', f.status,
    'assigned_to_profile_id', f.assigned_to_profile_id,
    'assigned_to_name', assignee.display_name,
    'created_by_profile_id', f.created_by_profile_id,
    'created_by_name', creator.display_name,
    'due_at', f.due_at,
    'completed_at', f.completed_at,
    'completed_by_profile_id', f.completed_by_profile_id,
    'completed_by_name', completer.display_name,
    'completion_notes', f.completion_notes,
    'cancelled_at', f.cancelled_at,
    'cancelled_by_profile_id', f.cancelled_by_profile_id,
    'cancelled_by_name', canceller.display_name,
    'cancellation_reason', f.cancellation_reason,
    'archived_at', f.archived_at,
    'created_at', f.created_at,
    'updated_at', f.updated_at
  )
  into v_result
  from public.care_follow_ups f
  join public.people p on p.id = f.person_id
  join public.profiles assignee on assignee.id = f.assigned_to_profile_id
  join public.profiles creator on creator.id = f.created_by_profile_id
  left join public.prayer_requests r on r.id = f.prayer_request_id
  left join public.care_notes n on n.id = f.care_note_id
  left join public.profiles completer on completer.id = f.completed_by_profile_id
  left join public.profiles canceller on canceller.id = f.cancelled_by_profile_id
  where f.id = p_care_follow_up_id;

  if v_result is null then
    raise exception 'Care follow-up not found.'
      using errcode = 'P0002';
  end if;

  return v_result;
end;
$$;

create or replace function public.create_care_follow_up(
  p_person_id uuid,
  p_prayer_request_id uuid,
  p_care_note_id uuid,
  p_title text,
  p_instructions text,
  p_priority public.care_follow_up_priority,
  p_assigned_to_profile_id uuid,
  p_due_at timestamp with time zone default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
set row_security = off
as $$
declare
  v_follow_up_id uuid;
begin
  if not private.can_manage_care() then
    raise exception 'Prayer and Care management denied.'
      using errcode = '42501';
  end if;

  if length(btrim(coalesce(p_title, ''))) not between 1 and 200 then
    raise exception 'Follow-up title must contain between 1 and 200 characters.'
      using errcode = '22023';
  end if;

  if p_instructions is not null
     and length(btrim(p_instructions)) not between 1 and 5000 then
    raise exception 'Follow-up instructions must contain between 1 and 5000 characters.'
      using errcode = '22023';
  end if;

  if num_nonnulls(p_prayer_request_id, p_care_note_id) > 1 then
    raise exception 'A follow-up may reference one prayer request or one care note, not both.'
      using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.people p
    where p.id = p_person_id and p.status <> 'archived'
  ) then
    raise exception 'Person not found or archived.'
      using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = p_assigned_to_profile_id
      and p.status = 'active'
      and p.primary_role in (
        'platform_administrator',
        'youth_pastor',
        'staff_member'
      )
  ) then
    raise exception 'Eligible follow-up assignee not found.'
      using errcode = 'P0002';
  end if;

  if p_prayer_request_id is not null and not exists (
    select 1 from public.prayer_requests r
    where r.id = p_prayer_request_id and r.person_id = p_person_id
  ) then
    raise exception 'Prayer request does not belong to the selected person.'
      using errcode = '23514';
  end if;

  if p_care_note_id is not null and not exists (
    select 1 from public.care_notes n
    where n.id = p_care_note_id and n.person_id = p_person_id
  ) then
    raise exception 'Care note does not belong to the selected person.'
      using errcode = '23514';
  end if;

  insert into public.care_follow_ups (
    person_id,
    prayer_request_id,
    care_note_id,
    title,
    instructions,
    priority,
    assigned_to_profile_id,
    created_by_profile_id,
    due_at
  )
  values (
    p_person_id,
    p_prayer_request_id,
    p_care_note_id,
    btrim(p_title),
    nullif(btrim(p_instructions), ''),
    coalesce(p_priority, 'normal'),
    p_assigned_to_profile_id,
    auth.uid(),
    p_due_at
  )
  returning id into v_follow_up_id;

  perform private.write_care_audit(
    'care_follow_up.created',
    'care_follow_up',
    v_follow_up_id,
    jsonb_build_object(
      'person_id', p_person_id,
      'priority', coalesce(p_priority, 'normal'),
      'assigned_to_profile_id', p_assigned_to_profile_id
    )
  );

  return v_follow_up_id;
end;
$$;

create or replace function public.update_care_follow_up(
  p_care_follow_up_id uuid,
  p_title text,
  p_instructions text,
  p_priority public.care_follow_up_priority,
  p_assigned_to_profile_id uuid,
  p_due_at timestamp with time zone,
  p_status public.care_follow_up_status
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
set row_security = off
as $$
begin
  if not private.can_manage_care() then
    raise exception 'Prayer and Care management denied.'
      using errcode = '42501';
  end if;

  if p_status not in ('pending', 'in_progress') then
    raise exception 'Use the complete or cancel workflow for terminal follow-up statuses.'
      using errcode = '22023';
  end if;

  if length(btrim(coalesce(p_title, ''))) not between 1 and 200 then
    raise exception 'Follow-up title must contain between 1 and 200 characters.'
      using errcode = '22023';
  end if;

  if p_instructions is not null
     and length(btrim(p_instructions)) not between 1 and 5000 then
    raise exception 'Follow-up instructions must contain between 1 and 5000 characters.'
      using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = p_assigned_to_profile_id
      and p.status = 'active'
      and p.primary_role in (
        'platform_administrator',
        'youth_pastor',
        'staff_member'
      )
  ) then
    raise exception 'Eligible follow-up assignee not found.'
      using errcode = 'P0002';
  end if;

  update public.care_follow_ups
  set
    title = btrim(p_title),
    instructions = nullif(btrim(p_instructions), ''),
    priority = p_priority,
    assigned_to_profile_id = p_assigned_to_profile_id,
    due_at = p_due_at,
    status = p_status,
    updated_at = now()
  where id = p_care_follow_up_id
    and archived_at is null
    and status in ('pending', 'in_progress');

  if not found then
    raise exception 'Open care follow-up not found.'
      using errcode = 'P0002';
  end if;

  perform private.write_care_audit(
    'care_follow_up.updated',
    'care_follow_up',
    p_care_follow_up_id,
    jsonb_build_object(
      'priority', p_priority,
      'status', p_status,
      'assigned_to_profile_id', p_assigned_to_profile_id
    )
  );
end;
$$;

create or replace function public.complete_care_follow_up(
  p_care_follow_up_id uuid,
  p_completion_notes text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
set row_security = off
as $$
begin
  if not private.can_manage_care() then
    raise exception 'Prayer and Care management denied.'
      using errcode = '42501';
  end if;

  if p_completion_notes is not null
     and length(btrim(p_completion_notes)) not between 1 and 5000 then
    raise exception 'Completion notes must contain between 1 and 5000 characters.'
      using errcode = '22023';
  end if;

  update public.care_follow_ups
  set
    status = 'completed',
    completed_at = now(),
    completed_by_profile_id = auth.uid(),
    completion_notes = nullif(btrim(p_completion_notes), ''),
    cancelled_at = null,
    cancelled_by_profile_id = null,
    cancellation_reason = null,
    updated_at = now()
  where id = p_care_follow_up_id
    and archived_at is null
    and status in ('pending', 'in_progress');

  if not found then
    raise exception 'Open care follow-up not found.'
      using errcode = 'P0002';
  end if;

  perform private.write_care_audit(
    'care_follow_up.completed',
    'care_follow_up',
    p_care_follow_up_id
  );
end;
$$;

create or replace function public.cancel_care_follow_up(
  p_care_follow_up_id uuid,
  p_cancellation_reason text
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
set row_security = off
as $$
begin
  if not private.can_manage_care() then
    raise exception 'Prayer and Care management denied.'
      using errcode = '42501';
  end if;

  if length(btrim(coalesce(p_cancellation_reason, ''))) not between 1 and 1000 then
    raise exception 'Cancellation reason must contain between 1 and 1000 characters.'
      using errcode = '22023';
  end if;

  update public.care_follow_ups
  set
    status = 'cancelled',
    cancelled_at = now(),
    cancelled_by_profile_id = auth.uid(),
    cancellation_reason = btrim(p_cancellation_reason),
    completed_at = null,
    completed_by_profile_id = null,
    completion_notes = null,
    updated_at = now()
  where id = p_care_follow_up_id
    and archived_at is null
    and status in ('pending', 'in_progress');

  if not found then
    raise exception 'Open care follow-up not found.'
      using errcode = 'P0002';
  end if;

  perform private.write_care_audit(
    'care_follow_up.cancelled',
    'care_follow_up',
    p_care_follow_up_id
  );
end;
$$;

create or replace function public.archive_care_follow_up(
  p_care_follow_up_id uuid
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
set row_security = off
as $$
begin
  if not private.can_manage_care() then
    raise exception 'Prayer and Care management denied.'
      using errcode = '42501';
  end if;

  update public.care_follow_ups
  set archived_at = now(), updated_at = now()
  where id = p_care_follow_up_id
    and archived_at is null
    and status in ('completed', 'cancelled');

  if not found then
    raise exception 'Completed or cancelled follow-up not found.'
      using errcode = 'P0002';
  end if;

  perform private.write_care_audit(
    'care_follow_up.archived',
    'care_follow_up',
    p_care_follow_up_id
  );
end;
$$;

-- Restrict all RPCs to authenticated application users.
revoke all on function public.list_care_categories(boolean)
  from public, anon;
revoke all on function public.create_care_category(text, text, integer)
  from public, anon;
revoke all on function public.update_care_category(uuid, text, text, integer, boolean)
  from public, anon;
revoke all on function public.archive_care_category(uuid)
  from public, anon;

revoke all on function public.list_prayer_requests(
  text,
  public.prayer_request_status,
  uuid,
  uuid,
  boolean
) from public, anon;
revoke all on function public.get_prayer_request(uuid)
  from public, anon;
revoke all on function public.create_prayer_request(
  uuid,
  uuid,
  text,
  text,
  public.prayer_request_visibility,
  uuid
) from public, anon;
revoke all on function public.update_prayer_request(
  uuid,
  uuid,
  text,
  text,
  public.prayer_request_visibility
) from public, anon;
revoke all on function public.assign_prayer_request(uuid, uuid)
  from public, anon;
revoke all on function public.answer_prayer_request(uuid, text)
  from public, anon;
revoke all on function public.archive_prayer_request(uuid)
  from public, anon;

revoke all on function public.list_care_notes(text, uuid, boolean)
  from public, anon;
revoke all on function public.get_care_note(uuid)
  from public, anon;
revoke all on function public.create_care_note(
  uuid,
  uuid,
  text,
  text,
  timestamp with time zone
) from public, anon;
revoke all on function public.update_care_note(
  uuid,
  uuid,
  text,
  text,
  timestamp with time zone
) from public, anon;
revoke all on function public.archive_care_note(uuid)
  from public, anon;

revoke all on function public.list_care_follow_ups(
  text,
  public.care_follow_up_status,
  public.care_follow_up_priority,
  uuid,
  uuid,
  boolean
) from public, anon;
revoke all on function public.get_care_follow_up(uuid)
  from public, anon;
revoke all on function public.create_care_follow_up(
  uuid,
  uuid,
  uuid,
  text,
  text,
  public.care_follow_up_priority,
  uuid,
  timestamp with time zone
) from public, anon;
revoke all on function public.update_care_follow_up(
  uuid,
  text,
  text,
  public.care_follow_up_priority,
  uuid,
  timestamp with time zone,
  public.care_follow_up_status
) from public, anon;
revoke all on function public.complete_care_follow_up(uuid, text)
  from public, anon;
revoke all on function public.cancel_care_follow_up(uuid, text)
  from public, anon;
revoke all on function public.archive_care_follow_up(uuid)
  from public, anon;

grant execute on function public.list_care_categories(boolean)
  to authenticated;
grant execute on function public.create_care_category(text, text, integer)
  to authenticated;
grant execute on function public.update_care_category(uuid, text, text, integer, boolean)
  to authenticated;
grant execute on function public.archive_care_category(uuid)
  to authenticated;

grant execute on function public.list_prayer_requests(
  text,
  public.prayer_request_status,
  uuid,
  uuid,
  boolean
) to authenticated;
grant execute on function public.get_prayer_request(uuid)
  to authenticated;
grant execute on function public.create_prayer_request(
  uuid,
  uuid,
  text,
  text,
  public.prayer_request_visibility,
  uuid
) to authenticated;
grant execute on function public.update_prayer_request(
  uuid,
  uuid,
  text,
  text,
  public.prayer_request_visibility
) to authenticated;
grant execute on function public.assign_prayer_request(uuid, uuid)
  to authenticated;
grant execute on function public.answer_prayer_request(uuid, text)
  to authenticated;
grant execute on function public.archive_prayer_request(uuid)
  to authenticated;

grant execute on function public.list_care_notes(text, uuid, boolean)
  to authenticated;
grant execute on function public.get_care_note(uuid)
  to authenticated;
grant execute on function public.create_care_note(
  uuid,
  uuid,
  text,
  text,
  timestamp with time zone
) to authenticated;
grant execute on function public.update_care_note(
  uuid,
  uuid,
  text,
  text,
  timestamp with time zone
) to authenticated;
grant execute on function public.archive_care_note(uuid)
  to authenticated;

grant execute on function public.list_care_follow_ups(
  text,
  public.care_follow_up_status,
  public.care_follow_up_priority,
  uuid,
  uuid,
  boolean
) to authenticated;
grant execute on function public.get_care_follow_up(uuid)
  to authenticated;
grant execute on function public.create_care_follow_up(
  uuid,
  uuid,
  uuid,
  text,
  text,
  public.care_follow_up_priority,
  uuid,
  timestamp with time zone
) to authenticated;
grant execute on function public.update_care_follow_up(
  uuid,
  text,
  text,
  public.care_follow_up_priority,
  uuid,
  timestamp with time zone,
  public.care_follow_up_status
) to authenticated;
grant execute on function public.complete_care_follow_up(uuid, text)
  to authenticated;
grant execute on function public.cancel_care_follow_up(uuid, text)
  to authenticated;
grant execute on function public.archive_care_follow_up(uuid)
  to authenticated;

comment on function private.write_care_audit(text, text, uuid, jsonb) is
  'Writes a minimal Prayer and Care audit event without copying confidential care content into audit metadata.';

comment on function public.list_care_categories(boolean) is
  'Lists active or archived Prayer and Care categories for authorized care users.';

comment on function public.list_prayer_requests(
  text,
  public.prayer_request_status,
  uuid,
  uuid,
  boolean
) is
  'Lists person-based prayer requests for authorized Prayer and Care users.';

comment on function public.get_prayer_request(uuid) is
  'Returns one complete prayer request workspace record to an authorized care user.';

comment on function public.list_care_notes(text, uuid, boolean) is
  'Lists confidential pastoral care notes for authorized Prayer and Care users.';

comment on function public.get_care_note(uuid) is
  'Returns one confidential care note workspace record to an authorized care user.';

comment on function public.list_care_follow_ups(
  text,
  public.care_follow_up_status,
  public.care_follow_up_priority,
  uuid,
  uuid,
  boolean
) is
  'Lists Prayer and Care follow-up assignments for authorized care users.';

comment on function public.get_care_follow_up(uuid) is
  'Returns one Prayer and Care follow-up workspace record to an authorized care user.';

commit;