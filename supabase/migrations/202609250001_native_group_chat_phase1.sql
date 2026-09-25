begin;

create type public.chat_room_type as enum ('ministry','event','volunteer_team','staff_leadership','parent','custom');
create type public.chat_source_access as enum ('explicit','event_parents','event_volunteers','schedule_volunteers');
create type public.chat_membership_source as enum ('explicit','event','schedule');

create table public.chat_rooms (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 150),
  room_type public.chat_room_type not null,
  source_access public.chat_source_access not null default 'explicit',
  event_id uuid references public.events(id) on delete restrict,
  schedule_id uuid references public.ministry_schedules(id) on delete restrict,
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  archived_at timestamptz,
  archived_by_profile_id uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chat_room_source_shape check (
    (source_access = 'explicit' and event_id is null and schedule_id is null)
    or (source_access in ('event_parents','event_volunteers') and event_id is not null and schedule_id is null)
    or (source_access = 'schedule_volunteers' and schedule_id is not null and event_id is null)
  ),
  constraint chat_room_type_source_check check (
    (room_type in ('ministry','custom','staff_leadership') and source_access='explicit')
    or (room_type='parent' and source_access in ('explicit','event_parents'))
    or (room_type='volunteer_team' and source_access in ('explicit','event_volunteers','schedule_volunteers'))
    or (room_type='event' and source_access in ('event_parents','event_volunteers'))
  ),
  constraint chat_room_archive_shape check ((archived_at is null) = (archived_by_profile_id is null))
);

create table public.chat_room_members (
  id uuid primary key default extensions.gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  membership_source public.chat_membership_source not null default 'explicit',
  added_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  joined_at timestamptz not null default now(),
  removed_at timestamptz,
  removed_by_profile_id uuid references public.profiles(id) on delete restrict,
  removal_reason text check (removal_reason is null or length(btrim(removal_reason)) between 1 and 500),
  constraint chat_member_removal_shape check (
    (removed_at is null and removed_by_profile_id is null and removal_reason is null)
    or (removed_at is not null and removed_by_profile_id is not null and removal_reason is not null)
  )
);
create unique index chat_room_members_active_key on public.chat_room_members(room_id,profile_id) where removed_at is null;

create table public.chat_messages (
  id uuid primary key default extensions.gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete restrict,
  author_profile_id uuid not null references public.profiles(id) on delete restrict,
  reply_to_message_id uuid,
  message_body text not null check (length(btrim(message_body)) between 1 and 4000),
  removed_at timestamptz,
  removed_by_profile_id uuid references public.profiles(id) on delete restrict,
  removal_reason text check (removal_reason is null or length(btrim(removal_reason)) between 1 and 500),
  created_at timestamptz not null default now(),
  constraint chat_messages_id_room_key unique (id,room_id),
  constraint chat_messages_reply_same_room_fk foreign key (reply_to_message_id,room_id)
    references public.chat_messages(id,room_id) on delete restrict,
  constraint chat_message_removal_shape check (
    (removed_at is null and removed_by_profile_id is null and removal_reason is null)
    or (removed_at is not null and removed_by_profile_id is not null and removal_reason is not null)
  )
);
create index chat_messages_room_created_idx on public.chat_messages(room_id,created_at,id);

