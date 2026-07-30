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
  "supabase/migrations/202607260002_attendance_foundation.sql",
  "supabase/migrations/202607260003_attendance_workflows.sql",
  "supabase/migrations/202607260004_checkin_foundation.sql",
  "supabase/migrations/202607260005_checkin_workflows.sql",
  "supabase/migrations/202607260006_child_relationship_addition.sql",
  "supabase/migrations/202607260007_checkin_correction_repair.sql",
  "supabase/migrations/202607260008_checkin_reentry_after_correction.sql",
  "supabase/migrations/202607270001_attendance_reports.sql",
  "supabase/migrations/202607270002_event_management_foundation.sql",
  "supabase/migrations/202607300001_event_registration_foundation.sql",
  "supabase/migrations/202607300002_event_registration_settings.sql",
  "supabase/migrations/202607300003_family_event_registration_options.sql",
  "supabase/migrations/202607300004_family_event_registration.sql",
  "supabase/migrations/202607300005_family_event_registration_cancellation.sql",
  "supabase/migrations/202607300006_event_registration_management.sql",
  "supabase/migrations/202607300007_event_volunteer_workspace.sql",
  "supabase/migrations/202607300008_event_planning_tools.sql",
];

const ids = {
  admin: "40000000-0000-4000-8000-000000000001",
  assignedVolunteer: "40000000-0000-4000-8000-000000000002",
  otherVolunteer: "40000000-0000-4000-8000-000000000003",
  parent: "40000000-0000-4000-8000-000000000004",
  studentPerson: "40000000-0000-4000-8000-000000000005",
  household: "40000000-0000-4000-8000-000000000006",
  student: "40000000-0000-4000-8000-000000000007",
  event: "40000000-0000-4000-8000-000000000008",
  assignment: "40000000-0000-4000-8000-000000000009",
  session: "40000000-0000-4000-8000-000000000010",
  record: "40000000-0000-4000-8000-000000000011",
  checkIn: "40000000-0000-4000-8000-000000000012",
  visitor: "40000000-0000-4000-8000-000000000013",
  qrToken: "40000000-0000-4000-8000-000000000014",
  parentPerson: "40000000-0000-4000-8000-000000000015",
  correctionEvent: "40000000-0000-4000-8000-000000000016",
  correctionRecord: "40000000-0000-4000-8000-000000000017",
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

  for (const migrationPath of migrationPaths) {
    const migration = await readFile(migrationPath, "utf8");
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
        ($1, 'admin@example.test', '{"display_name":"Test Admin"}'),
        ($2, 'assigned@example.test', '{"display_name":"Assigned Volunteer"}'),
        ($3, 'other@example.test', '{"display_name":"Other Volunteer"}'),
        ($4, 'parent@example.test', '{"display_name":"Test Parent"}')
    `,
    [ids.admin, ids.assignedVolunteer, ids.otherVolunteer, ids.parent],
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
    [
      ids.admin,
      ids.assignedVolunteer,
      ids.otherVolunteer,
      ids.parent,
    ],
  );

  await db.query(
    `
      insert into public.people (
        id, first_name, last_name, email, phone
      ) values
        ($1, 'Synthetic', 'Student', null, null),
        ($2, 'Synthetic', 'Parent', 'parent@example.test', '555-0100')
    `,
    [ids.studentPerson, ids.parentPerson],
  );
  await db.query(
    "update public.profiles set person_id = $1 where id = $2",
    [ids.parentPerson, ids.parent],
  );
  await db.query(
    "insert into public.households (id, name, status) values ($1, 'Synthetic Family', 'active')",
    [ids.household],
  );
  await db.query(
    `
      insert into public.students (
        id, person_id, primary_household_id, birth_date, grade, status
      ) values ($1, $2, $3, '2012-01-01', '8', 'active')
    `,
    [ids.student, ids.studentPerson, ids.household],
  );
  await db.query(
    `
      insert into public.household_memberships (
        household_id, person_id, relationship_label,
        is_responsible_adult, is_primary_contact
      ) values ($1, $2, 'Parent', true, true)
    `,
    [ids.household, ids.parentPerson],
  );
  await db.query(
    `
      insert into public.student_relationships (
        student_id, person_id, relationship_type,
        is_legal_guardian, is_emergency_contact,
        is_authorized_pickup, may_view_student_information
      ) values ($1, $2, 'Parent', true, true, true, true)
    `,
    [ids.student, ids.parentPerson],
  );
  await db.query(
    `
      insert into public.events (
        id, name, event_type, status, starts_at, ends_at
      ) values (
        $1, 'Synthetic Class Event', 'Synthetic Test', 'published',
        '2099-09-01T23:00:00Z', '2099-09-02T01:00:00Z'
      )
    `,
    [ids.event],
  );
  await db.query(
    `
      insert into public.event_volunteer_assignments (
        id, event_id, profile_id, assignment_role, status
      ) values ($1, $2, $3, 'Synthetic Teacher', 'confirmed')
    `,
    [ids.assignment, ids.event, ids.assignedVolunteer],
  );
  await db.query(
    `
      insert into public.attendance_sessions (
        id, event_id, session_date, class_name, created_by_profile_id
      ) values ($1, $2, '2099-09-01', 'Synthetic Grade 8', $3)
    `,
    [ids.session, ids.event, ids.admin],
  );
  await db.query(
    `
      insert into public.attendance_records (
        id, session_id, student_id, status, recorded_by_profile_id
      ) values ($1, $2, $3, 'present', $4)
    `,
    [ids.record, ids.session, ids.student, ids.admin],
  );

  const adminSessions = await asAuthenticated(ids.admin, () =>
    db.query("select id from public.attendance_sessions"),
  );
  assert.equal(adminSessions.rows.length, 1, "Admin reads attendance sessions");

  const assignedSessions = await asAuthenticated(ids.assignedVolunteer, () =>
    db.query("select id from public.attendance_sessions"),
  );
  assert.equal(
    assignedSessions.rows.length,
    1,
    "Assigned volunteer reads the event attendance session",
  );

  const assignedRecords = await asAuthenticated(ids.assignedVolunteer, () =>
    db.query("select id from public.attendance_records"),
  );
  assert.equal(
    assignedRecords.rows.length,
    1,
    "Assigned volunteer reads records for the authorized session",
  );

  for (const deniedId of [ids.otherVolunteer, ids.parent]) {
    const sessions = await asAuthenticated(deniedId, () =>
      db.query("select id from public.attendance_sessions"),
    );
    const records = await asAuthenticated(deniedId, () =>
      db.query("select id from public.attendance_records"),
    );
    assert.equal(sessions.rows.length, 0, "Unauthorized account sees no sessions");
    assert.equal(records.rows.length, 0, "Unauthorized account sees no records");
  }

  let directWriteRejected = false;
  try {
    await asAuthenticated(ids.admin, () =>
      db.query(
        "update public.attendance_records set status = 'absent' where id = $1",
        [ids.record],
      ),
    );
  } catch {
    directWriteRejected = true;
  }
  assert.equal(
    directWriteRejected,
    true,
    "Direct authenticated attendance writes are denied",
  );

  const createdSession = await asAuthenticated(ids.admin, () =>
    db.query(
      `
        select public.create_attendance_session(
          $1, '2099-09-01', 'Synthetic Grade 9', null, null
        ) as session_id
      `,
      [ids.event],
    ),
  );
  const createdSessionId = createdSession.rows[0].session_id;
  assert.equal(
    typeof createdSessionId,
    "string",
    "Ministry manager creates an event-linked class session",
  );

  const roster = await asAuthenticated(ids.assignedVolunteer, () =>
    db.query(
      "select * from public.list_attendance_roster($1, 'Synthetic')",
      [createdSessionId],
    ),
  );
  assert.equal(
    roster.rows.length,
    1,
    "Assigned volunteer searches the class roster",
  );
  assert.equal(
    roster.rows[0].display_name,
    "Synthetic S.",
    "Roster minimizes the student display name",
  );

  const createdRecord = await asAuthenticated(ids.assignedVolunteer, () =>
    db.query(
      `
        select public.save_attendance_record(
          $1, $2, 'present', 'Synthetic arrival note'
        ) as record_id
      `,
      [createdSessionId, ids.student],
    ),
  );
  const createdRecordId = createdRecord.rows[0].record_id;

  await asAuthenticated(ids.admin, () =>
    db.query(
      `
        select public.save_attendance_record(
          $1, $2, 'excused', 'Synthetic correction note'
        )
      `,
      [createdSessionId, ids.student],
    ),
  );
  const corrected = await db.query(
    "select status, corrected_at from public.attendance_records where id = $1",
    [createdRecordId],
  );
  assert.equal(corrected.rows[0].status, "excused", "Attendance can be corrected");
  assert.ok(corrected.rows[0].corrected_at, "Correction timestamp is preserved");

  await expectDatabaseError(
    () =>
      asAuthenticated(ids.otherVolunteer, () =>
        db.query(
          "select public.save_attendance_record($1, $2, 'present', null)",
          [createdSessionId, ids.student],
        ),
      ),
    "Unassigned volunteer cannot record attendance",
  );

  await asAuthenticated(ids.assignedVolunteer, () =>
    db.query("select public.finalize_attendance_session($1)", [
      createdSessionId,
    ]),
  );
  await expectDatabaseError(
    () =>
      asAuthenticated(ids.admin, () =>
        db.query(
          "select public.save_attendance_record($1, $2, 'present', null)",
          [createdSessionId, ids.student],
        ),
      ),
    "Finalized sessions reject further attendance changes",
  );

  const auditRows = await db.query(
    `
      select action from public.audit_events
      where entity_id in ($1, $2)
      order by occurred_at
    `,
    [createdSessionId, createdRecordId],
  );
  assert.deepEqual(
    auditRows.rows.map((row) => row.action),
    [
      "attendance.session_created",
      "attendance.record_created",
      "attendance.record_corrected",
      "attendance.session_finalized",
    ],
    "Session, recording, correction, and finalization are audited",
  );

  await db.query(
    `
      insert into public.check_in_records (
        id, event_id, student_id, household_id, status,
        checked_in_at, checked_in_by_profile_id
      ) values ($1, $2, $3, $4, 'checked_in', now(), $5)
    `,
    [ids.checkIn, ids.event, ids.student, ids.household, ids.admin],
  );
  await db.query(
    `
      insert into public.visitor_check_ins (
        id, event_id, first_name, last_name, grade,
        guardian_name, guardian_contact, checked_in_by_profile_id
      ) values (
        $1, $2, 'Synthetic', 'Visitor', '8',
        'Synthetic Guardian', 'guardian@example.test', $3
      )
    `,
    [ids.visitor, ids.event, ids.admin],
  );
  await db.query(
    `
      insert into public.family_check_in_tokens (
        id, household_id, token_hash, expires_at, created_by_profile_id
      ) values (
        $1, $2,
        'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        now() + interval '15 minutes', $3
      )
    `,
    [ids.qrToken, ids.household, ids.admin],
  );

  const assignedCustody = await asAuthenticated(ids.assignedVolunteer, () =>
    db.query("select id from public.check_in_records"),
  );
  const assignedVisitors = await asAuthenticated(ids.assignedVolunteer, () =>
    db.query("select id from public.visitor_check_ins"),
  );
  assert.equal(
    assignedCustody.rows.length,
    1,
    "Assigned volunteer reads event check-in records",
  );
  assert.equal(
    assignedVisitors.rows.length,
    1,
    "Assigned volunteer reads event visitor records",
  );

  for (const deniedId of [ids.otherVolunteer, ids.parent]) {
    const custody = await asAuthenticated(deniedId, () =>
      db.query("select id from public.check_in_records"),
    );
    const visitors = await asAuthenticated(deniedId, () =>
      db.query("select id from public.visitor_check_ins"),
    );
    assert.equal(custody.rows.length, 0, "Unauthorized account sees no custody records");
    assert.equal(visitors.rows.length, 0, "Unauthorized account sees no visitor records");
  }

  await expectDatabaseError(
    () =>
      asAuthenticated(ids.admin, () =>
        db.query("select token_hash from public.family_check_in_tokens"),
      ),
    "Raw token hashes are not directly readable by authenticated accounts",
  );
  await expectDatabaseError(
    () =>
      asAuthenticated(ids.admin, () =>
        db.query(
          "update public.check_in_records set status = 'checked_out' where id = $1",
          [ids.checkIn],
        ),
      ),
    "Direct authenticated custody writes are denied",
  );

  const familyToken = await asAuthenticated(ids.parent, () =>
    db.query(
      "select public.issue_family_checkin_token($1) as token",
      [ids.household],
    ),
  );
  assert.ok(
    familyToken.rows[0].token.length >= 70,
    "Related family account receives a short-lived opaque QR token",
  );

  const resolvedHousehold = await asAuthenticated(
    ids.assignedVolunteer,
    () =>
      db.query(
        "select public.resolve_family_checkin_token($1, $2) as household_id",
        [ids.event, familyToken.rows[0].token],
      ),
  );
  assert.equal(
    resolvedHousehold.rows[0].household_id,
    ids.household,
    "Assigned check-in volunteer resolves the family token",
  );
  const householdWorkspace = await asAuthenticated(
    ids.assignedVolunteer,
    () =>
      db.query(
        "select public.get_checkin_household($1, $2) as household",
        [ids.event, ids.household],
      ),
  );
  assert.equal(
    householdWorkspace.rows[0].household.students[0].displayName,
    "Synthetic S.",
    "Check-in workspace minimizes routine student names",
  );
  assert.equal(
    householdWorkspace.rows[0].household.pickups[0].personId,
    ids.parentPerson,
    "Check-in workspace identifies authorized pickups",
  );
  const emergencyRoster = await asAuthenticated(
    ids.assignedVolunteer,
    () => db.query("select * from public.list_emergency_roster($1)", [ids.event]),
  );
  assert.equal(
    emergencyRoster.rows.length,
    1,
    "Emergency roster includes currently checked-in students",
  );

  await asAuthenticated(ids.assignedVolunteer, () =>
    db.query(
      "select public.check_out_student($1, $2, $3, null)",
      [ids.event, ids.student, ids.parentPerson],
    ),
  );
  const checkedOut = await db.query(
    "select status, pickup_person_id from public.check_in_records where id = $1",
    [ids.checkIn],
  );
  assert.equal(checkedOut.rows[0].status, "checked_out");
  assert.equal(checkedOut.rows[0].pickup_person_id, ids.parentPerson);

  await asAuthenticated(ids.assignedVolunteer, () =>
    db.query("select public.check_out_visitor($1)", [ids.visitor]),
  );
  const visitorStatus = await db.query(
    "select status from public.visitor_check_ins where id = $1",
    [ids.visitor],
  );
  assert.equal(
    visitorStatus.rows[0].status,
    "checked_out",
    "Assigned volunteer checks out a temporary visitor",
  );

  await db.query(
    `
      insert into public.events (
        id, name, event_type, status, starts_at, ends_at
      ) values (
        $1, 'Synthetic Correction Event', 'Synthetic Test', 'active',
        '2099-09-03T23:00:00Z', '2099-09-04T01:00:00Z'
      )
    `,
    [ids.correctionEvent],
  );
  await db.query(
    `
      insert into public.check_in_records (
        id, event_id, student_id, household_id, status, checked_in_at,
        checked_in_by_profile_id
      ) values ($1, $2, $3, $4, 'checked_in', now(), $5)
    `,
    [
      ids.correctionRecord, ids.correctionEvent, ids.student,
      ids.household, ids.admin,
    ],
  );
  await asAuthenticated(ids.admin, () =>
    db.query(
      "select public.correct_student_check_in($1, $2, $3)",
      [ids.correctionEvent, ids.student, "Synthetic correction"],
    ),
  );
  const correctedRecord = await db.query(
    `
      select status, exception_reason, override_by_profile_id
      from public.check_in_records where id = $1
    `,
    [ids.correctionRecord],
  );
  assert.equal(correctedRecord.rows[0].status, "exception");
  assert.equal(
    correctedRecord.rows[0].exception_reason,
    "Synthetic correction",
    "Correction retains the required audited reason",
  );
  assert.equal(correctedRecord.rows[0].override_by_profile_id, ids.admin);
  await asAuthenticated(ids.admin, () =>
    db.query(
      "select public.check_in_student($1, $2)",
      [ids.correctionEvent, ids.student],
    ),
  );
  const reenteredRecord = await db.query(
    `
      select status, exception_reason, override_by_profile_id
      from public.check_in_records where id = $1
    `,
    [ids.correctionRecord],
  );
  assert.equal(
    reenteredRecord.rows[0].status,
    "checked_in",
    "A corrected check-in can be legitimately recorded again",
  );
  assert.equal(reenteredRecord.rows[0].exception_reason, null);
  assert.equal(reenteredRecord.rows[0].override_by_profile_id, null);

  const parentEvents = await asAuthenticated(ids.parent, () =>
    db.query(
      `
        select * from public.list_event_calendar(
          '2099-09-01', '2099-09-30', null, null
        )
      `,
    ),
  );
  assert.equal(
    parentEvents.rows.some((event) => event.event_id === ids.event),
    true,
    "Parent calendar includes published events",
  );
  const createdEvent = await asAuthenticated(ids.admin, () =>
    db.query(
      `
        select public.create_event(
          'Synthetic Managed Event', 'Synthetic Test', 'draft', null,
          '2099-09-05 18:00', '2099-09-05 20:00', 'America/Chicago',
          25, 'Synthetic Campus', null, null, null, null
        ) as event_id
      `,
    ),
  );
  const managedEventId = createdEvent.rows[0].event_id;
  const managerCalendar = await asAuthenticated(ids.admin, () =>
    db.query(
      `
        select * from public.list_event_calendar(
          '2099-09-01', '2099-09-30', 'Managed', 'draft'
        )
      `,
    ),
  );
  assert.equal(managerCalendar.rows[0].event_id, managedEventId);
  const parentDraftCalendar = await asAuthenticated(ids.parent, () =>
    db.query(
      `
        select * from public.list_event_calendar(
          '2099-09-01', '2099-09-30', 'Managed', null
        )
      `,
    ),
  );
  assert.equal(
    parentDraftCalendar.rows.length,
    0,
    "Parents cannot discover draft events",
  );
  await asAuthenticated(ids.admin, () =>
    db.query("select public.archive_event($1)", [managedEventId]),
  );
  const archivedEvent = await db.query(
    "select status, archived_at from public.events where id = $1",
    [managedEventId],
  );
  assert.equal(archivedEvent.rows[0].status, "archived");
  assert.ok(archivedEvent.rows[0].archived_at);

  await asAuthenticated(ids.admin, () =>
    db.query(
      `
        select public.update_event_registration_settings(
          $1, 1, 1, null, null
        )
      `,
      [ids.event],
    ),
  );
  const familyOptions = await asAuthenticated(ids.parent, () =>
    db.query(
      "select * from public.list_my_event_registration_options($1)",
      [ids.event],
    ),
  );
  assert.equal(familyOptions.rows[0].student_id, ids.student);
  const registration = await asAuthenticated(ids.parent, () =>
    db.query(
      "select public.register_my_student_for_event($1, $2) as status",
      [ids.event, ids.student],
    ),
  );
  assert.equal(registration.rows[0].status, "registered");
  const registrationId = (
    await db.query(
      `
        select id from public.event_registrations
        where event_id = $1 and student_id = $2
      `,
      [ids.event, ids.student],
    )
  ).rows[0].id;
  await asAuthenticated(ids.parent, () =>
    db.query("select public.cancel_my_event_registration($1)", [
      registrationId,
    ]),
  );
  const reminderId = (
    await asAuthenticated(ids.admin, () =>
      db.query(
        `
          select public.create_event_reminder(
            $1, 'Synthetic reminder', '2099-09-01 12:00', null
          ) as id
        `,
        [ids.event],
      ),
    )
  ).rows[0].id;
  await asAuthenticated(ids.admin, () =>
    db.query(
      "select public.set_event_reminder_status($1, 'completed')",
      [reminderId],
    ),
  );
  const checklistId = (
    await asAuthenticated(ids.admin, () =>
      db.query(
        `
          select public.create_event_checklist_item(
            $1, 'Synthetic checklist item', null, null
          ) as id
        `,
        [ids.event],
      ),
    )
  ).rows[0].id;
  await asAuthenticated(ids.admin, () =>
    db.query(
      "select public.set_event_checklist_item_completed($1, true)",
      [checklistId],
    ),
  );
  const eventAssignments = await asAuthenticated(ids.admin, () =>
    db.query(
      "select * from public.list_event_volunteer_assignments($1)",
      [ids.event],
    ),
  );
  assert.equal(eventAssignments.rows[0].assignment_id, ids.assignment);

  await expectDatabaseError(
    () =>
      asAuthenticated(ids.assignedVolunteer, () =>
        db.query(
          "select public.resolve_family_checkin_token($1, $2)",
          [ids.event, familyToken.rows[0].token],
        ),
      ),
    "Family QR token is single-use",
  );
  await expectDatabaseError(
    () =>
      asAuthenticated(ids.otherVolunteer, () =>
        db.query(
          `
            select public.check_in_visitor(
              $1, 'Denied', 'Visitor', null, 'Guardian', '555-0101'
            )
          `,
          [ids.event],
        ),
      ),
    "Unassigned volunteer cannot check in a visitor",
  );

  console.log("Attendance and event management verification passed.");
} finally {
  await db.close();
}
