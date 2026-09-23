import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { createHash } from "node:crypto";
import { sanitizePdfDownloadFilename, validatePdfMasterBytes } from "../features/forms/services/pdf-master-validation.mjs";
import { inspectCompletedDocument, sanitizeCompletedDocumentFilename } from "../features/forms/services/completed-document-validation.mjs";
import { describeReadinessRequirement, getParticipationOverrideState } from "../features/events/components/event-registration-readiness.mjs";

const migrations = [
  "202607230001_core_database_foundation.sql",
  "202607230002_security_authorization.sql",
  "202607240001_milestone3_user_management.sql",
  "202607240002_member_management_foundation.sql",
  "202607260004_checkin_foundation.sql",
  "202607260005_checkin_workflows.sql",
  "202607270002_event_management_foundation.sql",
  "202607300001_event_registration_foundation.sql",
  "202607300002_event_registration_settings.sql",
  "202607300003_family_event_registration_options.sql",
  "202607300004_family_event_registration.sql",
  "202607300005_family_event_registration_cancellation.sql",
  "202607300006_event_registration_management.sql",
  "202608120001_milestone15_authorization_foundation.sql",
  "202608120002_document_domain_foundation.sql",
  "202608120003_custom_forms_foundation.sql",
  "202608120004_visitor_cards_foundation.sql",
  "202608120005_form_template_master_storage.sql",
  "202608120006_document_template_workflows.sql",
  "202608120007_student_document_storage.sql",
  "202608120008_completed_document_workflows.sql",
  "202608120009_document_readiness_participation.sql",
  "202608160001_custom_forms_workflows.sql",
  "202608220001_visitor_card_operational_workflows.sql",
  "202608230001_medical_permission_readiness_correction.sql",
  "202608230002_admin_event_registration_management.sql",
  "202608230003_custom_form_assignment_active_uniqueness.sql",
  "202608230004_custom_form_submission_respondent_uniqueness.sql",
].map((name) => `supabase/migrations/${name}`);

const ids = {
  admin: "c0000000-0000-4000-8000-000000000001",
  pastor: "c0000000-0000-4000-8000-000000000002",
  staff: "c0000000-0000-4000-8000-000000000003",
  volunteer: "c0000000-0000-4000-8000-000000000004",
  parent: "c0000000-0000-4000-8000-000000000005",
  person: "c0000000-0000-4000-8000-000000000006",
  household: "c0000000-0000-4000-8000-000000000007",
  student: "c0000000-0000-4000-8000-000000000008",
  event: "c0000000-0000-4000-8000-000000000009",
  registration: "c0000000-0000-4000-8000-000000000010",
  template: "c0000000-0000-4000-8000-000000000011",
  version: "c0000000-0000-4000-8000-000000000012",
  otherTemplate: "c0000000-0000-4000-8000-000000000013",
  otherVersion: "c0000000-0000-4000-8000-000000000014",
  submission: "c0000000-0000-4000-8000-000000000015",
  replacement: "c0000000-0000-4000-8000-000000000016",
  otherHousehold: "c0000000-0000-4000-8000-000000000017",
  otherEvent: "c0000000-0000-4000-8000-000000000018",
  requirement: "c0000000-0000-4000-8000-000000000019",
  otherRequirement: "c0000000-0000-4000-8000-000000000020",
  otherPerson: "c0000000-0000-4000-8000-000000000021",
  otherStudent: "c0000000-0000-4000-8000-000000000022",
  parentPerson: "c0000000-0000-4000-8000-000000000023",
  guardian: "c0000000-0000-4000-8000-000000000024",
  guardianPerson: "c0000000-0000-4000-8000-000000000025",
  unrelatedParent: "c0000000-0000-4000-8000-000000000026",
};

const db = new PGlite();
async function asUser(id, fn) {
  await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${id}',false),set_config('request.jwt.claim.role','authenticated',false);`);
  try { return await fn(); } finally { await db.exec("reset role"); }
}
async function denied(fn, message) {
  let blocked = false;
  try { await fn(); } catch { blocked = true; }
  assert.equal(blocked, true, message);
}
async function deniedTransaction(fn, message) {
  let blocked = false;
  await db.exec("begin");
  try { await fn(); await db.exec("commit"); } catch { blocked = true; await db.exec("rollback"); }
  assert.equal(blocked, true, message);
}
async function capability(id, value) {
  const result = await asUser(id, () => db.query(
    `select private.has_forms_capability('${value}'::public.forms_capability) allowed`,
  ));
  return result.rows[0].allowed;
}

