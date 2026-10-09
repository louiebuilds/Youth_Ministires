import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { PGlite } from "@electric-sql/pglite";
import {
  normalizeSmsPhoneNumber,
  resolveCommunicationsSmsEnvironment,
} from "../config/communications-sms-environment.mjs";
import { submitOutboundSms } from "../features/communications/services/outbound-sms-service.mjs";

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
  "supabase/migrations/202610090001_live_sms_foundation.sql",
];

const ids = {
  admin: "73000000-0000-4000-8000-000000000001",
  youthPastor: "73000000-0000-4000-8000-000000000002",
  staff: "73000000-0000-4000-8000-000000000003",
  allowedVolunteer: "73000000-0000-4000-8000-000000000004",
  blockedVolunteer: "73000000-0000-4000-8000-000000000005",
  invalidVolunteer: "73000000-0000-4000-8000-000000000006",
};
const operationId = "74000000-0000-4000-8000-000000000001";
const successfulOperationId = "74000000-0000-4000-8000-000000000002";
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
  const syntheticEnvironment = resolveCommunicationsSmsEnvironment({});
  assert.equal(syntheticEnvironment.mode, "synthetic");
  assert.equal(syntheticEnvironment.liveEnabled, false);
  let syntheticProviderCalls = 0;
  if (syntheticEnvironment.liveEnabled) syntheticProviderCalls += 1;
  assert.equal(syntheticProviderCalls, 0);

  const missingCredentials = resolveCommunicationsSmsEnvironment({
    COMMUNICATIONS_SMS_MODE: "live",
  });
  assert.equal(missingCredentials.liveEnabled, false);
  assert.match(missingCredentials.disabledReason, /credentials/);

  const noSender = resolveCommunicationsSmsEnvironment({
    COMMUNICATIONS_SMS_MODE: "live",
    TWILIO_ACCOUNT_SID: `AC${"a".repeat(32)}`,
    TWILIO_AUTH_TOKEN: "test-token",
    COMMUNICATIONS_SMS_ALLOWLIST: "(312) 555-0123",
  });
  assert.equal(noSender.liveEnabled, false);
  assert.match(noSender.disabledReason, /sending identity/);

  const emptyAllowlist = resolveCommunicationsSmsEnvironment({
    COMMUNICATIONS_SMS_MODE: "live",
    TWILIO_ACCOUNT_SID: `AC${"a".repeat(32)}`,
    TWILIO_AUTH_TOKEN: "test-token",
    TWILIO_FROM_PHONE_NUMBER: "+13125550100",
  });
  assert.equal(emptyAllowlist.liveEnabled, false);
  assert.match(emptyAllowlist.disabledReason, /recipients/);

  assert.equal(normalizeSmsPhoneNumber("(312) 555-0123"), "+13125550123");
  assert.equal(normalizeSmsPhoneNumber("12345"), null);
  const liveEnvironment = resolveCommunicationsSmsEnvironment({
    COMMUNICATIONS_SMS_MODE: "live",
    TWILIO_ACCOUNT_SID: `AC${"a".repeat(32)}`,
    TWILIO_AUTH_TOKEN: "test-token",
    TWILIO_MESSAGING_SERVICE_SID: `MG${"b".repeat(32)}`,
    COMMUNICATIONS_SMS_ALLOWLIST: "(312) 555-0123, invalid",
  });
  assert.equal(liveEnvironment.liveEnabled, true);
  assert.deepEqual(liveEnvironment.allowlist, ["+13125550123"]);

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
      ($5, 'blocked@example.test', '{"display_name":"Blocked Volunteer"}'),
      ($6, 'invalid@example.test', '{"display_name":"Invalid Volunteer"}')
  `, Object.values(ids));
  await db.query(`
    update public.profiles set primary_role = case id
      when $1 then 'platform_administrator'::public.account_role
      when $2 then 'youth_pastor'::public.account_role
      when $3 then 'staff_member'::public.account_role
      else 'volunteer'::public.account_role end
    where id in ($1, $2, $3, $4, $5, $6)
  `, Object.values(ids));
  await db.query(`
    insert into public.people (id, first_name, last_name, phone) values
      ($1, 'Allowed', 'Volunteer', '(312) 555-0123'),
      ($2, 'Blocked', 'Volunteer', '312-555-0199'),
      ($3, 'Invalid', 'Volunteer', '1234567')
  `, [
    "75000000-0000-4000-8000-000000000001",
    "75000000-0000-4000-8000-000000000002",
    "75000000-0000-4000-8000-000000000003",
  ]);
  await db.query(`
    update public.profiles set person_id = case id
      when $4 then $1::uuid when $5 then $2::uuid when $6 then $3::uuid end
    where id in ($4, $5, $6)
  `, [
    "75000000-0000-4000-8000-000000000001",
    "75000000-0000-4000-8000-000000000002",
    "75000000-0000-4000-8000-000000000003",
    ids.allowedVolunteer,
    ids.blockedVolunteer,
    ids.invalidVolunteer,
  ]);

  for (const id of [ids.admin, ids.youthPastor]) {
    const access = await asAuthenticated(id, () =>
      db.query("select private.can_send_live_sms() as allowed"));
    assert.equal(access.rows[0].allowed, true);
  }
  const staffAccess = await asAuthenticated(ids.staff, () =>
    db.query("select private.can_send_live_sms() as allowed"));
  assert.equal(staffAccess.rows[0].allowed, false);

  const emptyPreview = await asAuthenticated(ids.admin, () => db.query(
    "select * from public.preview_live_sms_recipients('volunteers', array[]::text[])",
  ));
  assert.equal(emptyPreview.rows.filter((row) => row.live_send_allowed).length, 0);

  const preview = await asAuthenticated(ids.admin, () => db.query(
    "select * from public.preview_live_sms_recipients('volunteers', array['+13125550123'])",
  ));
  assert.equal(preview.rows.filter((row) => row.live_send_allowed).length, 1);
  assert.equal(
    preview.rows.find((row) => row.recipient_profile_id === ids.blockedVolunteer)
      .suppression_reason,
    "Not included in live SMS beta",
  );
  assert.equal(
    preview.rows.find((row) => row.recipient_profile_id === ids.invalidVolunteer)
      .suppression_reason,
    "No valid mobile number",
  );
  assert.equal(
    preview.rows.find((row) => row.recipient_profile_id === ids.allowedVolunteer)
      .destination_masked,
    "***-***-0123",
  );

  let staffDenied = false;
  try {
    await asAuthenticated(ids.staff, () => db.query(
      `select public.create_live_sms_communication(
        'Denied', 'Denied', 'volunteers', null,
        array['+13125550123'], 1, $1
      )`, [operationId],
    ));
  } catch {
    staffDenied = true;
  }
  assert.equal(staffDenied, true);

  const created = await asAuthenticated(ids.admin, () => db.query(
    `select public.create_live_sms_communication(
      'Beta update', 'Plain text body', 'volunteers', null,
      array['+13125550123'], 1, $1
    ) as id`, [operationId],
  ));
  const communicationId = created.rows[0].id;
  const duplicate = await asAuthenticated(ids.admin, () => db.query(
    `select public.create_live_sms_communication(
      'Beta update', 'Plain text body', 'volunteers', null,
      array['+13125550123'], 1, $1
    ) as id`, [operationId],
  ));
  assert.equal(duplicate.rows[0].id, communicationId);

  const claim = await asAuthenticated(ids.admin, () => db.query(
    "select * from public.claim_live_sms_delivery($1)", [communicationId],
  ));
  assert.equal(claim.rows.length, 1);
  assert.equal(claim.rows[0].phone_number, "+13125550123");
  const duplicateClaim = await asAuthenticated(ids.admin, () => db.query(
    "select * from public.claim_live_sms_delivery($1)", [communicationId],
  ));
  assert.equal(duplicateClaim.rows.length, 0);

  await asAuthenticated(ids.admin, () => db.query(
    "select public.finalize_live_sms_delivery($1, false, null, 'Safe provider failure')",
    [claim.rows[0].delivery_id],
  ));
  const failedStatuses = await db.query(`
    select d.status, d.failure_reason
    from public.communication_deliveries d
    join public.communication_recipients r on r.id = d.communication_recipient_id
    where r.communication_id = $1 order by d.status
  `, [communicationId]);
  assert.deepEqual(
    failedStatuses.rows.map((row) => row.status),
    ["failed", "suppressed", "suppressed"],
  );
  assert.equal(failedStatuses.rows[0].failure_reason, "Safe provider failure");

  const successful = await asAuthenticated(ids.youthPastor, () => db.query(
    `select public.create_live_sms_communication(
      'Pastor beta update', 'Plain text body', 'volunteers', null,
      array['+13125550123'], 1, $1
    ) as id`, [successfulOperationId],
  ));
  const successfulClaim = await asAuthenticated(ids.youthPastor, () => db.query(
    "select * from public.claim_live_sms_delivery($1)", [successful.rows[0].id],
  ));
  await asAuthenticated(ids.youthPastor, () => db.query(
    "select public.finalize_live_sms_delivery($1, true, 'SM-test-id', null)",
    [successfulClaim.rows[0].delivery_id],
  ));
  const successfulResult = await asAuthenticated(ids.youthPastor, () => db.query(
    "select * from public.get_live_sms_send_result($1)", [successful.rows[0].id],
  ));
  assert.equal(successfulResult.rows[0].sent_count, 1);
  assert.equal(successfulResult.rows[0].failed_count, 0);
  assert.equal(successfulResult.rows[0].suppressed_count, 2);
  assert.equal(successfulResult.rows[0].pending_count, 0);

  const synthetic = await asAuthenticated(ids.staff, () => db.query(
    `select public.send_synthetic_communication(
      'Synthetic SMS', null, 'No provider call', 'sms', 'volunteers', null
    ) as id`,
  ));
  const syntheticRecord = await db.query(
    "select synthetic_delivery, delivery_mode from public.communications where id = $1",
    [synthetic.rows[0].id],
  );
  assert.equal(syntheticRecord.rows[0].synthetic_delivery, true);
  assert.equal(syntheticRecord.rows[0].delivery_mode, "synthetic");

  let mockCalls = 0;
  const mockProvider = {
    name: "mock-sms",
    async send(message) {
      mockCalls += 1;
      assert.equal(message.to, "+13125550123");
      assert.equal(message.text, "No real provider call.");
      return { success: true, provider: this.name, providerReference: "SM-mock-id" };
    },
  };
  const mockResult = await submitOutboundSms(mockProvider, {
    to: "+13125550123",
    text: "No real provider call.",
    messagingServiceSid: `MG${"b".repeat(32)}`,
    idempotencyKey: "mock-operation:recipient",
  });
  assert.equal(mockCalls, 1);
  assert.equal(mockResult.success, true);

  const composerSource = await readFile(
    "features/communications/components/communication-composer.tsx", "utf8");
  const providerSource = await readFile(
    "features/communications/providers/twilio-sms-provider.ts", "utf8");
  assert.match(composerSource, /Send real \{isLiveSms \? "text message"/);
  assert.match(composerSource, /Text message setup is not complete/);
  assert.doesNotMatch(providerSource, /console\./);

  console.log("Live SMS foundation verification passed.");
} finally {
  await db.close();
}
