import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { PGlite } from "@electric-sql/pglite";

const migrations = [
  "supabase/migrations/202607230001_core_database_foundation.sql",
  "supabase/migrations/202607230002_security_authorization.sql",
  "supabase/migrations/202607300009_curriculum_foundation.sql",
  "supabase/migrations/202607300010_lesson_library_workflows.sql",
  "supabase/migrations/202607300011_curriculum_plan_workflows.sql",
  "supabase/migrations/202607300012_teaching_resource_links.sql",
  "supabase/migrations/202607300013_curriculum_private_storage.sql",
];

const ids = {
  admin: "60000000-0000-4000-8000-000000000001",
  volunteer: "60000000-0000-4000-8000-000000000002",
  parent: "60000000-0000-4000-8000-000000000003",
  resource: "60000000-0000-4000-8000-000000000004",
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
  const volunteerLessons = await asAuthenticated(ids.volunteer, () =>
    db.query("select * from public.list_lesson_library(null, null)"),
  );
  assert.equal(volunteerLessons.rows[0].lesson_id, lessonId);
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
  const volunteerPlan = await asAuthenticated(ids.volunteer, () =>
    db.query("select * from public.list_curriculum_plan_lessons($1)", [planId]),
  );
  assert.equal(volunteerPlan.rows[0].lesson_id, lessonId);

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

  await asAuthenticated(ids.admin, () =>
    db.query("select public.archive_curriculum_plan($1)", [planId]),
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
