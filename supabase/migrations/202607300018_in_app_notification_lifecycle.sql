begin;

create or replace function public.get_my_unread_notification_count()
returns integer
language plpgsql stable security definer
set search_path = '' set row_security = off
as $$
begin
  if not private.current_profile_is_active() then
    raise exception 'Notification access is denied.' using errcode = '42501';
  end if;
  return (
    select count(*)::integer
    from public.in_app_notifications
    where recipient_profile_id = (select auth.uid())
      and read_at is null
  );
end;
$$;

create or replace function public.mark_my_notification_read(
  p_notification_id uuid
)
returns void
language plpgsql security definer
set search_path = '' set row_security = off
as $$
begin
  if not private.current_profile_is_active() then
    raise exception 'Notification update is denied.' using errcode = '42501';
  end if;
  update public.in_app_notifications
  set read_at = coalesce(read_at, now())
  where id = p_notification_id
    and recipient_profile_id = (select auth.uid());
  if not found then
    raise exception 'Notification update is denied.' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.mark_all_my_notifications_read()
returns integer
language plpgsql security definer
set search_path = '' set row_security = off
as $$
declare updated_count integer;
begin
  if not private.current_profile_is_active() then
    raise exception 'Notification update is denied.' using errcode = '42501';
  end if;
  update public.in_app_notifications
  set read_at = now()
  where recipient_profile_id = (select auth.uid())
    and read_at is null;
  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

revoke all on function public.get_my_unread_notification_count()
  from public, anon, authenticated;
revoke all on function public.mark_my_notification_read(uuid)
  from public, anon, authenticated;
revoke all on function public.mark_all_my_notifications_read()
  from public, anon, authenticated;

grant execute on function public.get_my_unread_notification_count()
  to authenticated;
grant execute on function public.mark_my_notification_read(uuid)
  to authenticated;
grant execute on function public.mark_all_my_notifications_read()
  to authenticated;

commit;
