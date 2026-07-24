import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { PGlite } from "@electric-sql/pglite";

const migrationPath =
  "supabase/migrations/202607230001_core_database_foundation.sql";

const expectedTables = [
  "audit_events",
  "event_volunteer_assignments",
  "events",
  "household_memberships",
  "households",
  "people",
  "profiles",
  "student_relationships",
  "students",
];

const firstUserId = "10000000-0000-4000-8000-000000000001";
const secondUserId = "10000000-0000-4000-8000-000000000002";
const existingUserId = "10000000-0000-4000-8000-000000000003";

const db = new PGlite();

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

  await db.query(
    `
      insert into auth.users (id, email, raw_user_meta_data)
      values ($1, 'existing@example.test', '{}')
    `,
    [existingUserId],
  );

  const migration = await readFile(migrationPath, "utf8");

  // PGlite does not bundle pgcrypto. PostgreSQL itself provides
  // gen_random_uuid(), so the harness removes only the extension installation
  // and its Supabase-specific schema qualification.
  const locallyCompatibleMigration = migration
    .replace(
      "create extension if not exists pgcrypto with schema extensions;",
      "",
    )
    .replaceAll("extensions.gen_random_uuid()", "gen_random_uuid()");

  await db.exec(locallyCompatibleMigration);

  const tableResult = await db.query(`
    select tablename
    from pg_catalog.pg_tables
    where schemaname = 'public'
    order by tablename
  `);

  assert.deepEqual(
    tableResult.rows.map(({ tablename }) => tablename),
    expectedTables,
    "migration creates the approved core tables",
  );

  const rowSecurityResult = await db.query(`
    select relname, relrowsecurity, relforcerowsecurity
    from pg_catalog.pg_class
    join pg_catalog.pg_namespace
      on pg_namespace.oid = pg_class.relnamespace
    where pg_namespace.nspname = 'public'
      and pg_class.relname = any($1)
    order by relname
  `, [expectedTables]);

  assert.equal(
    rowSecurityResult.rows.length,
    expectedTables.length,
    "every core table has a row-security record",
  );

  for (const table of rowSecurityResult.rows) {
    assert.equal(
      table.relrowsecurity,
      true,
      `${table.relname} enables Row-Level Security`,
    );
    assert.equal(
      table.relforcerowsecurity,
      true,
      `${table.relname} forces Row-Level Security`,
    );
  }

  const policyResult = await db.query(`
    select tablename, policyname, cmd
    from pg_catalog.pg_policies
    where schemaname = 'public'
    order by tablename, policyname
  `);

  assert.deepEqual(
    policyResult.rows,
    [
      {
        tablename: "profiles",
        policyname: "profiles_read_own",
        cmd: "SELECT",
      },
    ],
    "only the own-profile baseline policy exists",
  );

  await db.query(
    `
      insert into auth.users (id, email, raw_user_meta_data)
      values
        ($1, 'first@example.test', '{"display_name":"First Test User"}'),
        ($2, 'second@example.test', '{}')
    `,
    [firstUserId, secondUserId],
  );

  const profileResult = await db.query(`
    select id, primary_role, status, display_name
    from public.profiles
    order by id
  `);

  assert.deepEqual(
    profileResult.rows,
    [
      {
        id: firstUserId,
        primary_role: "parent",
        status: "active",
        display_name: "First Test User",
      },
      {
        id: secondUserId,
        primary_role: "parent",
        status: "active",
        display_name: "second",
      },
      {
        id: existingUserId,
        primary_role: "parent",
        status: "active",
        display_name: "existing",
      },
    ],
    "existing and future Auth users receive one least-privilege profile",
  );

  await db.exec(`
    set role authenticated;
    select set_config(
      'request.jwt.claim.sub',
      '${firstUserId}',
      false
    );
  `);

  const ownProfileResult = await db.query(`
    select id
    from public.profiles
    order by id
  `);

  assert.deepEqual(
    ownProfileResult.rows,
    [{ id: firstUserId }],
    "an authenticated account can read only its own profile",
  );

  await expectDatabaseError(
    () =>
      db.exec(`
        update public.profiles
        set primary_role = 'platform_administrator'
        where id = '${firstUserId}'
      `),
    "an authenticated account cannot change its permanent role",
  );

  await expectDatabaseError(
    () => db.query("select id from public.students"),
    "student records deny direct authenticated access",
  );

  await expectDatabaseError(
    () => db.query("select id from public.audit_events"),
    "audit records deny direct authenticated access",
  );

  await db.exec("reset role");

  await expectDatabaseError(
    () =>
      db.exec(`
        insert into public.events (
          name,
          event_type,
          starts_at,
          ends_at
        )
        values (
          'Invalid Test Event',
          'test',
          '2026-07-24T20:00:00Z',
          '2026-07-24T19:00:00Z'
        )
      `),
    "event end time must be later than its start time",
  );

  await expectDatabaseError(
    () =>
      db.exec(`
        insert into public.students (
          person_id,
          primary_household_id,
          birth_date,
          grade
        )
        values (
          gen_random_uuid(),
          gen_random_uuid(),
          current_date + 1,
          '7'
        )
      `),
    "future student birth dates are rejected",
  );

  console.log("Database migration execution: passed");
  console.log(`Core tables verified: ${expectedTables.length}`);
  console.log("RLS baseline, Auth profile trigger, and constraints: passed");
} finally {
  await db.close();
}
