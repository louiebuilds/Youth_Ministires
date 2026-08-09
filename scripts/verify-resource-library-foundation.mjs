import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { PGlite } from "@electric-sql/pglite";

const migrations = [
  "supabase/migrations/202607230001_core_database_foundation.sql",
  "supabase/migrations/202607230002_security_authorization.sql",
  "supabase/migrations/202608050001_resource_library_foundation.sql",
  "supabase/migrations/202608050002_resource_category_workflows.sql",
  "supabase/migrations/202608050003_resource_library_workflows.sql",
  "supabase/migrations/202608050004_resource_library_file_workflows.sql",
];

const ids = {
  admin: "80000000-0000-4000-8000-000000000001",
  volunteer: "80000000-0000-4000-8000-000000000002",
  parent: "80000000-0000-4000-8000-000000000003",
  category: "80000000-0000-4000-8000-000000000004",
  resource: "80000000-0000-4000-8000-000000000005",
  version: "80000000-0000-4000-8000-000000000006",
};

const db = new PGlite();

async function asAuthenticated(userId, operation) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${userId}', false);`);
  try {
    return await operation();
  } finally {
    await db.exec("reset role");
  }
}

async function expectError(operation, message) {
  let rejected = false;
  try {
    await operation();
  } catch {
    rejected = true;
  }
  assert.equal(rejected, true, message);
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
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create or replace function extensions.digest(data bytea, algorithm text)
    returns bytea language sql immutable strict
    as $$ select decode(md5(encode(data, 'hex')) || md5(algorithm || encode(data, 'hex')), 'hex') $$;
  `);

  for (const path of migrations) {
    const migration = await readFile(path, "utf8");
    await db.exec(
      migration
        .replace("create extension if not exists pgcrypto with schema extensions;", "")
        .replaceAll("extensions.gen_random_uuid()", "gen_random_uuid()"),
    );
  }

  await db.query(
    `insert into auth.users (id, email, raw_user_meta_data) values
      ($1, 'library-admin@example.test', '{"display_name":"Synthetic Library Admin"}'),
      ($2, 'library-volunteer@example.test', '{"display_name":"Synthetic Library Volunteer"}'),
      ($3, 'library-parent@example.test', '{"display_name":"Synthetic Library Parent"}')`,
    [ids.admin, ids.volunteer, ids.parent],
  );
  await db.query(
    `update public.profiles set primary_role = case
      when id = $1 then 'platform_administrator'::public.account_role
      when id = $2 then 'volunteer'::public.account_role
      else 'parent'::public.account_role end
      where id in ($1, $2, $3)`,
    [ids.admin, ids.volunteer, ids.parent],
  );

  const bucket = await db.query(
    "select public, file_size_limit from storage.buckets where id = 'resource-library'",
  );
  assert.equal(bucket.rows[0].public, false);
  assert.equal(Number(bucket.rows[0].file_size_limit), 262144000);

  const managedCategory = await asAuthenticated(ids.admin, () =>
    db.query(
      "select public.create_resource_category('Synthetic Managed Category', 'Synthetic category description') as id",
    ),
  );
  const managedCategoryId = managedCategory.rows[0].id;
  await asAuthenticated(ids.admin, () =>
    db.query(
      "select public.update_resource_category($1, 'Synthetic Renamed Category', 'Synthetic updated description')",
      [managedCategoryId],
    ),
  );
  const familyCategories = await asAuthenticated(ids.parent, () =>
    db.query("select * from public.list_resource_categories(false)"),
  );
  assert.equal(familyCategories.rows[0].category_name, "Synthetic Renamed Category");
  await expectError(
    () => asAuthenticated(ids.parent, () =>
      db.query("select public.create_resource_category('Denied Category', null)")),
    "Family category creation must remain denied",
  );
  await asAuthenticated(ids.admin, () =>
    db.query("select public.archive_resource_category($1)", [managedCategoryId]),
  );
  const activeCategories = await asAuthenticated(ids.admin, () =>
    db.query("select * from public.list_resource_categories(false)"),
  );
  assert.equal(activeCategories.rows.length, 0);
  const categoryHistory = await asAuthenticated(ids.admin, () =>
    db.query("select * from public.list_resource_categories(true)"),
  );
  assert.equal(categoryHistory.rows[0].category_id, managedCategoryId);

  await db.query(
    `insert into public.resource_categories (id, name, created_by_profile_id)
     values ($1, 'Synthetic Family Guides', $2)`,
    [ids.category, ids.admin],
  );
  const managedResource = await asAuthenticated(ids.admin, () =>
    db.query(
      `select public.create_library_resource(
        $1, 'Synthetic Draft Resource', 'Synthetic draft description',
        'document', 'family'
      ) as id`,
      [ids.category],
    ),
  );
  const managedResourceId = managedResource.rows[0].id;
  await asAuthenticated(ids.admin, () =>
    db.query(
      `select public.update_library_resource(
        $1, $2, 'Synthetic Published Guide', 'Synthetic updated description',
        'document', 'family'
      )`,
      [managedResourceId, ids.category],
    ),
  );
  await expectError(
    () => asAuthenticated(ids.admin, () =>
      db.query("select public.publish_library_resource($1)", [managedResourceId])),
    "A resource without a current file version cannot be published",
  );
  const managedVersionId = "80000000-0000-4000-8000-000000000007";
  await db.query(
    `insert into public.library_resource_versions (
      id, resource_id, version_number, storage_bucket, storage_object_path,
      original_file_name, content_type, file_size_bytes, created_by_profile_id
    ) values ($1, $2, 1, 'resource-library', $3,
      'synthetic-published-guide.pdf', 'application/pdf', 256, $4)`,
    [managedVersionId, managedResourceId, `${managedResourceId}/1/${managedVersionId}.pdf`, ids.admin],
  );
  await db.query(
    "update public.library_resources set current_version_id = $1 where id = $2",
    [managedVersionId, managedResourceId],
  );
  await asAuthenticated(ids.admin, () =>
    db.query("select public.publish_library_resource($1)", [managedResourceId]),
  );
  const familyResources = await asAuthenticated(ids.parent, () =>
    db.query("select * from public.list_library_resources('Published', null, null, null, null, false)"),
  );
  assert.equal(familyResources.rows[0].resource_id, managedResourceId);
  const volunteerResources = await asAuthenticated(ids.volunteer, () =>
    db.query("select * from public.list_library_resources(null, null, null, null, null, false)"),
  );
  assert.equal(volunteerResources.rows.length, 0);
  await expectError(
    () => asAuthenticated(ids.parent, () =>
      db.query(`select public.create_library_resource(
        null, 'Denied Resource', null, 'document', 'family'
      )`)),
    "Family resource creation must remain denied",
  );
  await asAuthenticated(ids.admin, () =>
    db.query("select public.archive_library_resource($1)", [managedResourceId]),
  );
  const archivedResource = await asAuthenticated(ids.admin, () =>
    db.query("select * from public.list_library_resources(null, null, null, null, 'archived', true)"),
  );
  assert.equal(archivedResource.rows[0].resource_id, managedResourceId);
  await db.query(
    `insert into public.library_resources (
       id, category_id, title, resource_type, audience, status,
       published_at, created_by_profile_id
     ) values ($1, $2, 'Synthetic Family Resource', 'document', 'family',
       'published', now(), $3)`,
    [ids.resource, ids.category, ids.admin],
  );
  const objectPath = `${ids.resource}/1/${ids.version}.pdf`;
  await db.query(
    `insert into public.library_resource_versions (
       id, resource_id, version_number, storage_bucket, storage_object_path,
       original_file_name, content_type, file_size_bytes, created_by_profile_id
     ) values ($1, $2, 1, 'resource-library', $3,
       'synthetic-family-guide.pdf', 'application/pdf', 128, $4)`,
    [ids.version, ids.resource, objectPath, ids.admin],
  );
  await db.query(
    "update public.library_resources set current_version_id = $1 where id = $2",
    [ids.version, ids.resource],
  );

  const adminCanManage = await asAuthenticated(ids.admin, () =>
    db.query("select private.can_manage_resource_library() as value"),
  );
  assert.equal(adminCanManage.rows[0].value, true);
  const parentCanView = await asAuthenticated(ids.parent, () =>
    db.query("select private.can_view_library_audience('family') as value"),
  );
  assert.equal(parentCanView.rows[0].value, true);
  const volunteerCannotView = await asAuthenticated(ids.volunteer, () =>
    db.query("select private.can_view_library_audience('family') as value"),
  );
  assert.equal(volunteerCannotView.rows[0].value, false);

  await expectError(
    () => asAuthenticated(ids.parent, () => db.query("select * from public.library_resources")),
    "Direct family table access must remain denied",
  );
  await expectError(
    () => db.query(
      "update public.library_resource_versions set original_file_name = 'changed.pdf' where id = $1",
      [ids.version],
    ),
    "File-version metadata must be immutable",
  );

  await asAuthenticated(ids.admin, () =>
    db.query("insert into storage.objects (bucket_id, name) values ('resource-library', $1)", [objectPath]),
  );
  const parentObject = await asAuthenticated(ids.parent, () =>
    db.query("select name from storage.objects where bucket_id = 'resource-library'"),
  );
  assert.equal(parentObject.rows[0].name, objectPath);
  const volunteerObject = await asAuthenticated(ids.volunteer, () =>
    db.query("select name from storage.objects where bucket_id = 'resource-library'"),
  );
  assert.equal(volunteerObject.rows.length, 0);
  await expectError(
    () => asAuthenticated(ids.parent, () =>
      db.query("insert into storage.objects (bucket_id, name) values ('resource-library', 'denied.pdf')")),
    "Family storage uploads must remain denied",
  );

  const versionedResource = await asAuthenticated(ids.admin, () =>
    db.query(
      `select public.create_library_resource(
        $1, 'Synthetic Versioned Resource', 'Synthetic version workflow',
        'document', 'family'
      ) as id`,
      [ids.category],
    ),
  );
  const versionedResourceId = versionedResource.rows[0].id;
  const firstVersionId = "80000000-0000-4000-8000-000000000008";
  const firstPath = `${versionedResourceId}/${firstVersionId}/upload.pdf`;
  await asAuthenticated(ids.admin, () =>
    db.query("insert into storage.objects (bucket_id, name) values ('resource-library', $1)", [firstPath]),
  );
  const firstNumber = await asAuthenticated(ids.admin, () =>
    db.query(
      `select public.create_library_resource_version(
        $1, $2, $3, 'synthetic-version-one.pdf', 'application/pdf', 512,
        null, 'Synthetic initial version'
      ) as value`,
      [firstVersionId, versionedResourceId, firstPath],
    ),
  );
  assert.equal(firstNumber.rows[0].value, 1);
  await asAuthenticated(ids.admin, () =>
    db.query("select public.publish_library_resource($1)", [versionedResourceId]),
  );
  const familyDownload = await asAuthenticated(ids.parent, () =>
    db.query("select public.authorize_library_resource_download($1, null) as value", [versionedResourceId]),
  );
  assert.equal(familyDownload.rows[0].value.objectPath, firstPath);
  await expectError(
    () => asAuthenticated(ids.volunteer, () =>
      db.query("select public.authorize_library_resource_download($1, null)", [versionedResourceId])),
    "Volunteer cannot download a family resource",
  );

  const secondVersionId = "80000000-0000-4000-8000-000000000009";
  const secondPath = `${versionedResourceId}/${secondVersionId}/upload.pdf`;
  await asAuthenticated(ids.admin, () =>
    db.query("insert into storage.objects (bucket_id, name) values ('resource-library', $1)", [secondPath]),
  );
  const secondNumber = await asAuthenticated(ids.admin, () =>
    db.query(
      `select public.create_library_resource_version(
        $1, $2, $3, 'synthetic-version-two.pdf', 'application/pdf', 640,
        null, 'Synthetic replacement version'
      ) as value`,
      [secondVersionId, versionedResourceId, secondPath],
    ),
  );
  assert.equal(secondNumber.rows[0].value, 2);
  const history = await asAuthenticated(ids.admin, () =>
    db.query("select * from public.list_library_resource_versions($1)", [versionedResourceId]),
  );
  assert.equal(history.rows.length, 2);
  assert.equal(history.rows[0].is_current, true);
  const historicalDownload = await asAuthenticated(ids.admin, () =>
    db.query("select public.authorize_library_resource_download($1, $2) as value", [versionedResourceId, firstVersionId]),
  );
  assert.equal(historicalDownload.rows[0].value.versionNumber, 1);
  await expectError(
    () => asAuthenticated(ids.parent, () =>
      db.query("select public.authorize_library_resource_download($1, $2)", [versionedResourceId, firstVersionId])),
    "Family cannot download a historical version",
  );

  console.log("Resource Library foundation migration execution: passed");
  console.log("Private bucket and immutable version history: passed");
  console.log("Manager, family, volunteer, and direct-access boundaries: passed");
  console.log("Category create, rename, archive, and audit workflows: passed");
  console.log("Resource create, search, publish, audience, and archive workflows: passed");
  console.log("Validated upload, immutable replacement, history, and download authorization: passed");
} finally {
  await db.close();
}
