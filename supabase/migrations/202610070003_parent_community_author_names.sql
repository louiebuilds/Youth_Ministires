create or replace function public.get_community_author_display_names(
  p_profile_ids uuid[]
)
returns table (
  profile_id uuid,
  display_name text
)
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if not private.can_view_parent_community() then
    raise exception 'Community access required.';
  end if;

  return query
  select
    p.id as profile_id,
    p.display_name
  from public.profiles p
  where p.id = any(p_profile_ids);
end;
$$;

revoke all on function public.get_community_author_display_names(uuid[])
from public;

grant execute on function public.get_community_author_display_names(uuid[])
to authenticated;