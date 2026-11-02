-- Isolated fixtures; caller must wrap this file in a transaction and roll back.
create function pg_temp.check_true(value boolean, label text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'FAIL: %', label; end if; end $$;
create function pg_temp.denied(statement text) returns boolean language plpgsql as $$
begin execute statement; return false; exception when insufficient_privilege then return true; end $$;
insert into auth.users(id,email,raw_user_meta_data)
select ('91000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,
  case n when 9 then null when 10 then 'invalid-email'
    when 7 then ' SHARED@example.test ' when 8 then 'shared@example.test'
    else 'recipient' || n || '@example.test' end,
  jsonb_build_object('display_name','Recipient ' || n)
from generate_series(1,12) n;
insert into public.people(id,first_name,last_name)
select ('92000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,'Recipient',n::text
from generate_series(1,12) n;
update public.profiles p set
  person_id = ('92000000-0000-4000-8000-' || right(p.id::text,12))::uuid,
  primary_role = case right(p.id::text,12)::integer when 1 then 'platform_administrator'::public.account_role
    when 3 then 'volunteer'::public.account_role when 6 then 'volunteer'::public.account_role
    when 9 then 'volunteer'::public.account_role when 10 then 'volunteer'::public.account_role
    when 11 then 'staff_member'::public.account_role else 'parent'::public.account_role end,
  status = case when right(p.id::text,12)::integer = 5 then 'disabled'::public.account_status else 'active'::public.account_status end
where p.id::text like '91000000-0000-4000-8000-%';
insert into public.volunteer_profiles(profile_id,is_active)
select ('91000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,n <> 6
from unnest(array[3,4,6,7,8,9,10,12]) n;
insert into public.households(id,name,status) values ('93000000-0000-4000-8000-000000000001','Fixture household','active');
insert into public.household_memberships(household_id,person_id,relationship_label,is_responsible_adult,receive_email)
select '93000000-0000-4000-8000-000000000001',
 ('92000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,'Guardian',true,n <> 12
from unnest(array[2,4,5,7,8,12]) n;
-- Unrelated administrator does not qualify by primary role alone.
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
select pg_temp.check_true((select count(*) = 0 from public.preview_live_email_recipients('ministry',array['recipient2@example.test']) where live_send_allowed),'empty trusted list fails closed');
select pg_temp.check_true(pg_temp.denied($q$insert into private.communication_email_allowlist values ('recipient2@example.test')$q$),'authenticated configuration write denied');
select pg_temp.check_true(pg_temp.denied($q$select * from private.communication_email_candidates('parents')$q$),'private resolver inaccessible');
reset role;
insert into private.communication_email_allowlist values ('recipient2@example.test'),('recipient3@example.test'),('recipient4@example.test'),('shared@example.test');
set local role authenticated;
select pg_temp.check_true((select count(*) = 4 from public.preview_live_email_recipients('ministry',array['recipient2@example.test','recipient3@example.test','recipient4@example.test','shared@example.test','recipient11@example.test']) where live_send_allowed),'combined audience deduplicates and excludes unrelated staff');
select pg_temp.check_true((select count(*) = 3 from public.preview_live_email_recipients('parents',array['recipient2@example.test','recipient3@example.test','recipient4@example.test','shared@example.test']) where live_send_allowed),'parents audience');
select pg_temp.check_true((select count(*) = 3 from public.preview_live_email_recipients('volunteers',array['recipient2@example.test','recipient3@example.test','recipient4@example.test','shared@example.test']) where live_send_allowed),'volunteers includes parent volunteer and volunteer-only');
select pg_temp.check_true((select count(*) = 0 from public.preview_live_email_recipients('ministry',array[]::text[]) where live_send_allowed),'caller can only narrow');
select pg_temp.check_true((select suppression_reason = 'Volunteer inactive' from public.preview_live_email_recipients('volunteers',array['recipient6@example.test']) where recipient_profile_id='91000000-0000-4000-8000-000000000006'),'inactive volunteer');
select pg_temp.check_true((select suppression_reason = 'Account inactive' from public.preview_live_email_recipients('parents',array['recipient5@example.test']) where recipient_profile_id='91000000-0000-4000-8000-000000000005'),'inactive account');
select pg_temp.check_true((select suppression_reason = 'No email address' from public.preview_live_email_recipients('volunteers',array['recipient9@example.test']) where recipient_profile_id='91000000-0000-4000-8000-000000000009'),'missing email');
select pg_temp.check_true((select suppression_reason = 'Invalid email address' from public.preview_live_email_recipients('volunteers',array['invalid-email']) where recipient_profile_id='91000000-0000-4000-8000-000000000010'),'invalid email');
select pg_temp.check_true((select suppression_reason = 'Email preference disabled' from public.preview_live_email_recipients('parents',array['recipient12@example.test']) where recipient_profile_id='91000000-0000-4000-8000-000000000012'),'opt-out');
select pg_temp.check_true((select count(*)=1 from public.preview_live_email_recipients('ministry',array['shared@example.test']) where suppression_reason='Duplicate email address'),'duplicate reason');
select pg_temp.check_true(not exists (
 select recipient_profile_id,preference_authorized from public.preview_communication_recipients('ministry','email')
 except select recipient_profile_id,preference_authorized from public.preview_live_email_recipients('ministry',array[]::text[])),'synthetic/live eligibility parity');
select pg_temp.check_true((select count(*)=0 from public.preview_live_email_recipients('ministry',array['recipient5@example.test','invalid-email','recipient12@example.test']) where live_send_allowed),'forged caller list cannot authorize delivery');
select public.create_live_email_communication('Fixture','Fixture','Fixture','ministry',null,
 array['recipient2@example.test','recipient3@example.test','recipient4@example.test','shared@example.test'],4,'94000000-0000-4000-8000-000000000001');
reset role;
select pg_temp.check_true((select count(*)=4 from public.communication_deliveries d join public.communication_recipients r on r.id=d.communication_recipient_id join public.communications c on c.id=r.communication_id where c.idempotency_key='94000000-0000-4000-8000-000000000001' and d.status='pending'),'send-time selection matches preview');
select pg_temp.check_true((select count(distinct destination_address)=4 from public.communication_recipients r join public.communications c on c.id=r.communication_id where c.idempotency_key='94000000-0000-4000-8000-000000000001' and destination_address is not null),'normalized unique destinations');
-- Changes between preview and send must invalidate confirmation.
update public.volunteer_profiles set is_active=false where profile_id='91000000-0000-4000-8000-000000000003';
set local role authenticated;
do $$ begin
  begin
    perform public.create_live_email_communication('Stale','Stale','Stale','ministry',null,
      array['recipient2@example.test','recipient3@example.test','recipient4@example.test','shared@example.test'],4,'94000000-0000-4000-8000-000000000009');
    raise exception 'FAIL: stale confirmation accepted';
  exception when invalid_parameter_value then null; end;
end $$;
select pg_temp.check_true((select suppression_reason='Email preference disabled' from public.preview_live_email_recipients('volunteers',array['recipient12@example.test']) where recipient_profile_id='91000000-0000-4000-8000-000000000012'),'volunteer role must not bypass parent opt-out');
reset role;
-- A guardian can qualify through family records without a parent primary role.
insert into public.household_memberships(household_id,person_id,relationship_label,is_responsible_adult,receive_email)
values ('93000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000011','Guardian',true,true);
insert into private.communication_email_allowlist values ('recipient11@example.test');
set local role authenticated;
select pg_temp.check_true((select live_send_allowed from public.preview_live_email_recipients('parents',array['recipient11@example.test']) where recipient_profile_id='91000000-0000-4000-8000-000000000011'),'guardian through family record');
reset role;
-- Also qualify legal guardians through the student relationship records.
delete from public.household_memberships where person_id='92000000-0000-4000-8000-000000000011';
insert into public.students(id,person_id,primary_household_id,birth_date,grade,status)
values ('95000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000006','93000000-0000-4000-8000-000000000001','2012-01-01','8','active');
insert into public.student_relationships(student_id,person_id,relationship_type,is_legal_guardian,receive_email)
values ('95000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000011','Guardian',true,true);
set local role authenticated;
select pg_temp.check_true((select live_send_allowed from public.preview_live_email_recipients('parents',array['recipient11@example.test']) where recipient_profile_id='91000000-0000-4000-8000-000000000011'),'legal guardian through student relationship');
select pg_temp.check_true(not exists(select 1 from public.preview_live_email_recipients('ministry',array[]::text[]) where recipient_profile_id='91000000-0000-4000-8000-000000000006'),'student account excluded');
reset role;
-- Removing trusted approval after queueing prevents provider claims.
delete from private.communication_email_allowlist;
select set_config('test.communication_id',(select id::text from public.communications where idempotency_key='94000000-0000-4000-8000-000000000001'),true);
set local role authenticated;
select pg_temp.check_true((select count(*)=0 from public.claim_live_email_delivery(current_setting('test.communication_id')::uuid)),'queued delivery fails closed after policy revocation');
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',true);
select pg_temp.check_true(pg_temp.denied($q$select * from public.preview_live_email_recipients('parents',array['recipient2@example.test'])$q$),'parent preview denied');
select pg_temp.check_true(pg_temp.denied($q$select public.create_live_email_communication('Bad','Bad','Bad','parents',null,array['recipient2@example.test'],1,'94000000-0000-4000-8000-000000000002')$q$),'parent send denied');
reset role;

update public.profiles set status='disabled' where id='91000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
select pg_temp.check_true(pg_temp.denied($q$select * from public.preview_live_email_recipients('parents',array[]::text[])$q$),'inactive leader denied');
reset role;
set local role anon;
select pg_temp.check_true(pg_temp.denied($q$select * from public.preview_live_email_recipients('parents',array[]::text[])$q$),'anonymous preview denied');
reset role;
set local role service_role;
select pg_temp.check_true(pg_temp.denied($q$insert into private.communication_email_allowlist values ('forged@example.test')$q$),'service role cannot write trusted configuration');
reset role;
