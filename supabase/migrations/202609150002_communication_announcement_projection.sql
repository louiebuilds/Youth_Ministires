begin;

drop function public.list_announcements(text, boolean);

create function public.list_announcements(
  p_search text default null,
  p_include_archived boolean default false
)
returns table (
  announcement_id uuid,
  title text,
  message_body text,
  audience_type public.communication_audience_type,
  published_at timestamp with time zone,
  expires_at timestamp with time zone,
  archived_at timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  can_manage boolean
)
language plpgsql stable security definer
set search_path = '' set row_security = off
as $$
declare
  normalized_search text;
  manager boolean := private.can_manage_communications();
begin
  if not private.current_profile_is_active() then
    raise exception 'Announcement access is denied.' using errcode = '42501';
  end if;
  normalized_search := nullif(btrim(coalesce(p_search, '')), '');
  if normalized_search is not null and length(normalized_search) > 100 then
    raise exception 'Announcement search is invalid.' using errcode = '22023';
  end if;
  return query
  select
    a.id, a.title, a.message_body, a.audience_type, a.published_at,
    a.expires_at, a.archived_at, a.created_at, a.updated_at, manager
  from public.announcements a
  where (
      manager
      or (
        a.published_at is not null
        and a.published_at <= now()
        and a.archived_at is null
        and (a.expires_at is null or a.expires_at > now())
        and private.can_view_announcement_audience(a.audience_type)
      )
    )
    and (p_include_archived or a.archived_at is null)
    and (
      normalized_search is null
      or lower(a.title) like '%' || lower(normalized_search) || '%'
      or lower(a.message_body) like '%' || lower(normalized_search) || '%'
    )
  order by coalesce(a.published_at, a.created_at) desc, a.title;
end;
$$;

revoke all on function public.list_announcements(text, boolean)
  from public, anon, authenticated;
grant execute on function public.list_announcements(text, boolean)
  to authenticated;

commit;