create table public.chat_read_state (
  room_id uuid not null references public.chat_rooms(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  last_read_message_id uuid,
  last_read_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (room_id,profile_id),
  constraint chat_read_state_message_same_room_fk foreign key (last_read_message_id,room_id)
    references public.chat_messages(id,room_id) on delete restrict
);

alter table public.chat_rooms enable row level security;
alter table public.chat_rooms force row level security;
alter table public.chat_room_members enable row level security;
alter table public.chat_room_members force row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_messages force row level security;
alter table public.chat_read_state enable row level security;
alter table public.chat_read_state force row level security;
revoke all on public.chat_rooms, public.chat_room_members, public.chat_messages, public.chat_read_state from public,anon,authenticated;

create or replace function private.can_manage_chat() returns boolean
language sql stable security definer set search_path='' set row_security=off
as $$ select private.current_profile_is_active() and private.has_role(array['platform_administrator','youth_pastor']::public.account_role[]) $$;

create or replace function private.chat_profile_role(p_profile_id uuid) returns public.account_role
language sql stable security definer set search_path='' set row_security=off
as $$ select primary_role from public.profiles where id=p_profile_id and status='active' $$;

create or replace function private.chat_role_allowed(p_room_id uuid,p_profile_id uuid) returns boolean
language sql stable security definer set search_path='' set row_security=off
as $$
  select coalesce((select case r.room_type
    when 'staff_leadership' then private.chat_profile_role(p_profile_id) in ('platform_administrator','youth_pastor','staff_member')
    when 'volunteer_team' then private.chat_profile_role(p_profile_id) in ('platform_administrator','youth_pastor','staff_member','volunteer')
    when 'parent' then private.chat_profile_role(p_profile_id) in ('platform_administrator','youth_pastor','staff_member','parent')
    else private.chat_profile_role(p_profile_id) is not null
  end from public.chat_rooms r where r.id=p_room_id),false)
$$;

create or replace function private.can_read_chat_room(p_room_id uuid) returns boolean
language sql stable security definer set search_path='' set row_security=off
as $$
  select private.current_profile_is_active() and (
    private.can_manage_chat()
    or exists(select 1 from public.chat_room_members m where m.room_id=p_room_id and m.profile_id=auth.uid() and m.removed_at is null))
$$;

create or replace function private.can_send_chat_message(p_room_id uuid) returns boolean
language sql stable security definer set search_path='' set row_security=off
as $$ select private.can_read_chat_room(p_room_id) and exists(select 1 from public.chat_rooms r where r.id=p_room_id and r.archived_at is null) $$;

create or replace function public.list_chat_rooms()
returns table(room_id uuid,room_name text,room_type public.chat_room_type,source_access public.chat_source_access,event_id uuid,schedule_id uuid,archived_at timestamptz,unread_count bigint,last_message_at timestamptz,can_manage boolean)
language sql stable security definer set search_path='' set row_security=off
as $$
  select r.id,r.name,r.room_type,r.source_access,r.event_id,r.schedule_id,r.archived_at,
    case when r.archived_at is not null then 0 else (select count(*) from public.chat_messages m
      left join public.chat_read_state s on s.room_id=r.id and s.profile_id=auth.uid()
      where m.room_id=r.id and m.removed_at is null and m.author_profile_id<>auth.uid()
        and (s.last_read_at is null or m.created_at>s.last_read_at)) end,
    (select max(m.created_at) from public.chat_messages m where m.room_id=r.id),private.can_manage_chat()
  from public.chat_rooms r where private.can_read_chat_room(r.id)
  order by r.archived_at nulls first,coalesce((select max(m.created_at) from public.chat_messages m where m.room_id=r.id),r.created_at) desc
$$;

create or replace function public.get_chat_room(p_room_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' set row_security=off as $$
declare v jsonb; begin
  if not private.can_read_chat_room(p_room_id) then raise exception 'Chat room access denied.' using errcode='42501'; end if;
  select jsonb_build_object('room_id',r.id,'room_name',r.name,'room_type',r.room_type,'source_access',r.source_access,'event_id',r.event_id,'schedule_id',r.schedule_id,'archived_at',r.archived_at,'can_manage',private.can_manage_chat()) into v from public.chat_rooms r where r.id=p_room_id;
  if v is null then raise exception 'Chat room not found.' using errcode='P0002'; end if; return v;
end $$;

create or replace function public.list_chat_messages(p_room_id uuid,p_before timestamptz default null,p_limit integer default 100)
returns table(message_id uuid,author_profile_id uuid,author_name text,message_body text,reply_to_message_id uuid,reply_author_name text,reply_message_body text,removed_at timestamptz,created_at timestamptz,can_moderate boolean)
language plpgsql stable security definer set search_path='' set row_security=off as $$
begin
  if not private.can_read_chat_room(p_room_id) then raise exception 'Chat room access denied.' using errcode='42501'; end if;
  if p_limit not between 1 and 200 then raise exception 'Invalid message limit.' using errcode='22023'; end if;
  return query select m.id,m.author_profile_id,a.display_name,
    case when m.removed_at is null then m.message_body else null end,
    m.reply_to_message_id,ra.display_name,case when rm.removed_at is null then rm.message_body else null end,
    m.removed_at,m.created_at,private.can_manage_chat()
  from public.chat_messages m join public.profiles a on a.id=m.author_profile_id
  left join public.chat_messages rm on rm.id=m.reply_to_message_id left join public.profiles ra on ra.id=rm.author_profile_id
  where m.room_id=p_room_id and (p_before is null or m.created_at<p_before)
  order by m.created_at asc limit p_limit;
end $$;

create or replace function public.create_chat_room(p_name text,p_room_type public.chat_room_type,p_source_access public.chat_source_access default 'explicit',p_event_id uuid default null,p_schedule_id uuid default null)
returns uuid language plpgsql security definer set search_path='' set row_security=off as $$
declare v_id uuid; begin
  if not private.can_manage_chat() then raise exception 'Chat room management denied.' using errcode='42501'; end if;
  if length(btrim(coalesce(p_name,''))) not between 1 and 150 then raise exception 'Invalid room name.' using errcode='22023'; end if;
  insert into public.chat_rooms(name,room_type,source_access,event_id,schedule_id,created_by_profile_id)
  values(btrim(p_name),p_room_type,p_source_access,p_event_id,p_schedule_id,auth.uid()) returning id into v_id;
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata)
  values(auth.uid(),'communication.chat_room_created','chat_room',v_id,'success','web',jsonb_build_object('roomType',p_room_type,'sourceAccess',p_source_access));
  return v_id;
end $$;

create or replace function public.rename_chat_room(p_room_id uuid,p_name text) returns void
language plpgsql security definer set search_path='' set row_security=off as $$ begin
  if not private.can_manage_chat() then raise exception 'Chat room management denied.' using errcode='42501'; end if;
  if length(btrim(coalesce(p_name,''))) not between 1 and 150 then raise exception 'Invalid room name.' using errcode='22023'; end if;
  update public.chat_rooms set name=btrim(p_name),updated_at=now() where id=p_room_id and archived_at is null;
  if not found then raise exception 'Active room not found.' using errcode='P0002'; end if;
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata) values(auth.uid(),'communication.chat_room_renamed','chat_room',p_room_id,'success','web','{}');
end $$;

