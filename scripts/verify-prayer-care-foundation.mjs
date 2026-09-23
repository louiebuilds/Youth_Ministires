import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { PGlite } from "@electric-sql/pglite";

import {
  initialPrayerVisibility,
  normalizePrayerVisibility,
  prayerVisibilityLabel,
} from "../features/prayer-care/components/prayer-visibility.mjs";

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
  "supabase/migrations/202609230001_prayer_care_manager_workflow_enhancements.sql",
];

const ids = {
  admin: "72000000-0000-4000-8000-000000000001",
  staff: "72000000-0000-4000-8000-000000000002",
  otherStaff: "72000000-0000-4000-8000-000000000003",
  parent: "72000000-0000-4000-8000-000000000004",
  volunteer: "72000000-0000-4000-8000-000000000005",
  person: "72000000-0000-4000-8000-000000000010",
  otherPerson: "72000000-0000-4000-8000-000000000011",
  missingPerson: "72000000-0000-4000-8000-000000000099",
  missingCategory: "72000000-0000-4000-8000-000000000098",
};

const db = new PGlite();

const [
  workspacePage,
  requestFormSource,
  serviceSource,
  lifecycleSource,
  careNoteSource,
  followUpSource,
  actionSource,
  schemaSource,
  authorizationSource,
  managerMigrationSource,
] = await Promise.all([
  readFile("app/(platform)/prayer-care/page.tsx", "utf8"),
  readFile(
    "features/prayer-care/components/prayer-request-form.tsx",
    "utf8",
  ),
  readFile(
    "features/prayer-care/services/prayer-care-service.ts",
    "utf8",
  ),
  readFile(
    "features/prayer-care/components/prayer-lifecycle-forms.tsx",
    "utf8",
  ),
  readFile(
    "features/prayer-care/components/care-note-form.tsx",
    "utf8",
  ),
  readFile(
    "features/prayer-care/components/care-follow-up-forms.tsx",
    "utf8",
  ),
  readFile(
    "features/prayer-care/actions/prayer-care-actions.ts",
    "utf8",
  ),
  readFile(
    "features/prayer-care/schemas/prayer-request-schema.ts",
    "utf8",
  ),
  readFile("features/auth/types/authorization.ts", "utf8"),
  readFile(
    "supabase/migrations/202609230001_prayer_care_manager_workflow_enhancements.sql",
    "utf8",
  ),
]);

// -----------------------------------------------------------------------------
// Workspace structure and privacy boundaries
// -----------------------------------------------------------------------------

assert.match(
  workspacePage,
  /z\.enum\(\s*\[\s*"overview",\s*"prayers",\s*"care",\s*"follow-ups",\s*"archived",?\s*\]\s*\)/u,
  "Prayer & Care workspace must retain Overview, Prayer Requests, Care, Follow-ups, and Archived sections.",
);

assert.match(
  workspacePage,
  /:\s*leadership\s*\?\s*"overview"\s*:\s*"prayers"/u,
  "Managers and Staff must default to Overview while family readers retain Prayer Requests.",
);

assert.match(
  workspacePage,
  /overflow-x-auto border-b/u,
  "Workspace navigation must remain usable at narrow widths.",
);

assert.match(workspacePage, /section=prayers&action=new/u);
assert.match(workspacePage, /section=care&action=new/u);
assert.match(workspacePage, /section=follow-ups&action=new/u);

assert.match(
  workspacePage,
  /query\.action === "new"/u,
  "Query-selected creation panels must remain intentional.",
);

assert.match(
  workspacePage,
  />\s*Cancel\s*<\/Link>/u,
  "Creation and edit panels must retain an intentional Cancel action.",
);

assert.match(
  workspacePage,
  /Confidential note contents are intentionally excluded\s+from this overview\./u,
  "Overview must explicitly state that confidential note contents are excluded.",
);

assert.doesNotMatch(
  workspacePage.match(
    /function Overview[\s\S]*?function isDetailed/u,
  )?.[0] ?? "",
  /noteContent|instructions|completionNotes|cancellationReason/u,
  "Overview must not receive or render confidential content fields.",
);

assert.match(
  workspacePage,
  /includeArchived = active === "archived"/u,
);

assert.match(
  workspacePage,
  /Archived records are retained read-only\.\s+No\s+restore workflow is available\./u,
  "Archived records must remain read-only with no restore workflow.",
);

// -----------------------------------------------------------------------------
// Phase 1 manager-workflow UI coverage
// -----------------------------------------------------------------------------

assert.match(
  workspacePage,
  /EditCareNoteForm/u,
  "Care workspace must expose the focused Edit Care Record form.",
);

assert.match(
  workspacePage,
  /action=edit&careNoteId=/u,
  "Active Care records must provide an intentional Edit Care Record route.",
);

assert.match(
  workspacePage,
  /action=new-follow-up&careNoteId=/u,
  "Active Care records must provide Create follow-up using the Care Note UUID.",
);

assert.match(
  workspacePage,
  /EditCareFollowUpForm/u,
  "Follow-up workspace must expose the focused Edit Follow-up form.",
);

assert.match(
  workspacePage,
  /action=edit&careFollowUpId=/u,
  "Open follow-ups must provide an intentional edit route.",
);

assert.match(
  workspacePage,
  /\{followUp\.title\}/u,
  "Follow-up card heading must remain bound to followUp.title.",
);

assert.match(
  workspacePage,
  /followUp\.careNoteTitle/u,
  "Authorized manager follow-up cards must retain Care Note source-title projection.",
);

assert.match(
  workspacePage,
  /followUp\.prayerRequestTitle/u,
  "Authorized manager follow-up cards must retain Prayer Request source-title projection.",
);

assert.match(
  workspacePage,
  /followUp\.completedAt/u,
  "Completed follow-ups must expose the retained completion timestamp.",
);

assert.match(
  workspacePage,
  /followUp\.completedByName/u,
  "Completed follow-ups must expose the retained completion actor.",
);

assert.match(
  workspacePage,
  /followUp\.cancelledAt/u,
  "Cancelled follow-ups must expose the retained cancellation timestamp.",
);

