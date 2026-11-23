begin;

create or replace function public.create_live_email_communication(
  p_title text,
  p_subject text,
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
  recipient_snapshot jsonb;
begin
  if not private.can_send_live_email() then
    raise exception 'Live email delivery is denied.' using errcode = '42501';
  end if;
  select id into existing_id from public.communications
  where idempotency_key = p_idempotency_key;
  if existing_id is not null then
    if not exists (select 1 from public.communications where id = existing_id
      and created_by_profile_id = (select auth.uid()) and channel = 'email' and delivery_mode = 'live') then
      raise exception 'Email operation access denied.' using errcode = '42501';
    end if;
    return existing_id;
  end if;

  if p_idempotency_key is null or p_confirmed_recipient_count is null
    or p_confirmed_recipient_count < 1
    or length(btrim(coalesce(p_title, ''))) not between 1 and 200
    or length(btrim(coalesce(p_subject, ''))) not between 1 and 200
    or length(btrim(coalesce(p_message_body, ''))) not between 1 and 10000
    or p_audience_type is null or p_audience_type not in ('parents', 'volunteers', 'ministry')
    or coalesce(cardinality(p_allowlist), 0) = 0
    or (p_template_id is not null and not exists (
      select 1 from public.communication_templates
      where id = p_template_id and archived_at is null and channel = 'email'
    )) then
    raise exception 'Live email details are invalid.' using errcode = '22023';
  end if;

  -- Capture eligibility, policy, deduplication and destination in one statement snapshot.
  -- Subsequent count/queue operations must never select a different recipient set.
  select coalesce(jsonb_agg(to_jsonb(candidate) || jsonb_build_object(
    'email_address', lower(btrim(u.email)))), '[]'::jsonb)
  into recipient_snapshot
  from public.preview_live_email_recipients(p_audience_type, p_allowlist) candidate
  join auth.users u on u.id = candidate.recipient_profile_id;
  select count(*) into allowed_count from jsonb_array_elements(recipient_snapshot) item
  where (item->>'live_send_allowed')::boolean;
  if allowed_count = 0 or allowed_count <> p_confirmed_recipient_count then
    raise exception 'Live email recipient confirmation is stale.' using errcode = '22023';
  end if;

  begin
    insert into public.communications (
      title, subject, message_body, channel, audience_type, status, template_id,
      synthetic_delivery, delivery_mode, provider_name, idempotency_key,
      created_by_profile_id
    ) values (
      btrim(p_title), btrim(p_subject), btrim(p_message_body), 'email',
      p_audience_type, 'sending', p_template_id, false, 'live', 'resend',
      p_idempotency_key, (select auth.uid())
    ) returning id into new_id;
  exception when unique_violation then
    select id into existing_id from public.communications
    where idempotency_key = p_idempotency_key
      and created_by_profile_id = (select auth.uid());
    if existing_id is null then raise; end if;
    return existing_id;
  end;

  for recipient in
    select * from jsonb_to_recordset(recipient_snapshot) as snapshot(
      recipient_profile_id uuid, display_name text, destination_masked text,
      preference_authorized boolean, live_send_allowed boolean,
      suppression_reason text, email_address text
    )
  loop
    insert into public.communication_recipients (
      communication_id, recipient_profile_id, display_name,
      destination_masked, destination_address, preference_authorized,
      suppression_reason
    ) values (
      new_id, recipient.recipient_profile_id, recipient.display_name,
      recipient.destination_masked,
      case when recipient.live_send_allowed then recipient.email_address else null end,
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
      case when recipient.live_send_allowed then 'resend' else null end,
      case when recipient.live_send_allowed
        then new_id::text || ':' || recipient.recipient_profile_id::text
        else null end
    );
  end loop;

  insert into public.audit_events (
    actor_profile_id, action, entity_type, entity_id, result, source, metadata
  ) values (
    (select auth.uid()), 'communication.live_email_created', 'communication',
    new_id, 'success', 'web', jsonb_build_object(
      'channel', 'email', 'audienceType', p_audience_type,
      'liveRecipientCount', allowed_count, 'provider', 'resend'
    )
  );
  return new_id;
end;
$$;


commit;