create or replace function public.archive_chat_room(p_room_id uuid) returns void
language plpgsql security definer set search_path='' set row_security=off as $$ begin
  if not private.can_manage_chat() then raise exception 'Chat room management denied.' using errcode='42501'; end if;
  update public.chat_rooms set archived_at=now(),archived_by_profile_id=auth.uid(),updated_at=now() where id=p_room_id and archived_at is null;
  if not found then raise exception 'Active room not found.' using errcode='P0002'; end if;
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata) values(auth.uid(),'communication.chat_room_archived','chat_room',p_room_id,'success','web','{}');
end $$;

create or replace function public.list_chat_member_candidates(p_room_id uuid)
returns table(profile_id uuid,display_name text,primary_role public.account_role,is_member boolean)
language plpgsql stable security definer set search_path='' set row_security=off as $$ begin
  if not private.can_manage_chat() then raise exception 'Chat membership management denied.' using errcode='42501'; end if;
  return query select p.id,p.display_name,p.primary_role,exists(select 1 from public.chat_room_members m where m.room_id=p_room_id and m.profile_id=p.id and m.removed_at is null)
  from public.profiles p where p.status='active' and private.chat_role_allowed(p_room_id,p.id)
  order by p.display_name;
end $$;

create or replace function public.add_chat_room_member(p_room_id uuid,p_profile_id uuid) returns uuid
language plpgsql security definer set search_path='' set row_security=off as $$ declare v_id uuid; begin
  if not private.can_manage_chat() then raise exception 'Chat membership management denied.' using errcode='42501'; end if;
  if not exists(select 1 from public.chat_rooms where id=p_room_id and archived_at is null) then raise exception 'Active room not found.' using errcode='P0002'; end if;
  if not private.chat_role_allowed(p_room_id,p_profile_id) then raise exception 'Profile is not eligible for this room.' using errcode='42501'; end if;
  insert into public.chat_room_members(room_id,profile_id,membership_source,added_by_profile_id) values(p_room_id,p_profile_id,'explicit',auth.uid()) returning id into v_id;
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata) values(auth.uid(),'communication.chat_member_added','chat_room',p_room_id,'success','web',jsonb_build_object('membershipId',v_id)); return v_id;
end $$;

create or replace function public.remove_chat_room_member(p_room_id uuid,p_profile_id uuid,p_reason text) returns void
language plpgsql security definer set search_path='' set row_security=off as $$ begin
  if not private.can_manage_chat() then raise exception 'Chat membership management denied.' using errcode='42501'; end if;
  if length(btrim(coalesce(p_reason,''))) not between 1 and 500 then raise exception 'Removal reason required.' using errcode='22023'; end if;
  if not exists(select 1 from public.chat_rooms where id=p_room_id and archived_at is null) then raise exception 'Active room not found.' using errcode='P0002'; end if;
  update public.chat_room_members set removed_at=now(),removed_by_profile_id=auth.uid(),removal_reason=btrim(p_reason) where room_id=p_room_id and profile_id=p_profile_id and removed_at is null;
  if not found then raise exception 'Active membership not found.' using errcode='P0002'; end if;
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata) values(auth.uid(),'communication.chat_member_removed','chat_room',p_room_id,'success','web',jsonb_build_object('profileId',p_profile_id));
end $$;

