import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { PGlite } from "@electric-sql/pglite";
import { initialPrayerVisibility, normalizePrayerVisibility, prayerVisibilityLabel } from "../features/prayer-care/components/prayer-visibility.mjs";

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
  "supabase/migrations/202609220001_edit_prayer_request_workflow.sql",
];

const ids = {
  admin: "72000000-0000-4000-8000-000000000001",
  staff: "72000000-0000-4000-8000-000000000002",
  otherStaff: "72000000-0000-4000-8000-000000000003",
  parent: "72000000-0000-4000-8000-000000000004",
  person: "72000000-0000-4000-8000-000000000010",
  otherPerson: "72000000-0000-4000-8000-000000000011",
};

const db = new PGlite();

const [workspacePage, requestFormSource, serviceSource, lifecycleSource, careNoteSource, followUpSource, authorizationSource] = await Promise.all([
  readFile("app/(platform)/prayer-care/page.tsx", "utf8"),
  readFile("features/prayer-care/components/prayer-request-form.tsx", "utf8"),
  readFile("features/prayer-care/services/prayer-care-service.ts", "utf8"),
  readFile("features/prayer-care/components/prayer-lifecycle-forms.tsx", "utf8"),
  readFile("features/prayer-care/components/care-note-form.tsx", "utf8"),
  readFile("features/prayer-care/components/care-follow-up-forms.tsx", "utf8"),
  readFile("features/auth/types/authorization.ts", "utf8"),
]);

