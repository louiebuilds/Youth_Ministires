begin;

create or replace function public.preview_communication_recipients(
  p_audience_type public.communication_audience_type,
  p_channel public.communication_channel
)
returns table (
  recipient_profile_id uuid,
  display_name text,
  destination_masked text,
  preference_authorized boolean,
  suppression_reason text
)
language plpgsql stable security definer
set search_path = '' set row_security = off
as $$
begin
  if not private.can_manage_communications() then
    raise exception 'Communication recipient preview is denied.'
      using errcode = '42501';
  end if;
  if p_audience_type not in ('parents', 'volunteers') then
    raise exception 'Communication audience is invalid.' using errcode = '22023';
  end if;
  return query
  with recipients as (
    select
      pr.id,
      pr.display_name,
      pr.primary_role,
      pe.phone,
      au.email,
      coalesce(bool_or(hm.receive_email), false) as parent_email_allowed,
      coalesce(bool_or(hm.receive_sms), false) as parent_sms_allowed
    from public.profiles pr
    left join public.people pe on pe.id = pr.person_id
    left join auth.users au on au.id = pr.id
    left join public.household_memberships hm on hm.person_id = pr.person_id
    where pr.status = 'active'
      and (
        (p_audience_type = 'parents' and pr.primary_role = 'parent')
        or (p_audience_type = 'volunteers' and pr.primary_role = 'volunteer')
      )
    group by pr.id, pr.display_name, pr.primary_role, pe.phone, au.email
  )
  select
    r.id,
    r.display_name,
    case
      when p_channel = 'in_app' then 'In-app'
      when p_channel = 'email' and r.email is not null
        then left(r.email, 1) || '***@' || split_part(r.email, '@', 2)
      when p_channel = 'sms' and r.phone is not null
        then '***-***-' || right(regexp_replace(r.phone, '[^0-9]', '', 'g'), 4)
      else null
    end,
    case
      when p_channel = 'in_app' then true
      when p_channel = 'email' and r.email is not null
        and (
          r.primary_role = 'volunteer'
          or r.parent_email_allowed
        ) then true
      when p_channel = 'sms' and r.phone is not null
        and (
          r.primary_role = 'volunteer'
          or r.parent_sms_allowed
        ) then true
      else false
    end,
    case
      when p_channel = 'email' and r.email is null then 'No email address'
      when p_channel = 'sms' and r.phone is null then 'No mobile number'
      when p_channel = 'email' and r.primary_role = 'parent'
        and not r.parent_email_allowed then 'Email preference disabled'
      when p_channel = 'sms' and r.primary_role = 'parent'
        and not r.parent_sms_allowed then 'SMS preference disabled'
      else null
    end
  from recipients r
  order by r.display_name, r.id;
end;
$$;

create or replace function public.send_synthetic_communication(
  p_title text,
  p_subject text,
  p_message_body text,
  p_channel public.communication_channel,
  p_audience_type public.communication_audience_type,
  p_template_id uuid default null
)
returns uuid
language plpgsql security definer
set search_path = '' set row_security = off
as $$
declare
  new_id uuid;
  recipient record;
  new_recipient_id uuid;
  eligible_count integer := 0;
  suppressed_count integer := 0;