create or replace function public.send_chat_message(p_room_id uuid,p_message_body text,p_reply_to_message_id uuid default null) returns uuid
language plpgsql security definer set search_path='' set row_security=off as $$ declare v_id uuid; begin
  if not private.can_send_chat_message(p_room_id) then raise exception 'Chat message send denied.' using errcode='42501'; end if;
  if length(btrim(coalesce(p_message_body,''))) not between 1 and 4000 then raise exception 'Invalid message.' using errcode='22023'; end if;
  if p_reply_to_message_id is not null and not exists(select 1 from public.chat_messages where id=p_reply_to_message_id and room_id=p_room_id) then raise exception 'Reply message is not in this room.' using errcode='23514'; end if;
  insert into public.chat_messages(room_id,author_profile_id,reply_to_message_id,message_body) values(p_room_id,auth.uid(),p_reply_to_message_id,btrim(p_message_body)) returning id into v_id; return v_id;
end $$;

create or replace function public.remove_chat_message(p_message_id uuid,p_reason text) returns void
language plpgsql security definer set search_path='' set row_security=off as $$ declare v_room uuid; begin
  if not private.can_manage_chat() then raise exception 'Chat moderation denied.' using errcode='42501'; end if;
  if length(btrim(coalesce(p_reason,''))) not between 1 and 500 then raise exception 'Removal reason required.' using errcode='22023'; end if;
  update public.chat_messages set removed_at=now(),removed_by_profile_id=auth.uid(),removal_reason=btrim(p_reason) where id=p_message_id and removed_at is null returning room_id into v_room;
  if v_room is null then raise exception 'Active message not found.' using errcode='P0002'; end if;
  insert into public.audit_events(actor_profile_id,action,entity_type,entity_id,result,source,metadata) values(auth.uid(),'communication.chat_message_removed','chat_message',p_message_id,'success','web',jsonb_build_object('roomId',v_room));
end $$;

create or replace function public.mark_chat_room_read(p_room_id uuid,p_message_id uuid) returns void
language plpgsql security definer set search_path='' set row_security=off as $$ declare v_at timestamptz; begin
  if not private.can_read_chat_room(p_room_id) then raise exception 'Chat room access denied.' using errcode='42501'; end if;
  select created_at into v_at from public.chat_messages where id=p_message_id and room_id=p_room_id and removed_at is null;
  if v_at is null then raise exception 'Visible room message not found.' using errcode='P0002'; end if;
  insert into public.chat_read_state(room_id,profile_id,last_read_message_id,last_read_at) values(p_room_id,auth.uid(),p_message_id,v_at)
  on conflict(room_id,profile_id) do update set last_read_message_id=excluded.last_read_message_id,last_read_at=excluded.last_read_at,updated_at=now()
  where public.chat_read_state.last_read_at<=excluded.last_read_at;
end $$;

revoke all on function private.can_manage_chat(),private.chat_profile_role(uuid),private.chat_role_allowed(uuid,uuid),private.can_read_chat_room(uuid),private.can_send_chat_message(uuid) from public,anon,authenticated;
revoke all on function public.list_chat_rooms(),public.get_chat_room(uuid),public.list_chat_messages(uuid,timestamptz,integer),public.create_chat_room(text,public.chat_room_type,public.chat_source_access,uuid,uuid),public.rename_chat_room(uuid,text),public.archive_chat_room(uuid),public.list_chat_member_candidates(uuid),public.add_chat_room_member(uuid,uuid),public.remove_chat_room_member(uuid,uuid,text),public.send_chat_message(uuid,text,uuid),public.remove_chat_message(uuid,text),public.mark_chat_room_read(uuid,uuid) from public,anon;
grant execute on function public.list_chat_rooms(),public.get_chat_room(uuid),public.list_chat_messages(uuid,timestamptz,integer),public.create_chat_room(text,public.chat_room_type,public.chat_source_access,uuid,uuid),public.rename_chat_room(uuid,text),public.archive_chat_room(uuid),public.list_chat_member_candidates(uuid),public.add_chat_room_member(uuid,uuid),public.remove_chat_room_member(uuid,uuid,text),public.send_chat_message(uuid,text,uuid),public.remove_chat_message(uuid,text),public.mark_chat_room_read(uuid,uuid) to authenticated;

commit;