assert.match(workspacePage, /z\.enum\(\["overview", "prayers", "care", "follow-ups", "archived"\]\)/u);
assert.match(workspacePage, /leadership \? "overview" : "prayers"/u, "Managers and Staff must default to Overview while family readers retain Prayer Requests.");
assert.match(workspacePage, /overflow-x-auto border-b/u, "Workspace navigation must remain usable at narrow widths.");
assert.match(workspacePage, /section=prayers&action=new/u);
assert.match(workspacePage, /section=care&action=new/u);
assert.match(workspacePage, /section=follow-ups&action=new/u);
assert.match(workspacePage, /query\.action === "new"/u, "Only one query-selected creation panel may be active.");
assert.match(workspacePage, />Cancel<\/Link>/u);
assert.match(workspacePage, /Confidential note contents are intentionally excluded from this overview/u);
assert.doesNotMatch(workspacePage.match(/function Overview[\s\S]*?function isDetailed/u)?.[0] ?? "", /noteContent|instructions|completionNotes|cancellationReason/u, "Overview must not receive or render confidential content fields.");
assert.match(workspacePage, /includeArchived = active === "archived"/u);
assert.match(workspacePage, /Archived records are retained read-only\. No restore workflow is available\./u);
assert.match(lifecycleSource, /<details/u, "Prayer lifecycle controls must be intentional rather than permanently expanded.");
assert.match(lifecycleSource, />Edit request<\/button>/u);
assert.match(lifecycleSource, /showEdit \? <form/u, "The edit form must stay hidden until the manager intentionally opens it.");
assert.match(lifecycleSource, />Cancel<\/button>/u, "Cancelling an edit must return to the normal request card.");
assert.match(lifecycleSource, /answerPrayerRequestAction/u, "Mark answered must remain a separate lifecycle action.");
assert.match(careNoteSource, /<details/u, "Confidential care content and archive controls must be intentionally revealed.");
assert.match(followUpSource, /<details/u, "Follow-up lifecycle controls must be intentionally revealed.");
assert.match(serviceSource, /PrayerCareListResult/u);
assert.match(serviceSource, /Prayer & Care retrieval failed/u);
assert.match(serviceSource, /We couldn’t load Prayer & Care information\. Please try again\./u);
assert.doesNotMatch(serviceSource, /console\.error\([^\n]*(request_details|note_content|instructions|profile_id|person_id)/u, "Diagnostics must not log confidential fields or identifiers.");
assert.match(authorizationSource, /parent:\s*\[[\s\S]*?"prayer_care\.view"/u);
const volunteerCapabilities = authorizationSource.match(/volunteer:\s*\[([\s\S]*?)\],\s*youth_pastor:/u)?.[1] ?? "";
assert.doesNotMatch(volunteerCapabilities, /prayer_care\.view/u, "The UX refactor must preserve the current Volunteer route boundary.");

assert.equal(initialPrayerVisibility, "leadership");
assert.match(requestFormSource, /useState\(initialPrayerVisibility\)/u);
assert.match(requestFormSource, /name="visibility" value=\{visibility\}/u);
assert.match(requestFormSource, /onChange=\{\(event\) => setVisibility\(normalizePrayerVisibility\(event\.currentTarget\.value\)\)\}/u);
let controlledVisibility = initialPrayerVisibility;
controlledVisibility = normalizePrayerVisibility("public");
const publicFormData = new FormData();
publicFormData.set("visibility", controlledVisibility);
assert.equal(controlledVisibility, "public");
assert.equal(publicFormData.get("visibility"), "public");
assert.equal(normalizePrayerVisibility(controlledVisibility), "public", "A rerender must preserve the controlled public value.");
controlledVisibility = normalizePrayerVisibility("private");
const privateFormData = new FormData();
privateFormData.set("visibility", controlledVisibility);
assert.equal(controlledVisibility, "private");
assert.equal(privateFormData.get("visibility"), "private");
assert.equal(prayerVisibilityLabel("public"), "Public signed-in summary");
assert.equal(prayerVisibilityLabel("leadership"), "Ministry leadership");
assert.equal(prayerVisibilityLabel("private"), "Private oversight");
assert.match(workspacePage, /Visibility: \{prayerVisibilityLabel\(request\.visibility\)\}/u, "Manager cards must label the stored projected visibility.");

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
     values ($1, 'Synthetic', 'Care Person'), ($2, 'Alternate', 'Care Person')`,
    [ids.person, ids.otherPerson],
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

  const editFunctionPrivilege = await db.query(`
    select
      has_function_privilege(
        'authenticated',
        'public.update_prayer_request(uuid,uuid,uuid,text,text,public.prayer_request_visibility)',
        'EXECUTE'
      ) as authenticated_access,
      has_function_privilege(
        'anon',
        'public.update_prayer_request(uuid,uuid,uuid,text,text,public.prayer_request_visibility)',
        'EXECUTE'
      ) as anonymous_access
  `);
  assert.equal(editFunctionPrivilege.rows[0].authenticated_access, true);
  assert.equal(editFunctionPrivilege.rows[0].anonymous_access, false);

  await assert.rejects(
    () => asAuthenticated(ids.staff, () =>
      db.query(
        "select public.update_prayer_request($1,$2,$3,'Denied edit','Denied details','public')",
        [created.leadershipId, ids.otherPerson, categoryId],
      )),
    /Prayer and Care management denied/,
  );
  await assert.rejects(
    () => asAuthenticated(ids.parent, () =>
      db.query(
        "select public.update_prayer_request($1,$2,$3,'Denied parent edit','Denied details','public')",
        [created.leadershipId, ids.otherPerson, categoryId],
      )),
    /Prayer and Care management denied/,
  );
  await assert.rejects(
    () => asAuthenticated(ids.admin, () =>
      db.query(
        "select public.update_prayer_request($1,$2,$3,'','Valid details','public')",
        [created.leadershipId, ids.otherPerson, categoryId],
      )),
    /title must contain between 1 and 200 characters/,
  );
  await assert.rejects(
    () => asAuthenticated(ids.admin, () =>
      db.query(
        "select public.update_prayer_request($1,$2,$3,'Archived edit','Valid details','public')",
        [created.historyId, ids.otherPerson, categoryId],
      )),
    /Active prayer request not found/,
  );

  for (const visibility of ["private", "public", "leadership"]) {
    await asAuthenticated(ids.admin, () =>
      db.query(
        "select public.update_prayer_request($1,$2,$3,'Edited prayer','Edited confidential details',$4::public.prayer_request_visibility)",
        [created.leadershipId, ids.otherPerson, categoryId, visibility],
      ));
    const persisted = await db.query(
      "select id, person_id, category_id, title, request_details, visibility from public.prayer_requests where id = $1",
      [created.leadershipId],
    );
    assert.deepEqual(persisted.rows[0], {
      id: created.leadershipId,
      person_id: ids.otherPerson,
      category_id: categoryId,
      title: "Edited prayer",
      request_details: "Edited confidential details",
      visibility,
    });
  }

  const editAudit = await db.query(
    "select action, entity_id, metadata from public.audit_events where action = 'prayer_request.updated' and entity_id = $1 order by id desc limit 1",
    [created.leadershipId],
  );
  assert.equal(editAudit.rows[0].action, "prayer_request.updated");
  assert.equal(editAudit.rows[0].entity_id, created.leadershipId);
  assert.equal(editAudit.rows[0].metadata.visibility, "leadership");
  assert.deepEqual(editAudit.rows[0].metadata.fields, ["person_id", "category_id", "title", "request_details", "visibility"]);
  assert.doesNotMatch(JSON.stringify(editAudit.rows[0].metadata), /Edited prayer|Edited confidential details|Alternate Care Person/u);

  await db.query("update public.profiles set status = 'suspended' where id = $1", [ids.admin]);
  await assert.rejects(
    () => asAuthenticated(ids.admin, () =>
      db.query(
        "select public.update_prayer_request($1,$2,$3,'Inactive edit','Denied details','private')",
        [created.leadershipId, ids.person, categoryId],
      )),
    /Prayer and Care management denied/,
  );
  await db.query("update public.profiles set status = 'active' where id = $1", [ids.admin]);

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
