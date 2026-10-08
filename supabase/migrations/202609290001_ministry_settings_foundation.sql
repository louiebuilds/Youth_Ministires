begin;

create table public.ministry_settings (
  id smallint primary key default 1 check (id = 1),
  ministry_display_name text not null
    check (length(btrim(ministry_display_name)) between 1 and 150),
  contact_email text check (
    contact_email is null
    or (
      length(contact_email) <= 320
      and contact_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    )
  ),
  contact_phone text check (
    contact_phone is null or length(btrim(contact_phone)) between 1 and 50
  ),
  timezone text not null check (timezone = 'America/Chicago'),
  default_campus_name text check (
    default_campus_name is null
    or length(btrim(default_campus_name)) between 1 and 150
  ),
  default_event_address text check (
    default_event_address is null
    or length(btrim(default_event_address)) between 1 and 300
  ),
  family_checkin_instructions text not null check (
    length(btrim(family_checkin_instructions)) between 1 and 1000
    and position('household' in lower(family_checkin_instructions)) > 0
    and position('does not authorize' in lower(family_checkin_instructions)) > 0
    and (
      position('pickup' in lower(family_checkin_instructions)) > 0
      or position('release' in lower(family_checkin_instructions)) > 0
    )
  ),
  default_communication_channel public.communication_channel not null,
  updated_at timestamp with time zone not null default now(),
  updated_by_profile_id uuid references public.profiles(id) on delete set null
);

alter table public.ministry_settings enable row level security;
alter table public.ministry_settings force row level security;
revoke all on table public.ministry_settings from public, anon, authenticated;

insert into public.ministry_settings (
  id,
  ministry_display_name,
  contact_email,
  contact_phone,
  timezone,
  default_campus_name,
  default_event_address,
  family_checkin_instructions,
  default_communication_channel,
  updated_by_profile_id
) values (
  1,
  'Youth Ministries Platform',
  null,
  null,
  'America/Chicago',
  null,
  null,
  'This QR code identifies your household for check-in. Staff confirms attendees, and the QR code does not authorize pickup or release.',
  'in_app',
  null
);

create or replace function public.get_ministry_settings()
returns table (
  ministry_display_name text,
  contact_email text,
  contact_phone text,
  timezone text,
  default_campus_name text,
  default_event_address text,
  family_checkin_instructions text,
  default_communication_channel public.communication_channel,
  updated_at timestamp with time zone,
  updated_by_profile_id uuid
)
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
begin
  if auth.uid() is null or not private.has_role(array[
    'platform_administrator', 'youth_pastor'
  ]::public.account_role[]) then
    raise exception 'Ministry Settings access is denied.' using errcode = '42501';
  end if;

  return query
  select
    settings.ministry_display_name,
    settings.contact_email,
    settings.contact_phone,
    settings.timezone,
    settings.default_campus_name,
    settings.default_event_address,
    settings.family_checkin_instructions,
    settings.default_communication_channel,
    settings.updated_at,
    settings.updated_by_profile_id
  from public.ministry_settings as settings
  where settings.id = 1;
end
$$;

create or replace function public.update_ministry_settings(
  p_ministry_display_name text,
  p_contact_email text,
  p_contact_phone text,
  p_timezone text,
  p_default_campus_name text,
  p_default_event_address text,
  p_family_checkin_instructions text,
  p_default_communication_channel public.communication_channel
)
returns void
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  v_actor_id uuid := auth.uid();
  v_changed_fields text[] := array[]::text[];
  v_contact_email text := nullif(btrim(p_contact_email), '');
  v_contact_phone text := nullif(btrim(p_contact_phone), '');
  v_default_campus_name text := nullif(btrim(p_default_campus_name), '');
  v_default_event_address text := nullif(btrim(p_default_event_address), '');
  v_family_checkin_instructions text := btrim(p_family_checkin_instructions);
  v_ministry_display_name text := btrim(p_ministry_display_name);
  v_previous public.ministry_settings%rowtype;