begin
  if not private.can_manage_communications() then
    raise exception 'Communication delivery is denied.' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_title, ''))) not between 1 and 200
    or length(btrim(coalesce(p_message_body, ''))) not between 1 and 10000
    or p_audience_type not in ('parents', 'volunteers')
    or (p_channel = 'email'
      and length(btrim(coalesce(p_subject, ''))) not between 1 and 200)
    or (p_channel <> 'email'
      and nullif(btrim(coalesce(p_subject, '')), '') is not null)
    or (p_template_id is not null and not exists (
      select 1 from public.communication_templates
      where id = p_template_id and archived_at is null and channel = p_channel
    )) then
    raise exception 'Communication details are invalid.' using errcode = '22023';
  end if;

  insert into public.communications (
    title, subject, message_body, channel, audience_type, status, template_id,
    sent_at, synthetic_delivery, created_by_profile_id
  ) values (
    btrim(p_title), nullif(btrim(coalesce(p_subject, '')), ''),
    btrim(p_message_body), p_channel, p_audience_type, 'delivered',
    p_template_id, now(), true, (select auth.uid())
  ) returning id into new_id;

  for recipient in
    select * from public.preview_communication_recipients(
      p_audience_type, p_channel
    )
  loop
    insert into public.communication_recipients (
      communication_id, recipient_profile_id, display_name,
      destination_masked, preference_authorized, suppression_reason
    ) values (
      new_id, recipient.recipient_profile_id, recipient.display_name,
      recipient.destination_masked, recipient.preference_authorized,
      recipient.suppression_reason
    ) returning id into new_recipient_id;

    if recipient.preference_authorized then
      eligible_count := eligible_count + 1;
      insert into public.communication_deliveries (
        communication_recipient_id, status, provider_reference,
        attempted_at, delivered_at
      ) values (
        new_recipient_id, 'delivered',
        'synthetic:' || extensions.gen_random_uuid()::text, now(), now()
      );
      if p_channel = 'in_app' then
        insert into public.in_app_notifications (
          recipient_profile_id, communication_id, title, message_body
        ) values (
          recipient.recipient_profile_id, new_id, btrim(p_title),
          btrim(p_message_body)
        );
      end if;
    else
      suppressed_count := suppressed_count + 1;
      insert into public.communication_deliveries (
        communication_recipient_id, status
      ) values (new_recipient_id, 'suppressed');
    end if;
  end loop;

  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    (select auth.uid()), 'communication.synthetic_delivered',
    'communication', new_id, 'success', 'web',
    jsonb_build_object(
      'channel', p_channel,
      'audienceType', p_audience_type,
      'eligibleCount', eligible_count,
      'suppressedCount', suppressed_count,
      'syntheticDelivery', true
    )
  );
  return new_id;
end;
$$;

create or replace function public.list_communication_history(
  p_search text default null
)
returns table (
  communication_id uuid,
  title text,
  channel public.communication_channel,
  audience_type public.communication_audience_type,
  communication_status public.communication_status,
  sent_at timestamp with time zone,
  delivered_count bigint,
  suppressed_count bigint,
  synthetic_delivery boolean
)
language plpgsql stable security definer
set search_path = '' set row_security = off
as $$
declare normalized_search text;
begin
  if not private.can_manage_communications() then
    raise exception 'Communication history access is denied.'
      using errcode = '42501';
  end if;
  normalized_search := nullif(btrim(coalesce(p_search, '')), '');
  if normalized_search is not null and length(normalized_search) > 100 then
    raise exception 'Communication search is invalid.' using errcode = '22023';
  end if;
  return query
  select
    c.id, c.title, c.channel, c.audience_type, c.status, c.sent_at,
    count(*) filter (where d.status = 'delivered'),
    count(*) filter (where d.status = 'suppressed'),
    c.synthetic_delivery
  from public.communications c
  left join public.communication_recipients r on r.communication_id = c.id
  left join public.communication_deliveries d
    on d.communication_recipient_id = r.id
  where normalized_search is null
    or lower(c.title) like '%' || lower(normalized_search) || '%'
    or lower(c.message_body) like '%' || lower(normalized_search) || '%'
  group by c.id
  order by c.created_at desc;
end;
$$;

create or replace function public.list_my_in_app_notifications()
returns table (
  notification_id uuid,
  title text,
  message_body text,
  read_at timestamp with time zone,
  created_at timestamp with time zone
)
language plpgsql stable security definer
set search_path = '' set row_security = off
as $$
begin
  if not private.current_profile_is_active() then
    raise exception 'Notification access is denied.' using errcode = '42501';
  end if;
  return query
  select n.id, n.title, n.message_body, n.read_at, n.created_at
  from public.in_app_notifications n
  where n.recipient_profile_id = (select auth.uid())
  order by n.created_at desc;
end;
$$;

revoke all on function public.preview_communication_recipients(
  public.communication_audience_type, public.communication_channel
) from public, anon, authenticated;
revoke all on function public.send_synthetic_communication(
  text, text, text, public.communication_channel,
  public.communication_audience_type, uuid
) from public, anon, authenticated;
revoke all on function public.list_communication_history(text)
  from public, anon, authenticated;
revoke all on function public.list_my_in_app_notifications()
  from public, anon, authenticated;

grant execute on function public.preview_communication_recipients(
  public.communication_audience_type, public.communication_channel
) to authenticated;
grant execute on function public.send_synthetic_communication(
  text, text, text, public.communication_channel,
  public.communication_audience_type, uuid
) to authenticated;
grant execute on function public.list_communication_history(text)
  to authenticated;
grant execute on function public.list_my_in_app_notifications()
  to authenticated;

commit;
