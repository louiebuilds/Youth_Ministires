import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { PGlite } from "@electric-sql/pglite";
const migrationPath = "supabase/migrations/202611020001_communication_email_recipients.sql";
const migration = await readFile(migrationPath,"utf8");
const snapshotMigration = await readFile("supabase/migrations/202611020002_communication_email_recipient_snapshot.sql","utf8");
const deliveryMigration = await readFile("supabase/migrations/202611020003_communication_email_delivery_policy.sql","utf8");
const fixtures = await readFile("scripts/communication-recipient-fixtures.sql","utf8") + await readFile("scripts/communication-delivery-policy-fixtures.sql","utf8");
if (process.argv.includes("--local")) {
  // Explicit container target; never uses linked hosted settings or connection URLs.
  const probe = spawnSync("docker",["exec","supabase_db_Youth-Ministries-Platform","psql","-X","-At","-U","supabase_admin","-d","postgres","-c","select count(*) from supabase_migrations.schema_migrations where version='202611020001'"],{encoding:"utf8"});
  if (probe.status !== 0) throw new Error("Unable to inspect local migration state");
  const installed = probe.stdout.trim() === "1";
  const snapshotProbe = spawnSync("docker",["exec","supabase_db_Youth-Ministries-Platform","psql","-X","-At","-U","supabase_admin","-d","postgres","-c","select count(*) from supabase_migrations.schema_migrations where version='202611020002'"],{encoding:"utf8"});
  if (snapshotProbe.status !== 0) throw new Error("Unable to inspect local snapshot migration state");
  const snapshotInstalled = snapshotProbe.stdout.trim() === "1";
  const policyProbe = spawnSync("docker",["exec","supabase_db_Youth-Ministries-Platform","psql","-X","-At","-U","supabase_admin","-d","postgres","-c","select count(*) from supabase_migrations.schema_migrations where version='202611020003'"],{encoding:"utf8"});
  if (policyProbe.status !== 0) throw new Error("Unable to inspect local delivery-policy migration state");
  const policyInstalled = policyProbe.stdout.trim() === "1";
  const sql = (installed ? "begin;" : migration.replace(/commit;\s*$/,"\n"))
    + (snapshotInstalled ? "" : snapshotMigration.replace(/^begin;/, "").replace(/commit;\s*$/, ""))
    + (policyInstalled ? "" : deliveryMigration.replace(/^begin;/, "").replace(/commit;\s*$/, ""))
    + fixtures + "\nrollback;";
  const result = spawnSync("docker",["exec","-i","supabase_db_Youth-Ministries-Platform","psql","-X","-v","ON_ERROR_STOP=1","-U","supabase_admin","-d","postgres"],{input:sql,encoding:"utf8",maxBuffer:4*1024*1024});
  if (result.status !== 0) throw new Error(result.stderr || result.error?.message || "Local SQL checks failed");
  console.log("LOCAL PostgreSQL migration rehearsal and recipient/security fixtures passed; transaction rolled back.");
} else {
  const db = new PGlite();
  try {
    await db.exec(`create schema auth; create schema extensions; create role anon nologin; create role authenticated nologin; create role service_role nologin;
      create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb not null default '{}'::jsonb);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;`);
    const paths = ["202607230001_core_database_foundation","202607230002_security_authorization","202607240003_volunteer_management_foundation","202607300014_communication_center_foundation","202607300015_announcement_workflows","202607300016_communication_template_workflows","202607300017_synthetic_communication_delivery","202607300018_in_app_notification_lifecycle","202609150002_communication_announcement_projection","202610080003_live_email_foundation","202611020001_communication_email_recipients","202611020002_communication_email_recipient_snapshot","202611020003_communication_email_delivery_policy"];
    for (const path of paths) await db.exec((await readFile(`supabase/migrations/${path}.sql`,"utf8")).replace("create extension if not exists pgcrypto with schema extensions;","").replaceAll("extensions.gen_random_uuid()","gen_random_uuid()"));
    await db.exec("begin;"+fixtures+"rollback;");
    assert.equal((await db.query("select count(*)::int as n from auth.users")).rows[0].n,0);
    console.log("Recipient audience, deduplication, preferences, send parity and direct-RPC security checks passed.");
  } catch(error) { console.error(error.message); process.exitCode=1; } finally { await db.close(); }
}
