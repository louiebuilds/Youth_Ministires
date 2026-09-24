import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { PGlite } from "@electric-sql/pglite";

const migrations = [
  "supabase/migrations/202607230001_core_database_foundation.sql",
  "supabase/migrations/202607230002_security_authorization.sql",
  "supabase/migrations/202607240003_volunteer_management_foundation.sql",
  "supabase/migrations/202607270002_event_management_foundation.sql",
  "supabase/migrations/202607300001_event_registration_foundation.sql",
  "supabase/migrations/202608090001_scheduling_foundation.sql",
  "supabase/migrations/202608090002_scheduling_workflows.sql",
  "supabase/migrations/202609240001_platform_calendar.sql",
];

const ids = {
  admin: "94000000-0000-4000-8000-000000000001",
  volunteer: "94000000-0000-4000-8000-000000000002",
  otherVolunteer: "94000000-0000-4000-8000-000000000003",
  parent: "94000000-0000-4000-8000-000000000004",
  parentPerson: "94000000-0000-4000-8000-000000000005",
  studentPerson: "94000000-0000-4000-8000-000000000006",
  student: "94000000-0000-4000-8000-000000000007",
  household: "94000000-0000-4000-8000-000000000008",
  publishedEvent: "94000000-0000-4000-8000-000000000009",
  draftEvent: "94000000-0000-4000-8000-000000000010",
};

const db = new PGlite();

async function asUser(id, fn) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${id}',false);`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
  }
}

async function denied(fn, message) {
  let failed = false;
  try {
    await fn();
  } catch {
    failed = true;
  }
  assert.equal(failed, true, message);
}

