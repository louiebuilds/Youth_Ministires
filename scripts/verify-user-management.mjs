import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { PGlite } from "@electric-sql/pglite";

const migrationPaths = [
  "supabase/migrations/202607230001_core_database_foundation.sql",
  "supabase/migrations/202607230002_security_authorization.sql",
  "supabase/migrations/202607240001_milestone3_user_management.sql",
];

const ids = {
  admin: "10000000-0000-4000-8000-000000000001",
  parent: "10000000-0000-4000-8000-000000000002",
  volunteer: "10000000-0000-4000-8000-000000000003",
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

  for (const migrationPath of migrationPaths) {
    const migration = await readFile(migrationPath, "utf8");
    const locallyCompatibleMigration = migration
      .replace(
        "create extension if not exists pgcrypto with schema extensions;",
        "",
      )
      .replaceAll("extensions.gen_random_uuid()", "gen_random_uuid()");

    await db.exec(locallyCompatibleMigration);
  }

  await db.query(
    `
      insert into auth.users (id, email, raw_user_meta_data)
      values
        ($1, 'admin@example.test', '{"display_name":"Test Admin"}'),
        ($2, 'parent@example.test', '{"display_name":"Test Parent"}'),
        ($3, 'volunteer@example.test', '{"display_name":"Test Volunteer"}')
    `,
    [ids.admin, ids.parent, ids.volunteer],
  );

  await db.query(
    `
      update public.profiles
      set primary_role = case id
        when $1 then 'platform_administrator'::public.account_role
        when $2 then 'parent'::public.account_role
        else 'volunteer'::public.account_role
      end
      where id in ($1, $2, $3)
    `,
    [ids.admin, ids.parent, ids.volunteer],
  );

  await asAuthenticated(ids.parent, () =>
    db.query("select public.update_own_profile($1)", ["Sample Parent"]),
  );

  const updatedParent = await db.query(
    "select display_name from public.profiles where id = $1",
    [ids.parent],
  );
  assert.equal(
    updatedParent.rows[0].display_name,
    "Sample Parent",
    "an active account can update only its own display name",
  );

  await expectDatabaseError(
    () =>
      asAuthenticated(ids.parent, () =>
        db.query("select * from public.list_managed_accounts(null)"),
      ),
    "a parent cannot list managed accounts",
  );

  const managedAccounts = await asAuthenticated(ids.admin, () =>
    db.query("select * from public.list_managed_accounts($1)", ["example"]),
  );
  assert.equal(
    managedAccounts.rows.length,
    3,
    "a platform administrator can search the managed account directory",
  );

  await asAuthenticated(ids.admin, () =>
    db.query(
      "select public.admin_update_account($1, $2, $3, $4)",
      [ids.volunteer, "Sample Volunteer", "staff_member", "suspended"],
    ),
  );

  const updatedVolunteer = await db.query(
    `
      select display_name, primary_role, status
      from public.profiles
      where id = $1
    `,
    [ids.volunteer],
  );
  assert.deepEqual(
    updatedVolunteer.rows[0],
    {
      display_name: "Sample Volunteer",
      primary_role: "staff_member",
      status: "suspended",
    },
    "an administrator can update another account through the audited function",
  );

  await expectDatabaseError(
    () =>
      asAuthenticated(ids.admin, () =>
        db.query(
          "select public.admin_update_account($1, $2, $3, $4)",
          [ids.admin, "Test Admin", "parent", "active"],
        ),
      ),
    "an administrator cannot demote their own active administrator account",
  );

  await expectDatabaseError(
    () =>
      asAuthenticated(ids.admin, () =>
        db.exec(`
          update public.profiles
          set primary_role = 'parent'
          where id = '${ids.volunteer}'
        `),
      ),
    "direct profile updates are revoked from authenticated accounts",
  );

  const auditActions = await db.query(`
    select action
    from public.audit_events
    order by occurred_at, event_id
  `);
  assert.deepEqual(
    auditActions.rows.map(({ action }) => action),
    ["profile.display_name_updated", "account.updated"],
    "self-service and administrative profile changes append audit events",
  );

  console.log("Milestone 3 user-management migration execution: passed");
  console.log("Self-service profile update and audit: passed");
  console.log("Administrator directory and account update: passed");
  console.log("Non-admin, self-demotion, and direct-update denial: passed");
} finally {
  await db.close();
}
