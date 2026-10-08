import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { PGlite } from "@electric-sql/pglite";
import { submitOutboundEmail } from "../features/communications/services/outbound-email-service.mjs";
import { resolveCommunicationsEmailEnvironment } from "../config/communications-email-environment.mjs";

const migrations = [
  "supabase/migrations/202607230001_core_database_foundation.sql",
  "supabase/migrations/202607230002_security_authorization.sql",
  "supabase/migrations/202607300014_communication_center_foundation.sql",
  "supabase/migrations/202607300015_announcement_workflows.sql",
  "supabase/migrations/202607300016_communication_template_workflows.sql",
  "supabase/migrations/202607300017_synthetic_communication_delivery.sql",
  "supabase/migrations/202607300018_in_app_notification_lifecycle.sql",
  "supabase/migrations/202609150002_communication_announcement_projection.sql",
  "supabase/migrations/202610080003_live_email_foundation.sql",
];

const ids = {
  admin: "71000000-0000-4000-8000-000000000001",
  youthPastor: "71000000-0000-4000-8000-000000000002",
  staff: "71000000-0000-4000-8000-000000000003",
  allowedVolunteer: "71000000-0000-4000-8000-000000000004",
  blockedVolunteer: "71000000-0000-4000-8000-000000000005",
};
const operationId = "72000000-0000-4000-8000-000000000001";
const successfulOperationId = "72000000-0000-4000-8000-000000000002";
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

