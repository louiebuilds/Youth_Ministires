import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { PGlite } from "@electric-sql/pglite";

const migrations = [
  "supabase/migrations/202607230001_core_database_foundation.sql",
  "supabase/migrations/202607230002_security_authorization.sql",
  "supabase/migrations/202607240003_volunteer_management_foundation.sql",
  "supabase/migrations/202607300001_event_registration_foundation.sql",
  "supabase/migrations/202608090001_scheduling_foundation.sql",
  "supabase/migrations/202609250001_native_group_chat_phase1.sql",
  "supabase/migrations/202609250002_native_group_chat_realtime.sql",
];

const ids = {
  admin: "95000000-0000-4000-8000-000000000001",
  pastor: "95000000-0000-4000-8000-000000000002",
  staff: "95000000-0000-4000-8000-000000000003",
  volunteer: "95000000-0000-4000-8000-000000000004",
  otherVolunteer: "95000000-0000-4000-8000-000000000005",
  parent: "95000000-0000-4000-8000-000000000006",
  otherParent: "95000000-0000-4000-8000-000000000007",
  parentPerson: "95000000-0000-4000-8000-000000000008",
  studentPerson: "95000000-0000-4000-8000-000000000009",
  student: "95000000-0000-4000-8000-000000000010",
  household: "95000000-0000-4000-8000-000000000011",
  event: "95000000-0000-4000-8000-000000000012",
  schedule: "95000000-0000-4000-8000-000000000013",
  position: "95000000-0000-4000-8000-000000000014",
};

const db = new PGlite();

async function asUser(id, operation) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${id}',false);`);
  try {
    return await operation();
  } finally {
    await db.exec("reset role");
  }
}

async function denied(operation, message) {
  let failed = false;
  try {
    await operation();
  } catch {
    failed = true;
  }
  assert.equal(failed, true, message);
}

async function asDatabaseUser(id, operation) {
  await db.exec(`select set_config('request.jwt.claim.sub','${id}',false);`);
  try {
    return await operation();
  } finally {
    await db.exec("select set_config('request.jwt.claim.sub','',false);");
  }
}

