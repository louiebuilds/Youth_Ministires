import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { PGlite } from "@electric-sql/pglite";

const migrationPaths = [
  "supabase/migrations/202607230001_core_database_foundation.sql",
  "supabase/migrations/202607230002_security_authorization.sql",
];

const ids = {
  admin: "10000000-0000-4000-8000-000000000001",
  pastor: "10000000-0000-4000-8000-000000000002",
  staff: "10000000-0000-4000-8000-000000000003",
  volunteer: "10000000-0000-4000-8000-000000000004",
  parent: "10000000-0000-4000-8000-000000000005",
  unrelatedParent: "10000000-0000-4000-8000-000000000006",
  suspended: "10000000-0000-4000-8000-000000000007",
  adminPerson: "20000000-0000-4000-8000-000000000001",
  pastorPerson: "20000000-0000-4000-8000-000000000002",
  staffPerson: "20000000-0000-4000-8000-000000000003",
  volunteerPerson: "20000000-0000-4000-8000-000000000004",
  parentPerson: "20000000-0000-4000-8000-000000000005",
  unrelatedParentPerson: "20000000-0000-4000-8000-000000000006",
  suspendedPerson: "20000000-0000-4000-8000-000000000007",
  relatedStudentPerson: "20000000-0000-4000-8000-000000000008",
  unrelatedStudentPerson: "20000000-0000-4000-8000-000000000009",
  relatedHousehold: "30000000-0000-4000-8000-000000000001",
  unrelatedHousehold: "30000000-0000-4000-8000-000000000002",
  relatedStudent: "40000000-0000-4000-8000-000000000001",
  unrelatedStudent: "40000000-0000-4000-8000-000000000002",
  assignedEvent: "50000000-0000-4000-8000-000000000001",
  publishedEvent: "50000000-0000-4000-8000-000000000002",
  draftEvent: "50000000-0000-4000-8000-000000000003",
};

