import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { PGlite } from "@electric-sql/pglite";

const migrationPaths = [
  "supabase/migrations/202607230001_core_database_foundation.sql",
  "supabase/migrations/202607230002_security_authorization.sql",
  "supabase/migrations/202607240001_milestone3_user_management.sql",
  "supabase/migrations/202607240002_member_management_foundation.sql",
  "supabase/migrations/202607240003_volunteer_management_foundation.sql",
  "supabase/migrations/202607240004_volunteer_management_workflows.sql",
  "supabase/migrations/202607260001_volunteer_scheduling.sql",
  "supabase/migrations/202608030004_volunteer_proper_display_names.sql",
];

const ids = {
  admin: "30000000-0000-4000-8000-000000000001",
  volunteer: "30000000-0000-4000-8000-000000000002",
  otherVolunteer: "30000000-0000-4000-8000-000000000003",
  parent: "30000000-0000-4000-8000-000000000004",
  certification: "30000000-0000-4000-8000-000000000005",
  skill: "30000000-0000-4000-8000-000000000006",
  skillAssignment: "30000000-0000-4000-8000-000000000007",
  availability: "30000000-0000-4000-8000-000000000008",
  event: "30000000-0000-4000-8000-000000000009",
  volunteerPerson: "30000000-0000-4000-8000-000000000010",
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
        ($2, 'volunteer@example.test', '{"display_name":"Test Volunteer"}'),
        ($3, 'other-volunteer@example.test', '{"display_name":"Other Volunteer"}'),
        ($4, 'parent@example.test', '{"display_name":"Test Parent"}')
    `,
    [ids.admin, ids.volunteer, ids.otherVolunteer, ids.parent],
  );

  await db.query(
    `
      update public.profiles
      set primary_role = case
        when id = $1 then 'platform_administrator'::public.account_role
        when id in ($2, $3) then 'volunteer'::public.account_role
        else 'parent'::public.account_role
      end
      where id in ($1, $2, $3, $4)
    `,
    [ids.admin, ids.volunteer, ids.otherVolunteer, ids.parent],
  );
  await db.query(
    "insert into public.people (id, first_name, last_name) values ($1, 'Proper', 'Volunteer')",
    [ids.volunteerPerson],
  );
  await db.query(
    "update public.profiles set person_id = $1 where id = $2",
    [ids.volunteerPerson, ids.volunteer],
  );

  await db.query(
    `
      insert into public.volunteer_profiles (
        profile_id,
        ministry_title,
        background_check_status,
        background_check_completed_at,
        background_check_expires_at,
        background_check_reference
      )
      values
        ($1, 'Small Group Leader', 'cleared', '2026-01-15', '2027-01-15', 'SYNTHETIC-001'),
        ($2, 'Check-In Volunteer', 'pending', null, null, null)
    `,
    [ids.volunteer, ids.otherVolunteer],
  );

  await db.query(
    `
      insert into public.volunteer_certifications (
        id, profile_id, name, issuer, issued_at, expires_at
      )
      values ($1, $2, 'Synthetic First Aid', 'Example Provider', '2026-02-01', '2027-02-01')
    `,
    [ids.certification, ids.volunteer],
  );

  await db.query(
    `
      insert into public.volunteer_skills (id, name, description)
      values ($1, 'Synthetic Hospitality', 'Synthetic test skill')
    `,
    [ids.skill],
  );

  await db.query(
    `
      insert into public.volunteer_skill_assignments (
        id, profile_id, skill_id, skill_level
      )
      values ($1, $2, $3, 'proficient')
    `,
    [ids.skillAssignment, ids.volunteer, ids.skill],
  );

  await db.query(
    `
      insert into public.volunteer_availability (
        id, profile_id, day_of_week, starts_at, ends_at
      )
      values ($1, $2, 0, '08:00', '12:00')
    `,
    [ids.availability, ids.volunteer],
  );

  await db.query(
    `
      insert into public.events (
        id, name, event_type, status, starts_at, ends_at, timezone
      )
      values (
        $1, 'Synthetic Youth Night', 'Synthetic Test', 'published',
        '2099-08-01T23:00:00Z', '2099-08-02T01:00:00Z',
        'America/Chicago'
      )
    `,
    [ids.event],
  );

  const adminRows = await asAuthenticated(ids.admin, () =>
    db.query("select profile_id from public.volunteer_profiles order by profile_id"),
  );
  assert.equal(adminRows.rows.length, 2, "Admin can read the volunteer directory");

  const ownRows = await asAuthenticated(ids.volunteer, () =>
    db.query("select profile_id from public.volunteer_profiles"),
  );
  assert.deepEqual(
    ownRows.rows.map((row) => row.profile_id),
    [ids.volunteer],
    "Volunteer reads only their own volunteer profile",
  );

  const ownCertificationRows = await asAuthenticated(ids.volunteer, () =>
    db.query("select id from public.volunteer_certifications"),
  );
  assert.equal(
    ownCertificationRows.rows.length,
    1,
    "Volunteer reads their own certification metadata",
  );

  const ownAvailabilityRows = await asAuthenticated(ids.otherVolunteer, () =>
    db.query("select id from public.volunteer_availability"),
  );
  assert.equal(
    ownAvailabilityRows.rows.length,
    0,
    "A volunteer cannot read another volunteer's availability",
  );

  const parentRows = await asAuthenticated(ids.parent, () =>
    db.query("select profile_id from public.volunteer_profiles"),
  );
  assert.equal(parentRows.rows.length, 0, "Family-only accounts cannot read volunteers");

  const parentSkillRows = await asAuthenticated(ids.parent, () =>
    db.query("select id from public.volunteer_skills"),
  );
  assert.equal(parentSkillRows.rows.length, 0, "Family-only accounts cannot read skills");

  const directoryRows = await asAuthenticated(ids.admin, () =>
    db.query("select * from public.list_volunteer_directory(null)"),
  );
  assert.equal(
    directoryRows.rows.length,
    2,
    "Admin can use the protected volunteer directory projection",
  );
  assert.equal(
    directoryRows.rows.find((row) => row.profile_id === ids.volunteer)?.display_name,
    "Proper Volunteer",
  );

  await asAuthenticated(ids.admin, () =>
    db.query(
      `
        select public.upsert_volunteer_profile(
          $1, 'Updated Synthetic Leader', 'cleared',
          '2026-03-01', '2027-03-01', 'SYNTHETIC-UPDATED', true
        )
      `,
      [ids.volunteer],
    ),
  );

  const workspaceRows = await asAuthenticated(ids.volunteer, () =>
    db.query("select public.get_volunteer_workspace($1) as workspace", [
      ids.volunteer,
    ]),
  );
  assert.equal(
    workspaceRows.rows[0].workspace.ministryTitle,
    "Updated Synthetic Leader",
    "Volunteer can load their protected self workspace",
  );
  assert.equal(workspaceRows.rows[0].workspace.displayName, "Proper Volunteer");
  assert.equal(
    workspaceRows.rows[0].workspace.backgroundCheckReference,
    null,
    "Provider reference is hidden from the volunteer self view",
  );

  await asAuthenticated(ids.volunteer, () =>
    db.query(
      `
        select public.save_volunteer_skill_assignment(
          $1, $2, 'advanced', 'Synthetic self-service note'
        )
      `,
      [ids.volunteer, ids.skill],
    ),
  );

  await asAuthenticated(ids.volunteer, () =>
    db.query(
      `
        select public.save_volunteer_availability(
          null::uuid, $1::uuid, 3::smallint, '18:00'::time,
          '20:00'::time, 'America/Chicago'::text,
          '2026-07-01'::date, null::date,
          'Synthetic Wednesday window'::text
        )
      `,
      [ids.volunteer],
    ),
  );

  await expectDatabaseError(
    () =>
      asAuthenticated(ids.parent, () =>
        db.query("select * from public.list_volunteer_directory(null)"),
      ),
    "Family-only accounts cannot call the volunteer directory projection",
  );
  await expectDatabaseError(
    () =>
      asAuthenticated(ids.otherVolunteer, () =>
        db.query("select public.get_volunteer_workspace($1)", [ids.volunteer]),
      ),
    "A volunteer cannot load another volunteer's workspace",
  );

  const auditRows = await db.query(
    `
      select action
      from public.audit_events
      where action like 'volunteer.%'
      order by action
    `,
  );
  assert.deepEqual(
    auditRows.rows.map((row) => row.action),
    [
      "volunteer.availability_saved",
      "volunteer.profile_saved",
      "volunteer.skill_assigned",
    ],
    "Volunteer profile, skill, and availability changes are audited",
  );

  const scheduled = await asAuthenticated(ids.admin, () =>
    db.query(
      `
        select public.schedule_volunteer(
          $1, $2, 'Synthetic Greeter', null, null
        ) as assignment_id
      `,
      [ids.event, ids.volunteer],
    ),
  );
  const assignmentId = scheduled.rows[0].assignment_id;
  assert.equal(typeof assignmentId, "string", "Admin can schedule a volunteer");

  const volunteerAssignments = await asAuthenticated(ids.volunteer, () =>
    db.query("select * from public.list_volunteer_assignments($1)", [
      ids.volunteer,
    ]),
  );
  assert.equal(
    volunteerAssignments.rows[0].event_name,
    "Synthetic Youth Night",
    "Volunteer can read their own assignment with event context",
  );

  await expectDatabaseError(
    () =>
      asAuthenticated(ids.otherVolunteer, () =>
        db.query("select * from public.list_volunteer_assignments($1)", [
          ids.volunteer,
        ]),
      ),
    "A volunteer cannot read another volunteer's schedule",
  );

  await asAuthenticated(ids.volunteer, () =>
    db.query(
      "select public.set_volunteer_assignment_status($1, 'confirmed')",
      [assignmentId],
    ),
  );
  const confirmed = await db.query(
    "select status from public.event_volunteer_assignments where id = $1",
    [assignmentId],
  );
  assert.equal(
    confirmed.rows[0].status,
    "confirmed",
    "Volunteer can confirm their own assignment",
  );

  await expectDatabaseError(
    () =>
      asAuthenticated(ids.otherVolunteer, () =>
        db.query(
          "select public.set_volunteer_assignment_status($1, 'declined')",
          [assignmentId],
        ),
      ),
    "A volunteer cannot respond to another volunteer's assignment",
  );

  const assignmentAuditRows = await db.query(
    `
      select action from public.audit_events
      where entity_id = $1 order by occurred_at
    `,
    [assignmentId],
  );
  assert.deepEqual(
    assignmentAuditRows.rows.map((row) => row.action),
    [
      "volunteer.assignment_scheduled",
      "volunteer.assignment_status_changed",
    ],
    "Scheduling and volunteer responses are audited",
  );

  let directWriteRejected = false;
  try {
    await asAuthenticated(ids.admin, () =>
      db.query(
        "update public.volunteer_profiles set ministry_title = 'Changed' where profile_id = $1",
        [ids.volunteer],
      ),
    );
  } catch {
    directWriteRejected = true;
  }
  assert.equal(
    directWriteRejected,
    true,
    "Direct authenticated writes remain closed until audited service functions are added",
  );

  console.log("Volunteer Management foundation verification passed.");
} finally {
  await db.close();
}
