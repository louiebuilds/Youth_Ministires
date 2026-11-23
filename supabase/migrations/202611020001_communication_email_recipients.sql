begin;

-- Trusted deployment configuration only. Empty means no live email delivery.
-- The browser-supplied RPC argument can narrow this list but never expand it.
create table private.communication_email_allowlist (
  email text primary key check (
    email = lower(btrim(email)) and length(email) between 3 and 320
    and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  )
);
alter table private.communication_email_allowlist enable row level security;
alter table private.communication_email_allowlist force row level security;
revoke all on private.communication_email_allowlist from public, anon, authenticated, service_role;
comment on table private.communication_email_allowlist is
  'Restricted beta delivery ceiling. Trusted migration administrator configures approved addresses; never populated from RPC arguments. Empty fails closed. No unrestricted mode.';

create function private.communication_email_candidates(p_audience_type public.communication_audience_type)
returns table (recipient_profile_id uuid, display_name text, email text,
  destination_masked text, preference_authorized boolean, suppression_reason text)
language sql stable security definer set search_path = '' set row_security = off
as $$
  with candidates as (
    select p.id, p.display_name, lower(btrim(u.email)) as email,
      p.status, pe.status as person_status, v.is_active as volunteer_active,
      (p.primary_role = 'parent' or exists (
        select 1 from public.household_memberships hm
        join public.households h on h.id = hm.household_id
        where hm.person_id = p.person_id and hm.is_responsible_adult and h.status = 'active'
      ) or exists (
        select 1 from public.student_relationships sr
        join public.students s on s.id = sr.student_id
        where sr.person_id = p.person_id and sr.is_legal_guardian
          and s.status in ('active', 'registered')
      )) as is_parent,
      exists (select 1 from public.household_memberships hm
        join public.households h on h.id = hm.household_id
        where hm.person_id = p.person_id and h.status = 'active' and hm.receive_email)
      or exists (select 1 from public.student_relationships sr
        join public.students s on s.id = sr.student_id
        where sr.person_id = p.person_id and sr.is_legal_guardian
          and s.status in ('active', 'registered') and sr.receive_email) as parent_email_allowed
    from public.profiles p
    join auth.users u on u.id = p.id
    left join public.people pe on pe.id = p.person_id
    left join public.volunteer_profiles v on v.profile_id = p.id
    where not exists (select 1 from public.students s where s.person_id = p.person_id)
  ), matched as (
    select *, case
      when status <> 'active' then 'Account inactive'
      when person_status is not null and person_status <> 'active' then 'Person inactive'
      when email is null or email = '' then 'No email address'
      when length(email) > 320 or email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then 'Invalid email address'
      when p_audience_type = 'volunteers' and not coalesce(volunteer_active, false) then 'Volunteer inactive'
      when p_audience_type = 'ministry' and not is_parent and not coalesce(volunteer_active, false) then 'Volunteer inactive'
      -- Preserve parent preferences even when the parent also volunteers.
      when is_parent and not parent_email_allowed then 'Email preference disabled'
      else null end as reason
    from candidates where
      (p_audience_type = 'parents' and is_parent)
      or (p_audience_type = 'volunteers' and volunteer_active is not null)
      or (p_audience_type = 'ministry' and (is_parent or volunteer_active is not null))
  ), ranked as (
    select *, row_number() over (partition by email order by (reason is null) desc, id) as email_rank
    from matched
  )
  select id, display_name, email,
    case when email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      then left(email, 1) || '***@' || split_part(email, '@', 2) else null end,
    reason is null and email_rank = 1,
    case when reason is not null then reason when email_rank > 1 then 'Duplicate email address' else null end
  from ranked;
$$;
revoke all on function private.communication_email_candidates(public.communication_audience_type)
  from public, anon, authenticated, service_role;

create or replace function public.preview_live_email_recipients(
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
  if not private.can_send_live_email() then
    raise exception 'Live email recipient preview is denied.' using errcode = '42501';
  end if;
  if p_audience_type not in ('parents', 'volunteers', 'ministry') then
    raise exception 'Communication audience is invalid.' using errcode = '22023';
  end if;

  return query
  select r.recipient_profile_id, r.display_name, r.destination_masked,
    r.preference_authorized,
    r.preference_authorized
      and exists (select 1 from private.communication_email_allowlist a where a.email = r.email)
      and r.email = any(coalesce(p_allowlist, array[]::text[])),
    case when not r.preference_authorized then r.suppression_reason
      when not exists (select 1 from private.communication_email_allowlist a where a.email = r.email)
        or not (r.email = any(coalesce(p_allowlist, array[]::text[])))
        then 'Not in live-email beta allowlist'
      else null end
  from private.communication_email_candidates(p_audience_type) r
  order by r.display_name, r.recipient_profile_id;
end;
$$;

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
  if p_channel = 'email' and p_audience_type in ('parents', 'volunteers', 'ministry') then
    return query select r.recipient_profile_id, r.display_name, r.destination_masked,
      r.preference_authorized, r.suppression_reason
    from private.communication_email_candidates(p_audience_type) r
    order by r.display_name, r.recipient_profile_id;
    return;
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

  select count(*) into allowed_count
  from public.preview_live_email_recipients(p_audience_type, p_allowlist)
  where live_send_allowed;
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
    select * from public.preview_live_email_recipients(p_audience_type, p_allowlist)
  loop
    insert into public.communication_recipients (
      communication_id, recipient_profile_id, display_name,
      destination_masked, destination_address, preference_authorized,
      suppression_reason
    ) values (
      new_id, recipient.recipient_profile_id, recipient.display_name,
      recipient.destination_masked,
      case when recipient.live_send_allowed then (
        select lower(btrim(email)) from auth.users
        where id = recipient.recipient_profile_id
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
    or (p_audience_type not in ('parents', 'volunteers') and not (p_channel = 'email' and p_audience_type = 'ministry'))
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
      join private.communication_email_allowlist a on a.email = candidate.email
      where candidate.recipient_profile_id = r.recipient_profile_id
        and candidate.preference_authorized and candidate.email = r.destination_address
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


-- Preserve the established definer identity rather than introducing cross-owner grants.
do $$
declare trusted_owner name; candidate record;
begin
  select pg_get_userbyid(proowner) into trusted_owner from pg_proc
    where oid = 'public.preview_live_email_recipients(public.communication_audience_type,text[])'::regprocedure;
  for candidate in select proowner from pg_proc where oid in (
    'public.preview_communication_recipients(public.communication_audience_type,public.communication_channel)'::regprocedure,
    'public.create_live_email_communication(text,text,text,public.communication_audience_type,uuid,text[],integer,uuid)'::regprocedure,
    'public.claim_live_email_delivery(uuid)'::regprocedure
  ) loop
    if pg_get_userbyid(candidate.proowner) <> trusted_owner then
      raise exception 'Communications definer ownership differs; review migration before applying';
    end if;
  end loop;
  if not exists(select 1 from pg_roles where rolname = trusted_owner and (rolsuper or rolbypassrls)) then
    raise exception 'Established communications owner cannot access protected configuration';
  end if;
  execute format('alter table private.communication_email_allowlist owner to %I',trusted_owner);
  execute format('alter function private.communication_email_candidates(public.communication_audience_type) owner to %I',trusted_owner);
end $$;
commit;