try {
  await db.exec(`
    create schema auth;
    create schema extensions;
    create role anon nologin;
    create role authenticated nologin;
    create table auth.users(
      id uuid primary key,
      email text,
      raw_user_meta_data jsonb not null default '{}'
    );
    create or replace function auth.uid()
    returns uuid language sql stable set search_path=''
    as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  `);

  for (const path of migrations) {
    let sql = await readFile(path, "utf8");
    sql = sql
      .replace("create extension if not exists pgcrypto with schema extensions;", "")
      .replaceAll("extensions.gen_random_uuid()", "gen_random_uuid()");
    await db.exec(sql);
  }

  const [page, service, navigation, migration] = await Promise.all([
    readFile("app/(platform)/calendar/page.tsx", "utf8"),
    readFile("features/calendar/services/platform-calendar-service.ts", "utf8"),
    readFile("config/navigation-config.ts", "utf8"),
    readFile("supabase/migrations/202609240001_platform_calendar.sql", "utf8"),
  ]);

  assert.match(page, /Month/);
  assert.match(page, /Week/);
  assert.match(page, /Agenda/);
  assert.match(page, /href=\{item\.href\}/u, "Calendar items must deep-link to their authoritative source.");
  assert.match(page, /overflow-x-auto/u, "Month view must remain usable at narrow widths.");
  assert.match(service, /list_platform_calendar/u);
  assert.match(service, /return \{ success: false \}/u);
  assert.doesNotMatch(service, /error\.message|error\.details|error\.hint/u);
  assert.match(navigation, /href: "\/calendar"/u);
  assert.match(migration, /security definer/u);
  assert.match(migration, /set search_path = '' set row_security = off/u);
  assert.match(migration, /revoke all on function public\.list_platform_calendar\(date, date\)/u);

  await db.query(
    `insert into auth.users(id,email,raw_user_meta_data) values
      ($1,'admin@example.test','{"display_name":"Synthetic Admin"}'),
      ($2,'volunteer@example.test','{"display_name":"Synthetic Volunteer"}'),
      ($3,'other@example.test','{"display_name":"Synthetic Other"}'),
      ($4,'parent@example.test','{"display_name":"Synthetic Parent"}')`,
    [ids.admin, ids.volunteer, ids.otherVolunteer, ids.parent],
  );
  await db.query(
    `update public.profiles set primary_role = case
      when id=$1 then 'platform_administrator'::public.account_role
      when id in ($2,$3) then 'volunteer'::public.account_role
      else 'parent'::public.account_role end`,
    [ids.admin, ids.volunteer, ids.otherVolunteer],
  );
  await db.query(
    `insert into public.people(id,first_name,last_name,status) values
      ($1,'Pat','Parent','active'),($2,'Sam','Student','active')`,
    [ids.parentPerson, ids.studentPerson],
  );
  await db.query(`update public.profiles set person_id=$1 where id=$2`, [ids.parentPerson, ids.parent]);
  await db.query(
    `insert into public.volunteer_profiles(profile_id,is_active)
     values($1,true),($2,true)`,
    [ids.volunteer, ids.otherVolunteer],
  );
  await db.query(
    `insert into public.households(id,name,status) values($1,'Synthetic Household','active')`,
    [ids.household],
  );
  await db.query(
    `insert into public.students(id,person_id,primary_household_id,birth_date,grade,status)
     values($1,$2,$3,'2013-01-01','7','active')`,
    [ids.student, ids.studentPerson, ids.household],
  );
  await db.query(
    `insert into public.student_relationships(student_id,person_id,relationship_type,is_legal_guardian,may_view_student_information)
     values($1,$2,'parent',true,true)`,
    [ids.student, ids.parentPerson],
  );
  await db.query(
    `insert into public.events(id,name,event_type,status,starts_at,ends_at,timezone)
     values
      ($1,'Published Retreat','Retreat','published','2026-10-10 14:00+00','2026-10-10 18:00+00','America/Chicago'),
      ($2,'Draft Planning Night','Planning','draft','2026-10-11 14:00+00','2026-10-11 16:00+00','America/Chicago')`,
    [ids.publishedEvent, ids.draftEvent],
  );
  await db.query(
    `insert into public.event_registrations(event_id,household_id,student_id,status,created_by_profile_id)
     values($1,$2,$3,'registered',$4)`,
    [ids.publishedEvent, ids.household, ids.student, ids.parent],
  );

  const schedule = await asUser(ids.admin, () => db.query(
    `select public.create_ministry_schedule(
      'Retreat Volunteers','Youth',$1,'2026-10-10 13:00+00','2026-10-10 19:00+00',
      'America/Chicago',null
    ) id`,
    [ids.publishedEvent],
  ));
  const scheduleId = schedule.rows[0].id;
  const position = await asUser(ids.admin, () => db.query(
    `select public.add_schedule_position($1,null,'Check-in leader',1,null,null) id`,
    [scheduleId],
  ));
  await asUser(ids.admin, () => db.query(
    `select public.assign_schedule_position($1,$2,'2026-10-10 13:00+00','2026-10-10 15:00+00',true,'Synthetic calendar coverage')`,
    [position.rows[0].id, ids.volunteer],
  ));
  await asUser(ids.admin, () => db.query(
    `select public.set_ministry_schedule_status($1,'published',false)`,
    [scheduleId],
  ));

  const manager = await asUser(ids.admin, () => db.query(
    `select * from public.list_platform_calendar('2026-10-01','2026-10-31')`,
  ));
  assert.equal(manager.rows.filter((item) => item.item_type === "event").length, 2, "Managers see authorized published and draft Events.");
  assert.equal(manager.rows.filter((item) => item.item_type === "schedule").length, 1, "Managers see ministry Schedules.");

  const volunteer = await asUser(ids.volunteer, () => db.query(
    `select * from public.list_platform_calendar('2026-10-01','2026-10-31')`,
  ));
  assert.ok(volunteer.rows.some((item) => item.item_id === ids.publishedEvent));
  assert.ok(volunteer.rows.some((item) => item.item_id === scheduleId && item.is_personal));
  assert.equal(volunteer.rows.some((item) => item.item_id === ids.draftEvent), false);

  const otherVolunteer = await asUser(ids.otherVolunteer, () => db.query(
    `select * from public.list_platform_calendar('2026-10-01','2026-10-31')`,
  ));
  assert.ok(otherVolunteer.rows.some((item) => item.item_id === ids.publishedEvent));
  assert.equal(otherVolunteer.rows.some((item) => item.item_type === "schedule"), false, "Volunteer schedules remain self-scoped.");

  const parent = await asUser(ids.parent, () => db.query(
    `select * from public.list_platform_calendar('2026-10-01','2026-10-31')`,
  ));
  const registeredEvent = parent.rows.find((item) => item.item_id === ids.publishedEvent);
  assert.ok(registeredEvent?.is_personal);
  assert.match(registeredEvent.context, /Sam Student • Registered/u);
  assert.equal(parent.rows.some((item) => item.item_type === "schedule"), false);
  assert.equal(parent.rows.some((item) => item.item_id === ids.draftEvent), false);

  await denied(
    () => asUser(ids.parent, () => db.query(`select * from public.list_platform_calendar('2026-11-01','2026-10-01')`)),
    "Invalid Calendar ranges must fail closed.",
  );
  await denied(
    async () => {
      await db.exec("set role anon");
      try {
        await db.query(`select * from public.list_platform_calendar('2026-10-01','2026-10-31')`);
      } finally {
        await db.exec("reset role");
      }
    },
    "Anonymous Calendar access must be denied.",
  );

  console.log("Platform Calendar projection, role boundaries, family context, and UI contract: passed");
} finally {
  await db.close();
}