try {
  await db.exec(`
    create schema auth;
    create schema extensions;
    create role anon nologin;
    create role authenticated nologin;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb not null default '{}');
    create or replace function auth.uid() returns uuid language sql stable set search_path=''
      as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create schema realtime;
    grant usage on schema realtime to authenticated;
    create table realtime.messages(extension text not null default 'broadcast');
    alter table realtime.messages enable row level security;
    grant select on realtime.messages to authenticated;
    insert into realtime.messages(extension) values('broadcast');
    create table realtime.broadcast_log(payload jsonb,event text,topic text,is_private boolean);
    create or replace function realtime.topic() returns text language sql stable
      as $$ select current_setting('request.realtime.topic',true) $$;
    create or replace function realtime.send(payload jsonb,event text,topic text,private boolean)
      returns void language sql as $$ insert into realtime.broadcast_log values(payload,event,topic,private) $$;
  `);
  for (const path of migrations) {
    const sql = (await readFile(path, "utf8"))
      .replace("create extension if not exists pgcrypto with schema extensions;", "")
      .replaceAll("extensions.gen_random_uuid()", "gen_random_uuid()");
    await db.exec(sql);
  }

  const foundationMigration = await readFile(migrations.at(-2), "utf8");
  const realtimeMigration = await readFile(migrations.at(-1), "utf8");
  assert.match(foundationMigration, /private\.can_manage_chat\(\)/);
  assert.doesNotMatch(foundationMigration, /can_manage_communications/);
  assert.match(foundationMigration, /alter table public\.chat_messages force row level security/);
  assert.match(foundationMigration, /revoke all on public\.chat_rooms/);
  assert.doesNotMatch(foundationMigration, /realtime\.messages|broadcast/i);
  assert.doesNotMatch(foundationMigration, /edit_chat_message|edited_at/);
  assert.match(realtimeMigration, /private\.can_receive_chat_broadcast\(p_topic text\)/);
  assert.match(realtimeMigration, /create policy chat_room_broadcast_receive/);
  assert.match(realtimeMigration, /for select\s+to authenticated/);
  assert.doesNotMatch(realtimeMigration, /for insert\s+to authenticated/i);
  assert.match(realtimeMigration, /realtime\.messages\.extension = 'broadcast'/);
  assert.match(realtimeMigration, /private\.can_receive_chat_broadcast\(realtime\.topic\(\)\)/);
  assert.match(realtimeMigration, /'chat-room:' \|\| new\.room_id::text/);
  assert.match(realtimeMigration, /'message_changed'/);
  assert.match(realtimeMigration, /'\{\}'::jsonb/);
  assert.doesNotMatch(realtimeMigration, /message_body|author_profile_id|reply_to_message_id|removal_reason/);
  assert.match(realtimeMigration, /after insert or update of removed_at on public\.chat_messages/);

  const chatListPage = await readFile("app/(platform)/communications/chat/page.tsx", "utf8");
  const chatRoomPage = await readFile("app/(platform)/communications/chat/[roomId]/page.tsx", "utf8");
  const roomManagement = await readFile("features/communications/chat/components/chat-room-management.tsx", "utf8");
  const roomActions = await readFile("features/communications/chat/actions/chat-room-actions.ts", "utf8");
  const communicationsPage = await readFile("app/(platform)/communications/page.tsx", "utf8");
  const realtimeRefresh = await readFile("features/communications/chat/components/chat-realtime-refresh.tsx", "utf8");
  const messageWorkspace = await readFile("features/communications/chat/components/chat-message-workspace.tsx", "utf8");
  const messageActions = await readFile("features/communications/chat/actions/chat-message-actions.ts", "utf8");
  const unreadBadge = await readFile("features/communications/chat/components/chat-unread-badge.tsx", "utf8");
  assert.match(chatListPage, /requireCapability\("communications\.view"\)/);
  assert.match(chatListPage, /managerRoles\.has\(account\.role\)/);
  assert.match(chatListPage, /canManage \? <CreateChatRoomForm \/>/);
  assert.match(chatListPage, /Archived/);
  assert.match(
  chatRoomPage,
  /if\s*\(\s*!roomResult\.success\s*\)\s*\{?\s*notFound\(\);?\s*\}?/,
);
  assert.match(
  chatRoomPage,
  /room\.canManage\s*&&\s*candidatesResult\?\.success/,
);
  assert.match(chatRoomPage, /!room\.canManage/);
  assert.match(
  chatRoomPage,
  /ChatMessageWorkspace/,
);

assert.match(
  chatRoomPage,
  /listChatMessages/,
);

assert.match(
  chatRoomPage,
  /currentProfileId=\{account\.id\}/,
);
  assert.match(roomManagement, /CreateChatRoomForm/);
  assert.match(roomManagement, /renameChatRoomAction/);
  assert.match(roomManagement, /archiveChatRoomAction/);
  assert.match(roomManagement, /addChatRoomMemberAction/);
  assert.match(roomManagement, /removeChatRoomMemberAction/);
  assert.match(
  roomManagement,
  /candidates\.filter\(\s*\(candidate\)\s*=>\s*candidate\.isMember\s*,?\s*\)/,
);
  assert.match(
  roomManagement,
  /candidates\.filter\(\s*\(candidate\)\s*=>\s*!candidate\.isMember\s*,?\s*\)/,
);
  assert.match(roomManagement, /if \(room\.archivedAt\)/);
  assert.match(roomManagement, /Room history is retained read-only/);
  assert.doesNotMatch(roomManagement, /sendChat|messageBody|realtime/i);
  assert.match(roomActions, /revalidatePath\("\/communications\/chat"\)/);
  assert.match(communicationsPage, /href="\/communications\/chat"/);
  assert.match(realtimeRefresh, /channel\(`chat-room:\$\{roomId\}`/);
  assert.match(realtimeRefresh, /config:\s*\{\s*private:\s*true\s*\}/);
  assert.match(realtimeRefresh, /\.on\("broadcast",\s*\{\s*event:\s*"message_changed"\s*\}/);
  assert.match(realtimeRefresh, /router\.refresh\(\)/);
  assert.match(realtimeRefresh, /POLL_INTERVAL_MS = 25_000/);
  assert.match(realtimeRefresh, /!document\.hidden/);
  assert.match(realtimeRefresh, /visibilitychange/);
  assert.match(realtimeRefresh, /supabase\.removeChannel\(channel\)/);
  assert.match(realtimeRefresh, /lastMarkedMessageId\.current === latestVisibleMessageId/);
  assert.match(realtimeRefresh, /if \(archived\) return null/);
  assert.match(messageWorkspace, /findLast\(\(message\) => !message\.removedAt\)/);
  assert.match(messageWorkspace, /ChatRealtimeRefresh/);
  assert.match(messageActions, /markChatRoomReadThroughAction/);
  assert.match(messageActions, /if \(success\) revalidatePath\("\/communications\/chat"\)/);
  assert.doesNotMatch(messageActions, /markChatRoomReadThroughAction[\s\S]*?revalidatePath\(`\/communications\/chat\/\$\{/);
  assert.match(chatListPage, /ChatUnreadBadge/);
  assert.match(chatRoomPage, /ChatUnreadBadge/);
  assert.match(unreadBadge, /if \(archived \|\| count <= 0\) return null/);
  assert.match(unreadBadge, /count > 99 \? "99\+" : count/);
  assert.match(unreadBadge, /aria-label=\{label\}/);
  assert.match(unreadBadge, /\$\{count\} unread \$\{count === 1 \? "message" : "messages"\}/);

  const users = Object.entries(ids).filter(([key]) =>
    ["admin", "pastor", "staff", "volunteer", "otherVolunteer", "parent", "otherParent"].includes(key),
  );
  for (const [key, id] of users) {
    await db.query(
      "insert into auth.users(id,email,raw_user_meta_data) values($1,$2,jsonb_build_object('display_name',$3::text))",
      [id, `${key}@example.test`, key],
    );
  }
  await db.query(`
    update public.profiles set primary_role=case
      when id='${ids.admin}' then 'platform_administrator'::public.account_role
      when id='${ids.pastor}' then 'youth_pastor'::public.account_role
      when id='${ids.staff}' then 'staff_member'::public.account_role
      when id in ('${ids.volunteer}','${ids.otherVolunteer}') then 'volunteer'::public.account_role
      else 'parent'::public.account_role end;
  `);

  assert.equal((await asDatabaseUser(ids.admin, () => db.query("select private.can_manage_chat() allowed"))).rows[0].allowed, true);
  assert.equal((await asDatabaseUser(ids.pastor, () => db.query("select private.can_manage_chat() allowed"))).rows[0].allowed, true);
  assert.equal((await asDatabaseUser(ids.staff, () => db.query("select private.can_manage_chat() allowed"))).rows[0].allowed, false);
  await denied(
    () => asUser(ids.staff, () => db.query("select public.create_chat_room('Denied','custom','explicit',null,null)")),
    "Staff must not manage chat rooms",
  );

  await db.query("insert into public.events(id,name,event_type,status,starts_at,ends_at) values($1,'Chat Event','Youth Night','published','2026-10-01 22:00+00','2026-10-02 00:00+00')", [ids.event]);
  const parentRoom = (await asUser(ids.admin, () => db.query("select public.create_chat_room('Event parents','parent','event_parents',$1,null) id", [ids.event]))).rows[0].id;
  await asUser(ids.admin, () => db.query("select public.add_chat_room_member($1,$2)", [parentRoom, ids.parent]));
  await asUser(ids.admin, () => db.query("select public.add_chat_room_member($1,$2)", [parentRoom, ids.otherParent]));
  assert.equal((await asUser(ids.parent, () => db.query("select count(*)::int count from public.list_chat_rooms() where room_id=$1", [parentRoom]))).rows[0].count, 1);
  assert.equal((await asUser(ids.otherParent, () => db.query("select count(*)::int count from public.list_chat_rooms() where room_id=$1", [parentRoom]))).rows[0].count, 1, "A Parent room may explicitly contain unrelated eligible Parents");
  assert.equal(
    (await asUser(ids.parent, () => db.query("select private.can_receive_chat_broadcast($1) allowed", [`chat-room:${parentRoom}`]))).rows[0].allowed,
    true,
    "An authorized room member may receive the private room signal",
  );
  assert.equal(
    (await asUser(ids.otherVolunteer, () => db.query("select private.can_receive_chat_broadcast($1) allowed", [`chat-room:${parentRoom}`]))).rows[0].allowed,
    false,
    "An unrelated account must not receive the private room signal",
  );
  assert.equal(
    (await asUser(ids.parent, () => db.query("select private.can_receive_chat_broadcast('chat-room:not-a-uuid') allowed"))).rows[0].allowed,
    false,
    "Malformed room topics must fail closed",
  );
  const authorizedBroadcastRows = await asUser(ids.parent, async () => {
    await db.exec(`select set_config('request.realtime.topic','chat-room:${parentRoom}',false)`);
    return db.query("select count(*)::int count from realtime.messages");
  });
  assert.equal(authorizedBroadcastRows.rows[0].count, 1);
  const deniedBroadcastRows = await asUser(ids.otherVolunteer, async () => {
    await db.exec(`select set_config('request.realtime.topic','chat-room:${parentRoom}',false)`);
    return db.query("select count(*)::int count from realtime.messages");
  });
  assert.equal(deniedBroadcastRows.rows[0].count, 0);
  await denied(
    () => asUser(ids.otherVolunteer, () => db.query("select public.get_chat_room($1)", [parentRoom])),
    "An unauthorized room deep link must fail closed",
  );

  const custom = await asUser(ids.admin, () =>
    db.query("select public.create_chat_room('Ministry team','custom','explicit',null,null) id"),
  );
  const roomId = custom.rows[0].id;
  const volunteerTeam = (await asUser(ids.admin, () => db.query("select public.create_chat_room('Volunteer team','volunteer_team','explicit',null,null) id"))).rows[0].id;
  await denied(
    () => asUser(ids.admin, () => db.query("select public.add_chat_room_member($1,$2)", [volunteerTeam, ids.parent])),
    "Parents must not be eligible for Volunteer Team rooms",
  );
  const leadershipRoom = (await asUser(ids.admin, () => db.query("select public.create_chat_room('Leadership','staff_leadership','explicit',null,null) id"))).rows[0].id;
  await denied(
    () => asUser(ids.admin, () => db.query("select public.add_chat_room_member($1,$2)", [leadershipRoom, ids.parent])),
    "Parents must not be eligible for Staff Leadership rooms",
  );
  await asUser(ids.admin, () => db.query("select public.add_chat_room_member($1,$2)", [volunteerTeam, ids.volunteer]));
  assert.equal((await asUser(ids.volunteer, () => db.query("select count(*)::int count from public.list_chat_rooms() where room_id=$1", [volunteerTeam]))).rows[0].count, 1);
  assert.equal((await asUser(ids.otherVolunteer, () => db.query("select count(*)::int count from public.list_chat_rooms() where room_id=$1", [volunteerTeam]))).rows[0].count, 0);
  const secondLinkedRoom = await asUser(ids.admin, () => db.query("select public.create_chat_room('Second Event parents','parent','event_parents',$1,null) id", [ids.event]));
  assert.ok(secondLinkedRoom.rows[0].id, "Multiple rooms may link to the same Event");
  await denied(
    () => asUser(ids.admin, () => db.query("select * from public.chat_rooms")),
    "Authenticated users must not read chat tables directly",
  );
  await denied(
    async () => {
      await db.exec("set role anon");
      try { await db.query("select * from public.list_chat_rooms()"); } finally { await db.exec("reset role"); }
    },
    "Anonymous users must not call chat RPCs",
  );
  await asUser(ids.admin, () => db.query("select public.add_chat_room_member($1,$2)", [roomId, ids.staff]));
  await asUser(ids.admin, () => db.query("select public.add_chat_room_member($1,$2)", [roomId, ids.parent]));
  await denied(
    () => asUser(ids.otherParent, () => db.query("select * from public.list_chat_messages($1,null,100)", [roomId])),
    "An unrelated Parent must not discover an explicit room",
  );
  await denied(
    () => asUser(ids.volunteer, () => db.query("select * from public.list_chat_messages($1,null,100)", [roomId])),
    "An unrelated Volunteer must not discover an explicit room",
  );

  const staffMessage = await asUser(ids.staff, () =>
    db.query("select public.send_chat_message($1,'Staff update',null) id", [roomId]),
  );
  const insertSignal = await db.query("select payload,event,topic,is_private from realtime.broadcast_log order by ctid desc limit 1");
  assert.deepEqual(insertSignal.rows[0].payload, {});
  assert.equal(insertSignal.rows[0].event, "message_changed");
  assert.equal(insertSignal.rows[0].topic, `chat-room:${roomId}`);
  assert.equal(insertSignal.rows[0].is_private, true);
  assert.equal(JSON.stringify(insertSignal.rows[0]).includes("Staff update"), false);
  await asUser(ids.parent, () =>
    db.query("select public.send_chat_message($1,'Parent reply',$2) id", [roomId, staffMessage.rows[0].id]),
  );
  const otherRoomMessage = await asUser(ids.volunteer, () =>
    db.query("select public.send_chat_message($1,'Other room message',null) id", [volunteerTeam]),
  );
  await denied(
    () => asUser(ids.staff, () => db.query("select public.send_chat_message($1,'Invalid cross-room reply',$2)", [roomId, otherRoomMessage.rows[0].id])),
    "Replies must reference a message in the same room",
  );
  await asUser(ids.admin, () => db.query("select public.remove_chat_room_member($1,$2,'Assignment ended')", [volunteerTeam, ids.volunteer]));
  const retainedMembership = await db.query("select removed_at,removal_reason from public.chat_room_members where room_id=$1 and profile_id=$2", [volunteerTeam, ids.volunteer]);
  assert.ok(retainedMembership.rows[0].removed_at);
  assert.equal(retainedMembership.rows[0].removal_reason, "Assignment ended");
  const staffRooms = await asUser(ids.staff, () => db.query("select * from public.list_chat_rooms()"));
  assert.equal(Number(staffRooms.rows[0].unread_count), 1, "Own messages must not count as unread");
  const messages = await asUser(ids.staff, () => db.query("select * from public.list_chat_messages($1,null,100)", [roomId]));
  assert.equal(messages.rows.length, 2);
  await asUser(ids.staff, () => db.query("select public.mark_chat_room_read($1,$2)", [roomId, messages.rows[1].message_id]));
  assert.equal(Number((await asUser(ids.staff, () => db.query("select unread_count from public.list_chat_rooms() where room_id=$1", [roomId]))).rows[0].unread_count), 0);
  await asUser(ids.staff, () => db.query("select public.mark_chat_room_read($1,$2)", [roomId, messages.rows[0].message_id]));
  const readState = await db.query("select last_read_message_id from public.chat_read_state where room_id=$1 and profile_id=$2", [roomId, ids.staff]);
  assert.equal(readState.rows[0].last_read_message_id, messages.rows[1].message_id, "Read state must not move backward");
  await db.query("update public.profiles set status='suspended' where id=$1", [ids.parent]);
  await denied(
    () => asUser(ids.parent, () => db.query("select * from public.list_chat_messages($1,null,100)", [roomId])),
    "Inactive members must lose room access",
  );
  await db.query("update public.profiles set status='active' where id=$1", [ids.parent]);

  await denied(
    () => asUser(ids.staff, () => db.query("select public.remove_chat_message($1,'Denied')", [staffMessage.rows[0].id])),
    "Staff must not moderate messages",
  );
  await asUser(ids.pastor, () => db.query("select public.remove_chat_message($1,'Phase 1 moderation')", [staffMessage.rows[0].id]));
  const moderationSignal = await db.query("select payload,event,topic,is_private from realtime.broadcast_log order by ctid desc limit 1");
  assert.deepEqual(moderationSignal.rows[0].payload, {});
  assert.equal(moderationSignal.rows[0].event, "message_changed");
  assert.equal(moderationSignal.rows[0].topic, `chat-room:${roomId}`);
  assert.equal(moderationSignal.rows[0].is_private, true);
  assert.equal(JSON.stringify(moderationSignal.rows[0]).includes("Phase 1 moderation"), false);
  const removed = await asUser(ids.parent, () => db.query("select message_body,removed_at from public.list_chat_messages($1,null,100) where message_id=$2", [roomId, staffMessage.rows[0].id]));
  assert.equal(removed.rows[0].message_body, null);
  assert.ok(removed.rows[0].removed_at);
  assert.equal((await db.query("select message_body from public.chat_messages where id=$1", [staffMessage.rows[0].id])).rows[0].message_body, "Staff update");

  await asUser(ids.admin, () => db.query("select public.archive_chat_room($1)", [roomId]));
  await denied(
    () => asUser(ids.parent, () => db.query("select public.send_chat_message($1,'Denied after archive',null)", [roomId])),
    "Archived rooms must be read-only",
  );
  await denied(
    () => asUser(ids.admin, () => db.query("select public.add_chat_room_member($1,$2)", [roomId, ids.otherParent])),
    "Archived rooms must reject ordinary membership additions",
  );
  await denied(
    () => asUser(ids.admin, () => db.query("select public.remove_chat_room_member($1,$2,'Denied after archive')", [roomId, ids.parent])),
    "Archived rooms must reject ordinary membership removals",
  );
  assert.equal(Number((await asUser(ids.parent, () => db.query("select unread_count from public.list_chat_rooms() where room_id=$1", [roomId]))).rows[0].unread_count), 0);

  const audited = await db.query("select metadata::text metadata from public.audit_events where action like 'communication.chat_%'");
  assert.ok(audited.rows.length >= 5);
  assert.equal(audited.rows.some((row) => row.metadata.includes("Staff update")), false, "Audit metadata must never contain message bodies");

  console.log("Native Group Chat Phase 1 verification passed.");
} finally {
  await db.close();
}
