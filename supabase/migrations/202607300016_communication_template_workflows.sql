begin;

create or replace function public.list_communication_templates(
  p_search text default null,
  p_include_archived boolean default false
)
returns table (
  template_id uuid,
  name text,
  channel public.communication_channel,
  subject text,
  message_body text,
  archived_at timestamp with time zone,
  updated_at timestamp with time zone
)
language plpgsql stable security definer
set search_path = '' set row_security = off
as $$
declare normalized_search text;
begin
  if not private.can_manage_communications() then
    raise exception 'Communication template access is denied.'
      using errcode = '42501';
  end if;
  normalized_search := nullif(btrim(coalesce(p_search, '')), '');
  if normalized_search is not null and length(normalized_search) > 100 then
    raise exception 'Template search is invalid.' using errcode = '22023';
  end if;
  return query
  select
    t.id, t.name, t.channel, t.subject, t.message_body, t.archived_at,
    t.updated_at
  from public.communication_templates t
  where (p_include_archived or t.archived_at is null)
    and (
      normalized_search is null
      or lower(t.name) like '%' || lower(normalized_search) || '%'
      or lower(coalesce(t.subject, ''))
        like '%' || lower(normalized_search) || '%'
      or lower(t.message_body) like '%' || lower(normalized_search) || '%'
    )
  order by t.updated_at desc, t.name;
end;
$$;

create or replace function public.create_communication_template(
  p_name text,
  p_channel public.communication_channel,
  p_subject text,
  p_message_body text
)
returns uuid
language plpgsql security definer
set search_path = '' set row_security = off
as $$
declare new_id uuid;
begin
  if not private.can_manage_communications() then
    raise exception 'Communication template creation is denied.'
      using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_name, ''))) not between 1 and 150
    or length(btrim(coalesce(p_message_body, ''))) not between 1 and 10000
    or (
      p_channel = 'email'
      and length(btrim(coalesce(p_subject, ''))) not between 1 and 200
    )
    or (
      p_channel <> 'email'
      and nullif(btrim(coalesce(p_subject, '')), '') is not null
    ) then
    raise exception 'Communication template details are invalid.'
      using errcode = '22023';
  end if;
  insert into public.communication_templates (
    name, channel, subject, message_body, created_by_profile_id
  ) values (
    btrim(p_name), p_channel,
    nullif(btrim(coalesce(p_subject, '')), ''), btrim(p_message_body),
    (select auth.uid())
  ) returning id into new_id;
  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    (select auth.uid()), 'communication.template_created',
    'communication_template', new_id, 'success', 'web',
    jsonb_build_object('channel', p_channel)
  );
  return new_id;
end;
$$;

create or replace function public.update_communication_template(
  p_template_id uuid,
  p_name text,
  p_channel public.communication_channel,
  p_subject text,
  p_message_body text
)
returns void
language plpgsql security definer
set search_path = '' set row_security = off
as $$
begin
  if not private.can_manage_communications() then
    raise exception 'Communication template update is denied.'
      using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_name, ''))) not between 1 and 150
    or length(btrim(coalesce(p_message_body, ''))) not between 1 and 10000
    or (
      p_channel = 'email'
      and length(btrim(coalesce(p_subject, ''))) not between 1 and 200
    )
    or (
      p_channel <> 'email'
      and nullif(btrim(coalesce(p_subject, '')), '') is not null
    ) then
    raise exception 'Communication template details are invalid.'
      using errcode = '22023';
  end if;
  update public.communication_templates set
    name = btrim(p_name),
    channel = p_channel,
    subject = nullif(btrim(coalesce(p_subject, '')), ''),
    message_body = btrim(p_message_body),
    updated_at = now()
  where id = p_template_id and archived_at is null;
  if not found then
    raise exception 'Communication template cannot be updated.'
      using errcode = '22023';
  end if;
  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    (select auth.uid()), 'communication.template_updated',
    'communication_template', p_template_id, 'success', 'web',
    jsonb_build_object('channel', p_channel)
  );
end;
$$;

create or replace function public.archive_communication_template(
  p_template_id uuid
)
returns void
language plpgsql security definer
set search_path = '' set row_security = off
as $$
begin
  if not private.can_manage_communications() then
    raise exception 'Communication template archive is denied.'
      using errcode = '42501';
  end if;
  update public.communication_templates
  set archived_at = now(), updated_at = now()
  where id = p_template_id and archived_at is null;
  if not found then
    raise exception 'Communication template cannot be archived.'
      using errcode = '22023';
  end if;
  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    (select auth.uid()), 'communication.template_archived',
    'communication_template', p_template_id, 'success', 'web', '{}'::jsonb
  );
end;
$$;

revoke all on function public.list_communication_templates(text, boolean)
  from public, anon, authenticated;
revoke all on function public.create_communication_template(
  text, public.communication_channel, text, text
) from public, anon, authenticated;
revoke all on function public.update_communication_template(
  uuid, text, public.communication_channel, text, text
) from public, anon, authenticated;
revoke all on function public.archive_communication_template(uuid)
  from public, anon, authenticated;

grant execute on function public.list_communication_templates(text, boolean)
  to authenticated;
grant execute on function public.create_communication_template(
  text, public.communication_channel, text, text
) to authenticated;
grant execute on function public.update_communication_template(
  uuid, text, public.communication_channel, text, text
) to authenticated;
grant execute on function public.archive_communication_template(uuid)
  to authenticated;

commit;
