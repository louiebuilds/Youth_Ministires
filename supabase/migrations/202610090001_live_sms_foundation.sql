begin;

alter table public.communications
  drop constraint communications_live_channel_check;

alter table public.communications
  add constraint communications_live_channel_check check (
    synthetic_delivery
    or (channel in ('email', 'sms') and delivery_mode = 'live')
  );

create or replace function private.can_send_live_sms()
returns boolean
language sql stable security definer
set search_path = '' set row_security = off
as $$
  select private.current_profile_is_active()
    and private.has_role(array[
      'platform_administrator',
      'youth_pastor'
    ]::public.account_role[])
$$;

create or replace function private.normalize_sms_phone(p_phone text)
returns text
language plpgsql immutable
set search_path = ''
as $$
declare
  raw_phone text := btrim(coalesce(p_phone, ''));
  digits text;
begin
  if raw_phone = '' then return null; end if;
  digits := regexp_replace(raw_phone, '[^0-9]', '', 'g');

  if raw_phone like '+%' then
    if raw_phone !~ '^\+[0-9 ()-]+$'
      or digits !~ '^[1-9][0-9]{7,14}$' then
      return null;
    end if;
    if left(digits, 1) = '1'
      and (length(digits) <> 11
        or substring(digits from 2 for 1) !~ '[2-9]'
        or substring(digits from 5 for 1) !~ '[2-9]') then
      return null;
    end if;
    return '+' || digits;
  end if;

  if length(digits) = 11 and left(digits, 1) = '1' then
    digits := right(digits, 10);
  end if;
  if length(digits) <> 10
    or substring(digits from 1 for 1) !~ '[2-9]'
    or substring(digits from 4 for 1) !~ '[2-9]' then
    return null;
  end if;
  return '+1' || digits;
end;
$$;

revoke all on function private.can_send_live_sms()
  from public, anon, authenticated;
revoke all on function private.normalize_sms_phone(text)
  from public, anon, authenticated;
grant execute on function private.can_send_live_sms()
  to authenticated;

create or replace function public.preview_live_sms_recipients(
  p_audience_type public.communication_audience_type,
  p_allowlist text[]
)
returns table (
  recipient_profile_id uuid,
  display_name text,
  destination_masked text,
  preference_authorized boolean,
  live_send_allowed boolean,
  suppression_reason text
)
language plpgsql stable security definer
set search_path = '' set row_security = off
as $$
begin
  if not private.can_send_live_sms() then
    raise exception 'Live SMS recipient preview is denied.' using errcode = '42501';
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
      private.normalize_sms_phone(pe.phone) as phone,
      coalesce(bool_or(hm.receive_sms), false) as parent_sms_allowed
    from public.profiles pr
    left join public.people pe on pe.id = pr.person_id
    left join public.household_memberships hm on hm.person_id = pr.person_id
    where pr.status = 'active'
      and (
        (p_audience_type = 'parents' and pr.primary_role = 'parent')
        or (p_audience_type = 'volunteers' and pr.primary_role = 'volunteer')
      )
    group by pr.id, pr.display_name, pr.primary_role, pe.phone
  )
  select
    r.id,
    r.display_name,
    case when r.phone is null then null else '***-***-' || right(r.phone, 4) end,
    r.phone is not null and (
      r.primary_role = 'volunteer' or r.parent_sms_allowed
    ),
    r.phone is not null
      and (r.primary_role = 'volunteer' or r.parent_sms_allowed)
      and r.phone = any(coalesce(p_allowlist, array[]::text[])),
    case
      when r.phone is null then 'No valid mobile number'
      when r.primary_role = 'parent' and not r.parent_sms_allowed
        then 'SMS preference disabled'
      when not (r.phone = any(coalesce(p_allowlist, array[]::text[])))
        then 'Not included in live SMS beta'
      else null
    end
  from recipients r
  order by r.display_name, r.id;
end;
$$;

create or replace function public.create_live_sms_communication(
  p_title text,
  p_message_body text,
  p_audience_type public.communication_audience_type,
  p_template_id uuid,
  p_allowlist text[],
  p_confirmed_recipient_count integer,
  p_idempotency_key uuid
)
returns uuid
language plpgsql security definer
set search_path = '' set row_security = off
as $$
declare
  new_id uuid;
  existing_id uuid;
  recipient record;
  new_recipient_id uuid;
  allowed_count integer;
