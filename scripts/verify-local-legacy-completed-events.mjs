import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
nextEnv.loadEnvConfig(process.cwd(), true);
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(url,'http://127.0.0.1:54321','LOCAL only');
const options={auth:{persistSession:false,autoRefreshToken:false}};
const admin=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,options);
const sql=input=>execFileSync('docker',['exec','-i','supabase_db_Youth-Ministries-Platform','psql','-U','supabase_admin','-d','postgres','-X','-At','-v','ON_ERROR_STOP=1'],{input,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
const eventId=randomUUID(), users=[]; let checks=0;
const ok=r=>{assert.ifError(r.error);return r.data;};
const pass=name=>{checks++;console.log(`PASS ${checks}: ${name}`);};
const denied=(r,code='42501')=>{assert.ok(r.error);assert.equal(r.error.code,code);};
const legacy=()=>sql(`set role event_lifecycle_owner; update public.events set status='completed',completed_at=null,completed_by_profile_id=null,completed_from_status=null,reopened_at=null,reopened_by_profile_id=null where id='${eventId}';`);
try {
  sql(`insert into public.events(id,name,event_type,status,starts_at,ends_at,timezone) values ('${eventId}','Step 31AM isolated REST fixture','Test','draft','2020-01-01 10:00Z','2020-01-01 11:00Z','UTC');`);
  for(const role of ['platform_administrator','youth_pastor','staff_member','volunteer','parent']) {
    const email=`step31am.${randomUUID()}@example.test`,password=randomBytes(24).toString('hex');
    const user=ok(await admin.auth.admin.createUser({email,password,email_confirm:true})).user;users.push(user.id);
    sql(`update public.profiles set primary_role='${role}',status='active' where id='${user.id}';`);
    const client=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,options);
    ok(await client.auth.signInWithPassword({email,password}));legacy();
    const prior=sql(`select to_jsonb(e) from public.events e where id='${eventId}';`);
    const call=target=>client.rpc('reopen_legacy_event',{p_event_id:eventId,p_target_status:target});
    if(['platform_administrator','youth_pastor'].includes(role)) {
      for(const target of [null,'completed','archived']) {denied(await call(target),'22023');pass(`${role}: invalid target ${target}`);}
      denied(await call('invalid'),'22P02');pass(`${role}: unknown enum target`);
      denied(await client.rpc('reopen_event',{p_event_id:eventId}),'22023');pass(`${role}: normal RPC cannot guess legacy history`);
      denied(await client.from('events').update({status:'published'}).eq('id',eventId));pass(`${role}: direct reopen denied`);
      denied(await client.from('events').update({completed_from_status:'published'}).eq('id',eventId));pass(`${role}: lifecycle forgery denied`);
      assert.equal(sql(`select to_jsonb(e) from public.events e where id='${eventId}';`),prior);pass(`${role}: failed calls preserve exact event`);
      for(const partial of ['completed_at=now()',`completed_by_profile_id='${user.id}'`,"completed_from_status='draft'"]) {
        sql(`set role event_lifecycle_owner;update public.events set ${partial} where id='${eventId}';`);
        denied(await call('draft'),'22023');legacy();pass(`${role}: partial metadata excluded (${partial.split('=')[0]})`);
      }
      sql(`update public.profiles set status='disabled' where id='${user.id}';`);
      denied(await call('draft'));pass(`${role}: inactive leader denied`);
      sql(`update public.profiles set status='active' where id='${user.id}';`);
      const target=role==='platform_administrator'?'draft':'published';
      ok(await call(target));
      assert.equal(sql(`select status||':'||reopened_by_profile_id from public.events where id='${eventId}';`),`${target}:${user.id}`);pass(`${role}: deliberate reopen succeeds with correct actor`);
      assert.equal(sql(`select count(*) from public.audit_events where entity_id='${eventId}' and action='event.legacy_reopened' and actor_profile_id='${user.id}' and metadata->>'selectedTargetStatus'='${target}';`),'1');pass(`${role}: selected status and actor audited`);
      denied(await call(target),'22023');pass(`${role}: repeated reopen rejected`);
    } else {
      denied(await call('draft'));pass(`${role}: legacy reopening denied`);
      const direct=await client.from('events').update({status:'draft'}).eq('id',eventId).select('id');
      if(direct.error)denied(direct);else assert.deepEqual(direct.data,[]);pass(`${role}: direct update denied`);
      assert.equal(sql(`select to_jsonb(e) from public.events e where id='${eventId}';`),prior);pass(`${role}: failure has no event side effects`);
      if(role==='parent') {
        denied(await client.rpc('get_event_workspace',{p_event_id:eventId}));
        assert.equal(ok(await client.rpc('list_event_calendar',{p_from_date:'2020-01-01',p_to_date:'2020-01-02'})).some(e=>e.event_id===eventId),false);pass('Parent: unknown history restricted in calendar and workspace');
        sql(`insert into public.event_volunteer_assignments(event_id,profile_id,assignment_role,status) values ('${eventId}','${user.id}','Step 31AM test','confirmed');`);
        assert.equal(ok(await client.rpc('get_event_workspace',{p_event_id:eventId})).eventId,eventId);
        assert.equal(ok(await client.rpc('list_event_calendar',{p_from_date:'2020-01-01',p_to_date:'2020-01-02'})).some(e=>e.event_id===eventId),true);pass('Parent: existing assignment access retained in both projections');
      }
    }
  }
  assert.equal(sql(`select count(*) from public.audit_events where entity_id='${eventId}' and action='event.legacy_reopened';`),'2');pass('Exactly two success audits; denied calls add none');
  assert.equal(sql("select pg_get_userbyid(proowner)||':'||prosecdef from pg_proc where oid='public.reopen_legacy_event(uuid,public.event_status)'::regprocedure;"),'event_lifecycle_owner:true');pass('Restricted function ownership retained');
  assert.equal(sql("select has_function_privilege('anon','public.reopen_legacy_event(uuid,public.event_status)','EXECUTE') or has_function_privilege('service_role','public.reopen_legacy_event(uuid,public.event_status)','EXECUTE') or has_schema_privilege('event_lifecycle_owner','public','CREATE') or pg_has_role('authenticated','event_lifecycle_owner','MEMBER');"),'f');pass('No anonymous/service execute, schema CREATE, or client membership');
  console.log(`LOCAL legacy REST: ${checks} checks passed`);
} finally {
  sql(`delete from public.event_volunteer_assignments where event_id='${eventId}';delete from public.audit_events where entity_id='${eventId}';delete from public.events where id='${eventId}';`);
  for(const id of users)ok(await admin.auth.admin.deleteUser(id));
}
