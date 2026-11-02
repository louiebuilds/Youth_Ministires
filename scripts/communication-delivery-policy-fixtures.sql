-- Runs after the existing recipient fixtures inside the same rollback transaction.
update public.profiles set status='active' where id in ('91000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000003');
update public.volunteer_profiles set is_active=true where profile_id='91000000-0000-4000-8000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
select pg_temp.check_true((select count(*)=0 from public.preview_live_email_recipients('ministry',array[]::text[],'ministry') where live_send_allowed),'browser cannot enable ministry before trusted approval');
select pg_temp.check_true(pg_temp.denied($q$update private.communication_email_delivery_policy set delivery_policy='ministry'$q$),'administrator application role cannot set deployment policy');
select pg_temp.check_true(pg_temp.denied($q$select private.communication_email_delivery_allowed('recipient2@example.test','ministry')$q$),'private policy helper inaccessible');
select pg_temp.check_true(pg_temp.denied($q$select * from private.communication_email_delivery_operations$q$),'captured delivery policies inaccessible to browser roles');
do $$ begin
  begin
    perform * from public.preview_live_email_recipients('ministry',array[]::text[],'invalid');
    raise exception 'FAIL: invalid delivery policy accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.create_live_email_communication('Denied','Denied','Denied','ministry',null,array[]::text[],5,'94000000-0000-4000-8000-000000000010','ministry');
    raise exception 'FAIL: unapproved ministry queue accepted';
  exception when invalid_parameter_value then null; end;
end $$;
reset role;
update private.communication_email_delivery_policy set delivery_policy='ministry' where singleton;
-- Neither application nor database recipient allowlists contain any approved emails here.
select pg_temp.check_true((select count(*)=0 from private.communication_email_allowlist),'ministry tests have no manual recipient list');
set local role authenticated;
select pg_temp.check_true((select count(*)=4 from public.preview_live_email_recipients('parents',array[]::text[],'ministry') where live_send_allowed and recipient_profile_id::text like '91000000-0000-4000-8000-%'),'ministry delivery parents');
select pg_temp.check_true((select count(*)=3 from public.preview_live_email_recipients('volunteers',array[]::text[],'ministry') where live_send_allowed and recipient_profile_id::text like '91000000-0000-4000-8000-%'),'ministry delivery parent-volunteer and volunteer-only');
select pg_temp.check_true((select count(*)=5 from public.preview_live_email_recipients('ministry',array[]::text[],'ministry') where live_send_allowed and recipient_profile_id::text like '91000000-0000-4000-8000-%'),'ministry delivery union deduplicated without lists');
select pg_temp.check_true((select count(*)=1 from public.preview_live_email_recipients('ministry',array[]::text[],'ministry') where suppression_reason='Duplicate email address' and recipient_profile_id::text like '91000000-0000-4000-8000-%'),'ministry delivery duplicate reason');
select pg_temp.check_true((select count(*)=0 from public.preview_live_email_recipients('ministry',array[]::text[]) where live_send_allowed),'legacy signature stays restricted');
select pg_temp.check_true((select count(*)=0 from public.preview_live_email_recipients('ministry',array['recipient2@example.test'],'restricted') where live_send_allowed),'explicit restricted mode stays restricted under global ministry approval');
select set_config('test.ministry_count',(select count(*)::text from public.preview_live_email_recipients('ministry',array[]::text[],'ministry') where live_send_allowed),true);
select public.create_live_email_communication('Ministry','Ministry','Ministry','ministry',null,array[]::text[],current_setting('test.ministry_count')::integer,'94000000-0000-4000-8000-000000000011','ministry');
reset role;
select pg_temp.check_true((select count(*)=current_setting('test.ministry_count')::integer and count(distinct r.destination_address)=count(*)
 from public.communication_recipients r join public.communications c on c.id=r.communication_id
 where c.idempotency_key='94000000-0000-4000-8000-000000000011' and r.destination_address is not null),'ministry queue unique destinations and count');
select pg_temp.check_true(exists(select 1 from private.communication_email_delivery_operations op join public.communications c on c.id=op.communication_id
 where c.idempotency_key='94000000-0000-4000-8000-000000000011' and op.delivery_policy='ministry'),'captured ministry policy');
insert into private.communication_email_allowlist values ('recipient2@example.test');
set local role authenticated;
select public.create_live_email_communication('Restricted','Restricted','Restricted','parents',null,array['recipient2@example.test'],1,'94000000-0000-4000-8000-000000000012');
reset role;
select pg_temp.check_true(exists(select 1 from private.communication_email_delivery_operations op join public.communications c on c.id=op.communication_id
 where c.idempotency_key='94000000-0000-4000-8000-000000000012' and op.delivery_policy='restricted'),'legacy queue captures restricted policy');
delete from private.communication_email_allowlist;
select set_config('test.restricted_id',(select id::text from public.communications where idempotency_key='94000000-0000-4000-8000-000000000012'),true);
select set_config('test.ministry_id',(select id::text from public.communications where idempotency_key='94000000-0000-4000-8000-000000000011'),true);
set local role authenticated;
select pg_temp.check_true((select count(*)=0 from public.claim_live_email_delivery(current_setting('test.restricted_id')::uuid)),'restricted queue never promoted into ministry');
do $$ begin
  begin
    perform public.create_live_email_communication('Changed','Changed','Changed','ministry',null,array[]::text[],5,'94000000-0000-4000-8000-000000000012','ministry');
    raise exception 'FAIL: idempotency key changed delivery policy';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
update public.profiles set status='disabled' where id='91000000-0000-4000-8000-000000000003';
set local role authenticated;
select pg_temp.check_true((select count(*)=1 and bool_and(email_address<>'recipient3@example.test') from public.claim_live_email_delivery(current_setting('test.ministry_id')::uuid)),'ministry claim rechecks active eligibility');
reset role;
update private.communication_email_delivery_policy set delivery_policy='restricted' where singleton;
set local role authenticated;
select pg_temp.check_true((select count(*)=0 from public.claim_live_email_delivery(current_setting('test.ministry_id')::uuid)),'ministry policy revocation suppresses queued claims');
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000011',true);
select pg_temp.check_true(pg_temp.denied($q$select * from public.preview_live_email_recipients('ministry',array[]::text[],'ministry')$q$),'staff cannot use new ministry preview RPC');
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',true);
select pg_temp.check_true(pg_temp.denied($q$select public.create_live_email_communication('Bad','Bad','Bad','parents',null,array[]::text[],1,'94000000-0000-4000-8000-000000000013','ministry')$q$),'parent cannot use new ministry send RPC');
reset role;
delete from private.communication_email_delivery_policy;
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
select pg_temp.check_true((select count(*)=0 from public.preview_live_email_recipients('ministry',array[]::text[],'ministry') where live_send_allowed),'missing trusted policy fails closed');
reset role;
set local role service_role;
select pg_temp.check_true(pg_temp.denied($q$insert into private.communication_email_delivery_policy values(true,'ministry')$q$),'service role cannot configure ministry delivery');
reset role;

set local role anon;
select pg_temp.check_true(pg_temp.denied($q$select * from public.preview_live_email_recipients('ministry',array[]::text[],'ministry')$q$),'anonymous new-policy preview denied');
reset role;