begin
  if v_actor_id is null or not private.has_role(array[
    'platform_administrator', 'youth_pastor'
  ]::public.account_role[]) then
    raise exception 'Ministry Settings update is denied.' using errcode = '42501';
  end if;
  if v_ministry_display_name is null
    or length(v_ministry_display_name) not between 1 and 150 then
    raise exception 'Ministry display name is invalid.' using errcode = '22023';
  end if;
  if v_contact_email is not null and (
    length(v_contact_email) > 320
    or v_contact_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ) then
    raise exception 'Contact email is invalid.' using errcode = '22023';
  end if;
  if v_contact_phone is not null and length(v_contact_phone) > 50 then
    raise exception 'Contact phone is invalid.' using errcode = '22023';
  end if;
  if p_timezone is distinct from 'America/Chicago' then
    raise exception 'Timezone is not supported.' using errcode = '22023';
  end if;
  if p_default_communication_channel is null then
    raise exception 'Default communication channel is invalid.' using errcode = '22023';
  end if;
  if v_default_campus_name is not null and length(v_default_campus_name) > 150 then
    raise exception 'Default campus is invalid.' using errcode = '22023';
  end if;
  if v_default_event_address is not null and length(v_default_event_address) > 300 then
    raise exception 'Default event address is invalid.' using errcode = '22023';
  end if;
  if v_family_checkin_instructions is null
    or length(v_family_checkin_instructions) not between 1 and 1000
    or position('household' in lower(v_family_checkin_instructions)) = 0
    or position('does not authorize' in lower(v_family_checkin_instructions)) = 0
    or (
      position('pickup' in lower(v_family_checkin_instructions)) = 0
      and position('release' in lower(v_family_checkin_instructions)) = 0
    ) then
    raise exception 'Family check-in instructions must preserve the household identification and pickup safety statement.' using errcode = '22023';
  end if;

  select settings.* into v_previous
  from public.ministry_settings as settings
  where settings.id = 1
  for update;
  if not found then
    raise exception 'Ministry Settings are unavailable.' using errcode = 'P0002';
  end if;

  if v_previous.ministry_display_name is distinct from v_ministry_display_name then v_changed_fields := array_append(v_changed_fields, 'ministry_display_name'); end if;
  if v_previous.contact_email is distinct from v_contact_email then v_changed_fields := array_append(v_changed_fields, 'contact_email'); end if;
  if v_previous.contact_phone is distinct from v_contact_phone then v_changed_fields := array_append(v_changed_fields, 'contact_phone'); end if;
  if v_previous.timezone is distinct from p_timezone then v_changed_fields := array_append(v_changed_fields, 'timezone'); end if;
  if v_previous.default_campus_name is distinct from v_default_campus_name then v_changed_fields := array_append(v_changed_fields, 'default_campus_name'); end if;
  if v_previous.default_event_address is distinct from v_default_event_address then v_changed_fields := array_append(v_changed_fields, 'default_event_address'); end if;
  if v_previous.family_checkin_instructions is distinct from v_family_checkin_instructions then v_changed_fields := array_append(v_changed_fields, 'family_checkin_instructions'); end if;
  if v_previous.default_communication_channel is distinct from p_default_communication_channel then v_changed_fields := array_append(v_changed_fields, 'default_communication_channel'); end if;

  update public.ministry_settings
  set ministry_display_name = v_ministry_display_name,
      contact_email = v_contact_email,
      contact_phone = v_contact_phone,
      timezone = p_timezone,
      default_campus_name = v_default_campus_name,
      default_event_address = v_default_event_address,
      family_checkin_instructions = v_family_checkin_instructions,
      default_communication_channel = p_default_communication_channel,
      updated_at = now(),
      updated_by_profile_id = v_actor_id
  where id = 1;

  insert into public.audit_events (
    actor_profile_id, action, entity_type, result, source, metadata
  ) values (
    v_actor_id,
    'ministry_settings.updated',
    'ministry_settings',
    'success',
    'web',
    jsonb_build_object(
      'changedFields', to_jsonb(v_changed_fields),
      'previousValues', jsonb_build_object(
        'ministry_display_name', v_previous.ministry_display_name,
        'contact_email', v_previous.contact_email,
        'contact_phone', v_previous.contact_phone,
        'timezone', v_previous.timezone,
        'default_campus_name', v_previous.default_campus_name,
        'default_event_address', v_previous.default_event_address,
        'family_checkin_instructions', v_previous.family_checkin_instructions,
        'default_communication_channel', v_previous.default_communication_channel
      ),
      'newValues', jsonb_build_object(
        'ministry_display_name', v_ministry_display_name,
        'contact_email', v_contact_email,
        'contact_phone', v_contact_phone,
        'timezone', p_timezone,
        'default_campus_name', v_default_campus_name,
        'default_event_address', v_default_event_address,
        'family_checkin_instructions', v_family_checkin_instructions,
        'default_communication_channel', p_default_communication_channel
      )
    )
  );
end
$$;

revoke all on function public.get_ministry_settings()
  from public, anon, authenticated;
revoke all on function public.update_ministry_settings(
  text, text, text, text, text, text, text, public.communication_channel
) from public, anon, authenticated;
grant execute on function public.get_ministry_settings() to authenticated;
grant execute on function public.update_ministry_settings(
  text, text, text, text, text, text, text, public.communication_channel
) to authenticated;

commit;
