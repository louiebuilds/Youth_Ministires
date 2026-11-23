begin;

-- Deployment controls only: application roles and browser callers cannot configure these.
create table private.communication_email_delivery_policy (
  singleton boolean primary key default true check (singleton),
  delivery_policy text not null default 'restricted' check (delivery_policy in ('restricted','ministry'))
);
insert into private.communication_email_delivery_policy(singleton,delivery_policy) values (true,'restricted');
create table private.communication_email_delivery_operations (
  communication_id uuid primary key references public.communications(id) on delete restrict,
  delivery_policy text not null check (delivery_policy in ('restricted','ministry'))
);
alter table private.communication_email_delivery_policy enable row level security;
alter table private.communication_email_delivery_policy force row level security;
alter table private.communication_email_delivery_operations enable row level security;
alter table private.communication_email_delivery_operations force row level security;
revoke all on private.communication_email_delivery_policy, private.communication_email_delivery_operations
  from public, anon, authenticated, service_role;
comment on table private.communication_email_delivery_policy is
  'Trusted deployment operator only. Default restricted. Ministry permits eligible recipients without maintaining an allowlist; it also requires server delivery-policy configuration.';
comment on table private.communication_email_delivery_operations is
  'Immutable-by-client delivery policy captured when a communication is queued. Legacy operations remain restricted.';

create function private.communication_email_delivery_allowed(p_email text,p_delivery_policy text)
returns boolean language sql stable security definer set search_path = '' set row_security = off as $$
  select exists (
    select 1 from private.communication_email_delivery_policy policy where policy.singleton
      and ((p_delivery_policy='ministry' and policy.delivery_policy='ministry')
        or (p_delivery_policy='restricted' and exists (
          select 1 from private.communication_email_allowlist a where a.email=p_email
        )))
  );
$$;
revoke all on function private.communication_email_delivery_allowed(text,text) from public,anon,authenticated,service_role;

create function public.preview_live_email_recipients(
  p_audience_type public.communication_audience_type, p_allowlist text[], p_delivery_policy text
)
returns table (recipient_profile_id uuid, display_name text, destination_masked text,
  preference_authorized boolean, live_send_allowed boolean, suppression_reason text)
language plpgsql stable security definer set search_path = '' set row_security = off as $$
begin
  if not private.can_send_live_email() then
    raise exception 'Live email recipient preview is denied.' using errcode='42501';
  end if;
  if p_audience_type is null or p_audience_type not in ('parents','volunteers','ministry')
    or p_delivery_policy is null or p_delivery_policy not in ('restricted','ministry') then
    raise exception 'Email audience or delivery policy is invalid.' using errcode='22023';
  end if;
  return query select r.recipient_profile_id,r.display_name,r.destination_masked,r.preference_authorized,
    r.preference_authorized and private.communication_email_delivery_allowed(r.email,p_delivery_policy)
      and (p_delivery_policy='ministry' or r.email=any(coalesce(p_allowlist,array[]::text[]))),
    case when not r.preference_authorized then r.suppression_reason
      when p_delivery_policy='ministry' and not private.communication_email_delivery_allowed(r.email,p_delivery_policy)
        then 'Ministry delivery is not enabled by deployment policy'
      when p_delivery_policy='restricted' and (not private.communication_email_delivery_allowed(r.email,p_delivery_policy)
        or not (r.email=any(coalesce(p_allowlist,array[]::text[])))) then 'Not in live-email beta allowlist'
      else null end
  from private.communication_email_candidates(p_audience_type) r order by r.display_name,r.recipient_profile_id;
end;
$$;

-- Legacy callers always request restricted delivery; NULL/empty lists cannot opt into ministry mode.
create or replace function public.preview_live_email_recipients(
  p_audience_type public.communication_audience_type, p_allowlist text[]
)
returns table (recipient_profile_id uuid, display_name text, destination_masked text,
  preference_authorized boolean, live_send_allowed boolean, suppression_reason text)
language sql stable security definer set search_path = '' set row_security = off as $$
  select * from public.preview_live_email_recipients(p_audience_type,p_allowlist,'restricted');
$$;

create function public.create_live_email_communication(
  p_title text,
  p_subject text,
  p_message_body text,
  p_audience_type public.communication_audience_type,
  p_template_id uuid,
  p_allowlist text[],
  p_confirmed_recipient_count integer,
  p_idempotency_key uuid,
  p_delivery_policy text
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
      and created_by_profile_id = (select auth.uid()) and channel = 'email' and delivery_mode = 'live'
      and coalesce((select delivery_policy from private.communication_email_delivery_operations op where op.communication_id=public.communications.id),'restricted')=p_delivery_policy) then
      raise exception 'Email operation access denied.' using errcode = '42501';
    end if;
    return existing_id;
  end if;

  if p_delivery_policy is null or p_delivery_policy not in ('restricted','ministry')
    or p_idempotency_key is null or p_confirmed_recipient_count is null
    or p_confirmed_recipient_count < 1
    or length(btrim(coalesce(p_title, ''))) not between 1 and 200
    or length(btrim(coalesce(p_subject, ''))) not between 1 and 200
    or length(btrim(coalesce(p_message_body, ''))) not between 1 and 10000
    or p_audience_type is null or p_audience_type not in ('parents', 'volunteers', 'ministry')
    or (p_delivery_policy='restricted' and coalesce(cardinality(p_allowlist),0)=0)
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
  from public.preview_live_email_recipients(p_audience_type, p_allowlist, p_delivery_policy) candidate
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
      and created_by_profile_id = (select auth.uid())
      and coalesce((select delivery_policy from private.communication_email_delivery_operations op where op.communication_id=public.communications.id),'restricted')=p_delivery_policy;
    if existing_id is null then raise; end if;
    return existing_id;
  end;

  insert into private.communication_email_delivery_operations(communication_id,delivery_policy)
  values(new_id,p_delivery_policy);

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
      'liveRecipientCount', allowed_count, 'provider', 'resend', 'deliveryPolicy', p_delivery_policy
    )
  );
  return new_id;
