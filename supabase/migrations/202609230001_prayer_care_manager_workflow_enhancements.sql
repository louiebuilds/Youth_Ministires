begin;

create or replace function public.update_care_note_details(
  p_care_note_id uuid,
  p_person_id uuid,
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
declare
  v_existing public.care_notes%rowtype;
  v_linked_follow_ups_reassigned integer := 0;
begin
  if not private.can_manage_care() then
    raise exception 'Prayer and Care management denied.' using errcode = '42501';
  end if;

  select *
  into v_existing
  from public.care_notes
  where id = p_care_note_id
  for update;

  if not found or v_existing.archived_at is not null then
    raise exception 'Active care note not found.' using errcode = 'P0002';
  end if;

  if not exists (
    select 1
    from public.people p
    where p.id = p_person_id
      and p.status <> 'archived'
  ) then
    raise exception 'Person not found or archived.' using errcode = 'P0002';
  end if;

  if p_category_id is not null and not exists (
    select 1
    from public.care_categories c
    where c.id = p_category_id
      and c.archived_at is null
      and c.is_active
  ) then
    raise exception 'Active care category not found.' using errcode = 'P0002';
  end if;

  if length(btrim(coalesce(p_title, ''))) not between 1 and 200
     or length(btrim(coalesce(p_note_content, ''))) not between 1 and 10000 then
    raise exception 'Care note details are invalid.' using errcode = '22023';
  end if;

  update public.care_notes
  set person_id = p_person_id,
      category_id = p_category_id,
      title = btrim(p_title),
      note_content = btrim(p_note_content),
      occurred_at = coalesce(p_occurred_at, occurred_at),
      updated_at = now()
  where id = p_care_note_id;

  if p_person_id is distinct from v_existing.person_id then
    update public.care_follow_ups
    set person_id = p_person_id,
        updated_at = now()
    where care_note_id = p_care_note_id
      and person_id is distinct from p_person_id;

    get diagnostics v_linked_follow_ups_reassigned = row_count;
  end if;

  perform private.write_care_audit(
    'care_note.updated',
    'care_note',
    p_care_note_id,
    jsonb_build_object(
      'person_id', p_person_id,
      'category_id', p_category_id,
      'linked_follow_ups_reassigned', v_linked_follow_ups_reassigned
    )
  );
end;
$$;

create or replace function public.update_care_follow_up_details(
  p_care_follow_up_id uuid,
  p_person_id uuid,
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
declare
  v_existing public.care_follow_ups%rowtype;
begin
  if not private.can_manage_care() then
    raise exception 'Prayer and Care management denied.' using errcode = '42501';
  end if;

  select *
  into v_existing
  from public.care_follow_ups
  where id = p_care_follow_up_id
  for update;

  if not found
     or v_existing.archived_at is not null
     or v_existing.status not in ('pending', 'in_progress') then
    raise exception 'Open care follow-up not found.' using errcode = 'P0002';
  end if;

  if p_status not in ('pending', 'in_progress') then
    raise exception 'Use the complete or cancel workflow for terminal follow-up statuses.'
      using errcode = '22023';
  end if;

  if v_existing.care_note_id is not null
     and not exists (
       select 1
       from public.care_notes cn
       where cn.id = v_existing.care_note_id
         and cn.person_id = p_person_id
     ) then
    raise exception 'A linked follow-up must retain its source Person.'
      using errcode = '23514';
  end if;

  if v_existing.prayer_request_id is not null
     and not exists (
       select 1
       from public.prayer_requests pr
       where pr.id = v_existing.prayer_request_id
         and pr.person_id = p_person_id
     ) then
    raise exception 'A linked follow-up must retain its source Person.'
      using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.people p
    where p.id = p_person_id
      and p.status <> 'archived'
  ) then
    raise exception 'Person not found or archived.' using errcode = 'P0002';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = p_assigned_to_profile_id
      and p.status = 'active'
      and p.primary_role in (
        'platform_administrator',
        'youth_pastor',
        'staff_member'
      )
  ) then
    raise exception 'Eligible follow-up assignee not found.' using errcode = 'P0002';
  end if;

  if length(btrim(coalesce(p_title, ''))) not between 1 and 200
     or (
       p_instructions is not null
       and length(btrim(p_instructions)) not between 1 and 5000
     ) then
    raise exception 'Follow-up details are invalid.' using errcode = '22023';
  end if;

  update public.care_follow_ups
  set person_id = p_person_id,
      title = btrim(p_title),
      instructions = nullif(btrim(p_instructions), ''),
      priority = p_priority,
      assigned_to_profile_id = p_assigned_to_profile_id,
      due_at = p_due_at,
      status = p_status,
      updated_at = now()
  where id = p_care_follow_up_id;

  perform private.write_care_audit(
    'care_follow_up.updated',
    'care_follow_up',
    p_care_follow_up_id,
    jsonb_build_object(
      'person_id', p_person_id,
      'priority', p_priority,
      'status', p_status,
      'assigned_to_profile_id', p_assigned_to_profile_id,
      'source_type',
      case
        when v_existing.care_note_id is not null then 'care_note'
        when v_existing.prayer_request_id is not null then 'prayer_request'
        else null
      end
    )
  );
end;
$$;

revoke all on function public.update_care_note_details(
  uuid,
  uuid,
  uuid,
  text,
  text,
  timestamp with time zone
) from public, anon;

grant execute on function public.update_care_note_details(
  uuid,
  uuid,
  uuid,
  text,
  text,
  timestamp with time zone
) to authenticated;

revoke all on function public.update_care_follow_up_details(
  uuid,
  uuid,
  text,
  text,
  public.care_follow_up_priority,
  uuid,
  timestamp with time zone,
  public.care_follow_up_status
) from public, anon;

grant execute on function public.update_care_follow_up_details(
  uuid,
  uuid,
  text,
  text,
  public.care_follow_up_priority,
  uuid,
  timestamp with time zone,
  public.care_follow_up_status
) to authenticated;

comment on function public.update_care_note_details(
  uuid,
  uuid,
  uuid,
  text,
  text,
  timestamp with time zone
) is
  'Updates an active confidential care record, including a validated Person correction, keeps linked follow-ups source-consistent, and excludes narrative content from audit metadata.';

comment on function public.update_care_follow_up_details(
  uuid,
  uuid,
  text,
  text,
  public.care_follow_up_priority,
  uuid,
  timestamp with time zone,
  public.care_follow_up_status
) is
  'Updates an open follow-up while keeping a linked source Person immutable and terminal lifecycle changes separate.';

commit;