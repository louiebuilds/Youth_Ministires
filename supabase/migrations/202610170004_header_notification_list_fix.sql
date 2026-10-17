
begin;

-- Fix Notification Center dropdown column naming.
-- Preserve existing authorization and notification data.

create or replace function public.list_header_notifications(
  p_limit integer default 20
)
returns table (
  notification_type text,
  notification_id uuid,
  title text,
  occurred_at timestamptz,
  read_at timestamptz,
  href text
)
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
begin
  if not private.current_profile_is_active() then
    raise exception 'Notification access is denied.'
      using errcode = '42501';
  end if;

  if p_limit not between 1 and 50 then
    raise exception 'Notification limit is invalid.'
      using errcode = '22023';
  end if;

  return query
  select
    items.notification_type,
    items.notification_id,
    items.title,
    items.occurred_at,
    items.read_at,
    items.href
  from (
    select
      'notification'::text,
      n.id,
      n.title,
      n.created_at,
      n.read_at,
      '/communications'::text
    from public.in_app_notifications n
    where n.recipient_profile_id = (select auth.uid())

    union all

    select
      'announcement'::text,
      a.id,
      a.title,
      a.published_at,
      rs.read_at,
      '/communications/' || a.id::text
    from public.announcements a
    left join public.announcement_read_states rs
      on rs.announcement_id = a.id
      and rs.profile_id = (select auth.uid())
    where a.published_at is not null
      and a.published_at <= now()
      and a.published_at >=
        '2026-10-17 00:00:00+00'::timestamptz
      and a.archived_at is null
      and (a.expires_at is null or a.expires_at > now())
      and (
        private.can_manage_communications()
        or private.can_view_announcement_audience(
          a.audience_type
        )
      )

    union all

    select
      'chat'::text,
      r.room_id,
      r.room_name || ' — ' ||
        r.unread_count::text || ' unread',
      r.last_message_at,
      null::timestamptz,
      '/communications/chat/' || r.room_id::text
    from public.list_chat_rooms() r
    where r.archived_at is null
      and r.unread_count > 0
  ) as items (
    notification_type,
    notification_id,
    title,
    occurred_at,
    read_at,
    href
  )
  order by items.occurred_at desc nulls last
  limit p_limit;
end;
$$;

revoke all on function public.list_header_notifications(integer)
  from public, anon, authenticated;

grant execute on function public.list_header_notifications(integer)
  to authenticated;

comment on function public.list_header_notifications(integer) is
  'Returns authorized header notifications ordered by occurrence time.';

commit;