begin
  if not private.can_send_live_sms() then
    raise exception 'Live SMS delivery is denied.' using errcode = '42501';
  end if;
  select id into existing_id from public.communications
  where idempotency_key = p_idempotency_key
    and created_by_profile_id = (select auth.uid())
    and channel = 'sms' and delivery_mode = 'live';
  if existing_id is not null then return existing_id; end if;

  if length(btrim(coalesce(p_title, ''))) not between 1 and 200
    or length(btrim(coalesce(p_message_body, ''))) not between 1 and 10000
    or p_audience_type not in ('parents', 'volunteers')
    or coalesce(cardinality(p_allowlist), 0) = 0
    or (p_template_id is not null and not exists (
      select 1 from public.communication_templates
      where id = p_template_id and archived_at is null and channel = 'sms'
    )) then
    raise exception 'Live SMS details are invalid.' using errcode = '22023';
  end if;

  select count(*) into allowed_count
  from public.preview_live_sms_recipients(p_audience_type, p_allowlist)
  where live_send_allowed;
  if allowed_count = 0 or allowed_count <> p_confirmed_recipient_count then
    raise exception 'Live SMS recipient confirmation is stale.' using errcode = '22023';
  end if;

  begin
    insert into public.communications (
      title, subject, message_body, channel, audience_type, status, template_id,
      synthetic_delivery, delivery_mode, provider_name, idempotency_key,
      created_by_profile_id
    ) values (
      btrim(p_title), null, btrim(p_message_body), 'sms', p_audience_type,
      'sending', p_template_id, false, 'live', 'twilio', p_idempotency_key,
      (select auth.uid())
    ) returning id into new_id;
  exception when unique_violation then
    select id into existing_id from public.communications
    where idempotency_key = p_idempotency_key
      and created_by_profile_id = (select auth.uid())
      and channel = 'sms' and delivery_mode = 'live';
    if existing_id is null then raise; end if;
    return existing_id;
  end;

  for recipient in
    select * from public.preview_live_sms_recipients(p_audience_type, p_allowlist)
  loop
    insert into public.communication_recipients (
      communication_id, recipient_profile_id, display_name,
      destination_masked, destination_address, preference_authorized,
      suppression_reason
    ) values (
      new_id, recipient.recipient_profile_id, recipient.display_name,
      recipient.destination_masked,
      case when recipient.live_send_allowed then (
        select private.normalize_sms_phone(pe.phone)
        from public.profiles pr
        join public.people pe on pe.id = pr.person_id
        where pr.id = recipient.recipient_profile_id
      ) else null end,
      recipient.preference_authorized,
      recipient.suppression_reason
    ) returning id into new_recipient_id;

    insert into public.communication_deliveries (
      communication_recipient_id, status, provider_name, submission_key
    ) values (
      new_recipient_id,
      case when recipient.live_send_allowed
        then 'pending'::public.communication_delivery_status
        else 'suppressed'::public.communication_delivery_status end,
      case when recipient.live_send_allowed then 'twilio' else null end,
      case when recipient.live_send_allowed
        then new_id::text || ':' || recipient.recipient_profile_id::text
        else null end
    );
  end loop;

  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    (select auth.uid()), 'communication.live_sms_created', 'communication',
    new_id, 'success', 'web', jsonb_build_object(
      'channel', 'sms', 'audienceType', p_audience_type,
      'liveRecipientCount', allowed_count, 'provider', 'twilio'
    )
  );
  return new_id;
end;
$$;

create or replace function public.claim_live_sms_delivery(
  p_communication_id uuid
)
returns table (
  delivery_id uuid,
  phone_number text,
  message_body text,
  submission_key text
)
language plpgsql security definer
set search_path = '' set row_security = off
as $$
begin
  if not private.can_send_live_sms() then
    raise exception 'Live SMS delivery is denied.' using errcode = '42501';
  end if;
  return query
  with claimed as (
    select d.id, r.destination_address, d.submission_key
    from public.communication_deliveries d
    join public.communication_recipients r
      on r.id = d.communication_recipient_id
    join public.communications c on c.id = r.communication_id
    where c.id = p_communication_id
      and c.created_by_profile_id = (select auth.uid())
      and c.channel = 'sms' and c.delivery_mode = 'live'
      and d.status = 'pending' and d.attempted_at is null
    order by d.created_at, d.id
    for update of d skip locked
    limit 1
  ), marked as (
    update public.communication_deliveries d
    set attempted_at = now(), updated_at = now()
    from claimed
    where d.id = claimed.id
    returning d.id, claimed.destination_address, claimed.submission_key
  )
  select m.id, m.destination_address, c.message_body, m.submission_key
  from marked m
  join public.communication_deliveries d on d.id = m.id
  join public.communication_recipients r on r.id = d.communication_recipient_id
  join public.communications c on c.id = r.communication_id;
end;
$$;