try {
  const syntheticEnvironment = resolveCommunicationsEmailEnvironment({});
  assert.equal(syntheticEnvironment.mode, "synthetic");
  assert.equal(syntheticEnvironment.liveEnabled, false);
  let syntheticProviderCalls = 0;
  if (syntheticEnvironment.liveEnabled) syntheticProviderCalls += 1;
  assert.equal(syntheticProviderCalls, 0);
  const missingCredentials = resolveCommunicationsEmailEnvironment({
    COMMUNICATIONS_EMAIL_MODE: "live",
  });
  assert.equal(missingCredentials.liveEnabled, false);
  assert.match(missingCredentials.disabledReason, /API key/);
  const emptyAllowlist = resolveCommunicationsEmailEnvironment({
    COMMUNICATIONS_EMAIL_MODE: "live",
    RESEND_API_KEY: "test-key",
    COMMUNICATIONS_FROM_EMAIL: "sender@example.test",
  });
  assert.equal(emptyAllowlist.liveEnabled, false);
  assert.match(emptyAllowlist.disabledReason, /allowlist/);

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
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  `);
  for (const path of migrations) {
    const migration = await readFile(path, "utf8");
    await db.exec(migration
      .replace("create extension if not exists pgcrypto with schema extensions;", "")
      .replaceAll("extensions.gen_random_uuid()", "gen_random_uuid()"));
  }

  await db.query(`
    insert into auth.users (id, email, raw_user_meta_data) values
      ($1, 'admin@example.test', '{"display_name":"Admin"}'),
      ($2, 'pastor@example.test', '{"display_name":"Pastor"}'),
      ($3, 'staff@example.test', '{"display_name":"Staff"}'),
      ($4, 'allowed@example.test', '{"display_name":"Allowed Volunteer"}'),
      ($5, 'blocked@example.test', '{"display_name":"Blocked Volunteer"}')
  `, Object.values(ids));
  await db.query(`
    update public.profiles set primary_role = case id
      when $1 then 'platform_administrator'::public.account_role
      when $2 then 'youth_pastor'::public.account_role
      when $3 then 'staff_member'::public.account_role
      else 'volunteer'::public.account_role end
    where id in ($1, $2, $3, $4, $5)
  `, Object.values(ids));

  for (const id of [ids.admin, ids.youthPastor]) {
    const access = await asAuthenticated(id, () =>
      db.query("select private.can_send_live_email() as allowed"));
    assert.equal(access.rows[0].allowed, true);
  }
  const staffAccess = await asAuthenticated(ids.staff, () =>
    db.query("select private.can_send_live_email() as allowed"));
  assert.equal(staffAccess.rows[0].allowed, false);

  const emptyPreview = await asAuthenticated(ids.admin, () => db.query(
    "select * from public.preview_live_email_recipients('volunteers', array[]::text[])",
  ));
  assert.equal(emptyPreview.rows.filter((row) => row.live_send_allowed).length, 0);

  const preview = await asAuthenticated(ids.admin, () => db.query(
    "select * from public.preview_live_email_recipients('volunteers', array['allowed@example.test'])",
  ));
  assert.equal(preview.rows.filter((row) => row.live_send_allowed).length, 1);
  assert.equal(
    preview.rows.find((row) => row.recipient_profile_id === ids.blockedVolunteer)
      .suppression_reason,
    "Not in live-email beta allowlist",
  );

  let staffDenied = false;
  try {
    await asAuthenticated(ids.staff, () => db.query(
      `select public.create_live_email_communication(
        'Denied', 'Denied', 'Denied', 'volunteers', null,
        array['allowed@example.test'], 1, $1
      )`, [operationId],
    ));
  } catch {
    staffDenied = true;
  }
  assert.equal(staffDenied, true);

  const created = await asAuthenticated(ids.admin, () => db.query(
    `select public.create_live_email_communication(
      'Beta update', 'Beta subject', 'Plain text body', 'volunteers', null,
      array['allowed@example.test'], 1, $1
    ) as id`, [operationId],
  ));
  const communicationId = created.rows[0].id;
  const duplicate = await asAuthenticated(ids.admin, () => db.query(
    `select public.create_live_email_communication(
      'Beta update', 'Beta subject', 'Plain text body', 'volunteers', null,
      array['allowed@example.test'], 1, $1
    ) as id`, [operationId],
  ));
  assert.equal(duplicate.rows[0].id, communicationId);
  const communicationCount = await db.query(
    "select count(*)::integer as count from public.communications where idempotency_key = $1",
    [operationId],
  );
  assert.equal(communicationCount.rows[0].count, 1);

  const claim = await asAuthenticated(ids.admin, () => db.query(
    "select * from public.claim_live_email_delivery($1)", [communicationId],
  ));
  assert.equal(claim.rows.length, 1);
  assert.equal(claim.rows[0].email_address, "allowed@example.test");
  const duplicateClaim = await asAuthenticated(ids.admin, () => db.query(
    "select * from public.claim_live_email_delivery($1)", [communicationId],
  ));
  assert.equal(duplicateClaim.rows.length, 0);

  await asAuthenticated(ids.admin, () => db.query(
    "select public.finalize_live_email_delivery($1, false, null, 'Safe provider failure')",
    [claim.rows[0].delivery_id],
  ));
  const statuses = await db.query(`
    select d.status, d.failure_reason
    from public.communication_deliveries d
    join public.communication_recipients r on r.id = d.communication_recipient_id
    where r.communication_id = $1 order by d.status
  `, [communicationId]);
  assert.deepEqual(statuses.rows.map((row) => row.status), ["failed", "suppressed"]);
  assert.equal(statuses.rows[0].failure_reason, "Safe provider failure");

  const successful = await asAuthenticated(ids.youthPastor, () => db.query(
    `select public.create_live_email_communication(
      'Pastor beta update', 'Pastor subject', 'Plain text body', 'volunteers', null,
      array['allowed@example.test'], 1, $1
    ) as id`, [successfulOperationId],
  ));
  const successfulClaim = await asAuthenticated(ids.youthPastor, () => db.query(
    "select * from public.claim_live_email_delivery($1)", [successful.rows[0].id],
  ));
  await asAuthenticated(ids.youthPastor, () => db.query(
    "select public.finalize_live_email_delivery($1, true, 'resend-test-id', null)",
    [successfulClaim.rows[0].delivery_id],
  ));
  const successfulResult = await asAuthenticated(ids.youthPastor, () => db.query(
    "select * from public.get_live_email_send_result($1)", [successful.rows[0].id],
  ));
  assert.equal(successfulResult.rows[0].sent_count, 1);
  assert.equal(successfulResult.rows[0].failed_count, 0);
  assert.equal(successfulResult.rows[0].suppressed_count, 1);
  assert.equal(successfulResult.rows[0].pending_count, 0);

  let liveSmsDenied = false;
  try {
    await db.query(`
      insert into public.communications (
        title, message_body, channel, audience_type, status,
        synthetic_delivery, delivery_mode, created_by_profile_id
      ) values ('No live SMS', 'No live SMS', 'sms', 'volunteers', 'sending',
        false, 'live', $1)
    `, [ids.admin]);
  } catch {
    liveSmsDenied = true;
  }
  assert.equal(liveSmsDenied, true);

  const serviceSource = await readFile(
    "features/communications/services/communication-service.ts", "utf8");
  const adapterSource = await readFile(
    "features/communications/providers/resend-email-provider.ts", "utf8");
  assert.match(serviceSource, /if \(!environment\.liveEnabled/);
  assert.match(serviceSource, /providerOverride \?\?/);
  assert.match(adapterSource, /idempotencyKey: message\.idempotencyKey/);
  assert.doesNotMatch(adapterSource, /console\./);

  let mockCalls = 0;
  const mockProvider = {
    name: "mock-resend",
    async send(message) {
      mockCalls += 1;
      assert.equal(message.to, "allowed@example.test");
      return { success: true, provider: this.name, providerReference: "mock-id" };
    },
  };
  const mockResult = await submitOutboundEmail(mockProvider, {
    to: "allowed@example.test",
    subject: "Safe test",
    text: "No real provider call.",
    fromEmail: "sender@example.test",
    idempotencyKey: "mock-operation:recipient",
  });
  assert.equal(mockCalls, 1);
  assert.equal(mockResult.success, true);

  console.log("Live email foundation verification passed.");
} finally {
  await db.close();
}
