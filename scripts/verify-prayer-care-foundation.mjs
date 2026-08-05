import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { PGlite } from "@electric-sql/pglite";

const migrations = [
  "supabase/migrations/202607230001_core_database_foundation.sql",
  "supabase/migrations/202607230002_security_authorization.sql",
  "supabase/migrations/202607300019_prayer_and_care_foundation.sql",
  "supabase/migrations/202607300020_prayer_and_care_rpc.sql",
  "supabase/migrations/202608030001_prayer_and_care_security_repair.sql",
  "supabase/migrations/202608030002_prayer_and_care_access_scope.sql",
  "supabase/migrations/202608030003_prayer_care_person_picker.sql",
  "supabase/migrations/202608030005_preserve_answered_prayer_history.sql",
  "supabase/migrations/202608040001_prayer_care_assignee_picker.sql",
];

const ids = {
  admin: "72000000-0000-4000-8000-000000000001",
  staff: "72000000-0000-4000-8000-000000000002",
  otherStaff: "72000000-0000-4000-8000-000000000003",
  parent: "72000000-0000-4000-8000-000000000004",
  person: "72000000-0000-4000-8000-000000000010",
};

const db = new PGlite();

async function asAuthenticated(userId, operation) {
  await db.exec(`
    set role authenticated;
    select set_config('request.jwt.claim.sub', '${userId}', false);
  `);
  try {
    return await operation();
  } finally {
    await db.exec("reset role");
  }
}

