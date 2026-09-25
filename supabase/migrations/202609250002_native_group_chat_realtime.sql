begin;

create or replace function private.can_receive_chat_broadcast(p_topic text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
declare
  v_room_id uuid;
begin
  if p_topic is null or p_topic !~ '^chat-room:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return false;
  end if;

  v_room_id := substring(p_topic from 11)::uuid;
  return private.can_read_chat_room(v_room_id);
exception
  when invalid_text_representation then
    return false;
end;
$$;

revoke all on function private.can_receive_chat_broadcast(text)
from public, anon, authenticated;
grant execute on function private.can_receive_chat_broadcast(text)
to authenticated;

create policy chat_room_broadcast_receive
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension = 'broadcast'
  and private.can_receive_chat_broadcast(realtime.topic())
);

create or replace function private.broadcast_chat_message_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT'
    or old.removed_at is distinct from new.removed_at then
    perform realtime.send(
      '{}'::jsonb,
      'message_changed',
      'chat-room:' || new.room_id::text,
      true
    );
  end if;

  return new;
end;
$$;

revoke all on function private.broadcast_chat_message_change()
from public, anon, authenticated;

create trigger chat_messages_broadcast_change
after insert or update of removed_at on public.chat_messages
for each row
execute function private.broadcast_chat_message_change();

commit;
