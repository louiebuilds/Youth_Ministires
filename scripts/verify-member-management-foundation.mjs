import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { PGlite } from "@electric-sql/pglite";

const migrationPaths = [
  "supabase/migrations/202607230001_core_database_foundation.sql",
  "supabase/migrations/202607230002_security_authorization.sql",
  "supabase/migrations/202607240001_milestone3_user_management.sql",
  "supabase/migrations/202607240002_member_management_foundation.sql",
  "supabase/migrations/202609070001_parent_account_person_linking.sql",
];

const ids = {
  admin: "20000000-0000-4000-8000-000000000001",
  parent: "20000000-0000-4000-8000-000000000002",
  unrelatedParent: "20000000-0000-4000-8000-000000000003",
  parentPerson: "20000000-0000-4000-8000-000000000004",
  unrelatedPerson: "20000000-0000-4000-8000-000000000005",
  studentPerson: "20000000-0000-4000-8000-000000000006",
  household: "20000000-0000-4000-8000-000000000007",
  unrelatedHousehold: "20000000-0000-4000-8000-000000000008",
  student: "20000000-0000-4000-8000-000000000009",
  tag: "20000000-0000-4000-8000-000000000010",
  pastor: "20000000-0000-4000-8000-000000000011",
  staff: "20000000-0000-4000-8000-000000000012",
  volunteer: "20000000-0000-4000-8000-000000000013",
  inactiveAdmin: "20000000-0000-4000-8000-000000000014",
  linkParent: "20000000-0000-4000-8000-000000000015",
  inactiveParent: "20000000-0000-4000-8000-000000000016",
  nonParent: "20000000-0000-4000-8000-000000000017",
  linkPerson: "20000000-0000-4000-8000-000000000018",
  oldLinkPerson: "20000000-0000-4000-8000-000000000019",
  nonAdultPerson: "20000000-0000-4000-8000-000000000020",
  linkHousehold: "20000000-0000-4000-8000-000000000021",
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
      email_confirmed_at timestamp with time zone,
      deleted_at timestamp with time zone,
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
        ($3, 'unrelated@example.test', '{"display_name":"Other Parent"}')
    `,
    [ids.admin, ids.parent, ids.unrelatedParent],
  );

  await db.query(
    `
      insert into public.people (
        id, first_name, preferred_name, last_name, email
      )
      values
        ($1, 'Pat', null, 'Parent', 'parent.person@example.test'),
        ($2, 'Other', null, 'Adult', 'other.adult@example.test'),
        ($3, 'Alexandra', 'Alex', 'Student', null)
    `,
    [ids.parentPerson, ids.unrelatedPerson, ids.studentPerson],
  );

  await db.query(
    `
      update public.profiles
      set
        primary_role = case
          when id = $1 then 'platform_administrator'::public.account_role
          else 'parent'::public.account_role
        end,
        person_id = case
          when id = $2 then $4::uuid
          when id = $3 then $5::uuid
          else null
        end
      where id in ($1, $2, $3)
    `,
    [
      ids.admin,
      ids.parent,
      ids.unrelatedParent,
      ids.parentPerson,
      ids.unrelatedPerson,
    ],
  );

  await db.query(
    `
      insert into public.households (id, name, status, city, region)
      values
        ($1, 'Sample Family', 'active', 'Testville', 'TX'),
        ($2, 'Other Family', 'active', 'Elsewhere', 'TX')
    `,
    [ids.household, ids.unrelatedHousehold],
  );
  await db.query(
    `
      insert into public.household_memberships (
        household_id,
        person_id,
        relationship_label,
        is_responsible_adult,
        is_primary_contact
      )
      values ($1, $2, 'Parent', true, true)
    `,
    [ids.household, ids.parentPerson],
  );
  await db.query(
    `
      insert into public.students (
        id,
        person_id,
        primary_household_id,
        birth_date,
        grade,
        status,
        medical_summary,
        allergy_summary,
        dietary_summary
      )
      values (
        $1,
        $2,
        $3,
        '2012-06-15',
        '7',
        'active',
        'Synthetic care plan',
        'Synthetic pollen allergy',
        'Synthetic dietary note'
      )
    `,
    [ids.student, ids.studentPerson, ids.household],
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
      values ($1, $2, 'Parent', true, true)
    `,
    [ids.student, ids.parentPerson],
  );
  await db.query(
    `
      insert into public.member_tags (id, name, color)
      values ($1, 'New student', '#0284C7')
    `,
    [ids.tag],
  );
  await db.query(
    `
      insert into public.member_tag_assignments (person_id, tag_id)
      values ($1, $2)
    `,
    [ids.studentPerson, ids.tag],
  );

  const directory = await asAuthenticated(ids.admin, () =>
    db.query(
      "select * from public.list_member_directory($1, $2, $3, $4)",
      ["Alex", "active", "7", ids.tag],
    ),
  );
  assert.equal(directory.rows.length, 1);
  assert.equal(directory.rows[0].display_name, "Alex S.");
  assert.deepEqual(directory.rows[0].tags, [
    {
      id: ids.tag,
      name: "New student",
      color: "#0284C7",
    },
  ]);

  const parentChildren = await asAuthenticated(ids.parent, () =>
    db.query(
      "select * from public.list_member_directory(null, null, null, null)",
    ),
  );
  assert.deepEqual(
    parentChildren.rows.map(({ display_name, tags }) => ({
      display_name,
      tags,
    })),
    [{ display_name: "Alex S.", tags: [] }],
    "parents receive only related children and no internal ministry tags",
  );

  const unrelatedChildren = await asAuthenticated(
    ids.unrelatedParent,
    () =>
      db.query(
        "select * from public.list_member_directory(null, null, null, null)",
      ),
  );
  assert.equal(
    unrelatedChildren.rows.length,
    0,
    "unrelated parents cannot browse the child directory",
  );

  const parentFamilies = await asAuthenticated(ids.parent, () =>
    db.query("select * from public.list_accessible_families(null)"),
  );

  const adultNameSearch = await asAuthenticated(ids.admin, () =>
    db.query("select * from public.list_accessible_families($1)", ["Pat"]),
  );
  assert.equal(adultNameSearch.rows.length, 1);
  const childNameSearch = await asAuthenticated(ids.admin, () =>
    db.query("select * from public.list_accessible_families($1)", ["Alex"]),
  );
  assert.equal(childNameSearch.rows.length, 1);
  const addressSearch = await asAuthenticated(ids.admin, () =>
    db.query("select * from public.list_accessible_families($1)", ["Testville"]),
  );
  assert.equal(addressSearch.rows.length, 1);
  assert.deepEqual(
    parentFamilies.rows.map(({ household_name }) => household_name),
    ["Sample Family"],
    "parents receive only related families",
  );

  const familyWorkspace = await asAuthenticated(ids.parent, () =>
    db.query("select public.get_family_workspace($1) as workspace", [
      ids.household,
    ]),
  );
  assert.equal(
    familyWorkspace.rows[0].workspace.name,
    "Sample Family",
    "a related parent can open the family workspace",
  );
  assert.equal(
    familyWorkspace.rows[0].workspace.adults[0].email,
    "parent.person@example.test",
    "authorized family detail includes contact information",
  );
  assert.equal(
    familyWorkspace.rows[0].workspace.children[0].displayName,
    "Alex S.",
    "family child names remain PII-minimized",
  );

  const parentChild = await asAuthenticated(ids.parent, () =>
    db.query("select public.get_child_workspace($1) as workspace", [
      ids.student,
    ]),
  );
  assert.equal(parentChild.rows[0].workspace.displayName, "Alex S.");
  assert.equal(parentChild.rows[0].workspace.canManage, false);
  assert.equal(parentChild.rows[0].workspace.canViewMedical, true);
  assert.equal(
    parentChild.rows[0].workspace.medicalSummary,
    "Synthetic care plan",
  );
  assert.deepEqual(parentChild.rows[0].workspace.relationships, []);
  assert.deepEqual(parentChild.rows[0].workspace.tags, []);

  const adminChild = await asAuthenticated(ids.admin, () =>
    db.query("select public.get_child_workspace($1) as workspace", [
      ids.student,
    ]),
  );
  assert.equal(adminChild.rows[0].workspace.canManage, true);
  assert.equal(adminChild.rows[0].workspace.firstName, "Alexandra");
  assert.equal(adminChild.rows[0].workspace.relationships.length, 1);
  assert.equal(adminChild.rows[0].workspace.tags.length, 1);

  await expectDatabaseError(
    () =>
      asAuthenticated(ids.unrelatedParent, () =>
        db.query("select public.get_child_workspace($1)", [ids.student]),
      ),
    "an unrelated parent cannot open a known child identifier",
  );

  await asAuthenticated(ids.admin, () =>
    db.query(
      `
        select public.update_child_details(
          $1,
          'Alexandra',
          'Lex',
          'Student',
          '2012-06-15',
          '8',
          'active',
          'Updated synthetic care plan',
          'Updated synthetic allergy',
          'Updated synthetic dietary note'
        )
      `,
      [ids.student],
    ),
  );

  const addedAdult = await asAuthenticated(ids.admin, () =>
    db.query(
      `
        select public.add_family_adult(
          $1,
          'Morgan',
          null,
          'Contact',
          'morgan@example.test',
          null,
          'Grandparent',
          true,
          false,
          true,
          false,
          true
        ) as id
      `,
      [ids.household],
    ),
  );
  assert.equal(typeof addedAdult.rows[0].id, "string");

  await expectDatabaseError(
    () =>
      asAuthenticated(ids.parent, () =>
        db.query(
          `
            select public.add_family_adult(
              $1, 'Denied', null, 'Contact', null, '555-0101',
              'Other', false, false, false, false, false
            )
          `,
          [ids.household],
        ),
      ),
    "family accounts cannot add adult contacts",
  );
  await asAuthenticated(ids.admin, () =>
    db.query(
      `
        select public.update_child_relationship(
          $1, $2, 'Guardian', true, true, true, true, true, true, true
        )
      `,
      [ids.student, ids.parentPerson],
    ),
  );

  const updatedChild = await db.query(
    `
      select grade, medical_summary
      from public.students
      where id = $1
    `,
    [ids.student],
  );
  assert.deepEqual(updatedChild.rows[0], {
    grade: "8",
    medical_summary: "Updated synthetic care plan",
  });

  await expectDatabaseError(
    () =>
      asAuthenticated(ids.parent, () =>
        db.query(
          `
            select public.update_child_relationship(
              $1, $2, 'Denied', true, true, true, true, true, true, true
            )
          `,
          [ids.student, ids.parentPerson],
        ),
      ),
    "family accounts cannot edit child relationships",
  );

  const createdFamily = await asAuthenticated(ids.admin, () =>
    db.query(
      `
        select public.create_family(
          'Created Family',
          'active',
          '200 Synthetic Road',
          null,
          'Testville',
          'TX',
          '75002',
          'US',
          'Casey',
          null,
          'Caregiver',
          'casey@example.test',
          null,
          'Guardian',
          true,
          true,
          true
        ) as id
      `,
    ),
  );
  const createdHouseholdId = createdFamily.rows[0].id;
  const createdAdult = await db.query(
    `
      select household_memberships.person_id
      from public.household_memberships
      where household_id = $1
    `,
    [createdHouseholdId],
  );
  const createdChild = await asAuthenticated(ids.admin, () =>
    db.query(
      `
        select public.create_child(
          $1,
          $2,
          'Taylor',
          null,
          'Youth',
          '2013-04-01',
          '6',
          'active',
          null,
          null,
          null
        ) as id
      `,
      [createdHouseholdId, createdAdult.rows[0].person_id],
    ),
  );
  assert.equal(
    typeof createdChild.rows[0].id,
    "string",
    "authorized staff can create a child with an explicit guardian",
  );

  const createdTag = await asAuthenticated(ids.admin, () =>
    db.query(
      "select public.create_member_tag('Needs follow-up', '#7C3AED') as id",
    ),
  );
  await asAuthenticated(ids.admin, () =>
    db.query("select public.set_child_tags($1, $2::uuid[])", [
      ids.student,
      [createdTag.rows[0].id],
    ]),
  );
  const assignedTags = await db.query(
    `
      select member_tags.name
      from public.member_tag_assignments
      join public.member_tags
        on member_tags.id = member_tag_assignments.tag_id
      where member_tag_assignments.person_id = $1
    `,
    [ids.studentPerson],
  );
  assert.deepEqual(
    assignedTags.rows.map(({ name }) => name),
    ["Needs follow-up"],
  );

  await expectDatabaseError(
    () =>
      asAuthenticated(ids.parent, () =>
        db.query(
          "select public.create_member_tag('Denied tag', '#000000')",
        ),
      ),
    "family accounts cannot create internal ministry tags",
  );

  await expectDatabaseError(
    () =>
      asAuthenticated(ids.unrelatedParent, () =>
        db.query("select public.get_family_workspace($1)", [ids.household]),
      ),
    "an unrelated parent cannot open a known family identifier",
  );

  await asAuthenticated(ids.admin, () =>
    db.query(
      `
        select public.update_family_details(
          $1,
          'Sample Family Updated',
          'active',
          '100 Test Way',
          null,
          'Testville',
          'TX',
          '75001',
          'US'
        )
      `,
      [ids.household],
    ),
  );
  await asAuthenticated(ids.admin, () =>
    db.query(
      `
        select public.update_family_adult(
          $1,
          $2,
          'Pat',
          'P',
          'Parent',
          'updated.parent@example.test',
          '555-0100',
          'Guardian',
          true,
          true,
          true,
          true,
          true
        )
      `,
      [ids.household, ids.parentPerson],
    ),
  );

  const updatedFamily = await db.query(
    `
      select name, address_line_1
      from public.households
      where id = $1
    `,
    [ids.household],
  );
  assert.deepEqual(updatedFamily.rows[0], {
    name: "Sample Family Updated",
    address_line_1: "100 Test Way",
  });

  const updatedContact = await db.query(
    `
      select people.preferred_name, people.email, household_memberships.receive_sms
      from public.people
      join public.household_memberships
        on household_memberships.person_id = people.id
      where people.id = $1
    `,
    [ids.parentPerson],
  );
  assert.deepEqual(updatedContact.rows[0], {
    preferred_name: "P",
    email: "updated.parent@example.test",
    receive_sms: true,
  });

  await expectDatabaseError(
    () =>
      asAuthenticated(ids.parent, () =>
        db.query(
          `
            select public.update_family_details(
              $1, 'Denied', 'active', null, null, null, null, null, 'US'
            )
          `,
          [ids.household],
        ),
      ),
    "family accounts cannot edit family records",
  );

  await expectDatabaseError(
    () =>
      asAuthenticated(ids.admin, () =>
        db.query(
          "update public.households set name = 'Bypass' where id = $1",
          [ids.household],
        ),
      ),
    "direct authenticated family mutations are revoked",
  );

  const familyAudit = await db.query(
    `
      select action
      from public.audit_events
      where entity_id in ($1, $2)
      order by action
    `,
    [ids.household, ids.parentPerson],
  );
  assert.deepEqual(
    familyAudit.rows.map(({ action }) => action),
    ["family.contact_updated", "family.updated"],
    "family and contact updates append audit events",
  );

  const unrelatedFamilies = await asAuthenticated(ids.unrelatedParent, () =>
    db.query("select * from public.list_accessible_families(null)"),
  );
  assert.equal(
    unrelatedFamilies.rows.length,
    0,
    "unrelated parents cannot discover families",
  );

  await expectDatabaseError(
    () =>
      asAuthenticated(ids.parent, () =>
        db.query(
          `
            insert into public.member_tags (name, color)
            values ('Unauthorized', '#000000')
          `,
        ),
      ),
    "parents cannot create ministry tags",
  );

  await db.query(
    `insert into auth.users (id,email,email_confirmed_at,raw_user_meta_data) values
      ($1,'pastor@example.test',now(),'{}'),($2,'staff@example.test',now(),'{}'),
      ($3,'volunteer@example.test',now(),'{}'),($4,'inactive-admin@example.test',now(),'{}'),
      ($5,'link-parent@example.test',now(),'{}'),($6,'inactive-parent@example.test',now(),'{}'),
      ($7,'non-parent@example.test',now(),'{}')`,
    [ids.pastor, ids.staff, ids.volunteer, ids.inactiveAdmin, ids.linkParent, ids.inactiveParent, ids.nonParent],
  );
  await db.query(
    `update public.profiles set
      primary_role=case
        when id=$1 then 'youth_pastor'::public.account_role
        when id=$2 then 'staff_member'::public.account_role
        when id=$3 then 'volunteer'::public.account_role
        when id=$4 then 'platform_administrator'::public.account_role
        when id=$7 then 'staff_member'::public.account_role
        else 'parent'::public.account_role end,
      status=case when id in($4,$6) then 'suspended'::public.account_status else 'active'::public.account_status end
     where id in($1,$2,$3,$4,$5,$6,$7)`,
    [ids.pastor, ids.staff, ids.volunteer, ids.inactiveAdmin, ids.linkParent, ids.inactiveParent, ids.nonParent],
  );
  await db.query(
    "insert into public.households(id,name,status) values($1,'Link Family','active')",
    [ids.linkHousehold],
  );
  await db.query(
    `insert into public.people(id,first_name,last_name,email) values
       ($1,'Link','Adult','link-parent@example.test'),
       ($2,'Earlier','Identity','link-parent@example.test'),
       ($3,'Not','Responsible','other@example.test')`,
    [ids.linkPerson, ids.oldLinkPerson, ids.nonAdultPerson],
  );
  await db.query(
    `insert into public.household_memberships(household_id,person_id,relationship_label,is_responsible_adult)
       values($1,$2,'Parent',true),($1,$3,'Guardian',true),($1,$4,'Contact',false)`,
    [ids.linkHousehold, ids.linkPerson, ids.oldLinkPerson, ids.nonAdultPerson],
  );

  const beforeLinkFamilies = await asAuthenticated(ids.linkParent, () =>
    db.query("select * from public.list_accessible_families(null)"),
  );
  assert.equal(beforeLinkFamilies.rows.length, 0, "unlinked Parent cannot access a family");

  const candidates = await asAuthenticated(ids.admin, () =>
    db.query("select * from public.list_parent_account_link_candidates($1)", [ids.linkPerson]),
  );
  const linkCandidate = candidates.rows.find(({ profile_id }) => profile_id === ids.linkParent);
  assert.equal(linkCandidate.email_matches, true, "email match is exposed only as advisory context");
  assert.equal(Number(linkCandidate.matching_active_people_count), 2, "same-email ambiguity is disclosed");
  assert.equal((await db.query("select person_id from public.profiles where id=$1", [ids.linkParent])).rows[0].person_id, null,
    "candidate discovery never auto-links an ambiguous email");
  await asAuthenticated(ids.pastor, () =>
    db.query("select * from public.list_parent_account_link_candidates($1)", [ids.linkPerson]),
  );
  for (const actor of [ids.staff, ids.parent, ids.volunteer, ids.inactiveAdmin]) {
    await expectDatabaseError(
      () => asAuthenticated(actor, () => db.query("select * from public.list_parent_account_link_candidates($1)", [ids.linkPerson])),
      "unauthorized or inactive actor cannot list account-link candidates",
    );
  }

  for (const actor of [ids.staff, ids.parent, ids.volunteer, ids.inactiveAdmin]) {
    await expectDatabaseError(
      () => asAuthenticated(actor, () => db.query(
        "select public.link_parent_account_to_person($1,$2,false,'Verified identity')",
        [ids.linkParent, ids.linkPerson],
      )),
      "unauthorized or inactive actor cannot link a Parent account",
    );
  }
  await expectDatabaseError(
    () => asAuthenticated(ids.admin, () => db.query(
      "select public.link_parent_account_to_person($1,$2,false,'Verified identity')",
      [ids.inactiveParent, ids.linkPerson],
    )),
    "inactive target Parent is denied",
  );
  await expectDatabaseError(
    () => asAuthenticated(ids.admin, () => db.query(
      "select public.link_parent_account_to_person($1,$2,false,'Verified identity')",
      [ids.nonParent, ids.linkPerson],
    )),
    "non-Parent target is denied",
  );
  for (const personId of ["20000000-0000-4000-8000-000000000099", ids.nonAdultPerson]) {
    await expectDatabaseError(
      () => asAuthenticated(ids.admin, () => db.query(
        "select public.link_parent_account_to_person($1,$2,false,'Verified identity')",
        [ids.linkParent, personId],
      )),
      "invalid or non-responsible Person is denied",
    );
  }

  const peopleBefore = Number((await db.query("select count(*) from public.people")).rows[0].count);
  const membershipsBefore = Number((await db.query("select count(*) from public.household_memberships")).rows[0].count);
  await asAuthenticated(ids.admin, () => db.query(
    "select public.link_parent_account_to_person($1,$2,false,'Identity verified with parent')",
    [ids.linkParent, ids.linkPerson],
  ));
  assert.equal((await db.query("select person_id from public.profiles where id=$1", [ids.linkParent])).rows[0].person_id, ids.linkPerson,
    "Administrator links an unlinked Parent account");
  assert.equal(Number((await asAuthenticated(ids.linkParent, () => db.query("select count(*) from public.list_accessible_families(null)"))).rows[0].count), 1,
    "Parent gains family access only after the correct link");

  await expectDatabaseError(
    () => asAuthenticated(ids.pastor, () => db.query(
      "select public.link_parent_account_to_person($1,$2,false,'Move to corrected Person')",
      [ids.linkParent, ids.oldLinkPerson],
    )),
    "relink requires explicit confirmation",
  );
  await expectDatabaseError(
    () => asAuthenticated(ids.pastor, () => db.query(
      "select public.link_parent_account_to_person($1,$2,true,'')",
      [ids.linkParent, ids.oldLinkPerson],
    )),
    "relink requires a reason",
  );
  await asAuthenticated(ids.pastor, () => db.query(
    "select public.link_parent_account_to_person($1,$2,true,'Corrected identity after manager review')",
    [ids.linkParent, ids.oldLinkPerson],
  ));
  assert.equal((await db.query("select person_id from public.profiles where id=$1", [ids.linkParent])).rows[0].person_id, ids.oldLinkPerson,
    "Youth Pastor can explicitly relink a Parent account");
  assert.equal(Number((await db.query("select count(*) from public.people")).rows[0].count), peopleBefore,
    "linking does not create People");
  assert.equal(Number((await db.query("select count(*) from public.household_memberships")).rows[0].count), membershipsBefore,
    "linking does not create memberships");

  const linkAudit = await db.query(
    `select action,metadata from public.audit_events
     where entity_id=$1 and action in('account.person_linked','account.person_relinked') order by id`,
    [ids.linkParent],
  );
  assert.deepEqual(linkAudit.rows.map(({ action }) => action), ["account.person_linked", "account.person_relinked"],
    "link and relink append audit evidence");
  assert.equal(JSON.stringify(linkAudit.rows).includes("link-parent@example.test"), false,
    "audit metadata excludes account email and contact details");

  const familiesPageSource = await readFile("app/(platform)/families/page.tsx", "utf8");
  const familyListSource = await readFile("features/members/components/family-directory-list.tsx", "utf8");
  const linkUiSource = await readFile("features/members/components/parent-account-link-form.tsx", "utf8");
  assert.match(familiesPageSource, /result\.families\.length > 0/u,
    "Parent check-in entry is withheld when no related family exists");
  assert.match(familyListSource, /Ask a ministry administrator or Youth Pastor/u,
    "unlinked Parent receives safe operational guidance without self-linking");
  assert.match(linkUiSource, /Email alone is not identity proof/u,
    "manager UI requires explicit identity verification rather than email auto-linking");

  console.log("Milestone 6 foundation migration execution: passed");
  console.log("PII-minimized role- and relationship-scoped directory: passed");
  console.log("Relationship-scoped family listing: passed");
  console.log("Expanded family search across people and address fields: passed");
  console.log("Authorized family workspace and identifier denial: passed");
  console.log("Audited family and contact updates with bypass denial: passed");
  console.log("Audited additional family contact creation: passed");
  console.log("Medical boundary and audited child permissions: passed");
  console.log("Audited family, child, and tag creation: passed");
  console.log("Tag authorization denial: passed");
  console.log("Manager-controlled Parent account linking and relinking: passed");
  console.log("Account-link ambiguity, authorization, audit, and no-duplication controls: passed");
} finally {
  await db.close();
}