assert.match(
  workspacePage,
  /followUp\.cancelledByName/u,
  "Cancelled follow-ups must expose the retained cancellation actor.",
);

assert.match(
  workspacePage,
  /View retained outcome/u,
  "Completion and cancellation narratives must remain behind intentional disclosure.",
);

assert.match(
  workspacePage,
  /Confidential care-note\s+content is not copied into the follow-up\./u,
  "Care-to-follow-up workflow must explicitly preserve the no-copy privacy boundary.",
);

// -----------------------------------------------------------------------------
// Component, action, schema, and service wiring
// -----------------------------------------------------------------------------

assert.match(
  lifecycleSource,
  /<details/u,
  "Prayer lifecycle controls must be intentional rather than permanently expanded.",
);

assert.match(lifecycleSource, />Edit request<\/button>/u);

assert.match(
  lifecycleSource,
  /showEdit \? <form/u,
  "Prayer edit form must stay hidden until intentionally opened.",
);

assert.match(
  lifecycleSource,
  />Cancel<\/button>/u,
  "Cancelling a prayer edit must return to the normal request card.",
);

assert.match(
  lifecycleSource,
  /answerPrayerRequestAction/u,
  "Mark answered must remain a separate lifecycle action.",
);

assert.match(
  careNoteSource,
  /EditCareNoteForm/u,
  "Care Note components must include the focused edit form.",
);

assert.match(
  careNoteSource,
  /updateCareNoteAction/u,
  "Edit Care Record must submit through its protected server action.",
);

assert.match(
  careNoteSource,
  /name="careNoteId"/u,
  "Edit Care Record must preserve the Care Note UUID.",
);

assert.match(
  careNoteSource,
  /name="personId"/u,
  "Edit Care Record must submit the selected Person.",
);

assert.match(
  careNoteSource,
  /const \[personId, setPersonId\] = useState\(careNote\.personId\)/u,
  "Edit Care Record must keep the selected Person in controlled state.",
);

assert.match(
  careNoteSource,
  /name="personId"[\s\S]*?value=\{personId\}[\s\S]*?onChange=\{\(event\) => setPersonId\(event\.target\.value\)\}/u,
  "Edit Care Record must submit the controlled Person selection.",
);

assert.match(
  careNoteSource,
  /<details/u,
  "Confidential care content and archive controls must be intentionally revealed.",
);

assert.match(
  followUpSource,
  /EditCareFollowUpForm/u,
  "Follow-up components must include the focused edit form.",
);

assert.match(
  followUpSource,
  /updateCareFollowUpAction/u,
  "Edit Follow-up must submit through its protected server action.",
);

assert.match(
  followUpSource,
  /careNoteId/u,
  "Follow-up creation must accept an optional Care Note source.",
);

assert.match(
  followUpSource,
  /lockedPerson/u,
  "Care-linked follow-up creation must support an authoritative locked Person.",
);

assert.match(
  followUpSource,
  /const \[priority, setPriority\] = useState<CareFollowUp\["priority"\]>/u,
  "Edit Follow-up must keep Priority in controlled state.",
);

assert.match(
  followUpSource,
  /name="priority"[\s\S]*?value=\{priority\}[\s\S]*?setPriority/u,
  "Edit Follow-up must submit the controlled Priority selection.",
);

assert.match(
  followUpSource,
  /const \[status, setStatus\] = useState<"pending" \| "in_progress">/u,
  "Edit Follow-up must keep Status in controlled state.",
);

assert.match(
  followUpSource,
  /name="status"[\s\S]*?value=\{status\}[\s\S]*?setStatus/u,
  "Edit Follow-up must submit the controlled Status selection.",
);

assert.match(
  followUpSource,
  /<details/u,
  "Follow-up lifecycle content must remain intentionally revealed.",
);

assert.match(
  actionSource,
  /updateCareNoteAction/u,
  "Prayer & Care actions must expose the Care Record update workflow.",
);

assert.match(
  actionSource,
  /updateCareFollowUpAction/u,
  "Prayer & Care actions must expose the Follow-up update workflow.",
);

assert.match(
  actionSource,
  /careNoteId/u,
  "Follow-up creation action must preserve the Care Note source identifier.",
);

assert.match(
  schemaSource,
  /editCareNoteSchema/u,
  "Validation must include Edit Care Record input.",
);

assert.match(
  schemaSource,
  /editCareFollowUpSchema/u,
  "Validation must include Edit Follow-up input.",
);

assert.match(
  schemaSource,
  /value === "" \|\| value === undefined \|\| value === null \? null : value/u,
  "Optional UUID validation must accept omitted careNoteId values on edit.",
);

assert.match(
  serviceSource,
  /update_care_note_details/u,
  "Service layer must call the protected Care Record update RPC.",
);

assert.match(
  serviceSource,
  /update_care_follow_up_details/u,
  "Service layer must call the protected Follow-up update RPC.",
);

assert.match(
  serviceSource,
  /p_care_note_id:\s*input\.careNoteId/u,
  "Care-linked Follow-up creation must send the Care Note UUID to the database.",
);

assert.match(
  serviceSource,
  /careNoteTitle:\s*item\.care_note_title/u,
  "Follow-up service projection must retain the Care Note title.",
);

assert.match(
  serviceSource,
  /prayerRequestTitle:\s*item\.prayer_request_title/u,
  "Follow-up service projection must retain the Prayer Request title.",
);

assert.match(
  serviceSource,
  /completedByName:\s*item\.completed_by_name/u,
  "Follow-up service projection must retain completion actor display name.",
);

assert.match(
  serviceSource,
  /cancelledByName:\s*item\.cancelled_by_name/u,
  "Follow-up service projection must retain cancellation actor display name.",
);

assert.match(serviceSource, /PrayerCareListResult/u);
assert.match(serviceSource, /Prayer & Care retrieval failed/u);

assert.match(
  serviceSource,
  /We couldn’t load Prayer & Care information\. Please try again\./u,
);

