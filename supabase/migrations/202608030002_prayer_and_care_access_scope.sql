begin;

-- Full Prayer & Care management is limited to ministry oversight roles.
-- Staff access is exposed only through the scoped functions below.
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
      'youth_pastor'
    ]::public.account_role[])
$$;

create or replace function private.is_active_staff_member()
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select private.current_profile_is_active()
    and private.has_role(array['staff_member']::public.account_role[])
$$;

revoke all on function private.is_active_staff_member()
  from public, anon, authenticated;
grant execute on function private.is_active_staff_member()
  to authenticated;

alter table public.care_notes
  add column assigned_to_profile_id uuid
    references public.profiles(id) on delete restrict;

create index care_notes_assignee_active_idx
  on public.care_notes (assigned_to_profile_id, occurred_at desc)
  where assigned_to_profile_id is not null and archived_at is null;

create or replace function public.list_public_prayer_summaries()
returns table (
  prayer_request_id uuid,
  title text,
  category_name text,
  request_status public.prayer_request_status,
  created_at timestamp with time zone,
  answered_at timestamp with time zone
)
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
begin
  if not private.current_profile_is_active() then
    raise exception 'Prayer summary access denied.' using errcode = '42501';
  end if;

  return query
  select
    r.id,
    r.title,
    c.name,
    r.status,
    r.created_at,
    r.answered_at
  from public.prayer_requests r
  left join public.care_categories c on c.id = r.category_id
  where r.visibility = 'public'
    and r.status in ('active', 'answered')
    and r.archived_at is null
  order by r.created_at desc;
end;
$$;

create or replace function public.list_visible_prayer_requests(
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
  request_status public.prayer_request_status,
  submitted_by_profile_id uuid,
  assigned_to_profile_id uuid,
  answer_summary text,
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
  if not (private.can_manage_care() or private.is_active_staff_member()) then
    raise exception 'Prayer request access denied.' using errcode = '42501';
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
    r.assigned_to_profile_id,
    r.answer_summary,
    r.created_at,
    r.updated_at
  from public.prayer_requests r
  join public.people p on p.id = r.person_id
  left join public.care_categories c on c.id = r.category_id
  where (p_include_archived or r.archived_at is null)
    and (
      private.can_manage_care()
      or r.visibility in ('public', 'leadership')
      or r.submitted_by_profile_id = auth.uid()
      or r.assigned_to_profile_id = auth.uid()
    )
  order by r.created_at desc;
end;
$$;

create or replace function public.list_assigned_care_notes()
returns table (
  care_note_id uuid,
  person_id uuid,
  person_name text,
  category_name text,
  title text,
  note_content text,
  occurred_at timestamp with time zone,
  created_at timestamp with time zone
)
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
begin
  if not private.is_active_staff_member() then
    raise exception 'Assigned care-note access denied.' using errcode = '42501';
  end if;

  return query
  select
    n.id,
    n.person_id,
    concat_ws(' ', coalesce(nullif(p.preferred_name, ''), p.first_name), p.last_name),
    c.name,
    n.title,
    n.note_content,
    n.occurred_at,
    n.created_at
  from public.care_notes n
  join public.people p on p.id = n.person_id
  left join public.care_categories c on c.id = n.category_id
  where n.assigned_to_profile_id = auth.uid()
    and n.archived_at is null
  order by n.occurred_at desc;
end;
$$;

create or replace function public.assign_care_note(
  p_care_note_id uuid,
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
    raise exception 'Care-note assignment denied.' using errcode = '42501';
  end if;

  if p_assigned_to_profile_id is not null and not exists (
    select 1 from public.profiles p
    where p.id = p_assigned_to_profile_id
      and p.status = 'active'
      and p.primary_role = 'staff_member'
  ) then
    raise exception 'Eligible staff assignee not found.' using errcode = 'P0002';
  end if;

  update public.care_notes
  set assigned_to_profile_id = p_assigned_to_profile_id, updated_at = now()
  where id = p_care_note_id and archived_at is null;

  if not found then
    raise exception 'Active care note not found.' using errcode = 'P0002';
  end if;

  perform private.write_care_audit(
    'care_note.assigned',
    'care_note',
    p_care_note_id,
    jsonb_build_object('assigned_to_profile_id', p_assigned_to_profile_id)
  );
end;
$$;

create or replace function public.list_my_care_follow_ups()
returns table (
  care_follow_up_id uuid,
  person_id uuid,
  person_name text,
  title text,
  instructions text,
  priority public.care_follow_up_priority,
  follow_up_status public.care_follow_up_status,
  due_at timestamp with time zone,
  created_at timestamp with time zone
)
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
begin
  if not private.is_active_staff_member() then
    raise exception 'Assigned follow-up access denied.' using errcode = '42501';
  end if;

  return query
  select
    f.id,
    f.person_id,
    concat_ws(' ', coalesce(nullif(p.preferred_name, ''), p.first_name), p.last_name),
    f.title,
    f.instructions,
    f.priority,
    f.status,
    f.due_at,
    f.created_at
  from public.care_follow_ups f
  join public.people p on p.id = f.person_id
  where f.assigned_to_profile_id = auth.uid()
    and f.archived_at is null
  order by f.due_at nulls last, f.created_at desc;
end;
$$;

revoke all on function public.list_public_prayer_summaries()
  from public, anon;
revoke all on function public.list_visible_prayer_requests(boolean)
  from public, anon;
revoke all on function public.list_assigned_care_notes()
  from public, anon;
revoke all on function public.assign_care_note(uuid, uuid)
  from public, anon;
revoke all on function public.list_my_care_follow_ups()
  from public, anon;

grant execute on function public.list_public_prayer_summaries()
  to authenticated;
grant execute on function public.list_visible_prayer_requests(boolean)
  to authenticated;
grant execute on function public.list_assigned_care_notes()
  to authenticated;
grant execute on function public.assign_care_note(uuid, uuid)
  to authenticated;
grant execute on function public.list_my_care_follow_ups()
  to authenticated;

comment on function public.list_public_prayer_summaries() is
  'Returns a deliberately identity-free public prayer projection to active signed-in accounts.';
comment on column public.care_notes.assigned_to_profile_id is
  'Optional explicit staff assignment; it does not broaden administrator or Youth Pastor oversight.';

commit;