try {
  await db.exec(`create schema auth;create schema extensions;create schema storage;
    create role anon nologin;create role authenticated nologin;create role service_role nologin;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb not null default '{}');
    create table storage.buckets(
      id text primary key,name text not null,public boolean not null default false,
      file_size_limit bigint,allowed_mime_types text[]
    );
    create table storage.objects(
      id uuid primary key default gen_random_uuid(),bucket_id text not null references storage.buckets(id),
      name text not null,metadata jsonb not null default '{}',unique(bucket_id,name)
    );
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon,authenticated;
    grant select,insert,update,delete on storage.objects to anon,authenticated;
    create or replace function auth.uid() returns uuid language sql stable set search_path='' as
      $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create or replace function auth.role() returns text language sql stable set search_path='' as
      $$select nullif(current_setting('request.jwt.claim.role',true),'')$$;`);
  for (const path of migrations) {
    let sql = await readFile(path, "utf8");
    sql = sql.replace("create extension if not exists pgcrypto with schema extensions;", "")
      .replaceAll("extensions.gen_random_uuid()", "gen_random_uuid()");
    await db.exec(sql);
  }
  await db.query(`insert into auth.users(id,email,raw_user_meta_data) values
    ($1,'admin@test.invalid','{}'),($2,'pastor@test.invalid','{}'),($3,'staff@test.invalid','{}'),
    ($4,'volunteer@test.invalid','{}'),($5,'parent@test.invalid','{}'),
    ($6,'guardian@test.invalid','{}'),($7,'unrelated-parent@test.invalid','{}')`,
    [ids.admin,ids.pastor,ids.staff,ids.volunteer,ids.parent,ids.guardian,ids.unrelatedParent]);
  await db.query(`update public.profiles set primary_role=case id
    when $1 then 'platform_administrator'::public.account_role
    when $2 then 'youth_pastor'::public.account_role
    when $3 then 'staff_member'::public.account_role
    when $4 then 'volunteer'::public.account_role else 'parent'::public.account_role end`,
    [ids.admin,ids.pastor,ids.staff,ids.volunteer]);

  const expectedTables = [
    "profile_capability_grants","document_templates","document_template_versions",
    "student_document_submissions","document_paper_evidence_events","document_review_events",
    "event_document_requirements","event_participation_overrides","custom_form_templates",
    "custom_form_versions","custom_form_fields","custom_form_assignments","custom_form_submissions",
    "custom_form_answers","visitor_cards","visitor_card_review_events","visitor_card_links",
    "visitor_card_rate_limits","school_year_medical_requirements",
  ];
  const tables = await db.query(`select relname,relrowsecurity,relforcerowsecurity from pg_class
    join pg_namespace on pg_namespace.oid=pg_class.relnamespace
    where nspname='public' and relname=any($1)`, [expectedTables]);
  assert.equal(tables.rows.length, expectedTables.length);
  assert.ok(tables.rows.every((row) => row.relrowsecurity && row.relforcerowsecurity));
  await denied(() => asUser(ids.admin, () => db.query(`select * from public.document_templates`)),
    "Direct authenticated document access must remain denied");
  await denied(() => asUser(ids.volunteer, () => db.query(`select * from public.visitor_cards`)),
    "Volunteers must not receive direct Visitor Card access");
  await denied(() => asUser(ids.parent, () => db.query(`select * from public.custom_form_submissions`)),
    "Authenticated respondents must not receive direct Custom Form submission access");
  await denied(() => asUser(ids.parent, () => db.query(`select * from public.custom_form_answers`)),
    "Authenticated respondents must not receive direct Custom Form answer access");

  for (const value of ["forms.documents.manage","forms.medical.view","forms.medical.verify",
    "forms.participation.override","custom_forms.manage","visitor_cards.manage"]) {
    assert.equal(await capability(ids.admin,value),true,`Administrator missing ${value}`);
    assert.equal(await capability(ids.pastor,value),true,`Youth Pastor missing ${value}`);
  }
  assert.equal(await capability(ids.staff,"forms.documents.manage"),true);
  assert.equal(await capability(ids.staff,"forms.documents.paper_confirm"),true);
  assert.equal(await capability(ids.staff,"forms.medical.view"),false);
  assert.equal(await capability(ids.staff,"forms.medical.verify"),false);
  assert.equal(await capability(ids.staff,"forms.participation.override"),false);
  assert.equal(await capability(ids.volunteer,"forms.documents.manage"),false);

  await denied(() => asUser(ids.pastor, () => db.query(
    `select public.grant_sensitive_forms_capability($1,'forms.participation.override','Not permitted',null)`,[ids.staff])),
    "Youth Pastors cannot grant participation override");
  await denied(() => asUser(ids.staff, () => db.query(
    `select public.grant_sensitive_forms_capability($1,'forms.medical.view','Not permitted',null)`,[ids.staff])),
    "Staff Members cannot grant capabilities");
  await denied(() => asUser(ids.admin, () => db.query(
    `select public.grant_sensitive_forms_capability($1,'forms.medical.view','',null)`,[ids.staff])),
    "Grant reason is required");
  const grant = await asUser(ids.pastor, () => db.query(
    `select public.grant_sensitive_forms_capability($1,'forms.medical.view','Approved operational need',null) id`,[ids.staff]));
  assert.equal(await capability(ids.staff,"forms.medical.view"),true);
  await asUser(ids.admin, () => db.query(
    `select public.admin_update_account($1,'Staff Account','volunteer','active')`,[ids.staff]));
  assert.equal(await capability(ids.staff,"forms.medical.view"),false,
    "A retained Staff grant must stop applying after a permanent role change");
  const roleInvalidated = await db.query(`select revoked_at,revoked_by_profile_id,revocation_reason from public.profile_capability_grants where id=$1`,[grant.rows[0].id]);
  assert.equal(roleInvalidated.rows.length,1,
    "Role changes must not destroy grant history");
  assert.ok(roleInvalidated.rows[0].revoked_at);
  assert.equal(roleInvalidated.rows[0].revoked_by_profile_id,ids.admin);
  assert.match(roleInvalidated.rows[0].revocation_reason,/role changed away/i);
  const invalidationAudit = await db.query(`select actor_profile_id,metadata from public.audit_events where action='forms.sensitive_capability_role_invalidated' and entity_id=$1`,[grant.rows[0].id]);
  assert.equal(invalidationAudit.rows.length,1);
  assert.equal(invalidationAudit.rows[0].actor_profile_id,ids.admin);
  assert.deepEqual(Object.keys(invalidationAudit.rows[0].metadata).sort(),
    ["capability","newRole","previousRole","profileId"].sort(),
    "Role invalidation audit metadata must remain sanitized");
  await asUser(ids.admin, () => db.query(
    `select public.admin_update_account($1,'Staff Account','staff_member','active')`,[ids.staff]));
  assert.equal(await capability(ids.staff,"forms.medical.view"),false,
    "Returning to Staff must not resurrect a role-invalidated grant");
  const replacementGrant = await asUser(ids.pastor, () => db.query(
    `select public.grant_sensitive_forms_capability($1,'forms.medical.view','New approval after Staff return',null) id`,[ids.staff]));
  assert.notEqual(replacementGrant.rows[0].id,grant.rows[0].id);
  assert.equal(await capability(ids.staff,"forms.medical.view"),true,
    "A fresh explicit grant must become effective after Staff return");
  assert.equal((await db.query(`select count(*) count from public.profile_capability_grants where profile_id=$1 and capability='forms.medical.view'`,[ids.staff])).rows[0].count,2,
    "Invalidated and replacement grant history must both be retained");
  await denied(() => asUser(ids.pastor, () => db.query(
    `select public.revoke_sensitive_forms_capability($1,'')`,[replacementGrant.rows[0].id])),
    "Revocation reason is required");
  await asUser(ids.pastor, () => db.query(
    `select public.revoke_sensitive_forms_capability($1,'Operational need ended')`,[replacementGrant.rows[0].id]));
  assert.equal(await capability(ids.staff,"forms.medical.view"),false);
  const retained = await db.query(`select revoked_at,grant_reason,revocation_reason from public.profile_capability_grants where id=$1`,[replacementGrant.rows[0].id]);
  assert.equal(retained.rows.length,1);assert.ok(retained.rows[0].revoked_at);

  await db.query(`update public.profiles set status='suspended' where id=$1`,[ids.admin]);
  await denied(() => asUser(ids.admin, () => db.query(
    `select public.grant_sensitive_forms_capability($1,'forms.medical.verify','Inactive actor denied',null)`,[ids.staff])),
    "Inactive Administrators cannot grant sensitive capabilities");
  await db.query(`update public.profiles set status='active' where id=$1`,[ids.admin]);
  const revokeCandidate = await asUser(ids.admin, () => db.query(
    `select public.grant_sensitive_forms_capability($1,'forms.medical.verify','Temporary medical duty',null) id`,[ids.staff]));
  await db.query(`update public.profiles set status='suspended' where id=$1`,[ids.pastor]);
  await denied(() => asUser(ids.pastor, () => db.query(`select * from public.list_sensitive_forms_capability_grants()`)),
    "Inactive Youth Pastors cannot list sensitive grants");
  await denied(() => asUser(ids.pastor, () => db.query(
    `select public.revoke_sensitive_forms_capability($1,'Inactive actor denied')`,[revokeCandidate.rows[0].id])),
    "Inactive Youth Pastors cannot revoke sensitive grants");
  await db.query(`update public.profiles set status='active' where id=$1`,[ids.pastor]);
  await asUser(ids.admin, () => db.query(
    `select public.revoke_sensitive_forms_capability($1,'Temporary duty ended')`,[revokeCandidate.rows[0].id]));

  await denied(() => asUser(ids.admin, () => db.query(
    `select public.grant_sensitive_forms_capability($1,'forms.participation.override','Past expiration rejected',now()-interval '1 minute')`,[ids.staff])),
    "Already-expired requested grants must be rejected explicitly");
  const expiredGrant = await asUser(ids.admin, () => db.query(
    `select public.grant_sensitive_forms_capability($1,'forms.participation.override','Short approved duty',now()+interval '1 hour') id`,[ids.staff]));
  await db.query(`update public.profile_capability_grants set granted_at=now()-interval '2 days',expires_at=now()-interval '1 day' where id=$1`,[expiredGrant.rows[0].id]);
  assert.equal(await capability(ids.staff,"forms.participation.override"),false);
  const renewedGrant = await asUser(ids.admin, () => db.query(
    `select public.grant_sensitive_forms_capability($1,'forms.participation.override','Renewed approved duty',now()+interval '1 day') id`,[ids.staff]));
  assert.notEqual(renewedGrant.rows[0].id,expiredGrant.rows[0].id);
  await denied(() => asUser(ids.admin, () => db.query(
    `select public.grant_sensitive_forms_capability($1,'forms.participation.override','Duplicate effective duty',now()+interval '2 days')`,[ids.staff])),
    "A second simultaneously effective grant must be rejected");
  const renewalHistory = await db.query(`select id,expires_at,revoked_at from public.profile_capability_grants where profile_id=$1 and capability='forms.participation.override' order by granted_at`,[ids.staff]);
  assert.equal(renewalHistory.rows.length,2,"Expired grant history and its renewal must both be retained");
  assert.equal(renewalHistory.rows.filter((row)=>row.revoked_at===null && new Date(row.expires_at)>new Date()).length,1,
    "Only one renewed grant may be effective");

  await db.query(`insert into public.people(id,first_name,last_name) values($1,'Phase','Youth')`,[ids.person]);
  await db.query(`insert into public.households(id,name,status) values($1,'Phase Household','active')`,[ids.household]);
  await db.query(`insert into public.households(id,name,status) values($1,'Unrelated Household','active')`,[ids.otherHousehold]);
  await db.query(`insert into public.students(id,person_id,primary_household_id,birth_date,grade,status) values($1,$2,$3,'2012-01-01','8','active')`,[ids.student,ids.person,ids.household]);
  await db.query(`insert into public.people(id,first_name,last_name) values($1,'Other','Youth')`,[ids.otherPerson]);
  await db.query(`insert into public.students(id,person_id,primary_household_id,birth_date,grade,status) values($1,$2,$3,'2013-01-01','7','active')`,[ids.otherStudent,ids.otherPerson,ids.otherHousehold]);
  await db.query(`insert into public.people(id,first_name,last_name) values($1,'Parent','Account')`,[ids.parentPerson]);
  await db.query(`update public.profiles set person_id=$1 where id=$2`,[ids.parentPerson,ids.parent]);
  await db.query(`insert into public.household_memberships(household_id,person_id,relationship_label,is_responsible_adult) values($1,$2,'Parent',true)`,[ids.household,ids.parentPerson]);
  await db.query(`insert into public.people(id,first_name,last_name) values($1,'Second','Guardian')`,[ids.guardianPerson]);
  await db.query(`update public.profiles set person_id=$1 where id=$2`,[ids.guardianPerson,ids.guardian]);
  await db.query(`insert into public.household_memberships(household_id,person_id,relationship_label,is_responsible_adult) values($1,$2,'Guardian',true)`,[ids.household,ids.guardianPerson]);
  await db.query(`insert into public.events(id,name,event_type,status,starts_at,ends_at,timezone) values($1,'Phase Event','special','published','2026-09-01 12:00+00','2026-09-01 14:00+00','America/Chicago')`,[ids.event]);
  await db.query(`insert into public.events(id,name,event_type,status,starts_at,ends_at,timezone) values($1,'Other Event','special','published','2026-09-02 12:00+00','2026-09-02 14:00+00','America/Chicago')`,[ids.otherEvent]);
  await db.query(`insert into public.event_registrations(id,event_id,household_id,student_id,status,created_by_profile_id) values($1,$2,$3,$4,'registered',$5)`,[ids.registration,ids.event,ids.household,ids.student,ids.admin]);
  await db.query(`insert into public.document_templates(id,name,document_kind,status,created_by_profile_id) values($1,'Permission','permission_slip','active',$2),($3,'Medical','medical_release','active',$2)`,[ids.template,ids.admin,ids.otherTemplate]);
  await db.query(`insert into public.document_template_versions(id,template_id,version_number,status,validity_policy,valid_for,blank_storage_bucket,blank_storage_object_path,original_file_name,content_type,file_size_bytes,published_at,published_by_profile_id,created_by_profile_id) values
    ($1,$2,1,'published','event_specific',null,'future','object.pdf','master.pdf','application/pdf',100,now(),$3,$3),
    ($4,$5,1,'published','fixed_interval',interval '1 year','future','other.pdf','medical.pdf','application/pdf',100,now(),$3,$3)`,[ids.version,ids.template,ids.admin,ids.otherVersion,ids.otherTemplate]);
  await denied(() => db.query(`update public.document_template_versions set version_number=2 where id=$1`,[ids.version]),"Published document versions must be immutable");
  await denied(() => db.query(`insert into public.event_document_requirements(event_id,template_id,template_version_id,created_by_profile_id) values($1,$2,$3,$4)`,[ids.event,ids.template,ids.otherVersion,ids.admin]),"Event requirements must pin a version of the selected template");
  await db.query(`insert into public.event_document_requirements(id,event_id,template_id,template_version_id,created_by_profile_id) values($1,$2,$3,$4,$5)`,[ids.requirement,ids.event,ids.template,ids.version,ids.admin]);
  await db.query(`insert into public.event_document_requirements(id,event_id,template_id,template_version_id,created_by_profile_id) values($1,$2,$3,$4,$5)`,[ids.otherRequirement,ids.otherEvent,ids.template,ids.version,ids.admin]);
  await denied(() => db.query(`insert into public.student_document_submissions(student_id,household_id,template_version_id,upload_source,submitted_by_profile_id) values($1,$2,$3,'staff',$4)`,[ids.student,ids.otherHousehold,ids.version,ids.admin]),
    "A document submission cannot associate a student with an unrelated household");
  await db.query(`insert into public.student_document_submissions(id,student_id,household_id,template_version_id,upload_source,submitted_by_profile_id) values($1,$2,$3,$4,'staff',$5)`,[ids.submission,ids.student,ids.household,ids.version,ids.admin]);
  await deniedTransaction(async () => {
    await db.query(`update public.student_document_submissions set lifecycle_status='superseded',superseded_at=now() where id=$1`,[ids.submission]);
    await db.query(`insert into public.student_document_submissions(id,student_id,household_id,template_version_id,upload_source,submitted_by_profile_id,supersedes_submission_id) values($1,$2,$3,$4,'staff',$5,$6)`,[ids.replacement,ids.student,ids.household,ids.otherVersion,ids.admin,ids.submission]);
  },"Replacement must preserve the exact template version");
  await db.exec("begin");
  await db.query(`update public.student_document_submissions set lifecycle_status='superseded',superseded_at=now() where id=$1`,[ids.submission]);
  await db.query(`insert into public.student_document_submissions(id,student_id,household_id,template_version_id,upload_source,submitted_by_profile_id,supersedes_submission_id) values($1,$2,$3,$4,'staff',$5,$6)`,[ids.replacement,ids.student,ids.household,ids.version,ids.admin,ids.submission]);
  await db.exec("commit");
  await denied(() => db.query(`insert into public.student_document_submissions(student_id,household_id,template_version_id,upload_source,submitted_by_profile_id,supersedes_submission_id) values($1,$2,$3,'staff',$4,$5)`,[ids.student,ids.household,ids.version,ids.admin,ids.submission]),
    "A prior submission cannot branch to multiple replacements");
  await denied(() => db.query(`update public.student_document_submissions set supersedes_submission_id=$1 where id=$2`,[ids.replacement,ids.submission]),
    "Existing supersession links cannot be rewritten into malformed cycles");
  await denied(() => db.query(`update public.student_document_submissions set lifecycle_status='superseded',superseded_at=now() where id=$1`,[ids.replacement]),
    "Superseded lifecycle state requires a retained replacement row");

  await db.query(`insert into public.event_participation_overrides(event_id,registration_id,student_id,reason,unmet_requirement_ids,created_by_profile_id) values($1,$2,$3,'Approved test override',array[$4]::uuid[],$5)`,[ids.event,ids.registration,ids.student,ids.requirement,ids.admin]);
  await denied(() => db.query(`insert into public.event_participation_overrides(event_id,registration_id,student_id,reason,unmet_requirement_ids,created_by_profile_id) values($1,$2,$3,'Unknown requirement',array['d0000000-0000-4000-8000-000000000001']::uuid[],$4)`,[ids.event,ids.registration,ids.student,ids.admin]),
    "Unknown unmet requirement identifiers must be rejected");
  await denied(() => db.query(`insert into public.event_participation_overrides(event_id,registration_id,student_id,reason,unmet_requirement_ids,created_by_profile_id) values($1,$2,$3,'Cross Event requirement',array[$4]::uuid[],$5)`,[ids.event,ids.registration,ids.student,ids.otherRequirement,ids.admin]),
    "Cross-Event unmet requirements must be rejected");
  await denied(() => db.query(`insert into public.event_participation_overrides(event_id,registration_id,student_id,reason,unmet_requirement_ids,created_by_profile_id) values($1,$2,$3,'Duplicate requirements',array[$4,$4]::uuid[],$5)`,[ids.event,ids.registration,ids.student,ids.requirement,ids.admin]),
    "Duplicate unmet requirement identifiers must be rejected");
  await db.query(`update public.event_document_requirements set archived_at=now(),archived_by_profile_id=$1 where id=$2`,[ids.admin,ids.requirement]);
  await denied(() => db.query(`insert into public.event_participation_overrides(event_id,registration_id,student_id,reason,unmet_requirement_ids,created_by_profile_id) values($1,$2,$3,'Archived requirement',array[$4]::uuid[],$5)`,[ids.event,ids.registration,ids.student,ids.requirement,ids.admin]),
    "Archived unmet requirements must be rejected");

  const fieldTypes = await db.query(`select enumlabel from pg_enum join pg_type on pg_type.oid=enumtypid where typname='custom_form_field_type' order by enumsortorder`);
  assert.deepEqual(fieldTypes.rows.map((row)=>row.enumlabel),["short_text","long_text","yes_no","single_choice","multiple_choice","date","acknowledgment"]);
  const cf={template:"e0000000-0000-4000-8000-000000000001",version:"e0000000-0000-4000-8000-000000000002",otherVersion:"e0000000-0000-4000-8000-000000000003",
    text:"e0000000-0000-4000-8000-000000000010",date:"e0000000-0000-4000-8000-000000000011",choice:"e0000000-0000-4000-8000-000000000012",multi:"e0000000-0000-4000-8000-000000000013",ack:"e0000000-0000-4000-8000-000000000014",optional:"e0000000-0000-4000-8000-000000000015",
    studentAssignment:"e0000000-0000-4000-8000-000000000020",householdAssignment:"e0000000-0000-4000-8000-000000000021",volunteerAssignment:"e0000000-0000-4000-8000-000000000022",eventAssignment:"e0000000-0000-4000-8000-000000000023",generalAssignment:"e0000000-0000-4000-8000-000000000024",archivedAssignment:"e0000000-0000-4000-8000-000000000025",
    submission:"e0000000-0000-4000-8000-000000000030"};
  await db.query(`insert into public.custom_form_templates(id,name,status,created_by_profile_id) values($1,'Phase Form','active',$2)`,[cf.template,ids.admin]);
  await db.query(`insert into public.custom_form_versions(id,template_id,version_number,title,status,created_by_profile_id) values($1,$2,1,'Phase Form v1','draft',$3),($4,$2,2,'Phase Form v2','draft',$3)`,[cf.version,cf.template,ids.admin,cf.otherVersion]);
  await db.query(`insert into public.custom_form_fields(id,version_id,field_key,field_type,label,is_required,display_order,minimum_length,maximum_length) values($1,$2,'short_name','short_text','Short name',true,1,2,5)`,[cf.text,cf.version]);
  await db.query(`insert into public.custom_form_fields(id,version_id,field_key,field_type,label,is_required,display_order,minimum_date,maximum_date) values($1,$2,'service_date','date','Service date',true,2,'2026-01-01','2026-12-31')`,[cf.date,cf.version]);
  await db.query(`insert into public.custom_form_fields(id,version_id,field_key,field_type,label,is_required,display_order,choice_options) values($1,$2,'single','single_choice','Single',true,3,'["alpha","beta"]'),($3,$2,'multiple','multiple_choice','Multiple',false,4,'["alpha","beta"]')`,[cf.choice,cf.version,cf.multi]);
  await db.query(`insert into public.custom_form_fields(id,version_id,field_key,field_type,label,is_required,display_order) values($1,$2,'ack','acknowledgment','Acknowledge',true,5),($3,$2,'optional_note','long_text','Optional note',false,6)`,[cf.ack,cf.version,cf.optional]);
  await db.query(`update public.custom_form_versions set status='published',published_at=now(),published_by_profile_id=$1 where id in ($2,$3)`,[ids.admin,cf.version,cf.otherVersion]);
  await denied(()=>db.query(`update public.custom_form_versions set title='Changed' where id=$1`,[cf.version]),"Published Custom Form versions must remain immutable");
  await denied(()=>db.query(`update public.custom_form_fields set label='Changed' where id=$1`,[cf.text]),"Published Custom Form fields must remain immutable");
  await db.query(`insert into public.custom_form_assignments(id,version_id,assignment_type,student_id,assigned_by_profile_id) values($1,$2,'student',$3,$4)`,[cf.studentAssignment,cf.version,ids.student,ids.admin]);
  await db.query(`insert into public.custom_form_assignments(id,version_id,assignment_type,household_id,assigned_by_profile_id) values($1,$2,'household',$3,$4)`,[cf.householdAssignment,cf.version,ids.household,ids.admin]);
  await db.query(`insert into public.custom_form_assignments(id,version_id,assignment_type,volunteer_profile_id,assigned_by_profile_id) values($1,$2,'volunteer',$3,$4)`,[cf.volunteerAssignment,cf.version,ids.volunteer,ids.admin]);
  await db.query(`insert into public.custom_form_assignments(id,version_id,assignment_type,event_id,assigned_by_profile_id) values($1,$2,'event',$3,$4)`,[cf.eventAssignment,cf.version,ids.event,ids.admin]);
  await db.query(`insert into public.custom_form_assignments(id,version_id,assignment_type,is_general_ministry,assigned_by_profile_id) values($1,$2,'general_ministry',true,$3)`,[cf.generalAssignment,cf.version,ids.admin]);
  await db.query(`insert into public.custom_form_assignments(id,version_id,assignment_type,student_id,assigned_by_profile_id,archived_at,archived_by_profile_id) values($1,$2,'student',$3,$4,now(),$4)`,[cf.archivedAssignment,cf.version,ids.student,ids.admin]);
  await db.query(`insert into public.custom_form_submissions(id,assignment_id,version_id,submitted_by_profile_id,subject_student_id) values($1,$2,$3,$4,$5)`,[cf.submission,cf.studentAssignment,cf.version,ids.admin,ids.student]);
  await denied(()=>db.query(`insert into public.custom_form_submissions(assignment_id,version_id,submitted_by_profile_id,subject_student_id) values($1,$2,$3,$4)`,[cf.studentAssignment,cf.version,ids.admin,ids.otherStudent]),"Student assignments accept only their assigned student");
  await db.query(`insert into public.custom_form_submissions(assignment_id,version_id,submitted_by_profile_id,subject_household_id) values($1,$2,$3,$4)`,[cf.householdAssignment,cf.version,ids.admin,ids.household]);
  await denied(()=>db.query(`insert into public.custom_form_submissions(assignment_id,version_id,submitted_by_profile_id,subject_household_id) values($1,$2,$3,$4)`,[cf.householdAssignment,cf.version,ids.admin,ids.otherHousehold]),"Household assignments accept only their assigned household");
  await db.query(`insert into public.custom_form_submissions(assignment_id,version_id,submitted_by_profile_id,subject_volunteer_profile_id) values($1,$2,$3,$4)`,[cf.volunteerAssignment,cf.version,ids.admin,ids.volunteer]);
  await denied(()=>db.query(`insert into public.custom_form_submissions(assignment_id,version_id,submitted_by_profile_id,subject_volunteer_profile_id) values($1,$2,$3,$4)`,[cf.volunteerAssignment,cf.version,ids.admin,ids.staff]),"Volunteer assignments accept only their assigned volunteer");
  await db.query(`insert into public.custom_form_submissions(assignment_id,version_id,submitted_by_profile_id,subject_student_id,subject_household_id) values($1,$2,$3,$4,$5)`,[cf.eventAssignment,cf.version,ids.admin,ids.student,ids.household]);
  await denied(()=>db.query(`insert into public.custom_form_submissions(assignment_id,version_id,submitted_by_profile_id,subject_student_id,subject_household_id) values($1,$2,$3,$4,$5)`,[cf.eventAssignment,cf.version,ids.admin,ids.student,ids.otherHousehold]),"Event subjects require a matching active Event Registration");
  await db.query(`insert into public.custom_form_submissions(assignment_id,version_id,submitted_by_profile_id) values($1,$2,$3)`,[cf.generalAssignment,cf.version,ids.admin]);
  await denied(()=>db.query(`insert into public.custom_form_submissions(assignment_id,version_id,submitted_by_profile_id,subject_student_id) values($1,$2,$3,$4)`,[cf.generalAssignment,cf.version,ids.admin,ids.student]),"General-ministry submissions use the authenticated submitter and no unrelated subject IDs");
  await denied(()=>db.query(`insert into public.custom_form_submissions(assignment_id,version_id,submitted_by_profile_id,subject_student_id) values($1,$2,$3,$4)`,[cf.archivedAssignment,cf.version,ids.admin,ids.student]),"Archived assignments reject submissions");
  await denied(()=>db.query(`insert into public.custom_form_submissions(assignment_id,version_id,submitted_by_profile_id,subject_student_id) values($1,$2,$3,$4)`,[cf.studentAssignment,cf.otherVersion,ids.admin,ids.student]),"Submission version must match its assignment version");
  await denied(()=>db.query(`update public.custom_form_submissions set status='submitted',submitted_at=now() where id=$1`,[cf.submission]),"Missing required answers prevent submission");
  await denied(()=>db.query(`insert into public.custom_form_answers(submission_id,field_id,text_value) values($1,$2,'x')`,[cf.submission,cf.text]),"Minimum text length is enforced");
  await denied(()=>db.query(`insert into public.custom_form_answers(submission_id,field_id,text_value) values($1,$2,'toolong')`,[cf.submission,cf.text]),"Maximum text length is enforced");
  await db.query(`insert into public.custom_form_answers(submission_id,field_id,text_value) values($1,$2,'valid')`,[cf.submission,cf.text]);
  await denied(()=>db.query(`insert into public.custom_form_answers(submission_id,field_id,date_value) values($1,$2,'2025-12-31')`,[cf.submission,cf.date]),"Minimum date is enforced");
  await denied(()=>db.query(`insert into public.custom_form_answers(submission_id,field_id,date_value) values($1,$2,'2027-01-01')`,[cf.submission,cf.date]),"Maximum date is enforced");
  await db.query(`insert into public.custom_form_answers(submission_id,field_id,date_value) values($1,$2,'2026-06-01')`,[cf.submission,cf.date]);
  await denied(()=>db.query(`insert into public.custom_form_answers(submission_id,field_id,choice_value) values($1,$2,'invalid')`,[cf.submission,cf.choice]),"Invalid single-choice values are rejected");
  await db.query(`insert into public.custom_form_answers(submission_id,field_id,choice_value) values($1,$2,'alpha')`,[cf.submission,cf.choice]);
  await denied(()=>db.query(`insert into public.custom_form_answers(submission_id,field_id,multiple_choice_value) values($1,$2,'["alpha","alpha"]')`,[cf.submission,cf.multi]),"Duplicate multiple-choice selections are rejected");
  await db.query(`insert into public.custom_form_answers(submission_id,field_id,multiple_choice_value) values($1,$2,'["alpha","beta"]')`,[cf.submission,cf.multi]);
  await db.query(`insert into public.custom_form_answers(submission_id,field_id,boolean_value) values($1,$2,false)`,[cf.submission,cf.ack]);
  await denied(()=>db.query(`update public.custom_form_submissions set status='submitted',submitted_at=now() where id=$1`,[cf.submission]),"Required acknowledgment FALSE does not satisfy completeness");
  await db.query(`update public.custom_form_answers set boolean_value=true where submission_id=$1 and field_id=$2`,[cf.submission,cf.ack]);
  await db.query(`update public.custom_form_submissions set status='submitted',submitted_at=now() where id=$1`,[cf.submission]);
  assert.equal((await db.query(`select status from public.custom_form_submissions where id=$1`,[cf.submission])).rows[0].status,"submitted","Required acknowledgment TRUE permits completion while optional fields remain unanswered");
  const vc={self:"f0000000-0000-4000-8000-000000000001",staff:"f0000000-0000-4000-8000-000000000002",staffAck:"f0000000-0000-4000-8000-000000000003"};
  await denied(()=>db.query(`insert into public.visitor_cards(source,youth_first_name,youth_last_name,email) values('self_service','Self','Missing','self@example.test')`),
    "Self-service Visitor Cards require privacy acknowledgment");
  await db.query(`insert into public.visitor_cards(id,source,youth_first_name,youth_last_name,email,privacy_acknowledgment_version,privacy_acknowledged_at) values($1,'self_service','Self','Acknowledged','self@example.test','v1',now())`,[vc.self]);
  await db.query(`insert into public.visitor_cards(id,source,youth_first_name,youth_last_name,email,submitted_by_profile_id) values($1,'staff','Staff','No Consent','staff@example.test',$2)`,[vc.staff,ids.admin]);
  await denied(()=>db.query(`insert into public.visitor_cards(source,youth_first_name,youth_last_name,email,submitted_by_profile_id,privacy_acknowledgment_version) values('staff','Staff','Partial','partial@example.test',$1,'v1')`,[ids.admin]),
    "Staff Visitor Card acknowledgment evidence must be a complete pair");
  await denied(()=>db.query(`insert into public.visitor_cards(source,youth_first_name,youth_last_name,email,submitted_by_profile_id,privacy_acknowledged_at) values('staff','Staff','Partial','partial2@example.test',$1,now())`,[ids.admin]),
    "Staff Visitor Card acknowledgment timestamp cannot exist without its version");
  await db.query(`insert into public.visitor_cards(id,source,youth_first_name,youth_last_name,email,submitted_by_profile_id,privacy_acknowledgment_version,privacy_acknowledged_at) values($1,'staff','Staff','Captured','captured@example.test',$2,'v1',now())`,[vc.staffAck,ids.admin]);
  await db.query(`insert into public.visitor_card_links(visitor_card_id,link_type,person_id,linked_by_profile_id,link_reason) values($1,'person',$2,$3,'Reviewed existing person')`,[vc.staff,ids.person,ids.admin]);
  await db.query(`insert into public.visitor_card_links(visitor_card_id,link_type,student_id,linked_by_profile_id,link_reason) values($1,'student',$2,$3,'Reviewed existing student')`,[vc.staff,ids.student,ids.admin]);
  await db.query(`insert into public.visitor_card_links(visitor_card_id,link_type,household_id,linked_by_profile_id,link_reason) values($1,'household',$2,$3,'Reviewed existing household')`,[vc.staff,ids.household,ids.admin]);
  await db.query(`insert into public.visitor_card_links(visitor_card_id,link_type,student_id,linked_by_profile_id,link_reason) values($1,'conversion',$2,$3,'Single student conversion evidence')`,[vc.self,ids.student,ids.admin]);
  await db.query(`insert into public.visitor_card_links(visitor_card_id,link_type,person_id,student_id,household_id,linked_by_profile_id,link_reason) values($1,'conversion',$2,$3,$4,$5,'Consistent Member conversion evidence')`,[vc.staffAck,ids.person,ids.student,ids.household,ids.admin]);
  await denied(()=>db.query(`insert into public.visitor_card_links(visitor_card_id,link_type,student_id,household_id,linked_by_profile_id,link_reason) values($1,'conversion',$2,$3,$4,'Mismatched household evidence')`,[vc.self,ids.student,ids.otherHousehold,ids.admin]),
    "Conversion Student and Household must be authoritative matches");
  await denied(()=>db.query(`insert into public.visitor_card_links(visitor_card_id,link_type,person_id,student_id,linked_by_profile_id,link_reason) values($1,'conversion',$2,$3,$4,'Mismatched person evidence')`,[vc.self,ids.otherPerson,ids.student,ids.admin]),
    "Conversion Student and Person must be authoritative matches");
  await denied(()=>db.query(`insert into public.visitor_card_links(visitor_card_id,link_type,person_id,household_id,linked_by_profile_id,link_reason) values($1,'conversion',$2,$3,$4,'Unrelated person household evidence')`,[vc.self,ids.person,ids.otherHousehold,ids.admin]),
    "Conversion Person and Household must have an authoritative membership");
  const visitorColumns = await db.query(`select column_name from information_schema.columns where table_schema='public' and table_name in ('visitor_cards','visitor_card_review_events','visitor_card_links')`);
  assert.ok(visitorColumns.rows.every((row)=>!/(medical|allergy|medication|diagnosis)/i.test(row.column_name)),"Visitor Card foundation must contain no medical fields");
  const registrationColumns = await db.query(`select column_name from information_schema.columns where table_schema='public' and table_name='event_registrations'`);
  assert.ok(registrationColumns.rows.every((row)=>!/(document|readiness|permission)/i.test(row.column_name)),"Phase 1 must not reshape Event Registration");

  const bucket = await db.query(`select public,file_size_limit,allowed_mime_types from storage.buckets where id='form-template-masters'`);
  assert.equal(bucket.rows.length,1,"The private blank-master bucket must exist");
  assert.equal(bucket.rows[0].public,false,"The blank-master bucket must not be public");
  assert.equal(Number(bucket.rows[0].file_size_limit),15*1024*1024,"The bucket must enforce a 15 MB limit");
  assert.deepEqual(bucket.rows[0].allowed_mime_types,["application/pdf"],"The bucket must allow PDF only");
  await db.exec("set role anon");
  assert.equal((await db.query(`select * from storage.objects`)).rows.length,0,"Anonymous storage reads must reveal nothing");
  await denied(()=>db.query(`insert into storage.objects(bucket_id,name,metadata) values('form-template-masters','templates/anonymous.pdf','{}')`),
    "Anonymous storage writes must be denied");
  await db.exec("reset role");

  const p2={event:"a2000000-0000-4000-8000-000000000001",requirement:"a2000000-0000-4000-8000-000000000002",
    object:"a2000000-0000-4000-8000-000000000003",badObject:"a2000000-0000-4000-8000-000000000004",
    largeObject:"a2000000-0000-4000-8000-000000000005"};
  await denied(()=>asUser(ids.parent,()=>db.query(`select public.create_document_template('Denied parent',null,'permission_slip')`)),
    "Parents cannot manage document templates");
  await denied(()=>asUser(ids.volunteer,()=>db.query(`select public.create_document_template('Denied volunteer',null,'permission_slip')`)),
    "Volunteers cannot manage document templates");
  await denied(()=>asUser(ids.staff,()=>db.query(`select public.create_document_template('Staff template',null,'permission_slip')`)),
    "Ordinary Staff cannot manage Permission Slip templates");
  const created=await asUser(ids.admin,()=>db.query(`select public.create_document_template('Phase 2 permission','Blank master lifecycle','permission_slip') id`));
  const templateId=created.rows[0].id;
  const first=await asUser(ids.admin,()=>db.query(`select public.create_document_template_version($1,'event_specific',null,null,'2026-08-01',null) id`,[templateId]));
  const versionId=first.rows[0].id;
  await asUser(ids.admin,()=>db.query(`select public.update_document_template_version_draft($1,'event_specific',null,null,'2026-08-02',null)`,[versionId]));
  assert.equal((await db.query(`select effective_from::text from public.document_template_versions where id=$1`,[versionId])).rows[0].effective_from,"2026-08-02",
    "Draft version details must be editable through the protected workflow");
  await denied(()=>asUser(ids.admin,()=>db.query(`select public.publish_document_template_version($1)`,[versionId])),
    "A version cannot publish without a verified master");
  const prepared=await asUser(ids.admin,()=>db.query(`select public.prepare_document_template_master_upload($1,$2) authorization`,[versionId,p2.object]));
  const expectedPath=`templates/${templateId}/${versionId}/${p2.object}.pdf`;
  assert.equal(prepared.rows[0].authorization.objectPath,expectedPath,"The server must assign the exact UUID-only object path");
  assert.match(expectedPath,/^templates\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.pdf$/);
  await db.query(`insert into storage.buckets(id,name,public) values('unapproved','unapproved',false)`);
  await denied(()=>asUser(ids.admin,()=>db.query(`insert into storage.objects(bucket_id,name,metadata) values('unapproved',$1,'{"mimetype":"application/pdf","size":100}')`,[expectedPath])),
    "Authenticated callers cannot redirect a master upload to another bucket");
  await denied(()=>asUser(ids.admin,()=>db.query(`insert into storage.objects(bucket_id,name,metadata) values('form-template-masters',$1,'{"mimetype":"application/pdf","size":100}')`,[`${expectedPath}.wrong`])),
    "Authenticated callers cannot upload to an arbitrary path");
  assert.equal((await asUser(ids.admin,()=>db.query(`select * from storage.objects`))).rows.length,0,
    "Broad authenticated Storage listing must reveal no unrelated objects");
  await asUser(ids.admin,()=>db.query(`insert into storage.objects(bucket_id,name,metadata) values('form-template-masters',$1,'{"mimetype":"application/pdf","size":100}')`,[expectedPath]));
  assert.equal((await asUser(ids.admin,()=>db.query(`select * from storage.objects`))).rows.length,0,
    "Managers must not bypass the audited download workflow with direct Storage SELECT/list");
  assert.equal((await asUser(ids.parent,()=>db.query(`select * from storage.objects`))).rows.length,0,
    "Parents cannot directly read or list blank masters");
  assert.equal((await asUser(ids.volunteer,()=>db.query(`select * from storage.objects`))).rows.length,0,
    "Volunteers cannot directly read or list blank masters");
  const storagePolicies=await db.query(`select policyname,cmd from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'form_template_masters_%' order by policyname`);
  assert.deepEqual(storagePolicies.rows,[{policyname:"form_template_masters_insert",cmd:"INSERT"}],
    "Blank-master Storage must expose only the exact-path INSERT policy, with no SELECT, UPDATE, or DELETE path");
  const validPdfBytes=new TextEncoder().encode("%PDF-1.7\nPhase 2 blank master\n%%EOF");
  const verifiedPdf=validatePdfMasterBytes(validPdfBytes);
  const validPdfChecksum=createHash("sha256").update(validPdfBytes).digest("hex");
  assert.equal(verifiedPdf.fileSizeBytes,validPdfBytes.byteLength,"Genuine PDF bytes must pass server validation");
  assert.equal(verifiedPdf.checksumSha256,validPdfChecksum,"SHA-256 must be computed from actual stored content");
  assert.throws(()=>validatePdfMasterBytes(new TextEncoder().encode("renamed text file")),/valid PDF signature/,
    "A renamed non-PDF with a .pdf filename must be rejected");
  assert.throws(()=>validatePdfMasterBytes(new TextEncoder().encode("application/pdf metadata only")),/valid PDF signature/,
    "Spoofed application/pdf metadata must not substitute for real PDF bytes");
  assert.throws(()=>validatePdfMasterBytes(new Uint8Array(15*1024*1024+1)),/no larger than 15 MB/,
    "Oversized actual content must be rejected before finalization");
  assert.equal(sanitizePdfDownloadFilename("Permission Form.pdf"),"Permission Form.pdf",
    "A normal PDF filename must remain usable");
  assert.equal(sanitizePdfDownloadFilename("C:\\unsafe\\Permission Form.pdf"),"Permission Form.pdf",
    "Windows path-like filenames must be reduced to a sanitized basename");
  assert.equal(sanitizePdfDownloadFilename("/unsafe/path/Medical Form.pdf"),"Medical Form.pdf",
    "Unix path-like filenames must be reduced to a sanitized basename");
  assert.equal(sanitizePdfDownloadFilename("bad\r\n\u0001name.pdf"),"badname.pdf",
    "CR, LF, and ASCII control characters must be removed");
  assert.equal(sanitizePdfDownloadFilename("../\r\n.pdf"),"blank-form.pdf",
    "An unusable sanitized filename must use the safe fallback");
  assert.match(sanitizePdfDownloadFilename("unsafe\"header.pdf"),/\.pdf$/,
    "Every resulting download filename must retain a PDF extension");
  await denied(()=>asUser(ids.admin,()=>db.query(`select public.finalize_document_template_master_upload($1,$2,'blank.pdf','application/pdf',$3,$4)`,[versionId,ids.admin,validPdfBytes.byteLength,validPdfChecksum])),
    "Authenticated clients cannot substitute a checksum or invoke trusted finalization directly");
  await db.exec("set role service_role;select set_config('request.jwt.claim.role','service_role',false)");
  await denied(()=>db.query(`select public.finalize_document_template_master_upload($1,$2,'C:\\unsafe\\blank.pdf','application/pdf',100,$3)`,[versionId,ids.admin,validPdfChecksum]),
    "Database defense must reject path separators in a service-role filename");
  await denied(()=>db.query(`select public.finalize_document_template_master_upload($1,$2,E'blank\\r\\nInjected.pdf','application/pdf',100,$3)`,[versionId,ids.admin,validPdfChecksum]),
    "Database defense must reject control characters in a service-role filename");
  await db.query(`select public.finalize_document_template_master_upload($1,$2,'blank.pdf','application/pdf',100,$3)`,[versionId,ids.admin,validPdfChecksum]);
  await db.exec("reset role");
  await asUser(ids.admin,()=>db.query(`select public.publish_document_template_version($1)`,[versionId]));
  const published=await db.query(`select status,published_at,published_by_profile_id,blank_storage_object_path from public.document_template_versions where id=$1`,[versionId]);
  assert.equal(published.rows[0].status,"published");assert.ok(published.rows[0].published_at);
  assert.equal(published.rows[0].published_by_profile_id,ids.admin);
  await denied(()=>db.query(`update public.document_template_versions set effective_from='2026-08-03' where id=$1`,[versionId]),
    "Published versions must remain immutable");
  const overwrite=await asUser(ids.admin,()=>db.query(`update storage.objects set metadata='{"mimetype":"application/pdf","size":200}' where bucket_id='form-template-masters' and name=$1 returning id`,[expectedPath]));
  assert.equal(overwrite.rows.length,0,"Published master objects cannot be overwritten");

  await db.query(`insert into public.events(id,name,event_type,status,starts_at,ends_at,timezone) values($1,'Phase 2 Event','special','published','2026-10-01 12:00+00','2026-10-01 14:00+00','America/Chicago')`,[p2.event]);
  await db.query(`insert into public.event_document_requirements(id,event_id,template_id,template_version_id,created_by_profile_id) values($1,$2,$3,$4,$5)`,[p2.requirement,p2.event,templateId,versionId,ids.admin]);
  const second=await asUser(ids.admin,()=>db.query(`select public.create_document_template_version($1,'fixed_interval',interval '1 year',null,null,null) id`,[templateId]));
  const secondId=second.rows[0].id;
  const numbers=await db.query(`select version_number from public.document_template_versions where template_id=$1 order by version_number`,[templateId]);
  assert.deepEqual(numbers.rows.map((row)=>row.version_number),[1,2],"Version numbers must be assigned safely by the server");
  assert.equal((await db.query(`select template_version_id from public.event_document_requirements where id=$1`,[p2.requirement])).rows[0].template_version_id,versionId,
    "New versions must not reassign existing Event requirements");

  const nonPdfPrepared=await asUser(ids.admin,()=>db.query(`select public.prepare_document_template_master_upload($1,$2) authorization`,[secondId,p2.badObject]));
  await db.query(`insert into storage.objects(bucket_id,name,metadata) values('form-template-masters',$1,'{"mimetype":"image/png","size":100}')`,[nonPdfPrepared.rows[0].authorization.objectPath]);
  await denied(()=>asUser(ids.admin,()=>db.query(`select public.finalize_document_template_master_upload($1,$2,'wrong.png','image/png',100,$3)`,[secondId,ids.admin,validPdfChecksum])),
    "Non-PDF blank masters must be rejected");
  const third=await asUser(ids.admin,()=>db.query(`select public.create_document_template_version($1,'event_specific',null,null,null,null) id`,[templateId]));
  const thirdPrepared=await asUser(ids.admin,()=>db.query(`select public.prepare_document_template_master_upload($1,$2) authorization`,[third.rows[0].id,p2.largeObject]));
  await db.query(`insert into storage.objects(bucket_id,name,metadata) values('form-template-masters',$1,'{"mimetype":"application/pdf","size":15728641}')`,[thirdPrepared.rows[0].authorization.objectPath]);
  await denied(()=>asUser(ids.admin,()=>db.query(`select public.finalize_document_template_master_upload($1,$2,'large.pdf','application/pdf',15728641,$3)`,[third.rows[0].id,ids.admin,validPdfChecksum])),
    "Blank masters larger than 15 MB must be rejected");

  const download=await asUser(ids.admin,()=>db.query(`select public.authorize_document_template_master_download($1) authorization`,[versionId]));
  assert.equal(download.rows[0].authorization.objectPath,expectedPath,"Authorized managers receive only retained master metadata");
  assert.equal(download.rows[0].authorization.fileName,"blank.pdf","Downloads must use only the stored sanitized filename");
  assert.equal(JSON.stringify(download.rows[0].authorization).includes("http"),false,"The RPC must not expose a permanent public URL");
  const downloadAudit=await db.query(`select metadata from public.audit_events where action='forms.template_master_download_authorized' and entity_id=$1`,[versionId]);
  assert.equal(downloadAudit.rows.length,1,"Authorized application downloads must record an audit event before URL signing");
  assert.ok(!/(path|token|url|filename|content)/i.test(JSON.stringify(downloadAudit.rows[0].metadata)),
    "Download authorization audit metadata must remain sanitized");
  await denied(()=>asUser(ids.parent,()=>db.query(`select public.authorize_document_template_master_download($1)`,[versionId])),
    "A parent without an eligible Event Registration cannot download an unrelated blank permission slip");
  const downloadService=await readFile("features/forms/services/document-template-service.ts","utf8");
  assert.match(downloadService,/authorize_document_template_master_download/,
    "The application download must authorize by template version ID through the protected RPC");
  assert.match(downloadService,/createAdminClient\(\)[\s\S]*createSignedUrl\(authorization\.objectPath, 60/,
    "Trusted server-only Storage authority must issue the 60-second URL after authorization");
  await asUser(ids.admin,()=>db.query(`select public.retire_document_template_version($1)`,[versionId]));
  const retired=await db.query(`select status,published_at,published_by_profile_id,blank_storage_object_path from public.document_template_versions where id=$1`,[versionId]);
  assert.equal(retired.rows[0].status,"retired");
  assert.equal(retired.rows[0].published_at.toISOString(),published.rows[0].published_at.toISOString());
  assert.equal(retired.rows[0].published_by_profile_id,ids.admin);
  assert.equal(retired.rows[0].blank_storage_object_path,expectedPath,"Retirement must preserve the master and publication evidence");
  await asUser(ids.admin,()=>db.query(`select public.archive_document_template($1)`,[templateId]));
  assert.equal((await db.query(`select status from public.document_templates where id=$1`,[templateId])).rows[0].status,"archived");
  const phase2Audit=await db.query(`select metadata from public.audit_events where action like 'forms.template_%'`);
  assert.ok(phase2Audit.rows.length>=7,"Phase 2 lifecycle operations must be audited");
  assert.ok(phase2Audit.rows.every((row)=>!/(objectPath|storage|token|signed|fileName|blank\.pdf|contents?)/i.test(JSON.stringify(row.metadata))),
    "Template audit metadata must exclude paths, tokens, filenames, URLs, and contents");

  const studentBucket=await db.query(`select public,file_size_limit,allowed_mime_types from storage.buckets where id='student-documents'`);
  assert.equal(studentBucket.rows.length,1);assert.equal(studentBucket.rows[0].public,false);
  assert.equal(Number(studentBucket.rows[0].file_size_limit),20*1024*1024);
  assert.deepEqual(studentBucket.rows[0].allowed_mime_types,["application/pdf","image/jpeg","image/png"]);
  const studentPolicies=await db.query(`select policyname,cmd from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'student_documents_%'`);
  assert.deepEqual(studentPolicies.rows,[{policyname:"student_documents_insert",cmd:"INSERT"}],"Completed documents expose exact-path INSERT only");
  assert.equal((await asUser(ids.admin,()=>db.query(`select * from storage.objects where bucket_id='student-documents'`))).rows.length,0);
  assert.equal((await asUser(ids.parent,()=>db.query(`select * from storage.objects where bucket_id='student-documents'`))).rows.length,0);
  const pdf=inspectCompletedDocument(new TextEncoder().encode("%PDF-1.7\ncompleted"));
  const jpeg=inspectCompletedDocument(new Uint8Array([0xff,0xd8,0xff,0xe0,1]));
  const png=inspectCompletedDocument(new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,1]));
  assert.equal(pdf.contentType,"application/pdf");assert.equal(jpeg.contentType,"image/jpeg");assert.equal(png.contentType,"image/png");
  assert.throws(()=>inspectCompletedDocument(new TextEncoder().encode("spoofed application/pdf")),/not a valid/);
  assert.throws(()=>inspectCompletedDocument(new Uint8Array(20*1024*1024+1)),/no larger than 20 MB/);
  assert.equal(sanitizeCompletedDocumentFilename("C:\\unsafe\\signed form.PDF","pdf"),"signed form.pdf");
  assert.equal(sanitizeCompletedDocumentFilename("../\r\n.png","png"),"completed-document.png");

  await db.query(`update public.event_document_requirements set archived_at=null,archived_by_profile_id=null where id=$1`,[ids.requirement]);
  const p3={parentObject:"a3000000-0000-4000-8000-000000000001",staffObject:"a3000000-0000-4000-8000-000000000002",
    replacementObject:"a3000000-0000-4000-8000-000000000003",medicalObject:"a3000000-0000-4000-8000-000000000004"};
  const parentPrepared=await asUser(ids.parent,()=>db.query(`select public.prepare_document_submission_upload($1,$2,$3,'pdf',null) authorization`,[ids.student,ids.version,p3.parentObject]));
  const parentSubmission=parentPrepared.rows[0].authorization.submissionId;
  const parentPath=parentPrepared.rows[0].authorization.objectPath;
  assert.equal(parentPath,`submissions/${ids.student}/${parentSubmission}/${p3.parentObject}.pdf`);
  await db.query(`delete from public.household_memberships where household_id=$1 and person_id=$2`,[ids.household,ids.parentPerson]);
  await denied(()=>asUser(ids.parent,()=>db.query(`insert into storage.objects(bucket_id,name,metadata) values('student-documents',$1,$2)`,[parentPath,JSON.stringify({mimetype:"application/pdf",size:pdf.fileSizeBytes})])),"A removed Parent relationship invalidates a prepared upload path");
  await db.query(`insert into public.household_memberships(household_id,person_id,relationship_label,is_responsible_adult) values($1,$2,'Parent',true)`,[ids.household,ids.parentPerson]);
  await denied(()=>asUser(ids.parent,()=>db.query(`select public.prepare_document_submission_upload($1,$2,$3,'pdf',null)`,[ids.otherStudent,ids.version,p3.staffObject])),"Parents cannot upload for unrelated youth");
  await denied(()=>asUser(ids.volunteer,()=>db.query(`select public.prepare_document_submission_upload($1,$2,$3,'pdf',null)`,[ids.student,ids.version,p3.staffObject])),"Volunteers cannot upload documents");
  await denied(()=>asUser(ids.parent,()=>db.query(`insert into storage.objects(bucket_id,name,metadata) values('student-documents','submissions/arbitrary.pdf','{}')`)),"Arbitrary completed-document paths are denied");
  await asUser(ids.parent,()=>db.query(`insert into storage.objects(bucket_id,name,metadata) values('student-documents',$1,$2)`,[parentPath,JSON.stringify({mimetype:"application/pdf",size:pdf.fileSizeBytes})]));
  await denied(()=>asUser(ids.staff,()=>db.query(`select public.prepare_document_submission_upload($1,$2,$3,'png',null)`,[ids.otherStudent,ids.version,"a3000000-0000-4000-8000-000000000014"])),"Ordinary Staff cannot prepare Permission Slip uploads");
  await denied(()=>asUser(ids.staff,()=>db.query(`select public.authorize_document_template_master_download($1)`,[ids.version])),"Ordinary Staff cannot download blank Permission Slips");
  await denied(()=>asUser(ids.staff,()=>db.query(`select * from public.list_available_document_versions()`)),"Ordinary Staff cannot list Permission Slip upload options");
  const managerPrepared=await asUser(ids.pastor,()=>db.query(`select public.prepare_document_submission_upload($1,$2,$3,'png',null) authorization`,[ids.otherStudent,ids.version,"a3000000-0000-4000-8000-000000000006"]));
  await denied(()=>asUser(ids.pastor,()=>db.query(`select public.authorize_document_submission_download($1)`,[managerPrepared.rows[0].authorization.submissionId])),"A prepared submission without finalized content cannot be authorized for download");
  await db.query(`update public.profiles set primary_role='staff_member' where id=$1`,[ids.pastor]);
  await denied(()=>asUser(ids.pastor,()=>db.query(`insert into storage.objects(bucket_id,name,metadata) values('student-documents',$1,$2)`,[managerPrepared.rows[0].authorization.objectPath,JSON.stringify({mimetype:"image/png",size:png.fileSizeBytes})])),"Youth Pastor role loss invalidates a prepared upload path");
  await db.query(`update public.profiles set primary_role='youth_pastor' where id=$1`,[ids.pastor]);
  await asUser(ids.pastor,()=>db.query(`insert into storage.objects(bucket_id,name,metadata) values('student-documents',$1,$2)`,[managerPrepared.rows[0].authorization.objectPath,JSON.stringify({mimetype:"image/png",size:png.fileSizeBytes})]));
  const inactivePrepared=await asUser(ids.parent,()=>db.query(`select public.prepare_document_submission_upload($1,$2,$3,'jpg',null) authorization`,[ids.student,ids.version,"a3000000-0000-4000-8000-000000000007"]));
  await db.query(`update public.profiles set status='suspended' where id=$1`,[ids.parent]);
  await denied(()=>asUser(ids.parent,()=>db.query(`insert into storage.objects(bucket_id,name,metadata) values('student-documents',$1,$2)`,[inactivePrepared.rows[0].authorization.objectPath,JSON.stringify({mimetype:"image/jpeg",size:jpeg.fileSizeBytes})])),"Inactive profiles cannot use prepared upload paths");
  await db.query(`update public.profiles set status='active' where id=$1`,[ids.parent]);
  await denied(()=>asUser(ids.parent,()=>db.query(`select public.finalize_document_submission_upload($1,$2,'signed.pdf','application/pdf',$3,$4)`,[parentSubmission,ids.parent,pdf.fileSizeBytes,pdf.checksumSha256])),"Clients cannot invoke trusted completed-document finalization");
  await db.query(`delete from public.household_memberships where household_id=$1 and person_id=$2`,[ids.household,ids.parentPerson]);
  await db.exec("set role service_role;select set_config('request.jwt.claim.role','service_role',false)");
  await denied(()=>db.query(`select public.finalize_document_submission_upload($1,$2,'signed-form.pdf','application/pdf',$3,$4)`,[parentSubmission,ids.parent,pdf.fileSizeBytes,pdf.checksumSha256]),"Parent relationship loss after upload denies finalization");
  await db.exec("reset role");
  await db.query(`insert into public.household_memberships(household_id,person_id,relationship_label,is_responsible_adult) values($1,$2,'Parent',true)`,[ids.household,ids.parentPerson]);
  await db.exec("set role service_role;select set_config('request.jwt.claim.role','service_role',false)");
  await denied(()=>db.query(`select public.finalize_document_submission_upload($1,$2,E'bad\\r\\n.pdf','application/pdf',$3,$4)`,[parentSubmission,ids.parent,pdf.fileSizeBytes,pdf.checksumSha256]),"Unsafe completed filenames cannot persist");
  await db.query(`select public.finalize_document_submission_upload($1,$2,'signed-form.pdf','application/pdf',$3,$4)`,[parentSubmission,ids.parent,pdf.fileSizeBytes,pdf.checksumSha256]);
  await db.exec("reset role");
  const finalized=await db.query(`select digital_status,lifecycle_status,original_file_name,checksum_sha256 from public.student_document_submissions where id=$1`,[parentSubmission]);
  assert.equal(finalized.rows[0].digital_status,"uploaded");assert.equal(finalized.rows[0].lifecycle_status,"digital_received");
  assert.equal(finalized.rows[0].original_file_name,"signed-form.pdf");assert.equal(finalized.rows[0].checksum_sha256,pdf.checksumSha256);
  assert.equal((await db.query(`select count(*) count from public.document_paper_evidence_events where submission_id=$1`,[parentSubmission])).rows[0].count,0,"Upload/download never confirms paper automatically");

  const roleChangedParent=await asUser(ids.parent,()=>db.query(`select public.prepare_document_submission_upload($1,$2,$3,'pdf',null) authorization`,[ids.student,ids.version,"a3000000-0000-4000-8000-000000000008"]));
  await asUser(ids.parent,()=>db.query(`insert into storage.objects(bucket_id,name,metadata) values('student-documents',$1,$2)`,[roleChangedParent.rows[0].authorization.objectPath,JSON.stringify({mimetype:"application/pdf",size:pdf.fileSizeBytes})]));
  await db.query(`update public.profiles set primary_role='volunteer' where id=$1`,[ids.parent]);
  await db.exec("set role service_role;select set_config('request.jwt.claim.role','service_role',false)");
  await denied(()=>db.query(`select public.finalize_document_submission_upload($1,$2,'role-changed.pdf','application/pdf',$3,$4)`,[roleChangedParent.rows[0].authorization.submissionId,ids.parent,pdf.fileSizeBytes,pdf.checksumSha256]),"Parent role changes deny trusted finalization");
  await db.exec("reset role");await db.query(`update public.profiles set primary_role='parent' where id=$1`,[ids.parent]);

  await db.query(`update public.profiles set primary_role='staff_member' where id=$1`,[ids.pastor]);
  await db.exec("set role service_role;select set_config('request.jwt.claim.role','service_role',false)");
  await denied(()=>db.query(`select public.finalize_document_submission_upload($1,$2,'staff-upload.png','image/png',$3,$4)`,[managerPrepared.rows[0].authorization.submissionId,ids.pastor,png.fileSizeBytes,png.checksumSha256]),"Youth Pastor authority loss after upload denies finalization");
  await db.exec("reset role");await db.query(`update public.profiles set primary_role='youth_pastor' where id=$1`,[ids.pastor]);
  await db.exec("set role service_role;select set_config('request.jwt.claim.role','service_role',false)");
  await db.query(`select public.finalize_document_submission_upload($1,$2,'staff-upload.png','image/png',$3,$4)`,[managerPrepared.rows[0].authorization.submissionId,ids.pastor,png.fileSizeBytes,png.checksumSha256]);
  await db.exec("reset role");

  const inactiveManager=await asUser(ids.pastor,()=>db.query(`select public.prepare_document_submission_upload($1,$2,$3,'pdf',null) authorization`,[ids.otherStudent,ids.version,"a3000000-0000-4000-8000-000000000009"]));
  await asUser(ids.pastor,()=>db.query(`insert into storage.objects(bucket_id,name,metadata) values('student-documents',$1,$2)`,[inactiveManager.rows[0].authorization.objectPath,JSON.stringify({mimetype:"application/pdf",size:pdf.fileSizeBytes})]));
  await db.query(`update public.profiles set status='suspended' where id=$1`,[ids.pastor]);
  await db.exec("set role service_role;select set_config('request.jwt.claim.role','service_role',false)");
  await denied(()=>db.query(`select public.finalize_document_submission_upload($1,$2,'inactive-staff.pdf','application/pdf',$3,$4)`,[inactiveManager.rows[0].authorization.submissionId,ids.pastor,pdf.fileSizeBytes,pdf.checksumSha256]),"Inactive Youth Pastor cannot finalize an uploaded document");
  await db.exec("reset role");await db.query(`update public.profiles set status='active' where id=$1`,[ids.pastor]);

  const crossHouseholdSubmission="a3000000-0000-4000-8000-000000000010";
  const crossHouseholdPath=`submissions/${ids.otherStudent}/${crossHouseholdSubmission}/a3000000-0000-4000-8000-000000000011.pdf`;
  await db.query(`insert into public.student_document_submissions(id,student_id,household_id,template_version_id,upload_source,submitted_by_profile_id,storage_bucket,storage_object_path) values($1,$2,$3,$4,'parent',$5,'student-documents',$6)`,[crossHouseholdSubmission,ids.otherStudent,ids.otherHousehold,ids.version,ids.parent,crossHouseholdPath]);
  await db.query(`insert into storage.objects(bucket_id,name,metadata) values('student-documents',$1,$2)`,[crossHouseholdPath,JSON.stringify({mimetype:"application/pdf",size:pdf.fileSizeBytes})]);
  await db.exec("set role service_role;select set_config('request.jwt.claim.role','service_role',false)");
  await denied(()=>db.query(`select public.finalize_document_submission_upload($1,$2,'cross-household.pdf','application/pdf',$3,$4)`,[crossHouseholdSubmission,ids.parent,pdf.fileSizeBytes,pdf.checksumSha256]),"Cross-household Parent attribution cannot finalize a document");
  await db.exec("reset role");

  await denied(()=>asUser(ids.staff,()=>db.query(`select public.authorize_document_submission_download($1)`,[parentSubmission])),"Ordinary Staff cannot download completed Permission Slips");
  await asUser(ids.parent,()=>db.query(`select public.authorize_document_submission_download($1)`,[parentSubmission]));
  await denied(()=>asUser(ids.volunteer,()=>db.query(`select public.authorize_document_submission_download($1)`,[parentSubmission])),"Volunteers cannot download documents");
  const unrelatedPrepared=await asUser(ids.admin,()=>db.query(`select public.prepare_document_submission_upload($1,$2,$3,'pdf',null) authorization`,[ids.otherStudent,ids.version,"a3000000-0000-4000-8000-000000000005"]));
  const unrelatedId=unrelatedPrepared.rows[0].authorization.submissionId;
  await db.query(`insert into storage.objects(bucket_id,name,metadata) values('student-documents',$1,$2)`,[unrelatedPrepared.rows[0].authorization.objectPath,JSON.stringify({mimetype:"application/pdf",size:pdf.fileSizeBytes})]);
  await db.exec("set role service_role;select set_config('request.jwt.claim.role','service_role',false)");
  await db.query(`select public.finalize_document_submission_upload($1,$2,'other-signed.pdf','application/pdf',$3,$4)`,[unrelatedId,ids.admin,pdf.fileSizeBytes,pdf.checksumSha256]);await db.exec("reset role");
  await denied(()=>asUser(ids.parent,()=>db.query(`select public.authorize_document_submission_download($1)`,[unrelatedId])),"Parents cannot download another household's document");
  await asUser(ids.admin,()=>db.query(`select public.reject_document_submission($1,'Incorrect completed document')`,[unrelatedId]));
  await denied(()=>asUser(ids.parent,()=>db.query(`select public.confirm_document_paper_copy($1,null)`,[parentSubmission])),"Parents cannot confirm paper evidence");
  await denied(()=>asUser(ids.staff,()=>db.query(`select public.confirm_document_paper_copy($1,'Paper received by office')`,[parentSubmission])),"Ordinary Staff cannot confirm Permission Slip paper evidence");
  await asUser(ids.pastor,()=>db.query(`select public.confirm_document_paper_copy($1,'Paper received by office')`,[parentSubmission]));
  await asUser(ids.pastor,()=>db.query(`select public.revoke_document_paper_confirmation($1,'Paper evidence corrected')`,[parentSubmission]));
  assert.equal((await db.query(`select count(*) count from public.document_paper_evidence_events where submission_id=$1`,[parentSubmission])).rows[0].count,2,"Paper evidence history is retained");
  await asUser(ids.pastor,()=>db.query(`select public.accept_document_submission($1,null)`,[parentSubmission]));
  await asUser(ids.pastor,()=>db.query(`select public.request_document_replacement($1,'Uploaded copy is unreadable')`,[parentSubmission]));
  const replacementPrepared=await asUser(ids.parent,()=>db.query(`select public.prepare_document_submission_upload($1,$2,$3,'pdf',$4) authorization`,[ids.student,ids.version,p3.replacementObject,parentSubmission]));
  const replacementId=replacementPrepared.rows[0].authorization.submissionId;
  const replacementHistory=await db.query(`select id,lifecycle_status,supersedes_submission_id,storage_object_path from public.student_document_submissions where id in ($1,$2) order by created_at`,[parentSubmission,replacementId]);
  assert.equal(replacementHistory.rows.length,2);assert.equal(replacementHistory.rows.find(r=>r.id===parentSubmission).lifecycle_status,"superseded");
  assert.equal(replacementHistory.rows.find(r=>r.id===replacementId).supersedes_submission_id,parentSubmission);
  assert.notEqual(replacementHistory.rows[0].storage_object_path,replacementHistory.rows[1].storage_object_path,"Replacement uses a new retained object path");

  const unconfiguredReadiness=(await asUser(ids.admin,()=>db.query(`select public.get_event_registration_document_readiness($1) state`,[ids.registration]))).rows[0].state;
  const unconfiguredMedical=unconfiguredReadiness.requirements.find(item=>item.documentKind==="medical_release");
  assert.equal(unconfiguredReadiness.ready,false,"Missing school-year medical configuration never produces READY");
  assert.equal(unconfiguredMedical.configured,false,"Missing medical configuration is projected explicitly");
  assert.equal(unconfiguredMedical.requirementId,null,"Missing configuration does not fabricate a requirement UUID");
  assert.equal(describeReadinessRequirement(unconfiguredMedical),"Medical Form requirement is not configured for this school year.");
  const unconfiguredOverrideState=getParticipationOverrideState(unconfiguredReadiness.requirements);
  assert.equal(unconfiguredOverrideState.eligible,false,"Unconfigured standing medical requirement exposes no override control");
  assert.deepEqual(unconfiguredOverrideState.requirementIds,[],"No null requirement identifier can reach a hidden override input");
  const configuredBlocker={...unconfiguredMedical,configured:true,requirementId:ids.requirement,templateName:"Configured Permission",documentKind:"permission_slip"};
  assert.deepEqual(getParticipationOverrideState([configuredBlocker]),{eligible:true,hasUnconfiguredBlocker:false,requirementIds:[ids.requirement]},"Configured blocking requirements retain override behavior");
  assert.equal(getParticipationOverrideState([configuredBlocker,unconfiguredMedical]).eligible,false,"Mixed configured and unconfigured blockers cannot be partially overridden");  await asUser(ids.admin,()=>db.query(`select public.set_school_year_medical_requirement('2026-08-01',$1)`,[ids.otherVersion]));
  const medicalPrepared=await asUser(ids.admin,()=>db.query(`select public.prepare_document_submission_upload($1,$2,$3,'jpg',null) authorization`,[ids.student,ids.otherVersion,p3.medicalObject]));
  await denied(()=>asUser(ids.staff,()=>db.query(`select public.prepare_document_submission_upload($1,$2,$3,'jpg',null)`,[ids.student,ids.otherVersion,"a3000000-0000-4000-8000-000000000013"])),"Ordinary Staff cannot upload Medical Forms");
  const medicalId=medicalPrepared.rows[0].authorization.submissionId;const medicalPath=medicalPrepared.rows[0].authorization.objectPath;
  await asUser(ids.admin,()=>db.query(`insert into storage.objects(bucket_id,name,metadata) values('student-documents',$1,$2)`,[medicalPath,JSON.stringify({mimetype:"image/jpeg",size:jpeg.fileSizeBytes})]));
  await db.exec("set role service_role;select set_config('request.jwt.claim.role','service_role',false)");
  await db.query(`select public.finalize_document_submission_upload($1,$2,'medical-scan.jpg','image/jpeg',$3,$4)`,[medicalId,ids.admin,jpeg.fileSizeBytes,jpeg.checksumSha256]);await db.exec("reset role");
  await asUser(ids.parent,()=>db.query(`select public.authorize_document_submission_download($1)`,[medicalId]));
  await denied(()=>asUser(ids.staff,()=>db.query(`select original_file_name from public.list_document_submissions() where submission_id=$1`,[medicalId])),"Medical and Permission submission listings are denied to ordinary Staff");
  await denied(()=>asUser(ids.volunteer,()=>db.query(`select * from public.list_document_submissions()`)),"Volunteers are denied the submission projection");
  await denied(()=>asUser(ids.staff,()=>db.query(`select public.authorize_document_submission_download($1)`,[medicalId])),"Ordinary Staff cannot download medical documents");
  await denied(()=>asUser(ids.staff,()=>db.query(`select public.verify_medical_document($1,null)`,[medicalId])),"Ordinary Staff cannot verify medical documents");
  await denied(()=>asUser(ids.admin,()=>db.query(`select public.verify_medical_document($1,null)`,[medicalId])),"Uploaded medical documents cannot be verified before general acceptance");
  await asUser(ids.admin,()=>db.query(`select public.accept_document_submission($1,null)`,[medicalId]));
  await asUser(ids.admin,()=>db.query(`select public.verify_medical_document($1,'Administrator verification')`,[medicalId]));
  assert.equal((await asUser(ids.admin,()=>db.query(`select medical_verified from public.list_document_submissions() where submission_id=$1`,[medicalId]))).rows[0].medical_verified,true);
  const medicalGrant=await asUser(ids.pastor,()=>db.query(`select public.grant_sensitive_forms_capability($1,'forms.medical.view','Phase 3 medical review',null) id`,[ids.staff]));
  await asUser(ids.admin,()=>db.query(`select public.grant_sensitive_forms_capability($1,'forms.medical.verify','Phase 3 medical verification',null)`,[ids.staff]));
  await denied(()=>asUser(ids.staff,()=>db.query(`select public.authorize_document_submission_download($1)`,[medicalId])),"An individual grant does not broaden the Admin/Youth Pastor medical workspace boundary");
  await denied(()=>asUser(ids.staff,()=>db.query(`select public.verify_medical_document($1,'Granted staff verification')`,[medicalId])),"Granted Staff cannot perform protected medical verification under the corrected role boundary");
  await asUser(ids.admin,()=>db.query(`select public.reject_document_submission($1,'Medical document rejected after verification')`,[medicalId]));
  assert.equal((await asUser(ids.admin,()=>db.query(`select medical_verified from public.list_document_submissions() where submission_id=$1`,[medicalId]))).rows[0].medical_verified,false,"Rejection invalidates current medical verification");
  await denied(()=>asUser(ids.admin,()=>db.query(`select public.verify_medical_document($1,null)`,[medicalId])),"Rejected medical documents cannot be verified");
  await asUser(ids.admin,()=>db.query(`select public.accept_document_submission($1,null)`,[medicalId]));
  await asUser(ids.admin,()=>db.query(`select public.verify_medical_document($1,'Reverified after accepted review')`,[medicalId]));
  await asUser(ids.admin,()=>db.query(`select public.request_document_replacement($1,'Medical replacement required')`,[medicalId]));
  assert.equal((await asUser(ids.admin,()=>db.query(`select medical_verified from public.list_document_submissions() where submission_id=$1`,[medicalId]))).rows[0].medical_verified,false,"Replacement request invalidates current medical verification");
  await denied(()=>asUser(ids.admin,()=>db.query(`select public.verify_medical_document($1,null)`,[medicalId])),"Replacement-requested medical documents cannot be verified");
  await asUser(ids.admin,()=>db.query(`select public.accept_document_submission($1,null)`,[medicalId]));
  await asUser(ids.admin,()=>db.query(`select public.verify_medical_document($1,'Verification before retained revocation')`,[medicalId]));
  await asUser(ids.admin,()=>db.query(`select public.revoke_medical_verification($1,'Verification deliberately revoked')`,[medicalId]));
  assert.equal((await asUser(ids.admin,()=>db.query(`select medical_verified from public.list_document_submissions() where submission_id=$1`,[medicalId]))).rows[0].medical_verified,false,"Explicit verification revocation is current");
  await asUser(ids.admin,()=>db.query(`select public.verify_medical_document($1,'Verification before supersession')`,[medicalId]));
  await asUser(ids.admin,()=>db.query(`select public.request_document_replacement($1,'Superseding verified medical document')`,[medicalId]));
  await asUser(ids.parent,()=>db.query(`select public.prepare_document_submission_upload($1,$2,$3,'jpg',$4)`,[ids.student,ids.otherVersion,"a3000000-0000-4000-8000-000000000012",medicalId]));
  assert.equal((await asUser(ids.admin,()=>db.query(`select medical_verified from public.list_document_submissions() where submission_id=$1`,[medicalId]))).rows[0].medical_verified,false,"Supersession invalidates current medical verification");
  await denied(()=>asUser(ids.parent,()=>db.query(`select public.verify_medical_document($1,null)`,[medicalId])),"Parents cannot verify medical documents");
  await denied(()=>asUser(ids.volunteer,()=>db.query(`select public.verify_medical_document($1,null)`,[medicalId])),"Volunteers cannot verify medical documents");
  assert.ok(medicalGrant.rows[0].id);
  const medicalHistory=await db.query(`select action from public.document_review_events where submission_id=$1 and action in ('medical_verified','medical_verification_revoked') order by occurred_at,id`,[medicalId]);
  assert.ok(medicalHistory.rows.filter(r=>r.action==='medical_verified').length>=4,"Historical medical verification evidence is retained");
  assert.equal(medicalHistory.rows.filter(r=>r.action==='medical_verification_revoked').length,1,"Explicit verification revocation evidence is retained");
  const sensitiveAudit=await db.query(`select metadata from public.audit_events where action like 'forms.%document%' or action like 'forms.paper_%'`);
  assert.ok(sensitiveAudit.rows.every(r=>!/(storage|path|filename|content|medical instruction|contact)/i.test(JSON.stringify(r.metadata))),"Completed-document audit metadata remains sanitized");
  const route=await readFile("app/api/forms/submissions/[submissionId]/download/route.ts","utf8");
  assert.match(route,/Content-Disposition/);assert.match(route,/nosniff/);assert.match(route,/private, no-store/);

  await db.query(`update public.event_document_requirements set archived_at=now(),archived_by_profile_id=$1 where id=$2`,[ids.admin,ids.requirement]);
  const currentMedical=(await db.query(`select id from public.student_document_submissions where student_id=$1 and template_version_id=$2 and lifecycle_status<>'superseded' order by created_at desc limit 1`,[ids.student,ids.otherVersion])).rows[0].id;
  await db.query(`update public.student_document_submissions set digital_status='accepted',lifecycle_status='under_review',content_type='image/jpeg',file_size_bytes=100,checksum_sha256=repeat('a',64),original_file_name='current-medical.jpg' where id=$1`,[currentMedical]);
  await db.query(`insert into public.document_review_events(submission_id,action,actor_profile_id) values($1,'accepted',$2),($1,'medical_verified',$2)`,[currentMedical,ids.admin]);
  await db.query(`insert into public.document_paper_evidence_events(submission_id,action,actor_profile_id) values($1,'confirmed_on_file',$2)`,[currentMedical,ids.admin]);
  const noRequirement=await asUser(ids.admin,()=>db.query(`select public.get_event_registration_document_readiness($1) state`,[ids.registration]));
  assert.equal(noRequirement.rows[0].state.ready,true,"No active Event requirements is READY");
  const normalCheckIn=await asUser(ids.admin,()=>db.query(`select public.check_in_student($1,$2) id`,[ids.event,ids.student]));
  assert.ok(normalCheckIn.rows[0].id,"Events without active document requirements check in normally");
  await asUser(ids.admin,()=>db.query(`select public.correct_student_check_in($1,$2,'Phase 4 readiness test reset')`,[ids.event,ids.student]));
  await db.query(`update public.event_participation_overrides set revoked_at=now(),revoked_by_profile_id=$1,revocation_reason='Superseded foundation fixture' where registration_id=$2 and revoked_at is null`,[ids.admin,ids.registration]);
  await db.query(`update public.event_document_requirements set archived_at=null,archived_by_profile_id=null where id=$1`,[ids.requirement]);
  const missingReadiness=await asUser(ids.admin,()=>db.query(`select public.get_event_registration_document_readiness($1) state`,[ids.registration]));
  assert.equal(missingReadiness.rows[0].state.ready,false,"A registered participant may remain NOT READY");
  assert.equal(missingReadiness.rows[0].state.registrationStatus,"registered","Readiness does not alter registration lifecycle");
  assert.deepEqual(Object.keys(missingReadiness.rows[0].state).sort(),["eventId","ready","registrationId","registrationStatus","requirements","studentId"].sort(),"Readiness projection is operational only");
  assert.ok(!/(filename|storage|checksum|content|review note|medical detail)/i.test(JSON.stringify(missingReadiness.rows[0].state)),"Readiness never exposes sensitive document data");
  const blockedCheckIn=await asUser(ids.admin,()=>db.query(`select public.check_in_student($1,$2) id`,[ids.event,ids.student]));
  assert.equal(blockedCheckIn.rows[0].id,null,"NOT READY without override is blocked");
  assert.equal((await db.query(`select count(*) count from public.audit_events where action='checkin.blocked_documentation' and entity_id=$1`,[ids.registration])).rows[0].count,1,"Blocked Check-In is audited");
  await asUser(ids.admin,()=>db.query(`select public.revoke_sensitive_forms_capability($1,'Phase 4 baseline without override authority')`,[renewedGrant.rows[0].id]));
  await denied(()=>asUser(ids.staff,()=>db.query(`select public.create_event_participation_override($1,array[$2]::uuid[],'Staff without authority',null)`,[ids.registration,ids.requirement])),"Staff without participation capability is denied");
  await denied(()=>asUser(ids.parent,()=>db.query(`select public.create_event_participation_override($1,array[$2]::uuid[],'Parent denied override',null)`,[ids.registration,ids.requirement])),"Parents cannot override participation");
  await denied(()=>asUser(ids.volunteer,()=>db.query(`select public.create_event_participation_override($1,array[$2]::uuid[],'Volunteer denied override',null)`,[ids.registration,ids.requirement])),"Volunteers cannot override participation");
  await denied(()=>asUser(ids.admin,()=>db.query(`select public.create_event_participation_override($1,array[$2]::uuid[],'',null)`,[ids.registration,ids.requirement])),"Override reason is required");
  await denied(()=>asUser(ids.admin,()=>db.query(`select public.create_event_participation_override($1,array[$2]::uuid[],'Cross Event requirement',null)`,[ids.registration,ids.otherRequirement])),"Cross-Event requirement override is rejected");
  const adminOverride=await asUser(ids.admin,()=>db.query(`select public.create_event_participation_override($1,array[$2]::uuid[],'Approved participation exception',null) id`,[ids.registration,ids.requirement]));
  assert.ok(adminOverride.rows[0].id,"Administrator override succeeds");
  assert.equal((await asUser(ids.admin,()=>db.query(`select public.get_event_registration_document_readiness($1) state`,[ids.registration]))).rows[0].state.ready,false,"Override does not modify documentation readiness");
  const overrideCheckIn=await asUser(ids.admin,()=>db.query(`select public.check_in_student($1,$2) id`,[ids.event,ids.student]));
  assert.ok(overrideCheckIn.rows[0].id,"Applicable override allows Check-In");
  await asUser(ids.admin,()=>db.query(`select public.correct_student_check_in($1,$2,'Reset after override Check-In')`,[ids.event,ids.student]));
  await asUser(ids.admin,()=>db.query(`select public.revoke_event_participation_override($1,'Override no longer approved')`,[adminOverride.rows[0].id]));
  assert.equal((await asUser(ids.admin,()=>db.query(`select public.check_in_student($1,$2) id`,[ids.event,ids.student]))).rows[0].id,null,"Revoked override cannot authorize Check-In");
  const overrideGrant=await asUser(ids.admin,()=>db.query(`select public.grant_sensitive_forms_capability($1,'forms.participation.override','Temporary Event authority',now()+interval '1 day') id`,[ids.staff]));
  const staffOverride=await asUser(ids.staff,()=>db.query(`select public.create_event_participation_override($1,array[$2]::uuid[],'Granted Staff participation exception',null) id`,[ids.registration,ids.requirement]));
  assert.ok(staffOverride.rows[0].id);assert.ok(overrideGrant.rows[0].id,"Explicitly granted Staff may override");
  await db.query(`update public.event_document_requirements set archived_at=now(),archived_by_profile_id=$1 where id=$2`,[ids.admin,ids.requirement]);
  assert.equal((await asUser(ids.admin,()=>db.query(`select public.get_event_registration_document_readiness($1) state`,[ids.registration]))).rows[0].state.ready,true,"Archived requirements no longer block readiness");
  const overrideHistory=await db.query(`select count(*) count from public.event_participation_overrides where registration_id=$1`,[ids.registration]);
  assert.ok(Number(overrideHistory.rows[0].count)>=3,"Participation override history remains retained");
  const phase4Audit=await db.query(`select metadata from public.audit_events where action in ('forms.participation_override_created','forms.participation_override_revoked','checkin.blocked_documentation','checkin.allowed_participation_override')`);
  assert.ok(phase4Audit.rows.length>=5);assert.ok(phase4Audit.rows.every(r=>!/(filename|storage|checksum|content|medical|review|reason)/i.test(JSON.stringify(r.metadata))),"Phase 4 audit metadata remains sanitized");

  const p5 = {
    template: "b5000000-0000-4000-8000-000000000001",
    version: "b5000000-0000-4000-8000-000000000002",
    textField: "b5000000-0000-4000-8000-000000000003",
    acknowledgmentField: "b5000000-0000-4000-8000-000000000004",
    choiceField: "b5000000-0000-4000-8000-000000000005",
  };
  await denied(() => asUser(ids.parent, () => db.query(
    `select public.create_custom_form_template('Denied','Parent cannot manage')`)),
    "Parents cannot manage Custom Form templates");
  await denied(() => asUser(ids.volunteer, () => db.query(
    `select public.list_custom_form_templates()`)),
    "Volunteers cannot receive Custom Form management projections");
  const createdTemplate = await asUser(ids.admin, () => db.query(
    `select public.create_custom_form_template('Phase 5 Operations','No medical-document content') id`));
  p5.template = createdTemplate.rows[0].id;
  const createdVersion = await asUser(ids.admin, () => db.query(
    `select public.create_custom_form_version($1,'Operational Contact','Complete all required items') id`,[p5.template]));
  p5.version = createdVersion.rows[0].id;
  const textField = await asUser(ids.admin, () => db.query(
    `select public.save_custom_form_field($1,null,'contact_note','short_text','Operational note',null,true,1,3,40,null,null,null) id`,[p5.version]));
  p5.textField = textField.rows[0].id;
  const acknowledgmentField = await asUser(ids.admin, () => db.query(
    `select public.save_custom_form_field($1,null,'policy_ack','acknowledgment','I acknowledge the ministry policy',null,true,2,null,null,null,null,null) id`,[p5.version]));
  p5.acknowledgmentField = acknowledgmentField.rows[0].id;
  const choiceField = await asUser(ids.admin, () => db.query(
    `select public.save_custom_form_field($1,null,'shirt_size','single_choice','T-Shirt Size',null,true,3,null,null,null,null,'["Small","Medium","Large"]'::jsonb) id`,[p5.version]));
  p5.choiceField = choiceField.rows[0].id;
  await asUser(ids.admin, () => db.query(`select public.publish_custom_form_version($1)`,[p5.version]));
  await denied(() => db.query(`update public.custom_form_versions set title='Mutated' where id=$1`,[p5.version]),
    "Published Custom Form versions remain immutable");
  await denied(() => db.query(`update public.custom_form_fields set label='Mutated' where id=$1`,[p5.textField]),
    "Published Custom Form fields remain immutable");
  const nextVersion = await asUser(ids.admin, () => db.query(
    `select public.create_custom_form_version($1,'Operational Contact revision',null) id`,[p5.template]));
  assert.notEqual(nextVersion.rows[0].id,p5.version,"Post-publication edits require a new version");
  await denied(()=>asUser(ids.admin,()=>db.query(`select public.create_custom_form_assignment($1,'general_ministry',null,null,null,null)`,[nextVersion.rows[0].id])),"Unpublished Custom Form versions cannot become respondent assignments");

  const studentAssignment = (await asUser(ids.admin, () => db.query(
    `select public.create_custom_form_assignment($1,'student',null,$2,null,null) id`,[p5.version,ids.student]))).rows[0].id;
  const householdAssignment = (await asUser(ids.admin, () => db.query(
    `select public.create_custom_form_assignment($1,'household',null,null,$2,null) id`,[p5.version,ids.household]))).rows[0].id;
  const volunteerAssignment = (await asUser(ids.admin, () => db.query(
    `select public.create_custom_form_assignment($1,'volunteer',null,null,null,$2) id`,[p5.version,ids.volunteer]))).rows[0].id;
  const eventAssignment = (await asUser(ids.admin, () => db.query(
    `select public.create_custom_form_assignment($1,'event',$2,null,null,null) id`,[p5.version,ids.event]))).rows[0].id;
  const generalAssignment = (await asUser(ids.admin, () => db.query(
    `select public.create_custom_form_assignment($1,'general_ministry',null,null,null,null) id`,[p5.version]))).rows[0].id;
  const duplicateAssignmentCases = [
    ["student",null,ids.student,null,null],
    ["household",null,null,ids.household,null],
    ["volunteer",null,null,null,ids.volunteer],
    ["event",ids.event,null,null,null],
    ["general_ministry",null,null,null,null],
  ];
  for (const [assignmentType,eventId,studentId,householdId,volunteerProfileId] of duplicateAssignmentCases) {
    await assert.rejects(
      () => asUser(ids.admin, () => db.query(
        `select public.create_custom_form_assignment($1,$2,$3,$4,$5,$6)`,
        [p5.version,assignmentType,eventId,studentId,householdId,volunteerProfileId],
      )),
      /This form is already assigned to that target\./,
      `Duplicate active ${assignmentType} assignment is rejected with a stable message`,
    );
  }
  await denied(() => db.query(
    `insert into public.custom_form_assignments(version_id,assignment_type,is_general_ministry,assigned_by_profile_id) values($1,'general_ministry',true,$2)`,[p5.version,ids.admin]),
    "The database unique index independently rejects duplicate active General Ministry assignments with null targets");
  await denied(() => asUser(ids.parent, () => db.query(
    `select public.create_custom_form_assignment($1,'general_ministry',null,null,null,null)`,[p5.version])),
    "Respondents cannot create assignments");
  const administratorEventDraft=(await asUser(ids.admin,()=>db.query(
    `select public.open_custom_form_assignment($1,$2) draft`,[eventAssignment,ids.student]))).rows[0].draft;
  assert.equal(administratorEventDraft.status,"draft","Administrator can retain their own authorized Event-subject draft");
  await db.query(`insert into public.student_relationships(student_id,person_id,relationship_type,is_legal_guardian,may_sign_permission_forms,may_view_student_information)
    values($1,$2,'Parent',true,true,true) on conflict(student_id,person_id) do update set may_view_student_information=true`,[ids.student,ids.parentPerson]);
  await db.query(`insert into public.student_relationships(student_id,person_id,relationship_type,is_legal_guardian,may_sign_permission_forms,may_view_student_information)
    values($1,$2,'Guardian',true,true,true) on conflict(student_id,person_id) do update set may_view_student_information=true`,[ids.student,ids.guardianPerson]);
  await db.query(`update public.students set primary_household_id=$1 where id=$2`,[ids.household,ids.otherStudent]);
  await db.query(`insert into public.student_relationships(student_id,person_id,relationship_type,is_legal_guardian,may_sign_permission_forms,may_view_student_information)
    values($1,$2,'Parent',true,true,true) on conflict(student_id,person_id) do update set may_view_student_information=true`,[ids.otherStudent,ids.parentPerson]);
  const parentForms = await asUser(ids.parent, () => db.query(`select * from public.list_my_custom_forms()`));
  assert.ok(parentForms.rows.some(r=>r.assignment_id===studentAssignment));
  assert.ok(parentForms.rows.some(r=>r.assignment_id===householdAssignment));
  assert.ok(parentForms.rows.some(r=>r.assignment_id===eventAssignment && r.subject_student_id===ids.student));
  assert.ok(parentForms.rows.some(r=>r.assignment_id===generalAssignment));
  const volunteerForms = await asUser(ids.volunteer, () => db.query(`select * from public.list_my_custom_forms()`));
  assert.ok(volunteerForms.rows.some(r=>r.assignment_id===volunteerAssignment));
  await denied(() => asUser(ids.volunteer, () => db.query(
    `select public.open_custom_form_assignment($1,null)`,[studentAssignment])),
    "A volunteer cannot answer an unrelated Student assignment");
  await denied(() => asUser(ids.parent, () => db.query(
    `select public.open_custom_form_assignment($1,$2)`,[eventAssignment,ids.otherStudent])),
    "An authorized sibling without a qualifying Event Registration is rejected");

  await db.query(`update public.profiles set status='suspended' where id=$1`,[ids.parent]);
  await denied(() => asUser(ids.parent, () => db.query(`select * from public.list_my_custom_forms()`)),
    "An inactive respondent cannot list Custom Form assignments");
  await denied(() => asUser(ids.parent, () => db.query(
    `select public.open_custom_form_assignment($1,null)`,[generalAssignment])),
    "An inactive respondent cannot open Custom Form assignments");
  await db.query(`update public.profiles set status='active' where id=$1`,[ids.parent]);

  async function completeRespondentWorkflow(assignmentId, subjectStudentId, answerLabel) {
    const firstOpen = await asUser(ids.parent, () => db.query(
      `select public.open_custom_form_assignment($1,$2) draft`,[assignmentId,subjectStudentId]));
    const submissionId = firstOpen.rows[0].draft.submissionId;
    assert.equal(firstOpen.rows[0].draft.status,"draft",`${answerLabel} opens as a draft`);
    const resumed = await asUser(ids.parent, () => db.query(
      `select public.open_custom_form_assignment($1,$2) draft`,[assignmentId,subjectStudentId]));
    assert.equal(resumed.rows[0].draft.submissionId,submissionId,`${answerLabel} resumes the same draft`);
    await asUser(ids.parent, () => db.query(
      `select public.save_custom_form_answer($1,$2,$3,null,null,null,null)`,[submissionId,p5.textField,answerLabel]));
    await asUser(ids.parent, () => db.query(
      `select public.save_custom_form_answer($1,$2,null,true,null,null,null)`,[submissionId,p5.acknowledgmentField]));
    await asUser(ids.parent, () => db.query(
      `select public.save_custom_form_answer($1,$2,null,null,null,'Medium',null)`,[submissionId,p5.choiceField]));
    await asUser(ids.parent, () => db.query(`select public.submit_custom_form($1)`,[submissionId]));
    const retained = await asUser(ids.parent, () => db.query(
      `select public.get_custom_form_submission($1) detail`,[submissionId]));
    assert.equal(retained.rows[0].detail.status,"submitted",`${answerLabel} submits successfully`);
    assert.ok(retained.rows[0].detail.answers.some(answer => answer.textValue===answerLabel),
      `${answerLabel} completed submission and answers are retained`);
    return submissionId;
  }

  const householdSubmissionId = await completeRespondentWorkflow(householdAssignment,null,"Household response");
  const parentEventOpen=await asUser(ids.parent,()=>db.query(`select public.open_custom_form_assignment($1,$2) draft`,[eventAssignment,ids.student]));
  const eventSubmissionId=parentEventOpen.rows[0].draft.submissionId;
  assert.equal(eventSubmissionId,administratorEventDraft.submissionId,"Eligible Parent opens the Administrator-initiated authoritative subject draft");
  await asUser(ids.parent,()=>db.query(`select public.save_custom_form_answer($1,$2,'Event youth response',null,null,null,null)`,[eventSubmissionId,p5.textField]));
  await asUser(ids.parent,()=>db.query(`select public.save_custom_form_answer($1,$2,null,null,null,'Medium',null)`,[eventSubmissionId,p5.choiceField]));
  assert.equal((await db.query(`select choice_value from public.custom_form_answers where submission_id=$1 and field_id=$2`,[eventSubmissionId,p5.choiceField])).rows[0].choice_value,"Medium","Choice answer persists against the correct submission and field");
  const choiceResume=await asUser(ids.parent,()=>db.query(`select public.open_custom_form_assignment($1,$2) draft`,[eventAssignment,ids.student]));
  assert.equal(choiceResume.rows[0].draft.fields.find(field=>field.fieldId===p5.choiceField).choiceValue,"Medium","Reopening returns the stored choice answer");
  await asUser(ids.parent,()=>db.query(`select public.save_custom_form_answer($1,$2,null,null,null,'Large',null)`,[eventSubmissionId,p5.choiceField]));
  const updatedChoiceResume=await asUser(ids.parent,()=>db.query(`select public.open_custom_form_assignment($1,$2) draft`,[eventAssignment,ids.student]));
  assert.equal(updatedChoiceResume.rows[0].draft.fields.find(field=>field.fieldId===p5.choiceField).choiceValue,"Large","Updated draft choice survives another reopen");
  await denied(()=>asUser(ids.parent,()=>db.query(`select public.save_custom_form_answer($1,$2,null,null,null,'Not configured',null)`,[eventSubmissionId,p5.choiceField])),"Invalid choice values remain rejected at the database boundary");
  await asUser(ids.parent,()=>db.query(`select public.save_custom_form_answer($1,$2,null,true,null,null,null)`,[eventSubmissionId,p5.acknowledgmentField]));
  const parentEventResume=await asUser(ids.parent,()=>db.query(`select public.open_custom_form_assignment($1,$2) draft`,[eventAssignment,ids.student]));
  assert.equal(parentEventResume.rows[0].draft.submissionId,eventSubmissionId,"Parent resumes the same shared subject draft");
  const guardianEventOpen=await asUser(ids.guardian,()=>db.query(`select public.open_custom_form_assignment($1,$2) draft`,[eventAssignment,ids.student]));
  assert.equal(guardianEventOpen.rows[0].draft.submissionId,eventSubmissionId,"A second authorized guardian opens the same subject draft");
  await asUser(ids.parent,()=>db.query(`select public.submit_custom_form($1)`,[eventSubmissionId]));
  const eventRows=await db.query(`select submitted_by_profile_id,status from public.custom_form_submissions where assignment_id=$1 and subject_student_id=$2`,[eventAssignment,ids.student]);
  assert.equal(eventRows.rows.length,1,"Only one authoritative Event submission exists per assignment and Student");
  assert.equal(eventRows.rows[0].submitted_by_profile_id,ids.admin,"submitted_by_profile_id retains the initiating actor");
  assert.equal(eventRows.rows[0].status,"submitted");
  const eventAudit=await db.query(`select action,actor_profile_id,metadata from public.audit_events where entity_id=$1 order by occurred_at`,[eventSubmissionId]);
  assert.ok(eventAudit.rows.some(row=>row.action==="custom_forms.submission_answer_saved"&&row.actor_profile_id===ids.parent),"Answer-save audit identifies the actual Parent editor");
  assert.ok(eventAudit.rows.some(row=>row.action==="custom_forms.submission_submitted"&&row.actor_profile_id===ids.parent),"Submission audit identifies the actual Parent submitter");
  assert.ok(eventAudit.rows.every(row=>!JSON.stringify(row.metadata).includes("Event youth response")),"Shared-draft audit metadata excludes answer values");
  const submittedReopen=await asUser(ids.guardian,()=>db.query(`select public.open_custom_form_assignment($1,$2) draft`,[eventAssignment,ids.student]));
  assert.equal(submittedReopen.rows[0].draft.submissionId,eventSubmissionId,"Submitted subject form reopens the retained row");
  assert.equal(submittedReopen.rows[0].draft.status,"submitted","Submitted subject form is returned locked");
  await denied(()=>asUser(ids.guardian,()=>db.query(`select public.save_custom_form_answer($1,$2,'changed',null,null,null,null)`,[eventSubmissionId,p5.textField])),"Another authorized actor cannot change submitted answers");
  await denied(()=>asUser(ids.guardian,()=>db.query(`select public.save_custom_form_answer($1,$2,null,null,null,'Small',null)`,[eventSubmissionId,p5.choiceField])),"Submitted choice answers are immutable");
  assert.equal((await db.query(`select count(*) count from public.custom_form_submissions where assignment_id=$1 and subject_student_id=$2`,[eventAssignment,ids.student])).rows[0].count,1,"Reopening after submission creates no replacement row");
  await denied(()=>asUser(ids.unrelatedParent,()=>db.query(`select public.open_custom_form_assignment($1,$2)`,[eventAssignment,ids.student])),"An unrelated Parent cannot open the subject submission");
  await denied(()=>asUser(ids.parent,()=>db.query(`select public.open_custom_form_assignment('ffffffff-ffff-4fff-8fff-ffffffffffff',null)`)),"An arbitrary assignment identifier cannot bypass authorization");
  const generalSubmissionId = await completeRespondentWorkflow(generalAssignment,null,"General ministry response");
  const guardianGeneral=(await asUser(ids.guardian,()=>db.query(`select public.open_custom_form_assignment($1,null) draft`,[generalAssignment]))).rows[0].draft.submissionId;
  assert.notEqual(guardianGeneral,generalSubmissionId,"General Ministry submissions remain respondent-owned");

  const opened = await asUser(ids.parent, () => db.query(
    `select public.open_custom_form_assignment($1,null) draft`,[studentAssignment]));
  const parentSubmissionId = opened.rows[0].draft.submissionId;
  assert.equal(opened.rows[0].draft.status,"draft");
  const reopened = await asUser(ids.parent, () => db.query(
    `select public.open_custom_form_assignment($1,null) draft`,[studentAssignment]));
  assert.equal(reopened.rows[0].draft.submissionId,parentSubmissionId,"Opening again resumes the retained draft");
  await denied(() => asUser(ids.parent, () => db.query(
    `select public.submit_custom_form($1)`,[parentSubmissionId])),
    "Missing required answers cannot become submitted");
  await asUser(ids.parent, () => db.query(
    `select public.save_custom_form_answer($1,$2,'Saved draft answer',null,null,null,null)`,[parentSubmissionId,p5.textField]));
  await asUser(ids.parent, () => db.query(
    `select public.save_custom_form_answer($1,$2,null,false,null,null,null)`,[parentSubmissionId,p5.acknowledgmentField]));
  await denied(() => asUser(ids.parent, () => db.query(
    `select public.submit_custom_form($1)`,[parentSubmissionId])),
    "Required acknowledgment FALSE does not satisfy completion");
  await asUser(ids.parent, () => db.query(
    `select public.save_custom_form_answer($1,$2,null,true,null,null,null)`,[parentSubmissionId,p5.acknowledgmentField]));
  await denied(() => asUser(ids.parent, () => db.query(`select public.submit_custom_form($1)`,[parentSubmissionId])),
    "A missing required choice prevents submission");
  await asUser(ids.parent, () => db.query(
    `select public.save_custom_form_answer($1,$2,null,null,null,'Small',null)`,[parentSubmissionId,p5.choiceField]));
  await asUser(ids.parent, () => db.query(`select public.submit_custom_form($1)`,[parentSubmissionId]));
  assert.equal((await db.query(`select status from public.custom_form_submissions where id=$1`,[parentSubmissionId])).rows[0].status,"submitted");
  await denied(() => asUser(ids.parent, () => db.query(
    `select public.save_custom_form_answer($1,$2,'changed',null,null,null,null)`,[parentSubmissionId,p5.textField])),
    "Submitted answers cannot be changed through the workflow");
  await denied(() => db.query(`delete from public.custom_form_answers where submission_id=$1`,[parentSubmissionId]),
    "Submitted answers cannot be deleted even by a trusted database caller");
  const retainedDetail = await asUser(ids.admin, () => db.query(
    `select public.get_custom_form_submission($1) detail`,[parentSubmissionId]));
  assert.equal(retainedDetail.rows[0].detail.status,"submitted");
  assert.ok(retainedDetail.rows[0].detail.answers.some(a=>a.textValue==="Saved draft answer"));
  await denied(() => asUser(ids.volunteer, () => db.query(
    `select public.get_custom_form_submission($1)`,[parentSubmissionId])),
    "Respondents cannot view another person's retained submission");
  const managerProjection = await asUser(ids.staff, () => db.query(`select * from public.list_custom_form_submissions(null)`));
  assert.ok(managerProjection.rows.some(r=>r.submission_id===parentSubmissionId),"Authorized managers receive retained oversight data");
  await asUser(ids.admin, () => db.query(`select public.archive_custom_form_submission($1)`,[parentSubmissionId]));
  assert.equal((await db.query(`select status from public.custom_form_submissions where id=$1`,[parentSubmissionId])).rows[0].status,"archived");
  await asUser(ids.volunteer, () => db.query(`select public.open_custom_form_assignment($1,null)`,[volunteerAssignment]));
  await asUser(ids.admin, () => db.query(`select public.archive_custom_form_assignment($1)`,[volunteerAssignment]));
  await denied(() => asUser(ids.volunteer, () => db.query(
    `select public.open_custom_form_assignment($1,null)`,[volunteerAssignment])),
    "Archived assignments reject new or resumed responses");
  const replacementVolunteerAssignment=(await asUser(ids.admin,()=>db.query(
    `select public.create_custom_form_assignment($1,'volunteer',null,null,null,$2) id`,[p5.version,ids.volunteer]))).rows[0].id;
  assert.notEqual(replacementVolunteerAssignment,volunteerAssignment,"An archived historical assignment does not prevent a new active assignment");
  assert.equal(Number((await db.query(`select count(*) count from public.custom_form_assignments where version_id=$1 and assignment_type='volunteer' and volunteer_profile_id=$2`,[p5.version,ids.volunteer])).rows[0].count),2,"Archived and replacement assignment history are both retained");
  await asUser(ids.admin,()=>db.query(`select public.archive_custom_form_assignment($1)`,[replacementVolunteerAssignment]));

  await denied(() => asUser(ids.admin, () => db.query(`select public.retire_custom_form_version($1)`,[nextVersion.rows[0].id])),
    "Draft Custom Form versions cannot be retired");
  await asUser(ids.admin, () => db.query(`select public.archive_custom_form_template($1)`,[p5.template]));
  assert.equal((await db.query(`select status from public.custom_form_templates where id=$1`,[p5.template])).rows[0].status,"archived",
    "An active Custom Form template can be archived");
  await denied(() => asUser(ids.admin, () => db.query(`select public.archive_custom_form_template($1)`,[p5.template])),
    "An archived Custom Form template cannot be archived again");
  await asUser(ids.admin, () => db.query(`select public.retire_custom_form_version($1)`,[p5.version]));
  assert.equal((await db.query(`select status from public.custom_form_versions where id=$1`,[p5.version])).rows[0].status,"retired",
    "A published Custom Form version can be retired after its assignments are archived");
  await denied(() => asUser(ids.admin, () => db.query(`select public.retire_custom_form_version($1)`,[p5.version])),
    "A retired Custom Form version cannot be retired again");
  for (const submissionId of [householdSubmissionId,eventSubmissionId,generalSubmissionId]) {
    const retained = await asUser(ids.admin, () => db.query(`select public.get_custom_form_submission($1) detail`,[submissionId]));
    assert.equal(retained.rows[0].detail.status,"submitted",
      "Archiving a template and retiring its version preserve historical submissions");
    assert.ok(retained.rows[0].detail.answers.some(answer => answer.textValue),
      "Historical answers remain available after template archival");
  }
  const customAudit = await db.query(`select metadata from public.audit_events where action like 'custom_forms.%'`);
  assert.ok(customAudit.rows.length>=5);
  assert.ok(customAudit.rows.every(r=>!JSON.stringify(r.metadata).includes("Saved draft answer")),
    "Form answers are never copied into audit metadata");
  const assignmentUniquenessMigration = await readFile("supabase/migrations/202608230003_custom_form_assignment_active_uniqueness.sql","utf8");
  assert.match(assignmentUniquenessMigration,/nulls not distinct\s+where archived_at is null/i,"Database uniqueness treats General Ministry null targets as equal and scopes enforcement to active rows");
  assert.match(assignmentUniquenessMigration,/Duplicate active Custom Form assignments must be archived through the established lifecycle/,"Migration refuses to conceal existing duplicate data");
  const customAssignmentActionSource = await readFile("features/forms/actions/custom-form-actions.ts","utf8");
  assert.match(customAssignmentActionSource,/This form is already assigned to that target\./,"Application returns a friendly duplicate-assignment message");
  assert.match(customAssignmentActionSource,/isDuplicateCustomFormAssignmentError/,"Application sanitizes unique-index race errors");
  const respondentUniquenessMigration=await readFile("supabase/migrations/202608230004_custom_form_submission_respondent_uniqueness.sql","utf8");
  assert.doesNotMatch(respondentUniquenessMigration,/drop index|create unique index/i,"Model B correction leaves all original submission indexes unchanged");
  assert.match(respondentUniquenessMigration,/a\.assignment_type in \('student','event'\) and s\.subject_student_id=subject_student/i,"Student and Event submissions resolve by authoritative Student subject");
  assert.match(respondentUniquenessMigration,/a\.assignment_type='general_ministry' and s\.submitted_by_profile_id=auth\.uid\(\)/i,"General Ministry remains respondent-owned");
  assert.match(respondentUniquenessMigration,/custom_forms\.submission_answer_saved/i,"Shared draft answer changes record sanitized actor audit evidence");
  const formsNavigationSource = await readFile("config/navigation-config.ts","utf8");
  assert.match(formsNavigationSource,/capability: "custom_forms\.submit",\s*href: "\/permission-forms"/,"Forms navigation follows the respondent capability instead of a manager capability or role bypass");
  const formsRouteSource = await readFile("app/(platform)/permission-forms/page.tsx","utf8");
  assert.match(formsRouteSource,/customSubmit=hasCapability\(account\.role,"custom_forms\.submit"\)/,"Forms route recognizes respondent capability");
  assert.match(formsRouteSource,/formsAccess=documentsAccess\|\|customManager\|\|customSubmit/);
  assert.match(formsRouteSource,/manager=\{customManager\}/,"Custom Form management controls remain capability-gated");
  assert.match(formsRouteSource,/\{documentsManager\?<><section/,"Document template management remains manager-only");
  assert.match(formsRouteSource,/\{medicalManager\?<MedicalFormsWorkspace/,"Medical management remains manager-only");
  assert.doesNotMatch(formsRouteSource,/VisitorCardsWorkspace|visitor_cards\.manage/,"Parent Forms access does not reintroduce Visitor management");
  const managerTemplateRouteSource = await readFile("app/(platform)/permission-forms/[templateId]/page.tsx","utf8");
  assert.match(managerTemplateRouteSource,/requireCapability\("forms\.documents\.manage"\)/,"Direct template-management access remains denied without its manager capability");
  const respondentRouteSource = await readFile("app/(platform)/permission-forms/my/[assignmentId]/page.tsx","utf8");
  assert.match(respondentRouteSource,/openCustomForm/);assert.match(respondentRouteSource,/CustomFormRespondent/,"The existing respondent draft/submission workflow remains reachable");
  assert.match(respondentRouteSource,/result\.reason==="not_found"\)notFound\(\)/,"Only concealed missing or denied assignments become 404 responses");
  assert.match(respondentRouteSource,/temporarily unavailable/,"Operational failures render a sanitized unavailable state");
  const customFormServiceSource=await readFile("features/forms/services/custom-form-service.ts","utf8");
  assert.match(customFormServiceSource,/z\.string\(\)\.uuid\(\)\.safeParse\(assignmentId\)/,"Malformed assignment IDs are rejected before the RPC call");
  assert.match(customFormServiceSource,/\["22P02","42501","P0002"\]/,"Only known missing or denied RPC states are concealed as not found");
  const customFormRespondentSource=await readFile("features/forms/components/custom-form-respondent.tsx","utf8");
  assert.match(customFormRespondentSource,/value=\{choiceValue\} onChange=/,"Single-choice controls render the returned saved value as controlled state");
  assert.match(customFormRespondentSource,/checked=\{multipleChoiceValue\.includes\(o\)\}/,"Multiple-choice controls restore every returned selection");
  assert.match(customFormRespondentSource,/name="assignmentId" value=\{assignmentId\}/,"Draft saves carry the authoritative assignment route identifier");
  const customFormActionsSource=await readFile("features/forms/actions/custom-form-actions.ts","utf8");
  assert.ok(customFormActionsSource.includes('revalidatePath(`/permission-forms/my/${assignmentId}`)'),"Draft save revalidates the assignment route instead of a nonexistent submission-ID route");
  const assignmentUiSource = await readFile("features/forms/components/custom-forms-workspace.tsx","utf8");
  assert.doesNotMatch(assignmentUiSource,/Target ID/,"Custom Form assignments do not expose raw UUID entry");
  assert.match(assignmentUiSource,/targets\.events/);assert.match(assignmentUiSource,/targets\.students/);assert.match(assignmentUiSource,/targets\.households/);assert.match(assignmentUiSource,/targets\.volunteers/);
  assert.match(assignmentUiSource,/General Ministry assignments apply without a specific target\./,"General Ministry deliberately remains targetless");
  assert.match(assignmentUiSource,/name="targetId" required/,"Targeted assignments require a selected option");
  const assignmentSchemaSource = await readFile("features/forms/schemas/custom-form-schema.ts","utf8");
  assert.match(assignmentSchemaSource,/Select a target before creating the assignment\./,"Missing targeted assignments receive an operator-friendly validation message");
  assert.match(assignmentSchemaSource,/General Ministry assignments do not use a target\./,"General Ministry cannot retain a stale target");
  const assignmentTargetServiceSource = await readFile("features/forms/services/custom-form-assignment-target-service.ts","utf8");
  assert.match(assignmentTargetServiceSource,/listSchedulableEvents/);assert.match(assignmentTargetServiceSource,/listMemberDirectory/);assert.match(assignmentTargetServiceSource,/listAccessibleFamilies/);assert.match(assignmentTargetServiceSource,/listVolunteerDirectory/);
  assert.doesNotMatch(assignmentTargetServiceSource,/\.from\(/,"Assignment choices reuse protected directory workflows instead of direct table access");  const phase5Migration = await readFile("supabase/migrations/202608160001_custom_forms_workflows.sql","utf8");
  assert.ok(!/event_document_requirements|document_requirement_state|check_in_student/i.test(phase5Migration),
    "Custom Forms remain separate from document readiness and Check-In blocking");

  const navigationSource = await readFile("config/navigation-config.ts","utf8");
  assert.match(navigationSource,/capability: "visitor_cards\.manage",\s*href: "\/visitors",\s*icon: "visitors",\s*label: "Visitors"/,"Authorized Visitor managers receive a first-class Visitors navigation destination");
  const formsPageSource = await readFile("app/(platform)/permission-forms/page.tsx","utf8");
  assert.doesNotMatch(formsPageSource,/VisitorCardsWorkspace|listVisitorCards|listVisitorCardEvents|visitor_cards\.manage/,"Visitor management is no longer presented in the Forms workspace");
  const visitorsPageSource = await readFile("app/(platform)/visitors/page.tsx","utf8");
  assert.match(visitorsPageSource,/hasCapability\(account\.role, "visitor_cards\.manage"\)/,"Direct Visitors access retains the established capability boundary");
  assert.match(visitorsPageSource,/VisitorCardsWorkspace/);assert.match(visitorsPageSource,/listVisitorCards/);assert.match(visitorsPageSource,/listVisitorCardEvents/);
  const visitorDetailPageSource = await readFile("app/(platform)/visitors/[visitorCardId]/page.tsx","utf8");
  assert.match(visitorDetailPageSource,/hasCapability\(account\.role, "visitor_cards\.manage"\)/,"Visitor detail access retains the established capability boundary");
  const visitorWorkspaceSource = await readFile("features/forms/components/visitor-cards-workspace.tsx","utf8");
  assert.match(visitorWorkspaceSource,/href={`\/visitors\/\$\{card\.visitorCardId\}`}/,"Visitor queue links use the first-class Visitors route");
  assert.doesNotMatch(visitorWorkspaceSource,/permission-forms\/visitors/);
  const visitorActionsSource = await readFile("features/forms/actions/visitor-card-actions.ts","utf8");
  assert.match(visitorActionsSource,/revalidatePath\("\/visitors"\)/);assert.doesNotMatch(visitorActionsSource,/permission-forms\/visitors/);
  assert.equal((await Promise.all([readFile("app/(platform)/visitors/page.tsx","utf8"),readFile("app/(platform)/visitors/[visitorCardId]/page.tsx","utf8")])).filter(source=>source.includes("VisitorCardsWorkspace")).length,1,"Visitor workspace implementation is reused rather than duplicated");
  assert.ok(!navigationSource.match(/roles:\s*\[[^\]]*visitor/i),"Visitors navigation does not use a role bypass around visitor_cards.manage");  const phase6Create=`select public.create_staff_visitor_card(null,current_date,'Phase','Youth','Phase Guardian','phase6@test.invalid','555-0106','8th','A friend','Sunday visit',true,true,'Call after school') id`;
  const adminVisitor=(await asUser(ids.admin,()=>db.query(phase6Create))).rows[0].id;
  const pastorVisitor=(await asUser(ids.pastor,()=>db.query(
    `select public.create_staff_visitor_card(null,current_date,'Pastor','Visitor',null,null,'555-0107',null,null,null,false,true,null) id`))).rows[0].id;
  const staffVisitor=(await asUser(ids.staff,()=>db.query(
    `select public.create_staff_visitor_card($1,current_date,'Staff','Visitor',null,'staff-visitor@test.invalid',null,null,null,null,true,false,null) id`,[ids.event]))).rows[0].id;
  assert.ok(adminVisitor&&pastorVisitor&&staffVisitor,"Administrator, Youth Pastor, and Staff creation succeeds");
  await denied(()=>asUser(ids.parent,()=>db.query(phase6Create)),"Parents cannot manage Visitor Cards");
  await denied(()=>asUser(ids.volunteer,()=>db.query(phase6Create)),"Volunteers cannot manage Visitor Cards");
  await db.query(`update public.profiles set status='suspended' where id=$1`,[ids.staff]);
  await denied(()=>asUser(ids.staff,()=>db.query(phase6Create)),"Inactive Staff cannot manage Visitor Cards");
  await db.query(`update public.profiles set status='active' where id=$1`,[ids.staff]);
  await denied(()=>asUser(ids.admin,()=>db.query(`select * from public.visitor_cards`)),"Direct Visitor Card table access remains denied");
  const attribution=await db.query(`select source,submitted_by_profile_id,privacy_acknowledgment_version from public.visitor_cards where id=$1`,[adminVisitor]);
  assert.equal(attribution.rows[0].source,"staff");assert.equal(attribution.rows[0].submitted_by_profile_id,ids.admin);assert.equal(attribution.rows[0].privacy_acknowledgment_version,null,
    "Staff creation does not invent visitor privacy acknowledgment");
  await denied(()=>asUser(ids.staff,()=>db.query(
    `select public.create_staff_visitor_card(null,current_date,'No','Contact',null,null,null,null,null,null,false,false,null)`)),
    "At least one contact method remains required");
  await denied(()=>db.query(`update public.visitor_cards set youth_first_name='Changed' where id=$1`,[adminVisitor]),
    "Original Visitor Card intake evidence is immutable");
  const matches=await asUser(ids.admin,()=>db.query(`select * from public.list_visitor_card_possible_matches($1)`,[adminVisitor]));
  assert.ok(matches.rows.some(row=>row.person_id===ids.person),"Possible matches provide decision support from existing Member data");
  assert.ok(matches.rows.every(row=>!Object.hasOwn(row,'email')&&!Object.hasOwn(row,'phone')),"Match projection excludes contact details");
  await asUser(ids.admin,()=>db.query(`select public.begin_visitor_card_review($1)`,[adminVisitor]));
  await denied(()=>asUser(ids.admin,()=>db.query(`select public.begin_visitor_card_review($1)`,[adminVisitor])),"Invalid repeated review-start transition fails");
  await asUser(ids.admin,()=>db.query(`select public.flag_visitor_card_possible_duplicate($1,'Similar name requires staff review')`,[adminVisitor]));
  await asUser(ids.admin,()=>db.query(`select public.clear_visitor_card_duplicate($1,'Staff confirmed this is not the same visitor')`,[adminVisitor]));
  const duplicateHistory=await db.query(`select action from public.visitor_card_review_events where visitor_card_id=$1 order by occurred_at,id`,[adminVisitor]);
  assert.ok(duplicateHistory.rows.some(row=>row.action==='duplicate_flagged'));
  assert.ok(duplicateHistory.rows.some(row=>row.action==='duplicate_cleared'));
  const peopleBefore=Number((await db.query(`select count(*) count from public.people`)).rows[0].count);
  const studentsBefore=Number((await db.query(`select count(*) count from public.students`)).rows[0].count);
  const householdsBefore=Number((await db.query(`select count(*) count from public.households`)).rows[0].count);
  const memberSnapshot=JSON.stringify((await db.query(`select p.first_name,p.last_name,p.email,p.phone,s.primary_household_id from public.people p join public.students s on s.person_id=p.id where p.id=$1`,[ids.person])).rows[0]);
  await asUser(ids.admin,()=>db.query(`select public.link_visitor_card_existing($1,'person',$2,'Confirmed existing Person')`,[adminVisitor,ids.person]));
  await asUser(ids.admin,()=>db.query(`select public.link_visitor_card_existing($1,'student',$2,'Confirmed existing Student')`,[adminVisitor,ids.student]));
  await asUser(ids.admin,()=>db.query(`select public.link_visitor_card_existing($1,'household',$2,'Confirmed existing Household')`,[adminVisitor,ids.household]));
  assert.equal(JSON.stringify((await db.query(`select p.first_name,p.last_name,p.email,p.phone,s.primary_household_id from public.people p join public.students s on s.person_id=p.id where p.id=$1`,[ids.person])).rows[0]),memberSnapshot,
    "Visitor linking does not mutate Member records");
  await asUser(ids.admin,()=>db.query(`select public.start_visitor_card_conversion($1)`,[adminVisitor]));
  await denied(()=>asUser(ids.admin,()=>db.query(`select public.complete_visitor_card_conversion($1)`,[adminVisitor])),"Conversion cannot complete without retained conversion evidence");
  await denied(()=>asUser(ids.admin,()=>db.query(
    `select public.record_visitor_card_conversion($1,$2,$3,$4,'Mismatched conversion evidence')`,[adminVisitor,ids.otherPerson,ids.student,ids.household])),
    "Invalid conversion relationships remain rejected");
  await asUser(ids.admin,()=>db.query(
    `select public.record_visitor_card_conversion($1,$2,$3,$4,'Member records created through Member Management')`,[adminVisitor,ids.person,ids.student,ids.household]));
  await asUser(ids.admin,()=>db.query(`select public.complete_visitor_card_conversion($1)`,[adminVisitor]));
  assert.equal((await db.query(`select status from public.visitor_cards where id=$1`,[adminVisitor])).rows[0].status,"converted");
  assert.equal(Number((await db.query(`select count(*) count from public.people`)).rows[0].count),peopleBefore);
  assert.equal(Number((await db.query(`select count(*) count from public.students`)).rows[0].count),studentsBefore);
  assert.equal(Number((await db.query(`select count(*) count from public.households`)).rows[0].count),householdsBefore,
    "Visitor conversion does not create Person, Student, or Household records");
  await asUser(ids.staff,()=>db.query(`select public.begin_visitor_card_review($1)`,[staffVisitor]));
  await asUser(ids.staff,()=>db.query(`select public.close_visitor_card($1,'No further follow-up requested')`,[staffVisitor]));
  await asUser(ids.staff,()=>db.query(`select public.reopen_visitor_card($1,'Visitor returned for another ministry visit')`,[staffVisitor]));
  await asUser(ids.staff,()=>db.query(`select public.archive_visitor_card($1,'Operational review is complete')`,[staffVisitor]));
  const archivedVisitor=await db.query(`select status,archived_at,archived_by_profile_id from public.visitor_cards where id=$1`,[staffVisitor]);
  assert.equal(archivedVisitor.rows[0].status,"archived");assert.ok(archivedVisitor.rows[0].archived_at);assert.equal(archivedVisitor.rows[0].archived_by_profile_id,ids.staff);
  const retainedReview=await db.query(`select action from public.visitor_card_review_events where visitor_card_id=$1`,[staffVisitor]);
  assert.ok(['review_started','closed','reopened','archived'].every(action=>retainedReview.rows.some(row=>row.action===action)),"Close, reopen, and archive history remains retained");
  assert.equal((await db.query(`select count(*) count from public.visitor_card_links where visitor_card_id=$1`,[adminVisitor])).rows[0].count,4,"Existing and conversion links remain retained");
  const managedRegistrationEvent="f5000000-0000-4000-8000-000000000001";
  await db.query(`insert into public.events(id,name,event_type,status,starts_at,ends_at,timezone,capacity,waitlist_capacity) values($1,'Managed Registration Event','special','published','2026-10-01 12:00+00','2026-10-01 14:00+00','America/Chicago',1,1)`,[managedRegistrationEvent]);
  const adminRegistrationOptions=await asUser(ids.admin,()=>db.query(`select * from public.list_my_event_registration_options($1)`,[managedRegistrationEvent]));
  assert.deepEqual(new Set(adminRegistrationOptions.rows.map(row=>row.student_id)),new Set([ids.student,ids.otherStudent]),"Platform Administrator sees all eligible active students");
  assert.equal((await asUser(ids.admin,()=>db.query(`select public.register_my_student_for_event($1,$2) status`,[managedRegistrationEvent,ids.student]))).rows[0].status,"registered");
  await denied(()=>asUser(ids.admin,()=>db.query(`select public.register_my_student_for_event($1,$2)`,[managedRegistrationEvent,ids.student])),"Duplicate active registration follows the existing rejection rule");
  assert.equal((await asUser(ids.admin,()=>db.query(`select public.register_my_student_for_event($1,$2) status`,[managedRegistrationEvent,ids.otherStudent]))).rows[0].status,"waitlisted","Existing capacity and waitlist behavior remains authoritative");
  const managedRoster=await asUser(ids.admin,()=>db.query(`select * from public.list_event_registrations($1)`,[managedRegistrationEvent]));
  assert.equal(managedRoster.rows.length,2,"Administrator-created registrations appear in the Event roster");
  const managedReadiness=await asUser(ids.admin,()=>db.query(`select * from public.list_event_registration_document_readiness($1)`,[managedRegistrationEvent]));
  assert.ok(managedReadiness.rows.some(row=>row.student_id===ids.student),"Administrator-created registration participates in Milestone 15 readiness");
  const waitlistedRegistration=managedRoster.rows.find(row=>row.student_id===ids.otherStudent);
  await asUser(ids.admin,()=>db.query(`select public.cancel_my_event_registration($1)`,[waitlistedRegistration.registration_id]));
  const cancelledRegistration=await db.query(`select status,cancelled_at,cancelled_by_profile_id from public.event_registrations where id=$1`,[waitlistedRegistration.registration_id]);
  assert.equal(cancelledRegistration.rows[0].status,"cancelled");assert.ok(cancelledRegistration.rows[0].cancelled_at);assert.equal(cancelledRegistration.rows[0].cancelled_by_profile_id,ids.admin,"Cancellation retains registration history and actor attribution");
  assert.equal((await asUser(ids.admin,()=>db.query(`select public.register_my_student_for_event($1,$2) status`,[managedRegistrationEvent,ids.otherStudent]))).rows[0].status,"waitlisted","Re-registration replaces cancellation with the current waitlist result");
  const reregistered=await db.query(`select id,status,cancelled_at,cancelled_by_profile_id from public.event_registrations where event_id=$1 and student_id=$2`,[managedRegistrationEvent,ids.otherStudent]);
  assert.equal(reregistered.rows[0].id,waitlistedRegistration.registration_id,"Re-registration reuses retained lifecycle history");assert.equal(reregistered.rows[0].status,"waitlisted");assert.equal(reregistered.rows[0].cancelled_at,null);assert.equal(reregistered.rows[0].cancelled_by_profile_id,null);
  const registrationUiSource=await readFile("features/events/components/family-event-registration.tsx","utf8");
  assert.equal((registrationUiSource.match(/useActionState\(/g)??[]).length,1,"Registration and cancellation share one current action-state channel");
  assert.match(registrationUiSource,/manageEventRegistrationAction/);assert.match(registrationUiSource,/name="intent" type="hidden" value="register"/);assert.match(registrationUiSource,/name="intent" type="hidden" value="cancel"/);
  assert.doesNotMatch(registrationUiSource,/cancelState|registerState/,"An old cancellation state cannot take precedence over a later registration result");
  const registrationActionSource=await readFile("features/events/actions/event-management-actions.ts","utf8");
  assert.match(registrationActionSource,/Student registered successfully\./,"Initial and repeated registration retain current success messaging");
  assert.match(registrationActionSource,/Registration cancelled\./,"Cancellation retains its success message");
  assert.match(registrationActionSource,/Student added to the waitlist\./,"Waitlist-specific messaging remains intact");  await denied(()=>asUser(ids.staff,()=>db.query(`select public.register_my_student_for_event($1,$2)`,[managedRegistrationEvent,ids.otherStudent])),"Ordinary Staff do not gain administrator registration authority");
  await denied(()=>asUser(ids.volunteer,()=>db.query(`select public.register_my_student_for_event($1,$2)`,[managedRegistrationEvent,ids.otherStudent])),"Volunteers do not gain administrator registration authority");
  const deleteRpcs=await db.query(`select proname from pg_proc join pg_namespace on pg_namespace.oid=pg_proc.pronamespace where nspname='public' and proname like '%visitor_card%' and proname like '%delete%'`);
  assert.equal(deleteRpcs.rows.length,0,"No Visitor Card delete RPC exists");
  const phase6VisitorColumns=await db.query(`select column_name from information_schema.columns where table_schema='public' and table_name='visitor_cards'`);
  assert.ok(phase6VisitorColumns.rows.every(row=>!/(medical|allerg|medication|diagnos|photo|image)/i.test(row.column_name)),"Visitor Cards contain no medical or photo fields");
  const visitorAudit=await db.query(`select metadata from public.audit_events where action like 'visitor_cards.%'`);
  const prohibitedVisitorText=/Phase Youth|Phase Guardian|phase6@test|555-0106|Call after school|Sunday visit|A friend|Confirmed existing|Member records created|Similar name|same visitor|follow-up requested|returned for another|review is complete/i;
  assert.ok(visitorAudit.rows.length>=10);assert.ok(visitorAudit.rows.every(row=>!prohibitedVisitorText.test(JSON.stringify(row.metadata))),"Visitor Card audit metadata excludes PII and free-text intake, link, and reason content");

  assert.equal((await db.query(`select private.school_year_start_for('2026-07-31'::date) value`)).rows[0].value.toISOString().slice(0,10),'2025-08-01',"July 31 belongs to the prior school year");
  assert.equal((await db.query(`select private.school_year_start_for('2026-08-01'::date) value`)).rows[0].value.toISOString().slice(0,10),'2026-08-01',"August 1 begins the new school year");
  assert.equal((await db.query(`select private.school_year_start_for('2027-07-31'::date) value`)).rows[0].value.toISOString().slice(0,10),'2026-08-01',"School year remains current through July 31");
  assert.ok((await asUser(ids.admin,()=>db.query(`select * from public.list_current_medical_form_status('2026-08-23')`))).rows.some(row=>row.student_id===ids.student),"Administrator can access current Medical Forms status");
  assert.ok((await asUser(ids.pastor,()=>db.query(`select * from public.list_current_medical_form_status('2026-08-23')`))).rows.some(row=>row.student_id===ids.student),"Youth Pastor can access current Medical Forms status");
  await denied(()=>asUser(ids.staff,()=>db.query(`select * from public.list_current_medical_form_status('2026-08-23')`)),"Ordinary Staff cannot access Medical Forms status");
  await denied(()=>asUser(ids.parent,()=>db.query(`select * from public.list_current_medical_form_status('2026-08-23')`)),"Parents cannot access the protected Medical Forms workspace");
  await asUser(ids.admin,()=>db.query(`select public.set_event_permission_slip_requirement($1,false,null)`,[ids.event]));
  assert.equal((await asUser(ids.admin,()=>db.query(`select public.get_event_permission_slip_requirement($1) state`,[ids.event]))).rows[0].state.required,false,"An Event may require no permission slip");
  await asUser(ids.pastor,()=>db.query(`select public.set_event_permission_slip_requirement($1,true,$2)`,[ids.event,ids.version]));
  const pinnedPermission=(await asUser(ids.parent,()=>db.query(`select public.get_event_permission_slip_requirement($1) state`,[ids.event]))).rows[0].state;
  assert.equal(pinnedPermission.templateVersionId,ids.version,"Event permission slips pin the exact published version");
  await asUser(ids.parent,()=>db.query(`select public.authorize_document_template_master_download($1)`,[ids.version]));
  await denied(()=>asUser(ids.parent,()=>db.query(`select public.get_event_permission_slip_requirement($1)`,[ids.otherEvent])),"An unrelated Parent cannot inspect another Event requirement");
  const permissionSubmission='f6000000-0000-4000-8000-000000000001';
  await db.exec(`select set_config('request.jwt.claim.sub','c0000000-0000-4000-8000-000000000001',false),set_config('request.jwt.claim.role','authenticated',false)`);
  await db.query(`insert into public.student_document_submissions(id,student_id,household_id,template_version_id,upload_source,submitted_by_profile_id,digital_status,lifecycle_status,valid_from,content_type,file_size_bytes,checksum_sha256,original_file_name) values($1,$2,$3,$4,'staff',$5,'accepted','under_review',current_date,'application/pdf',100,repeat('b',64),'permission.pdf')`,[permissionSubmission,ids.student,ids.household,ids.version,ids.admin]);
  await db.query(`insert into public.document_review_events(submission_id,action,actor_profile_id) values($1,'accepted',$2)`,[permissionSubmission,ids.admin]);
  const permissionMissing=(await asUser(ids.admin,()=>db.query(`select public.get_event_registration_document_readiness($1) state`,[ids.registration]))).rows[0].state;
  assert.equal(permissionMissing.ready,false,"Current medical plus missing permission-slip paper evidence remains NOT READY");
  await db.query(`insert into public.document_paper_evidence_events(submission_id,action,actor_profile_id) values($1,'confirmed_on_file',$2)`,[permissionSubmission,ids.admin]);
  const bothReady=(await asUser(ids.admin,()=>db.query(`select public.get_event_registration_document_readiness($1) state`,[ids.registration]))).rows[0].state;
  assert.equal(bothReady.ready,true,"Standing current medical and Event permission slip together satisfy readiness");
  await asUser(ids.admin,()=>db.query(`select public.set_event_permission_slip_requirement($1,false,null)`,[ids.event]));
  assert.ok(Number((await db.query(`select count(*) count from public.event_document_requirements where event_id=$1`,[ids.event])).rows[0].count)>=2,"Requirement changes archive and retain Event history");
  const julyEvent="f7000000-0000-4000-8000-000000000001";
  const augustEvent="f7000000-0000-4000-8000-000000000002";
  const futureRegistration="f7000000-0000-4000-8000-000000000003";
  await db.query(`insert into public.events(id,name,event_type,status,starts_at,ends_at,timezone) values($1,'School Year Boundary July','special','published','2027-08-01 04:30+00','2027-08-01 05:00+00','America/Chicago'),($2,'School Year Boundary August','special','published','2027-08-01 05:30+00','2027-08-01 07:00+00','America/Chicago')`,[julyEvent,augustEvent]);
  assert.equal((await db.query(`select private.event_school_year_start($1) value`,[julyEvent])).rows[0].value.toISOString().slice(0,10),'2026-08-01',"July 31 in the Event timezone uses the prior school year");
  assert.equal((await db.query(`select private.event_school_year_start($1) value`,[augustEvent])).rows[0].value.toISOString().slice(0,10),'2027-08-01',"August 1 in the Event timezone starts the new school year");
  await db.query(`insert into public.event_registrations(id,event_id,household_id,student_id,status,created_by_profile_id) values($1,$2,$3,$4,'registered',$5)`,[futureRegistration,augustEvent,ids.household,ids.student,ids.admin]);
  const futureMedicalRequirement=(await asUser(ids.admin,()=>db.query(`select public.set_school_year_medical_requirement('2027-08-01',$1) id`,[ids.otherVersion]))).rows[0].id;
  const futureReadiness=(await asUser(ids.admin,()=>db.query(`select public.get_event_registration_document_readiness($1) state`,[futureRegistration]))).rows[0].state;
  const futureMedicalState=futureReadiness.requirements.find(item=>item.documentKind==="medical_release");
  assert.equal(futureMedicalState.schoolYearStart,'2027-08-01',"Future Event readiness uses the school year containing its local Event date");
  assert.equal(futureMedicalState.requirementId,futureMedicalRequirement,"Future Event readiness uses its exact configured standing medical requirement");
  const futureOverride=(await asUser(ids.admin,()=>db.query(`select public.create_event_participation_override($1,array[$2]::uuid[],'Approved future Event exception',null) id`,[futureRegistration,futureMedicalRequirement]))).rows[0].id;
  assert.ok(futureOverride,"Participation override accepts the Event-applicable standing medical requirement");
  assert.deepEqual((await db.query(`select unmet_requirement_ids from public.event_participation_overrides where id=$1`,[futureOverride])).rows[0].unmet_requirement_ids,[futureMedicalRequirement],"Override retains the same Event-applicable requirement identifier");
  const correctionAudit=await db.query(`select metadata from public.audit_events where action in ('forms.school_year_medical_requirement_set','forms.event_permission_requirement_changed')`);
  assert.ok(correctionAudit.rows.length>=3&&correctionAudit.rows.every(row=>!/(filename|storage|path|content|medical detail|reason)/i.test(JSON.stringify(row.metadata))),"Medical and permission configuration audits remain sanitized");
  console.log("Medical school-year, protected status, Event permission-slip, and standing readiness correction: passed");
  console.log("Milestone 15 Phase 1 tables, enums, RLS, and direct-access denial: passed");
  console.log("Role defaults and sensitive grant/revoke authority/history: passed");
  console.log("Document immutability, supersession, and pinned Event versions: passed");
  console.log("Controlled Custom Form fields and Visitor Card privacy foundation: passed");
  console.log("Existing Event Registration schema protection: passed");
  console.log("Phase 2 private Storage, template versioning, authorization, lifecycle, and audit controls: passed");
  console.log("Phase 3 completed-document upload, replacement, streamed retrieval, review, paper, and medical controls: passed");
  console.log("Phase 4 derived readiness, retained participation overrides, and authoritative Check-In enforcement: passed");
  console.log("Phase 5 Custom Form management, assignments, respondent drafts, immutable submissions, oversight, and audit controls: passed");
  console.log("Phase 6 Visitor Card management, review, linking, conversion evidence, and retention: passed");
} finally { await db.close(); }