assert.doesNotMatch(
  serviceSource,
  /console\.error\([^\n]*(request_details|note_content|instructions|profile_id|person_id)/u,
  "Diagnostics must not log confidential fields or identifiers.",
);

// -----------------------------------------------------------------------------
// Migration privacy and security assertions
// -----------------------------------------------------------------------------

assert.match(
  managerMigrationSource,
  /create or replace function public\.update_care_note_details/u,
);

assert.match(
  managerMigrationSource,
  /create or replace function public\.update_care_follow_up_details/u,
);

assert.match(
  managerMigrationSource,
  /if p_person_id is distinct from v_existing\.person_id[\s\S]*?update public\.care_follow_ups[\s\S]*?where care_note_id = p_care_note_id/u,
  "Care Record Person correction must keep linked Follow-ups source-consistent.",
);

assert.match(
  managerMigrationSource,
  /from public\.care_notes cn[\s\S]*?cn\.person_id = p_person_id/u,
  "Care-linked Follow-up edits must validate Person against the actual Care Note.",
);

assert.match(
  managerMigrationSource,
  /from public\.prayer_requests pr[\s\S]*?pr\.person_id = p_person_id/u,
  "Prayer-linked Follow-up edits must validate Person against the actual Prayer Request.",
);

assert.match(
  managerMigrationSource,
  /revoke all on function public\.update_care_note_details[\s\S]*?from public, anon/u,
);

assert.match(
  managerMigrationSource,
  /revoke all on function public\.update_care_follow_up_details[\s\S]*?from public, anon/u,
);

assert.doesNotMatch(
  managerMigrationSource.match(
    /perform private\.write_care_audit\([\s\S]*?\);/u,
  )?.[0] ?? "",
  /p_note_content|p_title/u,
  "Care Record update audit metadata must not include title or confidential note narrative.",
);

// -----------------------------------------------------------------------------
// Authorization configuration
// -----------------------------------------------------------------------------

assert.match(
  authorizationSource,
  /parent:\s*\[[\s\S]*?"prayer_care\.view"/u,
);

const volunteerCapabilities =
  authorizationSource.match(
    /volunteer:\s*\[([\s\S]*?)\],\s*youth_pastor:/u,
  )?.[1] ?? "";

assert.doesNotMatch(
  volunteerCapabilities,
  /prayer_care\.view/u,
  "Phase 1 must preserve the current Volunteer route boundary.",
);

// -----------------------------------------------------------------------------
// Prayer visibility regression coverage
// -----------------------------------------------------------------------------

assert.equal(initialPrayerVisibility, "leadership");

assert.match(
  requestFormSource,
  /useState\(initialPrayerVisibility\)/u,
);

assert.match(
  requestFormSource,
  /name="visibility" value=\{visibility\}/u,
);

assert.match(
  requestFormSource,
  /onChange=\{\(event\) => setVisibility\(normalizePrayerVisibility\(event\.currentTarget\.value\)\)\}/u,
);

let controlledVisibility = initialPrayerVisibility;

controlledVisibility = normalizePrayerVisibility("public");

const publicFormData = new FormData();
publicFormData.set("visibility", controlledVisibility);

assert.equal(controlledVisibility, "public");
assert.equal(publicFormData.get("visibility"), "public");

assert.equal(
  normalizePrayerVisibility(controlledVisibility),
  "public",
  "A rerender must preserve the controlled public value.",
);

controlledVisibility = normalizePrayerVisibility("private");

const privateFormData = new FormData();
privateFormData.set("visibility", controlledVisibility);

assert.equal(controlledVisibility, "private");
assert.equal(privateFormData.get("visibility"), "private");

assert.equal(
  prayerVisibilityLabel("public"),
  "Public signed-in summary",
);

assert.equal(
  prayerVisibilityLabel("leadership"),
  "Ministry leadership",
);

assert.equal(
  prayerVisibilityLabel("private"),
  "Private oversight",
);

assert.match(
  workspacePage,
  /Visibility:\{" "\}\s*\{prayerVisibilityLabel\(\s*request\.visibility,\s*\)\}/u,
  "Prayer request cards must continue showing the human-readable visibility label.",
);

// -----------------------------------------------------------------------------
// Database test helpers
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// Database behavior
// -----------------------------------------------------------------------------

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
    returns uuid
    language sql
    stable
    set search_path = ''
    as $$
      select nullif(
        current_setting('request.jwt.claim.sub', true),
        ''
      )::uuid
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
        .replaceAll(
          "extensions.gen_random_uuid()",
          "gen_random_uuid()",
        ),
    );
  }

  await db.query(
    `insert into auth.users (
       id,
       email,
       raw_user_meta_data
     )
     values
       ($1, 'care-admin@example.test', '{"display_name":"Care Admin"}'),
       ($2, 'care-staff@example.test', '{"display_name":"Care Staff"}'),
       ($3, 'other-care-staff@example.test', '{"display_name":"Other Staff"}'),
       ($4, 'care-parent@example.test', '{"display_name":"Care Parent"}'),
       ($5, 'care-volunteer@example.test', '{"display_name":"Care Volunteer"}')`,
    [
      ids.admin,
      ids.staff,
      ids.otherStaff,
      ids.parent,
      ids.volunteer,
    ],
  );

  await db.query(
    `update public.profiles
     set primary_role = case
       when id = $1
         then 'platform_administrator'::public.account_role
       when id in ($2, $3)
         then 'staff_member'::public.account_role
       when id = $5
         then 'volunteer'::public.account_role
       else 'parent'::public.account_role
     end
     where id in ($1, $2, $3, $4, $5)`,
    [
      ids.admin,
      ids.staff,
      ids.otherStaff,
      ids.parent,
      ids.volunteer,
    ],
  );

  // ---------------------------------------------------------------------------
  // Caregiver picker boundaries
  // ---------------------------------------------------------------------------

  const assignees = await asAuthenticated(
    ids.admin,
    () =>
      db.query(
        "select profile_id from public.list_prayer_care_assignees()",
      ),
  );

  assert.deepEqual(
    new Set(
      assignees.rows.map(
        (row) => row.profile_id,
      ),
    ),
    new Set([
      ids.admin,
      ids.staff,
      ids.otherStaff,
    ]),
  );

  await assert.rejects(
    () =>
      asAuthenticated(
        ids.parent,
        () =>
          db.query(
            "select * from public.list_prayer_care_assignees()",
          ),
      ),
    /Prayer and Care assignee access denied/,
  );

  await assert.rejects(
    () =>
      asAuthenticated(
        ids.volunteer,
        () =>
          db.query(
            "select * from public.list_prayer_care_assignees()",
          ),
      ),
    /Prayer and Care assignee access denied/,
  );

  // ---------------------------------------------------------------------------
  // Synthetic People and categories
  // ---------------------------------------------------------------------------

  await db.query(
    `insert into public.people (
       id,
       first_name,
       last_name
     )
     values
       ($1, 'Synthetic', 'Care Person'),
       ($2, 'Alternate', 'Care Person')`,
    [
      ids.person,
      ids.otherPerson,
    ],
  );

  const people = await asAuthenticated(
    ids.admin,
    () =>
      db.query(
        "select * from public.list_prayer_care_people('Synthetic')",
      ),
  );

  assert.deepEqual(
    people.rows,
    [
      {
        person_id: ids.person,
        display_name: "Synthetic Care Person",
      },
    ],
  );

  await assert.rejects(
    () =>
      asAuthenticated(
        ids.parent,
        () =>
          db.query(
            "select * from public.list_prayer_care_people(null)",
          ),
      ),
    /Prayer and Care person access denied/,
  );

  const categories = await db.query(
    `select id, created_by_profile_id
     from public.care_categories
     order by sort_order`,
  );

  assert.equal(
    categories.rows.length,
    8,
  );

  assert.ok(
    categories.rows.every(
      (row) =>
        row.created_by_profile_id === null,
    ),
  );

  const categoryId = categories.rows[0].id;

  // ---------------------------------------------------------------------------
  // Direct-table and helper security
  // ---------------------------------------------------------------------------

  const privileges = await db.query(`
    select
      has_table_privilege(
        'authenticated',
        'public.care_notes',
        'SELECT'
      ) as table_access,

      has_function_privilege(
        'authenticated',
        'private.write_care_audit(text,text,uuid,jsonb)',
        'EXECUTE'
      ) as audit_helper_access
  `);

  assert.equal(
    privileges.rows[0].table_access,
    false,
  );

  assert.equal(
    privileges.rows[0].audit_helper_access,
    false,
  );

  // ---------------------------------------------------------------------------
  // Phase 1 RPC execution privileges
  // ---------------------------------------------------------------------------

  const managerWorkflowPrivileges = await db.query(`
    select
      has_function_privilege(
        'authenticated',
        'public.update_care_note_details(uuid,uuid,uuid,text,text,timestamp with time zone)',
        'EXECUTE'
      ) as care_note_authenticated,

      has_function_privilege(
        'anon',
        'public.update_care_note_details(uuid,uuid,uuid,text,text,timestamp with time zone)',
        'EXECUTE'
      ) as care_note_anon,

      has_function_privilege(
        'authenticated',
        'public.update_care_follow_up_details(uuid,uuid,text,text,public.care_follow_up_priority,uuid,timestamp with time zone,public.care_follow_up_status)',
        'EXECUTE'
      ) as follow_up_authenticated,

      has_function_privilege(
        'anon',
        'public.update_care_follow_up_details(uuid,uuid,text,text,public.care_follow_up_priority,uuid,timestamp with time zone,public.care_follow_up_status)',
        'EXECUTE'
      ) as follow_up_anon
  `);

  assert.equal(
    managerWorkflowPrivileges.rows[0].care_note_authenticated,
    true,
  );

  assert.equal(
    managerWorkflowPrivileges.rows[0].care_note_anon,
    false,
  );

  assert.equal(
    managerWorkflowPrivileges.rows[0].follow_up_authenticated,
    true,
  );

  assert.equal(
    managerWorkflowPrivileges.rows[0].follow_up_anon,
    false,
  );

  // ---------------------------------------------------------------------------
  // Create synthetic Prayer & Care records
  // ---------------------------------------------------------------------------

  const created = await asAuthenticated(
    ids.admin,
    async () => {
      const publicRequest = await db.query(
        `select public.create_prayer_request(
           $1,
           $2,
           'Public prayer',
           'Private public-request details',
           'public',
           null
         ) as id`,
        [
          ids.person,
          categoryId,
        ],
      );

      const leadershipRequest = await db.query(
        `select public.create_prayer_request(
           $1,
           $2,
           'Leadership prayer',
           'Leadership-only details',
           'leadership',
           null
         ) as id`,
        [
          ids.person,
          categoryId,
        ],
      );

      const privateRequest = await db.query(
        `select public.create_prayer_request(
           $1,
           $2,
           'Private prayer',
           'Private assigned details',
           'private',
           $3
         ) as id`,
        [
          ids.person,
          categoryId,
          ids.staff,
        ],
      );

      const historyRequest = await db.query(
        `select public.create_prayer_request(
           $1,
           $2,
           'Answered history',
           'Synthetic history details',
           'leadership',
           null
         ) as id`,
        [
          ids.person,
          categoryId,
        ],
      );

      await db.query(
        `select public.answer_prayer_request(
           $1,
           'Synthetic answer retained'
         )`,
        [
          historyRequest.rows[0].id,
        ],
      );

      await db.query(
        "select public.archive_prayer_request($1)",
        [
          historyRequest.rows[0].id,
        ],
      );

      const careNote = await db.query(
        `select public.create_care_note(
           $1,
           $2,
           'Hospital visit',
           'Confidential visit notes',
           now()
         ) as id`,
        [
          ids.person,
          categoryId,
        ],
      );

      await db.query(
        "select public.assign_care_note($1,$2)",
        [
          careNote.rows[0].id,
          ids.staff,
        ],
      );

      const followUp = await db.query(
        `select public.create_care_follow_up(
           $1,
           null,
           $2,
           'Call family',
           'Confidential instructions',
           'normal',
           $3,
           null
         ) as id`,
        [
          ids.person,
          careNote.rows[0].id,
          ids.staff,
        ],
      );

      const standaloneFollowUp =
        await db.query(
          `select public.create_care_follow_up(
             $1,
             null,
             null,
             'Standalone follow-up',
             'Standalone confidential instructions',
             'normal',
             $2,
             null
           ) as id`,
          [
            ids.person,
            ids.staff,
          ],
        );

      const terminalFollowUp =
        await db.query(
          `select public.create_care_follow_up(
             $1,
             null,
             null,
             'Terminal follow-up',
             'Terminal confidential instructions',
             'normal',
             $2,
             null
           ) as id`,
          [
            ids.person,
            ids.staff,
          ],
        );

      await db.query(
        `select public.complete_care_follow_up(
           $1,
           'Synthetic completion notes'
         )`,
        [
          terminalFollowUp.rows[0].id,
        ],
      );

      const archivedCareNote =
        await db.query(
          `select public.create_care_note(
             $1,
             $2,
             'Archived synthetic care',
             'Archived confidential care notes',
             now()
           ) as id`,
          [
            ids.person,
            categoryId,
          ],
        );

      await db.query(
        "select public.archive_care_note($1)",
        [
          archivedCareNote.rows[0].id,
        ],
      );

      return {
        publicId:
          publicRequest.rows[0].id,
        leadershipId:
          leadershipRequest.rows[0].id,
        privateId:
          privateRequest.rows[0].id,
        historyId:
          historyRequest.rows[0].id,
        careNoteId:
          careNote.rows[0].id,
        followUpId:
          followUp.rows[0].id,
        standaloneFollowUpId:
          standaloneFollowUp.rows[0].id,
        terminalFollowUpId:
          terminalFollowUp.rows[0].id,
        archivedCareNoteId:
          archivedCareNote.rows[0].id,
      };
    },
  );

  // ---------------------------------------------------------------------------
  // Existing answered-prayer history behavior
  // ---------------------------------------------------------------------------

  const history = await db.query(
    `select
       status,
       answer_summary,
       answered_at
     from public.prayer_requests
     where id = $1`,
    [
      created.historyId,
    ],
  );

  assert.equal(
    history.rows[0].status,
    "archived",
  );

  assert.equal(
    history.rows[0].answer_summary,
    "Synthetic answer retained",
  );

  assert.ok(
    history.rows[0].answered_at,
  );

  // ---------------------------------------------------------------------------
  // Existing Prayer Request edit security
  // ---------------------------------------------------------------------------

  const editFunctionPrivilege =
    await db.query(`
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

  assert.equal(
    editFunctionPrivilege.rows[0].authenticated_access,
    true,
  );

  assert.equal(
    editFunctionPrivilege.rows[0].anonymous_access,
    false,
  );

  await assert.rejects(
    () =>
      asAuthenticated(
        ids.staff,
        () =>
          db.query(
            `select public.update_prayer_request(
               $1,
               $2,
               $3,
               'Denied edit',
               'Denied details',
               'public'
             )`,
            [
              created.leadershipId,
              ids.otherPerson,
              categoryId,
            ],
          ),
      ),
    /Prayer and Care management denied/,
  );

  await assert.rejects(
    () =>
      asAuthenticated(
        ids.parent,
        () =>
          db.query(
            `select public.update_prayer_request(
               $1,
               $2,
               $3,
               'Denied parent edit',
               'Denied details',
               'public'
             )`,
            [
              created.leadershipId,
              ids.otherPerson,
              categoryId,
            ],
          ),
      ),
    /Prayer and Care management denied/,
  );

  await assert.rejects(
    () =>
      asAuthenticated(
        ids.admin,
        () =>
          db.query(
            `select public.update_prayer_request(
               $1,
               $2,
               $3,
               '',
               'Valid details',
               'public'
             )`,
            [
              created.leadershipId,
              ids.otherPerson,
              categoryId,
            ],
          ),
      ),
    /title must contain between 1 and 200 characters/,
  );

  await assert.rejects(
    () =>
      asAuthenticated(
        ids.admin,
        () =>
          db.query(
            `select public.update_prayer_request(
               $1,
               $2,
               $3,
               'Archived edit',
               'Valid details',
               'public'
             )`,
            [
              created.historyId,
              ids.otherPerson,
              categoryId,
            ],
          ),
      ),
    /Active prayer request not found/,
  );

  for (
    const visibility of [
      "private",
      "public",
      "leadership",
    ]
  ) {
    await asAuthenticated(
      ids.admin,
      () =>
        db.query(
          `select public.update_prayer_request(
             $1,
             $2,
             $3,
             'Edited prayer',
             'Edited confidential details',
             $4::public.prayer_request_visibility
           )`,
          [
            created.leadershipId,
            ids.otherPerson,
            categoryId,
            visibility,
          ],
        ),
    );

    const persisted =
      await db.query(
        `select
           id,
           person_id,
           category_id,
           title,
           request_details,
           visibility
         from public.prayer_requests
         where id = $1`,
        [
          created.leadershipId,
        ],
      );

    assert.deepEqual(
      persisted.rows[0],
      {
        id:
          created.leadershipId,
        person_id:
          ids.otherPerson,
        category_id:
          categoryId,
        title:
          "Edited prayer",
        request_details:
          "Edited confidential details",
        visibility,
      },
    );
  }

  const editAudit =
    await db.query(
      `select
         action,
         entity_id,
         metadata
       from public.audit_events
       where action = 'prayer_request.updated'
         and entity_id = $1
       order by id desc
       limit 1`,
      [
        created.leadershipId,
      ],
    );

  assert.equal(
    editAudit.rows[0].action,
    "prayer_request.updated",
  );

  assert.equal(
    editAudit.rows[0].entity_id,
    created.leadershipId,
  );

  assert.equal(
    editAudit.rows[0].metadata.visibility,
    "leadership",
  );

  assert.deepEqual(
    editAudit.rows[0].metadata.fields,
    [
      "person_id",
      "category_id",
      "title",
      "request_details",
      "visibility",
    ],
  );

  assert.doesNotMatch(
    JSON.stringify(
      editAudit.rows[0].metadata,
    ),
    /Edited prayer|Edited confidential details|Alternate Care Person/u,
  );

  // ---------------------------------------------------------------------------
  // Phase 1: manager Edit Care Record
  // ---------------------------------------------------------------------------

  await assert.rejects(
    () =>
      asAuthenticated(
        ids.staff,
        () =>
          db.query(
            `select public.update_care_note_details(
               $1,
               $2,
               $3,
               'Denied staff edit',
               'Denied staff confidential note',
               now()
             )`,
            [
              created.careNoteId,
              ids.person,
              categoryId,
            ],
          ),
      ),
    /Prayer and Care management denied/,
  );

  await assert.rejects(
    () =>
      asAuthenticated(
        ids.parent,
        () =>
          db.query(
            `select public.update_care_note_details(
               $1,
               $2,
               $3,
               'Denied parent edit',
               'Denied parent confidential note',
               now()
             )`,
            [
              created.careNoteId,
              ids.person,
              categoryId,
            ],
          ),
      ),
    /Prayer and Care management denied/,
  );

  await assert.rejects(
    () =>
      asAuthenticated(
        ids.volunteer,
        () =>
          db.query(
            `select public.update_care_note_details(
               $1,
               $2,
               $3,
               'Denied volunteer edit',
               'Denied volunteer confidential note',
               now()
             )`,
            [
              created.careNoteId,
              ids.person,
              categoryId,
            ],
          ),
      ),
    /Prayer and Care management denied/,
  );

  await assert.rejects(
    () =>
      asAuthenticated(
        ids.admin,
        () =>
          db.query(
            `select public.update_care_note_details(
               $1,
               $2,
               $3,
               'Invalid Person edit',
               'Valid confidential note',
               now()
             )`,
            [
              created.careNoteId,
              ids.missingPerson,
              categoryId,
            ],
          ),
      ),
    /Person not found or archived/,
  );

  await assert.rejects(
    () =>
      asAuthenticated(
        ids.admin,
        () =>
          db.query(
            `select public.update_care_note_details(
               $1,
               $2,
               $3,
               'Invalid Category edit',
               'Valid confidential note',
               now()
             )`,
            [
              created.careNoteId,
              ids.person,
              ids.missingCategory,
            ],
          ),
      ),
    /Active care category not found/,
  );

  await assert.rejects(
    () =>
      asAuthenticated(
        ids.admin,
        () =>
          db.query(
            `select public.update_care_note_details(
               $1,
               $2,
               $3,
               'Archived care edit',
               'Archived confidential note edit',
               now()
             )`,
            [
              created.archivedCareNoteId,
              ids.person,
              categoryId,
            ],
          ),
      ),
    /Active care note not found/,
  );

  await asAuthenticated(
    ids.admin,
    () =>
      db.query(
        `select public.update_care_note_details(
           $1,
           $2,
           $3,
           'Hospital visit corrected',
           'Corrected confidential visit notes',
           '2026-09-23T14:30:00Z'
         )`,
        [
          created.careNoteId,
          ids.otherPerson,
          categoryId,
        ],
      ),
  );

  const persistedCare =
    await db.query(
      `select
         id,
         person_id,
         category_id,
         title,
         note_content,
         occurred_at
       from public.care_notes
       where id = $1`,
      [
        created.careNoteId,
      ],
    );

  assert.equal(
    persistedCare.rows[0].id,
    created.careNoteId,
    "Editing a Care Record must preserve its UUID.",
  );

  assert.equal(
    persistedCare.rows[0].person_id,
    ids.otherPerson,
  );

  assert.equal(
    persistedCare.rows[0].category_id,
    categoryId,
  );

  assert.equal(
    persistedCare.rows[0].title,
    "Hospital visit corrected",
  );

  assert.equal(
    persistedCare.rows[0].note_content,
    "Corrected confidential visit notes",
  );

  // Person correction must propagate to linked Follow-ups.
  const propagatedFollowUp =
    await db.query(
      `select
         person_id,
         care_note_id
       from public.care_follow_ups
       where id = $1`,
      [
        created.followUpId,
      ],
    );

  assert.equal(
    propagatedFollowUp.rows[0].person_id,
    ids.otherPerson,
  );

  assert.equal(
    propagatedFollowUp.rows[0].care_note_id,
    created.careNoteId,
  );

  const careEditAudit =
    await db.query(
      `select metadata
       from public.audit_events
       where action = 'care_note.updated'
         and entity_id = $1
       order by id desc
       limit 1`,
      [
        created.careNoteId,
      ],
    );

  assert.equal(
    careEditAudit.rows[0].metadata.person_id,
    ids.otherPerson,
  );

  assert.equal(
    careEditAudit.rows[0].metadata.category_id,
    categoryId,
  );

  assert.equal(
    Number(
      careEditAudit.rows[0].metadata
        .linked_follow_ups_reassigned,
    ),
    1,
  );

  assert.doesNotMatch(
    JSON.stringify(
      careEditAudit.rows[0].metadata,
    ),
    /Hospital visit corrected|Corrected confidential visit notes/u,
    "Care Record audit metadata must not contain title or confidential narrative.",
  );

  // ---------------------------------------------------------------------------
  // Phase 1: manager Edit Follow-up
  // ---------------------------------------------------------------------------

  await assert.rejects(
    () =>
      asAuthenticated(
        ids.staff,
        () =>
          db.query(
            `select public.update_care_follow_up_details(
               $1,
               $2,
               'Denied staff follow-up edit',
               'Denied confidential instructions',
               'normal',
               $3,
               null,
               'pending'
             )`,
            [
              created.followUpId,
              ids.otherPerson,
              ids.staff,
            ],
          ),
      ),
    /Prayer and Care management denied/,
  );

  await assert.rejects(
    () =>
      asAuthenticated(
        ids.parent,
        () =>
          db.query(
            `select public.update_care_follow_up_details(
               $1,
               $2,
               'Denied parent follow-up edit',
               'Denied confidential instructions',
               'normal',
               $3,
               null,
               'pending'
             )`,
            [
              created.followUpId,
              ids.otherPerson,
              ids.staff,
            ],
          ),
      ),
    /Prayer and Care management denied/,
  );

  await assert.rejects(
    () =>
      asAuthenticated(
        ids.volunteer,
        () =>
          db.query(
            `select public.update_care_follow_up_details(
               $1,
               $2,
               'Denied volunteer follow-up edit',
               'Denied confidential instructions',
               'normal',
               $3,
               null,
               'pending'
             )`,
            [
              created.followUpId,
              ids.otherPerson,
              ids.staff,
            ],
          ),
      ),
    /Prayer and Care management denied/,
  );

  // Linked Follow-up Person must match the actual Care Note source.
  await assert.rejects(
    () =>
      asAuthenticated(
        ids.admin,
        () =>
          db.query(
            `select public.update_care_follow_up_details(
               $1,
               $2,
               'Mismatched linked Person',
               'Confidential instructions',
               'high',
               $3,
               null,
               'in_progress'
             )`,
            [
              created.followUpId,
              ids.person,
              ids.staff,
            ],
          ),
      ),
    /A linked follow-up must retain its source Person/,
  );

  // Parent is not an eligible caregiver.
  await assert.rejects(
    () =>
      asAuthenticated(
        ids.admin,
        () =>
          db.query(
            `select public.update_care_follow_up_details(
               $1,
               $2,
               'Invalid caregiver',
               'Confidential instructions',
               'high',
               $3,
               null,
               'in_progress'
             )`,
            [
              created.followUpId,
              ids.otherPerson,
              ids.parent,
            ],
          ),
      ),
    /Eligible follow-up assignee not found/,
  );

  // Completed Follow-ups cannot return to an open workflow.
  await assert.rejects(
    () =>
      asAuthenticated(
        ids.admin,
        () =>
          db.query(
            `select public.update_care_follow_up_details(
               $1,
               $2,
               'Terminal edit',
               'Terminal instructions',
               'normal',
               $3,
               null,
               'pending'
             )`,
            [
              created.terminalFollowUpId,
              ids.person,
              ids.staff,
            ],
          ),
      ),
    /Open care follow-up not found/,
  );

  await asAuthenticated(
    ids.admin,
    () =>
      db.query(
        `select public.update_care_follow_up_details(
           $1,
           $2,
           'Family support follow-up',
           'Contact family later this week',
           'high',
           $3,
           '2026-09-25T23:00:00Z',
           'in_progress'
         )`,
        [
          created.followUpId,
          ids.otherPerson,
          ids.otherStaff,
        ],
      ),
  );

  const persistedFollowUp =
    await db.query(
      `select
         id,
         person_id,
         care_note_id,
         prayer_request_id,
         title,
         instructions,
         priority,
         assigned_to_profile_id,
         status
       from public.care_follow_ups
       where id = $1`,
      [
        created.followUpId,
      ],
    );

  assert.equal(
    persistedFollowUp.rows[0].id,
    created.followUpId,
    "Editing a Follow-up must preserve its UUID.",
  );

  assert.equal(
    persistedFollowUp.rows[0].person_id,
    ids.otherPerson,
  );

  assert.equal(
    persistedFollowUp.rows[0].care_note_id,
    created.careNoteId,
    "Editing a linked Follow-up must preserve the Care Note source.",
  );

  assert.equal(
    persistedFollowUp.rows[0].prayer_request_id,
    null,
  );

  assert.equal(
    persistedFollowUp.rows[0].title,
    "Family support follow-up",
  );

  assert.equal(
    persistedFollowUp.rows[0].instructions,
    "Contact family later this week",
  );

  assert.equal(
    persistedFollowUp.rows[0].priority,
    "high",
  );

  assert.equal(
    persistedFollowUp.rows[0].assigned_to_profile_id,
    ids.otherStaff,
  );

  assert.equal(
    persistedFollowUp.rows[0].status,
    "in_progress",
  );

  const followUpEditAudit =
    await db.query(
      `select metadata
       from public.audit_events
       where action = 'care_follow_up.updated'
         and entity_id = $1
       order by id desc
       limit 1`,
      [
        created.followUpId,
      ],
    );

  assert.equal(
    followUpEditAudit.rows[0].metadata.person_id,
    ids.otherPerson,
  );

  assert.equal(
    followUpEditAudit.rows[0].metadata.priority,
    "high",
  );

  assert.equal(
    followUpEditAudit.rows[0].metadata.status,
    "in_progress",
  );

  assert.equal(
    followUpEditAudit.rows[0].metadata
      .assigned_to_profile_id,
    ids.otherStaff,
  );

  assert.equal(
    followUpEditAudit.rows[0].metadata.source_type,
    "care_note",
  );

  assert.doesNotMatch(
    JSON.stringify(
      followUpEditAudit.rows[0].metadata,
    ),
    /Family support follow-up|Contact family later this week/u,
    "Follow-up audit metadata must not contain title or confidential instructions.",
  );

  // ---------------------------------------------------------------------------
  // Phase 1: unlinked Follow-up Person remains editable
  // ---------------------------------------------------------------------------

  await asAuthenticated(
    ids.admin,
    () =>
      db.query(
        `select public.update_care_follow_up_details(
           $1,
           $2,
           'Standalone Person corrected',
           'Standalone corrected instructions',
           'urgent',
           $3,
           null,
           'in_progress'
         )`,
        [
          created.standaloneFollowUpId,
          ids.otherPerson,
          ids.staff,
        ],
      ),
  );

  const standalonePersisted =
    await db.query(
      `select
         person_id,
         care_note_id,
         prayer_request_id,
         title,
         status
       from public.care_follow_ups
       where id = $1`,
      [
        created.standaloneFollowUpId,
      ],
    );

  assert.equal(
    standalonePersisted.rows[0].person_id,
    ids.otherPerson,
    "Unlinked Follow-up Person must remain manager-editable.",
  );

  assert.equal(
    standalonePersisted.rows[0].care_note_id,
    null,
  );

  assert.equal(
    standalonePersisted.rows[0].prayer_request_id,
    null,
  );

  assert.equal(
    standalonePersisted.rows[0].title,
    "Standalone Person corrected",
  );

  assert.equal(
    standalonePersisted.rows[0].status,
    "in_progress",
  );

  // ---------------------------------------------------------------------------
  // Inactive manager boundary applies to Phase 1 RPCs too
  // ---------------------------------------------------------------------------

  await db.query(
    `update public.profiles
     set status = 'suspended'
     where id = $1`,
    [
      ids.admin,
    ],
  );

  await assert.rejects(
    () =>
      asAuthenticated(
        ids.admin,
        () =>
          db.query(
            `select public.update_prayer_request(
               $1,
               $2,
               $3,
               'Inactive edit',
               'Denied details',
               'private'
             )`,
            [
              created.leadershipId,
              ids.person,
              categoryId,
            ],
          ),
      ),
    /Prayer and Care management denied/,
  );

  await assert.rejects(
    () =>
      asAuthenticated(
        ids.admin,
        () =>
          db.query(
            `select public.update_care_note_details(
               $1,
               $2,
               $3,
               'Inactive Care edit',
               'Inactive confidential note',
               now()
             )`,
            [
              created.careNoteId,
              ids.otherPerson,
              categoryId,
            ],
          ),
      ),
    /Prayer and Care management denied/,
  );

  await assert.rejects(
    () =>
      asAuthenticated(
        ids.admin,
        () =>
          db.query(
            `select public.update_care_follow_up_details(
               $1,
               $2,
               'Inactive Follow-up edit',
               'Inactive confidential instructions',
               'normal',
               $3,
               null,
               'pending'
             )`,
            [
              created.followUpId,
              ids.otherPerson,
              ids.staff,
            ],
          ),
      ),
    /Prayer and Care management denied/,
  );

  await db.query(
    `update public.profiles
     set status = 'active'
     where id = $1`,
    [
      ids.admin,
    ],
  );

  // ---------------------------------------------------------------------------
  // Parent sanitized prayer boundary
  // ---------------------------------------------------------------------------

  const parentSummaries =
    await asAuthenticated(
      ids.parent,
      () =>
        db.query(
          "select * from public.list_public_prayer_summaries()",
        ),
    );

  assert.deepEqual(
    parentSummaries.rows.map(
      (row) => row.prayer_request_id,
    ),
    [
      created.publicId,
    ],
  );

  assert.equal(
    "request_details" in
      parentSummaries.rows[0],
    false,
  );

  assert.equal(
    "person_id" in
      parentSummaries.rows[0],
    false,
  );

  await assert.rejects(
    () =>
      asAuthenticated(
        ids.parent,
        () =>
          db.query(
            "select * from public.list_visible_prayer_requests(false)",
          ),
      ),
    /Prayer request access denied/,
  );

  await assert.rejects(
    () =>
      asAuthenticated(
        ids.staff,
        () =>
          db.query(
            "select * from public.list_prayer_requests(null,null,null,null,false)",
          ),
      ),
    /Prayer and Care access denied/,
  );

  // ---------------------------------------------------------------------------
  // Staff scoped Prayer & Care projections
  // ---------------------------------------------------------------------------

  const staffRequests =
    await asAuthenticated(
      ids.staff,
      () =>
        db.query(
          "select prayer_request_id from public.list_visible_prayer_requests(false)",
        ),
    );

  assert.deepEqual(
    new Set(
      staffRequests.rows.map(
        (row) =>
          row.prayer_request_id,
      ),
    ),
    new Set([
      created.publicId,
      created.leadershipId,
      created.privateId,
    ]),
  );

  const otherStaffRequests =
    await asAuthenticated(
      ids.otherStaff,
      () =>
        db.query(
          "select prayer_request_id from public.list_visible_prayer_requests(false)",
        ),
    );

  assert.deepEqual(
    new Set(
      otherStaffRequests.rows.map(
        (row) =>
          row.prayer_request_id,
      ),
    ),
    new Set([
      created.publicId,
      created.leadershipId,
    ]),
  );

  const assignedNotes =
    await asAuthenticated(
      ids.staff,
      () =>
        db.query(
          "select care_note_id from public.list_assigned_care_notes()",
        ),
    );

  assert.deepEqual(
    assignedNotes.rows,
    [
      {
        care_note_id:
          created.careNoteId,
      },
    ],
  );

  const otherNotes =
    await asAuthenticated(
      ids.otherStaff,
      () =>
        db.query(
          "select care_note_id from public.list_assigned_care_notes()",
        ),
    );

  assert.equal(
    otherNotes.rows.length,
    0,
  );

  // Follow-up was reassigned to otherStaff during Phase 1 edit.
  const staffFollowUps =
    await asAuthenticated(
      ids.staff,
      () =>
        db.query(
          "select care_follow_up_id from public.list_my_care_follow_ups()",
        ),
    );

  assert.deepEqual(
  new Set(
    staffFollowUps.rows.map(
      (row) =>
        row.care_follow_up_id,
    ),
  ),
  new Set([
    created.standaloneFollowUpId,
    created.terminalFollowUpId,
  ]),
);

  const otherStaffFollowUps =
    await asAuthenticated(
      ids.otherStaff,
      () =>
        db.query(
          "select care_follow_up_id from public.list_my_care_follow_ups()",
        ),
    );

  assert.deepEqual(
    otherStaffFollowUps.rows,
    [
      {
        care_follow_up_id:
          created.followUpId,
      },
    ],
  );

  // ---------------------------------------------------------------------------
  // Inactive Parent summary access
  // ---------------------------------------------------------------------------

  await db.query(
    `update public.profiles
     set status = 'suspended'
     where id = $1`,
    [
      ids.parent,
    ],
  );

  await assert.rejects(
    () =>
      asAuthenticated(
        ids.parent,
        () =>
          db.query(
            "select * from public.list_public_prayer_summaries()",
          ),
      ),
    /Prayer summary access denied/,
  );

  console.log(
    "Prayer & Care foundation and Phase 1 manager workflow verification passed.",
  );
} finally {
  await db.close();
}