create or replace function public.finalize_live_sms_delivery(
  p_delivery_id uuid,
  p_success boolean,
  p_provider_reference text,
  p_failure_reason text
)
returns void
language plpgsql security definer
set search_path = '' set row_security = off
as $$
declare target_communication_id uuid;
begin
  if not private.can_send_live_sms() then
    raise exception 'Live SMS delivery finalization is denied.' using errcode = '42501';
  end if;
  update public.communication_deliveries d set
    status = case when p_success
      then 'sent'::public.communication_delivery_status
      else 'failed'::public.communication_delivery_status end,
    provider_reference = case when p_success
      then nullif(btrim(p_provider_reference), '') else null end,
    failure_reason = case when p_success then null
      else left(coalesce(nullif(btrim(p_failure_reason), ''),
        'The provider did not accept the text message.'), 1000) end,
    submitted_at = case when p_success then now() else null end,
    updated_at = now()
  from public.communication_recipients r
  join public.communications c on c.id = r.communication_id
  where d.id = p_delivery_id
    and r.id = d.communication_recipient_id
    and c.created_by_profile_id = (select auth.uid())
    and c.channel = 'sms' and c.delivery_mode = 'live'
    and d.status = 'pending' and d.attempted_at is not null
  returning c.id into target_communication_id;
  if target_communication_id is null then
    raise exception 'Live SMS delivery cannot be finalized.' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.communication_deliveries d
    join public.communication_recipients r on r.id = d.communication_recipient_id
    where r.communication_id = target_communication_id and d.status = 'pending'
  ) then
    update public.communications c set
      status = case when exists (
        select 1 from public.communication_deliveries d
        join public.communication_recipients r
          on r.id = d.communication_recipient_id
        where r.communication_id = target_communication_id and d.status = 'failed'
      ) then 'failed'::public.communication_status
        else 'sending'::public.communication_status end,
      sent_at = now(), provider_submission_completed_at = now(),
      failure_reason = case when exists (
        select 1 from public.communication_deliveries d
        join public.communication_recipients r
          on r.id = d.communication_recipient_id
        where r.communication_id = target_communication_id and d.status = 'failed'
      ) then 'One or more text messages were not accepted by the provider.' else null end,
      updated_at = now()
    where c.id = target_communication_id;
  end if;
end;
$$;

create or replace function public.get_live_sms_send_result(
  p_communication_id uuid
)
returns table (
  sent_count bigint,
  failed_count bigint,
  suppressed_count bigint,
  pending_count bigint
)
language plpgsql stable security definer
set search_path = '' set row_security = off
as $$
begin
  if not private.can_send_live_sms() then
    raise exception 'Live SMS result access is denied.' using errcode = '42501';
  end if;
  return query
  select
    count(*) filter (where d.status = 'sent'),
    count(*) filter (where d.status = 'failed'),
    count(*) filter (where d.status = 'suppressed'),
    count(*) filter (where d.status = 'pending')
  from public.communications c
  join public.communication_recipients r on r.communication_id = c.id
  join public.communication_deliveries d on d.communication_recipient_id = r.id
  where c.id = p_communication_id
    and c.created_by_profile_id = (select auth.uid())
    and c.channel = 'sms' and c.delivery_mode = 'live';
end;
$$;

revoke all on function public.preview_live_sms_recipients(
  public.communication_audience_type, text[]
) from public, anon, authenticated;
revoke all on function public.create_live_sms_communication(
  text, text, public.communication_audience_type, uuid, text[], integer, uuid
) from public, anon, authenticated;
revoke all on function public.claim_live_sms_delivery(uuid)
  from public, anon, authenticated;
revoke all on function public.finalize_live_sms_delivery(
  uuid, boolean, text, text
) from public, anon, authenticated;
revoke all on function public.get_live_sms_send_result(uuid)
  from public, anon, authenticated;

grant execute on function public.preview_live_sms_recipients(
  public.communication_audience_type, text[]
) to authenticated;
grant execute on function public.create_live_sms_communication(
  text, text, public.communication_audience_type, uuid, text[], integer, uuid
) to authenticated;
grant execute on function public.claim_live_sms_delivery(uuid)
  to authenticated;
grant execute on function public.finalize_live_sms_delivery(
  uuid, boolean, text, text
) to authenticated;
grant execute on function public.get_live_sms_send_result(uuid)
  to authenticated;

comment on function public.claim_live_sms_delivery(uuid) is
  'Claims one pending live-SMS delivery exactly once before provider submission.';
comment on function private.normalize_sms_phone(text) is
  'Normalizes valid NANP and explicit international phone values for server-side SMS safety checks.';

-- Deferred production compliance work: documented consent evidence, STOP/START/HELP,
-- provider opt-out synchronization, quiet hours, and complaint/abuse handling.

commit;
