import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { PGlite } from "@electric-sql/pglite";
import { classifyTeachingResourceFile } from
  "../features/curriculum/utils/teaching-resource-file-classification.mjs";
import { nextTeachingResourcePanel } from
  "../features/curriculum/utils/teaching-resource-panel-state.mjs";

const migrations = [
  "supabase/migrations/202607230001_core_database_foundation.sql",
  "supabase/migrations/202607230002_security_authorization.sql",
  "supabase/migrations/202607300009_curriculum_foundation.sql",
  "supabase/migrations/202607300010_lesson_library_workflows.sql",
  "supabase/migrations/202607300011_curriculum_plan_workflows.sql",
  "supabase/migrations/202607300012_teaching_resource_links.sql",
  "supabase/migrations/202607300013_curriculum_private_storage.sql",
  "supabase/migrations/202609210001_curriculum_plan_lesson_reordering.sql",
];

const ids = {
  admin: "60000000-0000-4000-8000-000000000001",
  volunteer: "60000000-0000-4000-8000-000000000002",
  parent: "60000000-0000-4000-8000-000000000003",
  resource: "60000000-0000-4000-8000-000000000004",
};

const db = new PGlite();

assert.deepEqual(
  classifyTeachingResourceFile("leader-guide.pdf", "application/pdf"),
  {
    contentType: "application/pdf",
    resourceType: "pdf",
    label: "PDF",
    extension: "pdf",
  },
  "PDF uploads use the canonical PDF resource type",
);
for (const [fileName, contentType] of [
  ["leader-guide.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ["lesson-slides.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  ["discussion.txt", "text/plain"],
]) {
  assert.equal(
    classifyTeachingResourceFile(fileName, contentType)?.resourceType,
    "document",
    `${fileName} uses the canonical document resource type`,
  );
}
assert.equal(
  classifyTeachingResourceFile("teaching.mp4", "video/mp4")?.resourceType,
  "video",
  "MP4 uploads use the canonical video resource type",
);
assert.equal(
  classifyTeachingResourceFile("renamed.pdf", "text/plain"),
  null,
  "Spoofed MIME and extension combinations are rejected",
);
assert.equal(
  classifyTeachingResourceFile("payload.exe", "application/octet-stream"),
  null,
  "Unsupported files are rejected before upload",
);
assert.equal(nextTeachingResourcePanel(null, null), null,
  "Resources opens with neither management form visible");
assert.equal(nextTeachingResourcePanel(null, "link"), "link",
  "Add resource opens only the external-resource form");
assert.equal(nextTeachingResourcePanel(null, "upload"), "upload",
  "Upload private file opens only the private-file form");
assert.equal(nextTeachingResourcePanel("link", "upload"), "upload",
  "Opening upload replaces the external-resource form");
assert.equal(nextTeachingResourcePanel("upload", "link"), "link",
  "Opening an external resource replaces the upload form");
assert.equal(nextTeachingResourcePanel("link", null), null,
  "Cancel restores the clean Resources view");

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

async function asAnonymous(operation) {
  await db.exec("set role anon");
  try {
    return await operation();
  } finally {
    await db.exec("reset role");
  }
}

async function expectDatabaseError(operation, description) {
  let rejected = false;
  try {
    await operation();
  } catch {
    rejected = true;
  }
  assert.equal(rejected, true, description);
}

try {
  await db.exec(`
    create schema auth;
    create schema extensions;
    create schema storage;
    create role anon nologin;
    create role authenticated nologin;
    create table auth.users (
      id uuid primary key,
      email text,
      raw_user_meta_data jsonb not null default '{}'::jsonb
    );
    create table storage.buckets (
      id text primary key,
      name text not null,
      public boolean not null default false,
      file_size_limit bigint,
      allowed_mime_types text[]
    );
    create table storage.objects (
      id uuid primary key default gen_random_uuid(),
      bucket_id text not null references storage.buckets(id),
      name text not null,
      unique (bucket_id, name)
    );
    alter table storage.objects enable row level security;
    grant usage on schema storage to authenticated;
    grant select, insert, update, delete on storage.objects to authenticated;
    create or replace function auth.uid()
    returns uuid language sql stable set search_path = ''
    as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    create or replace function extensions.digest(data bytea, algorithm text)
    returns bytea language sql immutable strict
    as $$
      select decode(
        md5(encode(data, 'hex')) || md5(algorithm || encode(data, 'hex')),
        'hex'
      )
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
    `
      insert into auth.users (id, email, raw_user_meta_data)
      values
        ($1, 'curriculum-admin@example.test',
          '{"display_name":"Synthetic Curriculum Admin"}'),
        ($2, 'curriculum-volunteer@example.test',
          '{"display_name":"Synthetic Curriculum Volunteer"}'),
        ($3, 'curriculum-parent@example.test',
          '{"display_name":"Synthetic Curriculum Parent"}')
    `,
    [ids.admin, ids.volunteer, ids.parent],
  );
  await db.query(
    `
      update public.profiles
      set primary_role = case
        when id = $1 then 'platform_administrator'::public.account_role
        when id = $2 then 'volunteer'::public.account_role
        else 'parent'::public.account_role
      end
      where id in ($1, $2, $3)
    `,
    [ids.admin, ids.volunteer, ids.parent],
  );

  const lesson = await asAuthenticated(ids.admin, () =>
    db.query(
      `
        select public.create_lesson(
          'Synthetic Curriculum Lesson', 'Synthetic summary',
          'Synthetic objective', 'James 1:19', 'Synthetic teaching notes',
          'Synthetic discussion guide', 'Synthetic preparation',
          'Grades 6-8', 'published'
        ) as id
      `,
    ),
  );
  const lessonId = lesson.rows[0].id;
  const secondLesson = await asAuthenticated(ids.admin, () =>
    db.query(
      `select public.create_lesson(
        'Second Synthetic Lesson', null, null, null, 'Second lesson notes',
        null, null, 'Grades 6-8', 'published'
      ) as id`,
    ),
  );
  const secondLessonId = secondLesson.rows[0].id;
  const volunteerLessons = await asAuthenticated(ids.volunteer, () =>
    db.query("select * from public.list_lesson_library(null, null)"),
  );
  assert.ok(volunteerLessons.rows.some((row) => row.lesson_id === lessonId));
  await expectDatabaseError(
    () => asAuthenticated(ids.parent, () =>
      db.query("select * from public.list_lesson_library(null, null)")),
    "Family account cannot access the lesson library",
  );

  const plan = await asAuthenticated(ids.admin, () =>
    db.query(
      `
        select public.create_curriculum_plan(
          'Synthetic Curriculum Plan', 'Synthetic plan summary',
          'Grades 6-8', 'published', null, null
        ) as id
      `,
    ),
  );
  const planId = plan.rows[0].id;
  await asAuthenticated(ids.admin, () =>
    db.query("select public.add_lesson_to_curriculum_plan($1, $2)", [
      planId,
      lessonId,
    ]),
  );
  await asAuthenticated(ids.admin, () =>
    db.query("select public.add_lesson_to_curriculum_plan($1, $2)", [
      planId,
      secondLessonId,
    ]),
  );
  await expectDatabaseError(
    () => asAuthenticated(ids.admin, () =>
      db.query("select public.add_lesson_to_curriculum_plan($1, $2)", [
        planId,
        lessonId,
      ])),
    "A duplicate lesson cannot be added to the plan",
  );
  const originalOrder = await asAuthenticated(ids.admin, () =>
    db.query("select * from public.list_curriculum_plan_lessons($1)", [planId]),
  );
  const firstRelationshipId = originalOrder.rows[0].plan_lesson_id;
  const secondRelationshipId = originalOrder.rows[1].plan_lesson_id;
  await expectDatabaseError(
    () => asAuthenticated(ids.admin, () =>
      db.query("select public.move_curriculum_plan_lesson($1, 'up')", [
        firstRelationshipId,
      ])),
    "The first lesson cannot move up",
  );
  await expectDatabaseError(
    () => asAuthenticated(ids.admin, () =>
      db.query("select public.move_curriculum_plan_lesson($1, 'down')", [
        secondRelationshipId,
      ])),
    "The last lesson cannot move down",
  );
  await expectDatabaseError(
    () => asAuthenticated(ids.volunteer, () =>
      db.query("select public.move_curriculum_plan_lesson($1, 'up')", [
        secondRelationshipId,
      ])),
    "Volunteers cannot reorder curriculum plan lessons",
  );
  await expectDatabaseError(
    () => asAuthenticated(ids.parent, () =>
      db.query("select public.move_curriculum_plan_lesson($1, 'up')", [
        secondRelationshipId,
      ])),
    "Parents cannot reorder curriculum plan lessons",
  );
  await expectDatabaseError(
    () => asAnonymous(() =>
      db.query("select public.move_curriculum_plan_lesson($1, 'up')", [
        secondRelationshipId,
      ])),
    "Anonymous users cannot invoke curriculum plan reordering",
  );
  await expectDatabaseError(
    () => asAuthenticated(ids.admin, () =>
      db.query("select public.move_curriculum_plan_lesson($1, 'sideways')", [
        secondRelationshipId,
      ])),
    "Unknown movement directions are rejected",
  );
  await expectDatabaseError(
    () => asAuthenticated(ids.admin, () =>
      db.query("select public.move_curriculum_plan_lesson($1, 'up')", [
        "60000000-0000-4000-8000-000000000099",
      ])),
    "Unknown curriculum plan relationships are rejected",
  );
  await expectDatabaseError(
    () => asAuthenticated(ids.admin, () =>
      db.query(
        "update public.curriculum_plan_lessons set sequence_number = 3 where id = $1",
        [firstRelationshipId],
      )),
    "Direct curriculum plan sequence mutation remains denied",
  );
  await db.query("update public.profiles set status = 'suspended' where id = $1", [ids.admin]);
  await expectDatabaseError(
    () => asAuthenticated(ids.admin, () =>
      db.query("select public.move_curriculum_plan_lesson($1, 'up')", [
        secondRelationshipId,
      ])),
    "Inactive managers cannot reorder curriculum plan lessons",
  );
  await db.query("update public.profiles set status = 'active' where id = $1", [ids.admin]);
  await asAuthenticated(ids.admin, () =>
    db.query("select public.move_curriculum_plan_lesson($1, 'up')", [
      secondRelationshipId,
    ]),
  );
  const movedOrder = await asAuthenticated(ids.admin, () =>
    db.query("select * from public.list_curriculum_plan_lessons($1)", [planId]),
  );
  assert.deepEqual(
    movedOrder.rows.map((row) => ({
      relationshipId: row.plan_lesson_id,
      lessonId: row.lesson_id,
      sequence: row.sequence_number,
    })),
    [
      { relationshipId: secondRelationshipId, lessonId: secondLessonId, sequence: 1 },
      { relationshipId: firstRelationshipId, lessonId, sequence: 2 },
    ],
    "Moving up preserves relationship and lesson IDs while persisting contiguous order",
  );
  const reorderAudit = await db.query(
    `select metadata from public.audit_events
     where action = 'curriculum.plan_lesson_reordered'
       and entity_id = $1`,
    [secondRelationshipId],
  );
  assert.equal(reorderAudit.rows.length, 1,
    "A successful movement creates exactly one reorder audit event");
  assert.deepEqual(Object.keys(reorderAudit.rows[0].metadata).sort(),
    ["curriculumPlanId", "direction", "fromSequence", "toSequence"].sort(),
    "Reorder audit metadata contains only the approved sanitized fields");
  await asAuthenticated(ids.admin, () =>
    db.query("select public.move_curriculum_plan_lesson($1, 'down')", [
      secondRelationshipId,
    ]),
  );
  const restoredOrder = await asAuthenticated(ids.admin, () =>
    db.query("select * from public.list_curriculum_plan_lessons($1)", [planId]),
  );
  assert.deepEqual(restoredOrder.rows.map((row) => row.lesson_id),
    [lessonId, secondLessonId], "Move down restores the persisted order");
  assert.deepEqual(restoredOrder.rows.map((row) => row.sequence_number), [1, 2],
    "Reordering preserves unique positive contiguous sequence numbers");
  const volunteerPlan = await asAuthenticated(ids.volunteer, () =>
    db.query("select * from public.list_curriculum_plan_lessons($1)", [planId]),
  );
  assert.equal(volunteerPlan.rows[0].lesson_id, lessonId);
  await asAuthenticated(ids.admin, () =>
    db.query("select public.remove_lesson_from_curriculum_plan($1)", [
      secondRelationshipId,
    ]),
  );
  const oneLessonOrder = await asAuthenticated(ids.admin, () =>
    db.query("select * from public.list_curriculum_plan_lessons($1)", [planId]),
  );
  assert.deepEqual(oneLessonOrder.rows.map((row) => row.sequence_number), [1],
    "Existing remove behavior closes sequence gaps");
  await expectDatabaseError(
    () => asAuthenticated(ids.admin, () =>
      db.query("select public.move_curriculum_plan_lesson($1, 'up')", [
        firstRelationshipId,
      ])),
    "A single lesson cannot move up",
  );
  await expectDatabaseError(
    () => asAuthenticated(ids.admin, () =>
      db.query("select public.move_curriculum_plan_lesson($1, 'down')", [
        firstRelationshipId,
      ])),
    "A single lesson cannot move down",
  );
  const readded = await asAuthenticated(ids.admin, () =>
    db.query("select public.add_lesson_to_curriculum_plan($1, $2) as id", [
      planId,
      secondLessonId,
    ]),
  );
  const readdedRelationshipId = readded.rows[0].id;
  const readdedOrder = await asAuthenticated(ids.admin, () =>
    db.query("select * from public.list_curriculum_plan_lessons($1)", [planId]),
  );
  assert.equal(readdedOrder.rows[1].plan_lesson_id, readdedRelationshipId);
  assert.equal(readdedOrder.rows[1].sequence_number, 2,
    "Existing add behavior still appends at the next sequence");

  const link = await asAuthenticated(ids.admin, () =>
    db.query(
      `
        select public.create_teaching_resource_link(
          $1, 'Synthetic Video', 'video', 'Synthetic description',
          'https://example.test/synthetic-video'
        ) as id
      `,
      [lessonId],
    ),
  );
  assert.ok(link.rows[0].id);

  const objectPath =
    `${lessonId}/${ids.resource}/upload.txt`;
  await asAuthenticated(ids.admin, () =>
    db.query(
      "insert into storage.objects (bucket_id, name) values ($1, $2)",
      ["curriculum-files", objectPath],
    ),
  );
  await asAuthenticated(ids.admin, () =>
    db.query(
      `
        select public.create_teaching_resource_file(
          $1, $2, 'Synthetic Private Guide', 'document',
          'Synthetic file', $3, 'synthetic-guide.txt', 'text/plain', 64
        )
      `,
      [ids.resource, lessonId, objectPath],
    ),
  );
  const pdfResourceId = "60000000-0000-4000-8000-000000000005";
  const pdfObjectPath = `${lessonId}/${pdfResourceId}/upload.pdf`;
  await asAuthenticated(ids.admin, () =>
    db.query(
      "insert into storage.objects (bucket_id, name) values ($1, $2)",
      ["curriculum-files", pdfObjectPath],
    ),
  );
  await expectDatabaseError(
    () => asAuthenticated(ids.parent, () =>
      db.query(
        `select public.create_teaching_resource_file(
          $1, $2, 'Denied PDF Guide', 'pdf', null,
          $3, 'leader-guide.pdf', 'application/pdf', 128
        )`,
        [pdfResourceId, lessonId, pdfObjectPath],
      )),
    "Family accounts cannot finalize private curriculum uploads",
  );
  await expectDatabaseError(
    () => asAuthenticated(ids.admin, () =>
      db.query(
        `select public.create_teaching_resource_file(
          $1, $2, 'Invalid PDF classification', 'document', null,
          $3, 'leader-guide.pdf', 'application/pdf', 128
        )`,
        [pdfResourceId, lessonId, pdfObjectPath],
      )),
    "A PDF cannot finalize using the document resource type",
  );
  await asAuthenticated(ids.admin, () =>
    db.query(
      `select public.create_teaching_resource_file(
        $1, $2, 'Canonical PDF Guide', 'pdf', null,
        $3, 'leader-guide.pdf', 'application/pdf', 128
      )`,
      [pdfResourceId, lessonId, pdfObjectPath],
    ),
  );
  const pdfResource = await db.query(
    `select resource_type, content_type from public.teaching_resources
     where id = $1`,
    [pdfResourceId],
  );
  assert.deepEqual(pdfResource.rows[0], {
    resource_type: "pdf",
    content_type: "application/pdf",
  });
  const pdfAudit = await db.query(
    `select count(*)::integer as count from public.audit_events
     where action = 'curriculum.resource_file_created' and entity_id = $1`,
    [pdfResourceId],
  );
  assert.equal(pdfAudit.rows[0].count, 1,
    "Successful PDF finalization creates exactly one audit event");
  const authorizedDownload = await asAuthenticated(ids.volunteer, () =>
    db.query(
      "select public.authorize_curriculum_resource_download($1) as value",
      [ids.resource],
    ),
  );
  assert.equal(authorizedDownload.rows[0].value.objectPath, objectPath);
  await expectDatabaseError(
    () => asAuthenticated(ids.parent, () =>
      db.query(
        "select public.authorize_curriculum_resource_download($1)",
        [ids.resource],
      )),
    "Family account cannot authorize curriculum downloads",
  );

  const uploadComponent = await readFile(
    "features/curriculum/components/teaching-resources.tsx",
    "utf8",
  );
  assert.match(uploadComponent,
    /classifyTeachingResourceFile\(file\.name, file\.type\)/,
    "The selected file determines the canonical classification");
  assert.match(uploadComponent,
    /\.remove\(\[prepared\.storageObjectPath\]\)/,
    "Finalization failure attempts cleanup of the exact uploaded object");
  assert.ok(
    uploadComponent.indexOf("if (!classification)") <
      uploadComponent.indexOf("prepareTeachingResourceUploadAction(input)"),
    "Unsupported or inconsistent files are rejected before upload preparation",
  );
  const uploadService = await readFile(
    "features/curriculum/services/curriculum-service.ts",
    "utf8",
  );
  assert.match(uploadService,
    /operation: "create_teaching_resource_file",\s+code,\s+category/,
    "Finalization diagnostics contain only the safe operation, code, and category");
  assert.doesNotMatch(uploadService,
    /error\.(message|details|hint)/,
    "Finalization diagnostics do not expose raw database failure text");
  const lessonWorkspace = await readFile(
    "app/(platform)/curriculum/lessons/[lessonId]/page.tsx",
    "utf8",
  );
  for (const label of [
    "Overview",
    "Lesson Content",
    "Discussion",
    "Resources",
    "Preparation",
  ]) {
    assert.match(lessonWorkspace, new RegExp(`label: "${label}"`),
      `Lesson workspace includes the ${label} section`);
  }
  assert.match(lessonWorkspace, /aria-label="Lesson workspace sections"/,
    "Lesson workspace navigation has an accessible label");
  assert.match(lessonWorkspace, /overflow-x-auto/,
    "Lesson workspace navigation supports narrow screens");
  assert.match(lessonWorkspace, /query\.mode === "edit"/,
    "The full lesson editor is rendered only after an intentional edit action");
  assert.match(lessonWorkspace, /lesson\.canManage && lesson\.status !== "archived"/,
    "Lesson management controls retain the authoritative workspace boundary");
  assert.match(uploadComponent, /activePanel === "link" \? <form/,
    "The resource-link form is revealed only on request");
  assert.match(uploadComponent, /activePanel === "upload" \? <div/,
    "The private-file form is revealed only on request");
  assert.match(uploadComponent,
    /useState<"link" \| "upload" \| null>\(null\)/,
    "Resources begins with no active management panel");
  assert.match(uploadComponent, /setActivePanel\(null\)/,
    "Resource management panels provide a clean-view Cancel action");
  assert.match(uploadComponent, /resources\.map\(\(resource\)/,
    "Existing resource cards remain visible independently of management panels");
  const lessonForm = await readFile(
    "features/curriculum/components/lesson-form.tsx",
    "utf8",
  );
  assert.match(lessonForm, /export function PublishLessonForm/,
    "Draft lessons expose an explicit publish lifecycle action");
  assert.match(lessonForm, /name="status" type="hidden" value="published"/,
    "Publishing reuses the existing lesson update workflow with published status");
  const planForms = await readFile(
    "features/curriculum/components/curriculum-plan-forms.tsx",
    "utf8",
  );
  assert.match(planForms, />Lesson sequence</,
    "The manager workspace identifies the persisted lesson sequence");
  assert.match(planForms, /Arrange lessons in their intended teaching order\./,
    "The sequence controls include concise ministry guidance");
  assert.match(planForms, /"Move up" : "Move down"/,
    "Manager rows expose both movement controls");
  assert.match(planForms,
    /direction === "up" \? isFirst : isLast/,
    "First and last lesson movement boundaries disable the correct controls");
  assert.match(planForms, /moveCurriculumPlanLessonAction/,
    "Movement controls use the protected reorder server action");
  const planPage = await readFile(
    "app/(platform)/curriculum/plans/[planId]/page.tsx",
    "utf8",
  );
  assert.match(planPage,
    /plan\.canManage && plan\.status !== "archived"[\s\S]*<CurriculumPlanLessons/,
    "Only active manager workspaces render reorder and removal controls");
  assert.match(planPage, /\) : \(\s*<ol/,
    "Read-only viewers receive lesson cards without manager controls");

  await asAuthenticated(ids.admin, () =>
    db.query("select public.archive_curriculum_plan($1)", [planId]),
  );
  await expectDatabaseError(
    () => asAuthenticated(ids.admin, () =>
      db.query("select public.move_curriculum_plan_lesson($1, 'up')", [
        readdedRelationshipId,
      ])),
    "Archived curriculum plans cannot be reordered",
  );
  await asAuthenticated(ids.admin, () =>
    db.query("select public.archive_lesson($1)", [lessonId]),
  );
  await expectDatabaseError(
    () => asAuthenticated(ids.volunteer, () =>
      db.query("select public.get_lesson_workspace($1)", [lessonId])),
    "Volunteer cannot access archived lessons",
  );

  console.log("Curriculum and lessons verification passed.");
} finally {
  await db.close();
}
