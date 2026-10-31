import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';

nextEnv.loadEnvConfig(process.cwd(), true);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(url, 'http://127.0.0.1:54321', 'LOCAL Supabase only');
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, options);
const users = [];
const eventId = randomUUID();
const sql = (input) => execFileSync('docker', ['exec', '-i', 'supabase_db_Youth-Ministries-Platform', 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-v', 'ON_ERROR_STOP=1', '-At'], { input, encoding: 'utf8', stdio: ['pipe','pipe','pipe'] }).trim();
const ok = (result) => { assert.ifError(result.error); return result.data; };
const denied = (result) => { assert.ok(result.error, 'Expected database denial'); assert.equal(result.error.code, '42501'); };
try {
  for (const role of ['platform_administrator','youth_pastor','staff_member','volunteer','parent']) {
    const email = `step26.${randomUUID()}@example.test`;
    const password = randomBytes(24).toString('hex');
    const user = ok(await admin.auth.admin.createUser({ email, password, email_confirm: true })).user;
    users.push(user.id);
    sql(`update public.profiles set status='active',primary_role='${role}' where id='${user.id}';`);
    const client = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options);
    ok(await client.auth.signInWithPassword({ email, password }));
    if (role === 'platform_administrator') {
      sql(`insert into public.events(id,name,event_type,status,starts_at,ends_at,timezone) values ('${eventId}','Step 26 REST fixture','Test','published',now()-interval '2 hours',now()-interval '1 hour','UTC');`);
    }
    const direct = await client.from('events').update({ status: 'completed' }).eq('id', eventId).select('id');
    if (direct.error) denied(direct); else assert.deepEqual(direct.data, [], 'RLS must hide unauthorized update targets');
    if (['platform_administrator','youth_pastor'].includes(role)) {
      ok(await client.rpc('complete_event', { p_event_id: eventId }));
      denied(await client.from('events').update({ name: 'Forbidden' }).eq('id', eventId));
      denied(await client.from('events').update({ status: 'published' }).eq('id', eventId));
      ok(await client.rpc('reopen_event', { p_event_id: eventId }));
      sql(`update public.profiles set status='disabled' where id='${user.id}';`);
      denied(await client.rpc('complete_event', { p_event_id: eventId }));
      denied(await client.rpc('reopen_event', { p_event_id: eventId }));
    } else {
      denied(await client.rpc('complete_event', { p_event_id: eventId }));
      denied(await client.rpc('reopen_event', { p_event_id: eventId }));
    }
    console.log(`PASS: LOCAL REST ${role} lifecycle authorization`);
  }
  assert.equal(sql(`select count(*) from public.audit_events where entity_id='${eventId}' and action in ('event.completed','event.reopened');`), '4');
  console.log('PASS: exactly four lifecycle audit records');
} finally {
  sql(`delete from public.audit_events where entity_id='${eventId}'; delete from public.events where id='${eventId}';`);
  for (const id of users) ok(await admin.auth.admin.deleteUser(id));
}