try {
  await db.exec(`
    create schema auth;
    create schema extensions;
    create role anon nologin;
    create role authenticated nologin;
    create table auth.users (
      id uuid primary key,
      email text,
      raw_user_meta_data jsonb not null default '{}'::jsonb
    );
    create or replace function auth.uid()
    returns uuid language sql stable set search_path = ''
    as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
  `);

  for (const path of migrations) {
    const migration = await readFile(path, "utf8");
    await db.exec(
      migration
        .replace(
          "create extension if not exists pgcrypto with schema extensions;",
          "",
        )
        .replaceAll("extensions.gen_random_uuid()", "gen_random_uuid()"),
    );
  }

  await db.query(
    `insert into auth.users (id, email, raw_user_meta_data) values
      ($1, 'care-admin@example.test', '{"display_name":"Care Admin"}'),
      ($2, 'care-staff@example.test', '{"display_name":"Care Staff"}'),
      ($3, 'other-care-staff@example.test', '{"display_name":"Other Staff"}'),
      ($4, 'care-parent@example.test', '{"display_name":"Care Parent"}')`,
    [ids.admin, ids.staff, ids.otherStaff, ids.parent],
  );
  await db.query(
    `update public.profiles set primary_role = case
      when id = $1 then 'platform_administrator'::public.account_role
      when id in ($2, $3) then 'staff_member'::public.account_role
      else 'parent'::public.account_role end
     where id in ($1, $2, $3, $4)`,
    [ids.admin, ids.staff, ids.otherStaff, ids.parent],
  );

  const assignees = await asAuthenticated(ids.admin, () =>
    db.query("select profile_id from public.list_prayer_care_assignees()"),
  );
  assert.deepEqual(
    new Set(assignees.rows.map((row) => row.profile_id)),
    new Set([ids.admin, ids.staff, ids.otherStaff]),
  );
  await assert.rejects(
    () => asAuthenticated(ids.parent, () =>
      db.query("select * from public.list_prayer_care_assignees()")),
    /Prayer and Care assignee access denied/,
  );
  await db.query(
    `insert into public.people (id, first_name, last_name)
     values ($1, 'Synthetic', 'Care Person')`,
    [ids.person],
  );

  const people = await asAuthenticated(ids.admin, () =>
    db.query("select * from public.list_prayer_care_people('Synthetic')"),
  );
  assert.deepEqual(people.rows, [
    { person_id: ids.person, display_name: "Synthetic Care Person" },
  ]);
  await assert.rejects(
    () => asAuthenticated(ids.parent, () =>
      db.query("select * from public.list_prayer_care_people(null)")),
    /Prayer and Care person access denied/,
  );

  const categories = await db.query(
    "select id, created_by_profile_id from public.care_categories order by sort_order",
  );
  assert.equal(categories.rows.length, 8);
  assert.ok(categories.rows.every((row) => row.created_by_profile_id === null));
  const categoryId = categories.rows[0].id;

  const privileges = await db.query(`
    select
      has_table_privilege('authenticated', 'public.care_notes', 'SELECT') as table_access,
      has_function_privilege(
        'authenticated',
        'private.write_care_audit(text,text,uuid,jsonb)',
        'EXECUTE'
      ) as audit_helper_access
  `);
  assert.equal(privileges.rows[0].table_access, false);
  assert.equal(privileges.rows[0].audit_helper_access, false);

  const created = await asAuthenticated(ids.admin, async () => {
    const publicRequest = await db.query(
      "select public.create_prayer_request($1,$2,'Public prayer','Private public-request details','public',null) as id",
      [ids.person, categoryId],
    );
    const leadershipRequest = await db.query(
      "select public.create_prayer_request($1,$2,'Leadership prayer','Leadership-only details','leadership',null) as id",
      [ids.person, categoryId],
    );
    const privateRequest = await db.query(
      "select public.create_prayer_request($1,$2,'Private prayer','Private assigned details','private',$3) as id",
      [ids.person, categoryId, ids.staff],
    );
    const historyRequest = await db.query(
      "select public.create_prayer_request($1,$2,'Answered history','Synthetic history details','leadership',null) as id",
      [ids.person, categoryId],
    );
    await db.query("select public.answer_prayer_request($1,'Synthetic answer retained')", [historyRequest.rows[0].id]);
    await db.query("select public.archive_prayer_request($1)", [historyRequest.rows[0].id]);
    const careNote = await db.query(
      "select public.create_care_note($1,$2,'Hospital visit','Confidential visit notes',now()) as id",
      [ids.person, categoryId],
    );
    await db.query("select public.assign_care_note($1,$2)", [
      careNote.rows[0].id,
      ids.staff,
    ]);
    const followUp = await db.query(
      "select public.create_care_follow_up($1,null,$2,'Call family','Confidential instructions','normal',$3,null) as id",
      [ids.person, careNote.rows[0].id, ids.staff],
    );
    return {
      publicId: publicRequest.rows[0].id,
      leadershipId: leadershipRequest.rows[0].id,
      privateId: privateRequest.rows[0].id,
      historyId: historyRequest.rows[0].id,
      careNoteId: careNote.rows[0].id,
      followUpId: followUp.rows[0].id,
    };
  });

  const history = await db.query(
    "select status, answer_summary, answered_at from public.prayer_requests where id = $1",
    [created.historyId],
  );
  assert.equal(history.rows[0].status, "archived");
  assert.equal(history.rows[0].answer_summary, "Synthetic answer retained");
  assert.ok(history.rows[0].answered_at);

  const parentSummaries = await asAuthenticated(ids.parent, () =>
    db.query("select * from public.list_public_prayer_summaries()"),
  );
  assert.deepEqual(
    parentSummaries.rows.map((row) => row.prayer_request_id),
    [created.publicId],
  );
  assert.equal("request_details" in parentSummaries.rows[0], false);
  assert.equal("person_id" in parentSummaries.rows[0], false);

  await assert.rejects(
    () =>
      asAuthenticated(ids.parent, () =>
        db.query("select * from public.list_visible_prayer_requests(false)"),
      ),
    /Prayer request access denied/,
  );
  await assert.rejects(
    () =>
      asAuthenticated(ids.staff, () =>
        db.query("select * from public.list_prayer_requests(null,null,null,null,false)"),
      ),
    /Prayer and Care access denied/,
  );

  const staffRequests = await asAuthenticated(ids.staff, () =>
    db.query("select prayer_request_id from public.list_visible_prayer_requests(false)"),
  );
  assert.deepEqual(
    new Set(staffRequests.rows.map((row) => row.prayer_request_id)),
    new Set([created.publicId, created.leadershipId, created.privateId]),
  );

  const otherStaffRequests = await asAuthenticated(ids.otherStaff, () =>
    db.query("select prayer_request_id from public.list_visible_prayer_requests(false)"),
  );
  assert.deepEqual(
    new Set(otherStaffRequests.rows.map((row) => row.prayer_request_id)),
    new Set([created.publicId, created.leadershipId]),
  );

  const assignedNotes = await asAuthenticated(ids.staff, () =>
    db.query("select care_note_id from public.list_assigned_care_notes()"),
  );
  assert.deepEqual(assignedNotes.rows, [{ care_note_id: created.careNoteId }]);
  const otherNotes = await asAuthenticated(ids.otherStaff, () =>
    db.query("select care_note_id from public.list_assigned_care_notes()"),
  );
  assert.equal(otherNotes.rows.length, 0);

  const assignedFollowUps = await asAuthenticated(ids.staff, () =>
    db.query("select care_follow_up_id from public.list_my_care_follow_ups()"),
  );
  assert.deepEqual(assignedFollowUps.rows, [
    { care_follow_up_id: created.followUpId },
  ]);
  const otherFollowUps = await asAuthenticated(ids.otherStaff, () =>
    db.query("select care_follow_up_id from public.list_my_care_follow_ups()"),
  );
  assert.equal(otherFollowUps.rows.length, 0);

  await db.query(
    "update public.profiles set status = 'suspended' where id = $1",
    [ids.parent],
  );
  await assert.rejects(
    () =>
      asAuthenticated(ids.parent, () =>
        db.query("select * from public.list_public_prayer_summaries()"),
      ),
    /Prayer summary access denied/,
  );

  console.log("Prayer & Care foundation verification passed.");
} finally {
  await db.close();
}
