
begin;

-- Youth Ministries Platform
-- Notification Center unread improvements
--
-- 1. Count all unread header items without the dropdown limit.
-- 2. Extend Mark All as Read to authorized chat conversations.
-- 3. Preserve private-group membership visibility.
-- 4. Never move a chat read position backward.
-- 5. Leave messages arriving after the operation unread.

create or replace function public.get_header_unread_count()
returns bigint
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
declare
  v_notification_count bigint := 0;
  v_announcement_count bigint := 0;
  v_chat_count bigint := 0;
begin
  if not private.current_profile_is_active() then
    raise exception 'Notification access is denied.'
      using errcode = '42501';
  end if;

  -- Personal in-app notifications.
  select count(*)
  into v_notification_count
  from public.in_app_notifications n
  where n.recipient_profile_id = (select auth.uid())
    and n.read_at is null;

  -- Eligible announcements published after feature launch.
  select count(*)
  into v_announcement_count
  from public.announcements a
  where a.published_at is not null
    and a.published_at <= now()
    and a.published_at >=
      '2026-10-17 00:00:00+00'::timestamptz
    and a.archived_at is null
    and (
      a.expires_at is null
      or a.expires_at > now()
    )
    and (
      private.can_manage_communications()
      or private.can_view_announcement_audience(
        a.audience_type
      )
    )
    and not exists (
      select 1
      from public.announcement_read_states rs
      where rs.announcement_id = a.id
        and rs.profile_id = (select auth.uid())
    );

  -- One unread notification per authorized conversation.
  -- list_chat_rooms() already applies the platform's
  -- existing chat visibility and unread-count rules.
  select count(*)
  into v_chat_count
  from public.list_chat_rooms() r
  where r.archived_at is null
    and r.unread_count > 0;

  return
    v_notification_count
    + v_announcement_count
    + v_chat_count;
end;
$$;

revoke all on function public.get_header_unread_count()
  from public, anon, authenticated;

grant execute on function public.get_header_unread_count()
  to authenticated;

comment on function public.get_header_unread_count() is
  'Counts unread personal notifications, eligible announcements, and authorized unread chat conversations without a dropdown limit.';


-- Extend the existing Mark All as Read function.
-- Keep its original return type and notification behavior.

create or replace function
  public.mark_all_header_notifications_read()
returns integer
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  v_changed integer := 0;
  v_added integer := 0;
  v_chat_changed integer := 0;
  v_rows_changed integer := 0;

  v_room record;
  v_message_id uuid;
  v_message_at timestamptz;

  -- Only messages existing at the beginning of
  -- this operation are eligible to be marked read.
  v_cutoff timestamptz := statement_timestamp();
begin
  if not private.current_profile_is_active() then
    raise exception 'Notification access is denied.'
      using errcode = '42501';
  end if;

  -- Mark personal notifications read.
  update public.in_app_notifications
  set read_at = now()
  where recipient_profile_id = (select auth.uid())
    and read_at is null;

  get diagnostics v_changed = row_count;

  -- Mark authorized announcements read.
  insert into public.announcement_read_states (
    announcement_id,
    profile_id
  )
  select
    a.id,
    (select auth.uid())
  from public.announcements a
  where a.published_at is not null
    and a.published_at <= v_cutoff
    and a.published_at >=
      '2026-10-17 00:00:00+00'::timestamptz
    and a.archived_at is null
    and (
      a.expires_at is null
      or a.expires_at > now()
    )
    and (
      private.can_manage_communications()
      or private.can_view_announcement_audience(
        a.audience_type
      )
    )
  on conflict (announcement_id, profile_id)
  do nothing;

  get diagnostics v_added = row_count;

  -- Process only authorized rooms with unread activity.
  -- Skip archived rooms, consistent with the header list.
  for v_room in
    select
      r.room_id,
      r.is_parent_managed
    from public.list_chat_rooms() r
    where r.archived_at is null
      and r.unread_count > 0
  loop

    -- Recheck access before advancing read state.
    if not private.can_read_chat_room(v_room.room_id) then
      continue;
    end if;

    v_message_id := null;
    v_message_at := null;

    -- Select the latest eligible message.
    -- For ordinary members of parent-managed groups,
    -- exclude messages before their active join time.
    -- Chat managers retain their existing access.
    select
      m.id,
      m.created_at
    into
      v_message_id,
      v_message_at
    from public.chat_messages m
    where m.room_id = v_room.room_id
      and m.removed_at is null
      and m.created_at <= v_cutoff
      and (
        not v_room.is_parent_managed
        or private.can_manage_chat()
        or m.created_at >= (
          select membership.joined_at
          from public.chat_room_members membership
          where membership.room_id = v_room.room_id
            and membership.profile_id = (select auth.uid())
            and membership.removed_at is null
          order by membership.joined_at desc
          limit 1
        )
      )
    order by m.created_at desc, m.id desc
    limit 1;

    if v_message_id is null then
      continue;
    end if;

    -- Store the latest eligible read position.
    -- The existing composite foreign key ensures that
    -- the message belongs to the correct room.
    insert into public.chat_read_state (
      room_id,
      profile_id,
      last_read_message_id,
      last_read_at,
      updated_at
    )
    values (
      v_room.room_id,
      (select auth.uid()),
      v_message_id,
      v_message_at,
      now()
    )
    on conflict (room_id, profile_id)
    do update set
      last_read_message_id =
        excluded.last_read_message_id,
      last_read_at = excluded.last_read_at,
      updated_at = now()
    where public.chat_read_state.last_read_at
      <= excluded.last_read_at;

    get diagnostics v_rows_changed = row_count;

    v_chat_changed :=
      v_chat_changed + v_rows_changed;

  end loop;

  return
    v_changed
    + v_added
    + v_chat_changed;
end;
$$;

revoke all on function
  public.mark_all_header_notifications_read()
  from public, anon, authenticated;

grant execute on function
  public.mark_all_header_notifications_read()
  to authenticated;

comment on function
  public.mark_all_header_notifications_read() is
  'Marks eligible personal notifications, announcements, and authorized conversations read through their latest eligible existing messages.';

commit;