const expectedPolicies = [
  "audit_events_read_oversight",
  "event_assignments_manage_ministry",
  "event_assignments_read_authorized",
  "events_manage_ministry",
  "events_read_authorized",
  "household_memberships_manage_ministry",
  "household_memberships_read_authorized",
  "households_manage_ministry",
  "households_read_authorized",
  "people_manage_ministry",
  "people_read_authorized",
  "profiles_admin_delete",
  "profiles_admin_insert",
  "profiles_admin_update",
  "profiles_read_active_authorized",
  "student_relationships_manage_ministry",
  "student_relationships_read_authorized",
  "students_manage_ministry",
  "students_read_authorized",
];

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

  const policyResult = await db.query(`
    select policyname
    from pg_catalog.pg_policies
    where schemaname = 'public'
    order by policyname
  `);

  assert.deepEqual(
    policyResult.rows.map(({ policyname }) => policyname),
    expectedPolicies,
    "the final policy catalog matches the approved security design",
  );

  const helperSecurityResult = await db.query(`
    select
      routine_name,
      security_type
    from information_schema.routines
    where routine_schema = 'private'
    order by routine_name
  `);

  assert.equal(
    helperSecurityResult.rows.length,
    7,
    "all authorization helpers are private",
  );
  assert.equal(
    helperSecurityResult.rows.every(
      ({ security_type }) => security_type === "DEFINER",
    ),
    true,
    "authorization helpers use controlled definer execution",
  );

  await db.query(
    `
      insert into auth.users (id, email, raw_user_meta_data)
      values
        ($1, 'admin@example.test', '{"display_name":"Test Admin"}'),
        ($2, 'pastor@example.test', '{"display_name":"Test Pastor"}'),
        ($3, 'staff@example.test', '{"display_name":"Test Staff"}'),
        ($4, 'volunteer@example.test', '{"display_name":"Test Volunteer"}'),
        ($5, 'parent@example.test', '{"display_name":"Test Parent"}'),
        ($6, 'unrelated@example.test', '{"display_name":"Other Parent"}'),
        ($7, 'suspended@example.test', '{"display_name":"Suspended User"}')
    `,
    [
      ids.admin,
      ids.pastor,
      ids.staff,
      ids.volunteer,
      ids.parent,
      ids.unrelatedParent,
      ids.suspended,
    ],
  );

  await db.query(
    `
      insert into public.people (id, first_name, last_name, email)
      values
        ($1, 'Test', 'Admin', 'admin@example.test'),
        ($2, 'Test', 'Pastor', 'pastor@example.test'),
        ($3, 'Test', 'Staff', 'staff@example.test'),
        ($4, 'Test', 'Volunteer', 'volunteer@example.test'),
        ($5, 'Test', 'Parent', 'parent@example.test'),
        ($6, 'Other', 'Parent', 'unrelated@example.test'),
        ($7, 'Suspended', 'User', 'suspended@example.test'),
        ($8, 'Related', 'Student', null),
        ($9, 'Unrelated', 'Student', null)
    `,
    [
      ids.adminPerson,
      ids.pastorPerson,
      ids.staffPerson,
      ids.volunteerPerson,
      ids.parentPerson,
      ids.unrelatedParentPerson,
      ids.suspendedPerson,
      ids.relatedStudentPerson,
      ids.unrelatedStudentPerson,
    ],
  );

  const profileUpdates = [
    [ids.admin, ids.adminPerson, "platform_administrator", "active"],
    [ids.pastor, ids.pastorPerson, "youth_pastor", "active"],
    [ids.staff, ids.staffPerson, "staff_member", "active"],
    [ids.volunteer, ids.volunteerPerson, "volunteer", "active"],
    [ids.parent, ids.parentPerson, "parent", "active"],
    [
      ids.unrelatedParent,
      ids.unrelatedParentPerson,
      "parent",
      "active",
    ],
    [ids.suspended, ids.suspendedPerson, "staff_member", "suspended"],
  ];

  for (const [profileId, personId, role, status] of profileUpdates) {
    await db.query(
      `
        update public.profiles
        set person_id = $2,
            primary_role = $3,
            status = $4
        where id = $1
      `,
      [profileId, personId, role, status],
    );
  }

  await db.query(
    `
      insert into public.households (id, name, status)
      values
        ($1, 'Example Household', 'active'),
        ($2, 'Other Household', 'active')
    `,
    [ids.relatedHousehold, ids.unrelatedHousehold],
  );

  await db.query(
    `
      insert into public.household_memberships (
        household_id,
        person_id,
        relationship_label,
        is_responsible_adult
      )
      values
        ($1, $3, 'Parent', true),
        ($1, $4, 'Student', false),
        ($2, $5, 'Parent', true),
        ($2, $6, 'Student', false)
    `,
    [
      ids.relatedHousehold,
      ids.unrelatedHousehold,
      ids.parentPerson,
      ids.relatedStudentPerson,
      ids.unrelatedParentPerson,
      ids.unrelatedStudentPerson,
    ],
  );

  await db.query(
    `
      insert into public.students (
        id,
        person_id,
        primary_household_id,
        birth_date,
        grade,
        status
      )
      values
        ($1, $2, $3, '2012-06-01', '8', 'active'),
        ($4, $5, $6, '2013-06-01', '7', 'active')
    `,
    [
      ids.relatedStudent,
      ids.relatedStudentPerson,
      ids.relatedHousehold,
      ids.unrelatedStudent,
      ids.unrelatedStudentPerson,
      ids.unrelatedHousehold,
    ],
  );

  await db.query(
    `
      insert into public.student_relationships (
        student_id,
        person_id,
        relationship_type,
        is_legal_guardian,
        may_view_student_information
      )
      values
        ($1, $2, 'Parent', true, true),
        ($3, $4, 'Parent', true, true)
    `,
    [
      ids.relatedStudent,
      ids.parentPerson,
      ids.unrelatedStudent,
      ids.unrelatedParentPerson,
    ],
  );

  await db.query(
    `
      insert into public.events (
        id,
        name,
        event_type,
        status,
        starts_at,
        ends_at
      )
      values
        ($1, 'Assigned Test Event', 'service', 'draft',
          '2026-08-01T18:00:00Z', '2026-08-01T20:00:00Z'),
        ($2, 'Published Test Event', 'gathering', 'published',
          '2026-08-02T18:00:00Z', '2026-08-02T20:00:00Z'),
        ($3, 'Private Draft Event', 'planning', 'draft',
          '2026-08-03T18:00:00Z', '2026-08-03T20:00:00Z')
    `,
    [ids.assignedEvent, ids.publishedEvent, ids.draftEvent],
  );

  await db.query(
    `
      insert into public.event_volunteer_assignments (
        event_id,
        profile_id,
        assignment_role,
        status,
        assigned_by_profile_id
      )
      values ($1, $2, 'Check-In', 'confirmed', $3)
    `,
    [ids.assignedEvent, ids.volunteer, ids.admin],
  );

  await db.query(
    `
      insert into public.audit_events (
        actor_profile_id,
        action,
        entity_type,
        entity_id,
        result,
        source
      )
      values ($1, 'security.test', 'profile', $2, 'success', 'system')
    `,
    [ids.admin, ids.volunteer],
  );

  for (const privilegedId of [ids.admin, ids.pastor, ids.staff]) {
    const result = await asAuthenticated(privilegedId, () =>
      db.query(`
        select count(*)::integer as count
        from public.students
      `),
    );

    assert.equal(
      result.rows[0].count,
      2,
      "each ministry operations role can read all current students",
    );
  }

  const relatedStudentResult = await asAuthenticated(ids.parent, () =>
    db.query(`
      select id
      from public.students
      order by id
    `),
  );
  assert.deepEqual(
    relatedStudentResult.rows,
    [{ id: ids.relatedStudent }],
    "a parent sees only the student with explicit view permission",
  );

  const unrelatedStudentResult = await asAuthenticated(
    ids.unrelatedParent,
    () =>
      db.query(`
        select id
        from public.students
        order by id
      `),
  );
  assert.deepEqual(
    unrelatedStudentResult.rows,
    [{ id: ids.unrelatedStudent }],
    "another parent cannot cross the household boundary",
  );

  const parentHouseholdResult = await asAuthenticated(ids.parent, () =>
    db.query(`
      select id
      from public.households
      order by id
    `),
  );
  assert.deepEqual(
    parentHouseholdResult.rows,
    [{ id: ids.relatedHousehold }],
    "a parent sees only their related household",
  );

  const volunteerEventResult = await asAuthenticated(ids.volunteer, () =>
    db.query(`
      select id
      from public.events
      order by id
    `),
  );
  assert.deepEqual(
    volunteerEventResult.rows,
    [{ id: ids.assignedEvent }],
    "a volunteer sees only their assigned event",
  );

  const parentEventResult = await asAuthenticated(ids.parent, () =>
    db.query(`
      select id
      from public.events
      order by id
    `),
  );
  assert.deepEqual(
    parentEventResult.rows,
    [{ id: ids.publishedEvent }],
    "a parent sees published events but not drafts",
  );

  const volunteerStudentResult = await asAuthenticated(ids.volunteer, () =>
    db.query("select id from public.students"),
  );
  assert.deepEqual(
    volunteerStudentResult.rows,
    [],
    "an event assignment does not expose student rows",
  );

  const suspendedProfileResult = await asAuthenticated(ids.suspended, () =>
    db.query("select id from public.profiles"),
  );
  assert.deepEqual(
    suspendedProfileResult.rows,
    [],
    "a suspended account cannot read even its application profile",
  );

  await asAuthenticated(ids.volunteer, async () => {
    await db.exec(`
      update public.profiles
      set primary_role = 'platform_administrator'
      where id = '${ids.volunteer}'
    `);
  });

  const volunteerRoleResult = await db.query(
    "select primary_role from public.profiles where id = $1",
    [ids.volunteer],
  );
  assert.equal(
    volunteerRoleResult.rows[0].primary_role,
    "volunteer",
    "a volunteer cannot self-assign a privileged role",
  );

  await expectDatabaseError(
    () =>
      asAuthenticated(ids.volunteer, () =>
        db.exec(`
          insert into public.events (
            name,
            event_type,
            starts_at,
            ends_at
          )
          values (
            'Unauthorized Event',
            'test',
            '2026-08-04T18:00:00Z',
            '2026-08-04T20:00:00Z'
          )
        `),
      ),
    "a volunteer cannot create an event",
  );

  await asAuthenticated(ids.staff, () =>
    db.exec(`
      insert into public.events (
        name,
        event_type,
        starts_at,
        ends_at
      )
      values (
        'Authorized Staff Event',
        'test',
        '2026-08-05T18:00:00Z',
        '2026-08-05T20:00:00Z'
      )
    `),
  );

  for (const oversightId of [ids.admin, ids.pastor]) {
    const auditResult = await asAuthenticated(oversightId, () =>
      db.query("select event_id from public.audit_events"),
    );
    assert.equal(
      auditResult.rows.length,
      1,
      "security oversight roles can read audit events",
    );
  }

  const staffAuditResult = await asAuthenticated(ids.staff, () =>
    db.query("select event_id from public.audit_events"),
  );
  assert.deepEqual(
    staffAuditResult.rows,
    [],
    "staff cannot read security audit events",
  );

  await expectDatabaseError(
    () =>
      asAuthenticated(ids.admin, () =>
        db.exec("delete from public.audit_events"),
      ),
    "audit events remain immutable even for platform administrators",
  );

  await expectDatabaseError(
    async () => {
      await db.exec("set role anon");
      try {
        await db.query("select id from public.events");
      } finally {
        await db.exec("reset role");
      }
    },
    "anonymous users cannot read protected tables",
  );

  const acceptanceSql = await readFile(
    "supabase/tests/database/manual_milestone_4_acceptance.sql",
    "utf8",
  );
  const acceptanceResult = await db.query(acceptanceSql);

  assert.equal(
    Object.values(acceptanceResult.rows[0]).every(Boolean),
    true,
    "the connected-database acceptance query returns only true checks",
  );

  console.log("Security migrations execute from a clean database: passed");
  console.log(`Authorization policies verified: ${expectedPolicies.length}`);
  console.log("Five-role, lifecycle, relationship, and event scope: passed");
  console.log("Privilege escalation and audit tampering denial: passed");
  console.log("Product Owner acceptance query contract: passed");
} finally {
  await db.close();
}
