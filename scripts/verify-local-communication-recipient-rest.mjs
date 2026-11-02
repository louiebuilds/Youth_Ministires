import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
process.loadEnvFile(process.env.COMMUNICATIONS_LOCAL_ENV_FILE || '.env.local');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(url,'http://127.0.0.1:54321','This integration test runs only against the existing local stack');
const options = {auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(url,options)=>fetch(url,{...options,signal:AbortSignal.timeout(60000)})}};
const admin = createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,options);
const client = createClient(url,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,options);
const email = `recipient-fixture-${randomUUID()}@example.test`;
const password = randomUUID()+randomUUID();
let userId = randomUUID();
let initialPolicy;
const testMinistry = process.argv.includes('--ministry');
const ministryCounts = new Map();
function sql(statement) {
 const result=spawnSync('docker',['exec','-i','supabase_db_Youth-Ministries-Platform','psql','-X','-At','-v','ON_ERROR_STOP=1','-U','supabase_admin','-d','postgres'],{input:statement,encoding:'utf8'});
 if(result.status!==0)throw new Error('Local SQL fixture operation failed: '+result.stderr);
 return result.stdout.trim();
}
const beforeCounts=sql("select json_build_object('communications',(select count(*) from public.communications),'deliveries',(select count(*) from public.communication_deliveries),'operations',(select count(*) from private.communication_email_delivery_operations));");
try {
 initialPolicy=sql("select delivery_policy from private.communication_email_delivery_policy where singleton;");
 assert.ok(['restricted','ministry'].includes(initialPolicy));
 const created=await admin.auth.admin.createUser({id:userId,email,password,email_confirm:true,user_metadata:{display_name:'Recipient REST fixture'}});
 if(created.error)throw new Error('Local test account creation failed: '+created.error.message);
 userId=created.data.user.id; assert.match(userId,/^[0-9a-f-]{36}$/);
 sql(`update public.profiles set primary_role='platform_administrator',status='active' where id='${userId}';
 insert into public.volunteer_profiles(profile_id) values ('${userId}');
 insert into private.communication_email_allowlist(email) values ('${email}');`);
 const signed=await client.auth.signInWithPassword({email,password});
 if(signed.error)throw new Error('Local test login failed: '+signed.error.message);
 if(testMinistry) {
  sql("update private.communication_email_delivery_policy set delivery_policy='restricted' where singleton;");
  const unapproved=await client.rpc('preview_live_email_recipients',{p_audience_type:'ministry',p_allowlist:[],p_delivery_policy:'ministry'});
  assert.equal(unapproved.error,null);assert.equal(unapproved.data.find(r=>r.recipient_profile_id===userId)?.live_send_allowed,false);
  sql("update private.communication_email_delivery_policy set delivery_policy='ministry' where singleton;");
  // Verify ministry mode with no request allowlist and with this fixture removed from the trusted list.
  sql(`delete from private.communication_email_allowlist where email='${email}';`);
  for(const audience of ['volunteers','ministry']) {
   const preview=await client.rpc('preview_live_email_recipients',{p_audience_type:audience,p_allowlist:[],p_delivery_policy:'ministry'});
   assert.equal(preview.error,null);assert.equal(preview.data.find(r=>r.recipient_profile_id===userId)?.live_send_allowed,true);
   ministryCounts.set(audience,preview.data.filter(r=>r.live_send_allowed).length);
  }
  const optedOut=await client.rpc('preview_live_email_recipients',{p_audience_type:'parents',p_allowlist:[],p_delivery_policy:'ministry'});
  assert.equal(optedOut.error,null);assert.equal(optedOut.data.some(r=>r.recipient_profile_id===userId),false);
  ministryCounts.set('parents',optedOut.data.filter(r=>r.live_send_allowed).length);
  sql(`insert into private.communication_email_allowlist(email) values ('${email}');`);
 }
 if(process.argv.includes('--compose')) {
  let cookies=[];
  const browserSession=createServerClient(url,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{
   cookies:{getAll:()=>cookies,setAll:values=>{cookies=values;}}
  });
  const session=await browserSession.auth.setSession({access_token:signed.data.session.access_token,refresh_token:signed.data.session.refresh_token});
  assert.equal(session.error,null);
  for(const audience of ['parents','volunteers','ministry']) {
   const response=await fetch(`http://127.0.0.1:3017/communications/compose?channel=email&audience=${audience}`,{
    headers:{Cookie:cookies.map(c=>`${c.name}=${c.value}`).join('; ')},redirect:'manual',signal:AbortSignal.timeout(30000)
   });
   assert.equal(response.status,200,`Authenticated Compose page: ${audience}`);
   const html=await response.text();
   assert.ok(html.includes('Ministries (email)'));
   assert.ok(html.includes('Preview recipients'));
   if(testMinistry) {
    const text=html.replace(/<[^>]*>/g,'');
    assert.ok(text.includes('Ministry delivery'));assert.ok(text.includes('Review email'));
    const count=ministryCounts.get(audience);
    assert.ok(text.includes(`${count} recipient${count===1?'':'s'} will receive this email`),'Compose count must match ministry-mode RPC eligibility');
   }
   assert.equal(html.includes('Recipient REST fixture'),audience!=='parents');
  }
  console.log('LOCAL authenticated Compose Email pages passed for Parents, Volunteers and Ministries; ministry delivery label, exact server counts and review-before-send verified.');
 }
 for(const audience of ['volunteers','ministry']) {
  const {data,error}=await client.rpc('preview_live_email_recipients',{p_audience_type:audience,p_allowlist:[email,'forged@example.test']});
  assert.equal(error,null); assert.equal(data.filter(r=>r.live_send_allowed).length,1);
  assert.equal(data.find(r=>r.recipient_profile_id===userId)?.live_send_allowed,true);
 }
 const parents=await client.rpc('preview_live_email_recipients',{p_audience_type:'parents',p_allowlist:[email]});
 assert.equal(parents.error,null);assert.equal(parents.data.some(r=>r.recipient_profile_id===userId),false);
 sql(`delete from private.communication_email_allowlist where email='${email}';`);
 const blocked=await client.rpc('preview_live_email_recipients',{p_audience_type:'ministry',p_allowlist:[email]});
 assert.equal(blocked.error,null);assert.equal(blocked.data.find(r=>r.recipient_profile_id===userId)?.live_send_allowed,false);
 sql(`update public.profiles set primary_role='volunteer' where id='${userId}';`);
 const denied=await client.rpc('preview_live_email_recipients',{p_audience_type:'ministry',p_allowlist:[email]});
 assert.equal(denied.error?.code,'42501');
 assert.equal(sql("select json_build_object('communications',(select count(*) from public.communications),'deliveries',(select count(*) from public.communication_deliveries),'operations',(select count(*) from private.communication_email_delivery_operations));"),beforeCounts,'Audience preview must not queue or send communications');
 console.log('LOCAL Auth login + authenticated REST previews passed: volunteer-only, Ministries, parent exclusion, trusted allowlist revocation, unauthorized role. No provider calls.');
} finally {
 if(initialPolicy) sql(`update private.communication_email_delivery_policy set delivery_policy='${initialPolicy}' where singleton;`);
 if(userId) {
  sql(`delete from private.communication_email_allowlist where email='${email}'; delete from public.volunteer_profiles where profile_id='${userId}';`);
  const deleted=await admin.auth.admin.deleteUser(userId);
  if(deleted.error && deleted.error.status !== 404)throw new Error('Local fixture cleanup failed: '+deleted.error.message);
 }
}