end;
$$;

create or replace function public.create_live_email_communication(
  p_title text,p_subject text,p_message_body text,p_audience_type public.communication_audience_type,
  p_template_id uuid,p_allowlist text[],p_confirmed_recipient_count integer,p_idempotency_key uuid
)
returns uuid language sql security definer set search_path = '' set row_security = off as $$
  select public.create_live_email_communication(p_title,p_subject,p_message_body,p_audience_type,
    p_template_id,p_allowlist,p_confirmed_recipient_count,p_idempotency_key,'restricted');
$$;

create or replace function public.claim_live_email_delivery(
  p_communication_id uuid
)
returns table (
  delivery_id uuid,
  email_address text,
  subject text,
  message_body text,
  submission_key text
)
language plpgsql security definer
set search_path = '' set row_security = off
as $$
begin
  if not private.can_send_live_email() then
    raise exception 'Live email delivery is denied.' using errcode = '42501';
  end if;
  -- Recheck eligibility and the trusted ceiling for queued deliveries as well.
  update public.communication_deliveries d
  set status = 'suppressed', updated_at = now()
  from public.communication_recipients r, public.communications c
  where d.communication_recipient_id = r.id and r.communication_id = c.id
    and c.id = p_communication_id and c.created_by_profile_id = (select auth.uid())
    and c.channel = 'email' and c.delivery_mode = 'live'
    and d.status = 'pending' and d.attempted_at is null
    and not exists (
      select 1 from private.communication_email_candidates(c.audience_type) candidate
      where candidate.recipient_profile_id = r.recipient_profile_id
        and candidate.preference_authorized and candidate.email = r.destination_address
        and private.communication_email_delivery_allowed(candidate.email,
          coalesce((select op.delivery_policy from private.communication_email_delivery_operations op
            where op.communication_id=c.id),'restricted'))
    );
  return query
  with claimed as (
    select d.id, r.destination_address, d.submission_key
    from public.communication_deliveries d
    join public.communication_recipients r
      on r.id = d.communication_recipient_id
    join public.communications c on c.id = r.communication_id
    where c.id = p_communication_id
      and c.created_by_profile_id = (select auth.uid())
      and c.channel = 'email' and c.delivery_mode = 'live'
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
  select m.id, m.destination_address, c.subject, c.message_body, m.submission_key
  from marked m
  join public.communication_deliveries d on d.id = m.id
  join public.communication_recipients r on r.id = d.communication_recipient_id
  join public.communications c on c.id = r.communication_id;
end;
$$;


revoke all on function public.preview_live_email_recipients(public.communication_audience_type,text[],text)
  from public,anon,authenticated,service_role;
revoke all on function public.create_live_email_communication(text,text,text,public.communication_audience_type,uuid,text[],integer,uuid,text)
  from public,anon,authenticated,service_role;
grant execute on function public.preview_live_email_recipients(public.communication_audience_type,text[],text) to authenticated;
grant execute on function public.create_live_email_communication(text,text,text,public.communication_audience_type,uuid,text[],integer,uuid,text) to authenticated;

do $$ declare trusted_owner name;
begin
  select pg_get_userbyid(proowner) into trusted_owner from pg_proc
    where oid='public.preview_live_email_recipients(public.communication_audience_type,text[])'::regprocedure;
  if not exists(select 1 from pg_roles where rolname=trusted_owner and (rolsuper or rolbypassrls))
    or pg_get_userbyid((select proowner from pg_proc where oid='public.create_live_email_communication(text,text,text,public.communication_audience_type,uuid,text[],integer,uuid)'::regprocedure)) <> trusted_owner
    or pg_get_userbyid((select proowner from pg_proc where oid='public.claim_live_email_delivery(uuid)'::regprocedure)) <> trusted_owner then
    raise exception 'Review communications definer ownership before applying delivery-policy migration';
  end if;
  execute format('alter table private.communication_email_delivery_policy owner to %I',trusted_owner);
  execute format('alter table private.communication_email_delivery_operations owner to %I',trusted_owner);
  execute format('alter function private.communication_email_delivery_allowed(text,text) owner to %I',trusted_owner);
  execute format('alter function public.preview_live_email_recipients(public.communication_audience_type,text[],text) owner to %I',trusted_owner);
  execute format('alter function public.create_live_email_communication(text,text,text,public.communication_audience_type,uuid,text[],integer,uuid,text) owner to %I',trusted_owner);
end $$;
commit;
