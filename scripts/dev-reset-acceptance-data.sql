-- Youth Ministries Platform - clean acceptance data reset
-- TARGET: development Supabase project txjwwxzlsltbwixrscfp ONLY.
-- NEVER run against staging or production.
--
-- SAFETY:
--   * Review and run dev-reset-acceptance-preview.sql first.
--   * Take a database backup before approval/execution.
--   * Remove Storage objects separately through the trusted Storage API.
--   * This file intentionally ends in ROLLBACK. Technical Lead approval is
--     required before changing that one final statement to COMMIT.
--   * No TRUNCATE ... CASCADE is used.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '5min';

create temporary table acceptance_reset_keep_accounts (
  email text primary key,
  expected_user_id uuid not null,
  expected_role public.account_role not null
) on commit drop;

insert into acceptance_reset_keep_accounts (email, expected_user_id, expected_role)
values
  ('louisbuilds2026@gmail.com', '5cf33e7d-5021-4da5-a041-59bd1885786a', 'platform_administrator'),
  ('vandermolenlouis@gmail.com', '6e9f7c76-0849-467b-b6cd-a67dc7d6dffb', 'parent'),
  ('volunteer.test@example.com', '8956bae2-d21c-4de4-96d2-54eea2928815', 'volunteer');

do $$
declare
  v_invalid_count integer;
begin
  select count(*)
  into v_invalid_count
  from acceptance_reset_keep_accounts k
  left join auth.users u
    on u.id = k.expected_user_id and lower(u.email) = k.email
  left join public.profiles p on p.id = u.id
  where u.id is null
     or p.id is null
     or p.status <> 'active'
     or p.primary_role <> k.expected_role;

  if v_invalid_count <> 0 then
    raise exception 'Acceptance reset aborted: preserved account identity/role validation failed.';
  end if;

  select count(*)
  into v_invalid_count
  from (
    select k.email
    from acceptance_reset_keep_accounts k
    left join auth.users u on lower(u.email) = k.email
    group by k.email
    having count(u.id) <> 1
  ) ambiguous;
  if v_invalid_count <> 0 then
    raise exception 'Acceptance reset aborted: a preserved email is missing or ambiguous.';
  end if;

  -- profiles.id is a foreign key to auth.users.id with ON DELETE CASCADE.
  -- Preserved profiles must therefore be the exact one-to-one rows for the
  -- preserved Auth UUIDs, and no profile may exist without its Auth parent.
  select count(*)
  into v_invalid_count
  from public.profiles p
  left join auth.users u on u.id = p.id
  where u.id is null;
  if v_invalid_count <> 0 then
    raise exception 'Acceptance reset aborted: orphaned public profile rows exist.';
  end if;

  select count(*)
  into v_invalid_count
  from acceptance_reset_keep_accounts k
  join public.profiles p on p.id = k.expected_user_id;
  if v_invalid_count <> 3 then
    raise exception 'Acceptance reset aborted: expected exactly three preserved Auth/Profile relationships.';
  end if;

  -- Application Storage is deliberately outside this SQL reset. Fail closed
  -- until objects have been removed with trusted Storage tooling.
  select count(*)
  into v_invalid_count
  from storage.objects o
  where o.bucket_id in (
    'curriculum-files',
    'resource-library',
    'form-template-masters',
    'student-documents'
  );
  if v_invalid_count <> 0 then
    raise exception 'Acceptance reset aborted: % application Storage object(s) still exist. Clean Storage separately first.', v_invalid_count;
  end if;
end
$$;

create temporary table acceptance_reset_keep_people (id uuid primary key) on commit drop;
insert into acceptance_reset_keep_people (id)
select distinct p.person_id
from public.profiles p
join acceptance_reset_keep_accounts k on k.expected_user_id = p.id
where p.person_id is not null;

-- Five domain immutability triggers deliberately prohibit ordinary lifecycle
-- mutation. Fail closed unless the exact reviewed trigger/function bindings are
-- present, non-constraint, and enabled before this owner-only reset. Trigger DDL
-- is transactional, so any later error also restores their original state when
-- PostgreSQL rolls the transaction back. Foreign-key triggers remain enabled.
do $$
declare
  v_approved_count integer;
begin
  with approved(table_name, trigger_name, function_schema, function_name) as (
    values
      ('custom_form_answers', 'custom_form_answers_delete_immutable', 'private', 'prevent_completed_custom_form_answer_delete'),
      ('custom_form_fields', 'custom_form_fields_immutable', 'private', 'prevent_published_custom_form_change'),
      ('custom_form_versions', 'custom_form_versions_immutable', 'private', 'prevent_published_custom_form_change'),
      ('document_template_versions', 'document_template_versions_immutable', 'private', 'prevent_published_document_version_change'),
      ('library_resource_versions', 'reject_library_version_update', 'private', 'reject_library_version_mutation')
  )
  select count(*)
  into v_approved_count
  from approved a
  join pg_catalog.pg_class c on c.relname = a.table_name
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
  join pg_catalog.pg_trigger t on t.tgrelid = c.oid
    and t.tgname = a.trigger_name
    and not t.tgisinternal
    and t.tgenabled = 'O'
  join pg_catalog.pg_proc p on p.oid = t.tgfoid and p.proname = a.function_name
  join pg_catalog.pg_namespace pn on pn.oid = p.pronamespace
    and pn.nspname = a.function_schema;

  if v_approved_count <> 5 then
    raise exception 'Acceptance reset aborted: approved domain-trigger inventory or enabled state changed.';
  end if;
end
$$;

alter table public.custom_form_answers disable trigger custom_form_answers_delete_immutable;
alter table public.custom_form_fields disable trigger custom_form_fields_immutable;
alter table public.custom_form_versions disable trigger custom_form_versions_immutable;
alter table public.document_template_versions disable trigger document_template_versions_immutable;
alter table public.library_resource_versions disable trigger reject_library_version_update;

-- Leaf evidence, delivery, answer, and join rows.
delete from public.communication_deliveries;
delete from public.communication_recipients;
delete from public.in_app_notifications;
delete from public.event_reminders;
delete from public.custom_form_answers;
delete from public.document_paper_evidence_events;
delete from public.document_review_events;
delete from public.visitor_card_review_events;
delete from public.visitor_card_links;
delete from public.visitor_check_ins;
delete from public.visitor_card_rate_limits;
delete from public.check_in_records;
delete from public.event_participation_overrides;
delete from public.event_checklist_items;
delete from public.event_volunteer_assignments;
delete from public.teaching_resources;
delete from public.curriculum_plan_lessons;
delete from public.member_tag_assignments;
delete from public.volunteer_skill_assignments;
delete from public.volunteer_certifications;
delete from public.schedule_assignments;

-- Retained operational histories and their parents.
delete from public.custom_form_submissions;
delete from public.custom_form_assignments;
delete from public.custom_form_fields;
delete from public.custom_form_versions;
delete from public.custom_form_templates;
delete from public.student_document_submissions;
delete from public.event_document_requirements;
delete from public.school_year_medical_requirements;
update public.document_template_versions
set supersedes_version_id = null
where supersedes_version_id is not null;
delete from public.document_template_versions;
delete from public.document_templates;
delete from public.family_check_in_tokens;
delete from public.event_registrations;
delete from public.attendance_records;
delete from public.attendance_sessions;
delete from public.schedule_positions;
delete from public.schedule_locations;
delete from public.ministry_schedules;
delete from public.schedule_rotations;
delete from public.communications;
delete from public.communication_templates;
delete from public.visitor_cards;
delete from public.events;

-- Scheduling, communications, content, and care operations.
delete from public.volunteer_availability;
delete from public.announcements;
delete from public.care_follow_ups;
delete from public.care_notes;
delete from public.prayer_requests;
delete from public.curriculum_plans;
delete from public.lessons;
update public.library_resources
set current_version_id = null
where current_version_id is not null;
delete from public.library_resource_versions;
delete from public.library_resources;
delete from public.resource_categories;
delete from public.report_saved_configurations;

-- Membership/domain identity rows. Preserve only login-linked Person rows.
delete from public.student_relationships;
delete from public.household_memberships;
delete from public.students;
delete from public.households;
delete from public.volunteer_profiles;
delete from public.volunteer_skills;
delete from public.member_tags;
delete from public.profile_capability_grants;

-- Preserve repository-provided Prayer & Care categories; remove custom ones.
delete from public.care_categories
where name not in (
  'General', 'Illness', 'Hospital', 'Family',
  'Bereavement', 'Counseling', 'School', 'Celebration'
);

alter table public.custom_form_answers enable trigger custom_form_answers_delete_immutable;
alter table public.custom_form_fields enable trigger custom_form_fields_immutable;
alter table public.custom_form_versions enable trigger custom_form_versions_immutable;
alter table public.document_template_versions enable trigger document_template_versions_immutable;
alter table public.library_resource_versions enable trigger reject_library_version_update;

do $$
declare
  v_restored_count integer;
begin
  with approved(table_name, trigger_name) as (
    values
      ('custom_form_answers', 'custom_form_answers_delete_immutable'),
      ('custom_form_fields', 'custom_form_fields_immutable'),
      ('custom_form_versions', 'custom_form_versions_immutable'),
      ('document_template_versions', 'document_template_versions_immutable'),
      ('library_resource_versions', 'reject_library_version_update')
  )
  select count(*)
  into v_restored_count
  from approved a
  join pg_catalog.pg_class c on c.relname = a.table_name
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
  join pg_catalog.pg_trigger t on t.tgrelid = c.oid
    and t.tgname = a.trigger_name
    and not t.tgisinternal
    and t.tgenabled = 'O';

  if v_restored_count <> 5 then
    raise exception 'Acceptance reset aborted: approved domain triggers were not restored.';
  end if;
end
$$;

-- Remove non-preserved accounts and their profile rows through the Auth FK lifecycle.
delete from auth.users u
where not exists (
  select 1
  from acceptance_reset_keep_accounts k
  where k.expected_user_id = u.id
);

delete from public.people p
where not exists (
  select 1 from acceptance_reset_keep_people k where k.id = p.id
);

-- A clean acceptance run starts with an empty audit trail. Retain a backup first.
delete from public.audit_events;

-- Fail closed if the three exact accounts or login-linked Person rows were damaged.
do $$
declare
  v_count integer;
  v_table text;
begin
  select count(*) into v_count from auth.users;
  if v_count <> 3 then
    raise exception 'Acceptance reset post-check failed: expected exactly 3 Auth users, found %.', v_count;
  end if;

  select count(*) into v_count
  from acceptance_reset_keep_accounts k
  join auth.users u on u.id = k.expected_user_id and lower(u.email) = k.email
  join public.profiles p on p.id = u.id
  where p.status = 'active' and p.primary_role = k.expected_role;
  if v_count <> 3 then
    raise exception 'Acceptance reset post-check failed: preserved profiles changed.';
  end if;

  if exists (
    select 1
    from acceptance_reset_keep_people k
    left join public.people p on p.id = k.id
    where p.id is null
  ) then
    raise exception 'Acceptance reset post-check failed: a login-linked Person row was removed.';
  end if;

  foreach v_table in array array[
    'announcements','attendance_records','attendance_sessions','audit_events',
    'care_follow_ups','care_notes','check_in_records','communication_deliveries',
    'communication_recipients','communication_templates','communications',
    'curriculum_plan_lessons','curriculum_plans','custom_form_answers',
    'custom_form_assignments','custom_form_fields','custom_form_submissions',
    'custom_form_templates','custom_form_versions','document_paper_evidence_events',
    'document_review_events','document_template_versions','document_templates',
    'event_checklist_items','event_document_requirements','event_participation_overrides',
    'event_registrations','event_reminders','event_volunteer_assignments','events',
    'family_check_in_tokens','household_memberships','households','in_app_notifications',
    'lessons','library_resource_versions','library_resources','member_tag_assignments',
    'member_tags','ministry_schedules','people','prayer_requests',
    'profile_capability_grants','report_saved_configurations','resource_categories',
    'schedule_assignments','schedule_locations','schedule_positions','schedule_rotations',
    'school_year_medical_requirements','student_document_submissions',
    'student_relationships','students','teaching_resources','visitor_card_links',
    'visitor_card_rate_limits','visitor_card_review_events','visitor_cards',
    'visitor_check_ins','volunteer_availability','volunteer_certifications',
    'volunteer_profiles','volunteer_skill_assignments','volunteer_skills'
  ] loop
    execute format('select count(*) from public.%I', v_table) into v_count;
    if v_table = 'people' then
      select count(*) into v_count
      from public.people p
      where not exists (select 1 from acceptance_reset_keep_people k where k.id = p.id);
    end if;
    if v_count <> 0 then
      raise exception 'Acceptance reset post-check failed: public.% contains % unexpected rows.', v_table, v_count;
    end if;
  end loop;

  select count(*) into v_count
  from public.care_categories
  where name in ('General','Illness','Hospital','Family','Bereavement','Counseling','School','Celebration');
  if v_count <> 8 or (select count(*) from public.care_categories) <> 8 then
    raise exception 'Acceptance reset post-check failed: system Care category baseline changed.';
  end if;

  select count(*) into v_count
  from storage.buckets
  where id in ('curriculum-files','resource-library','form-template-masters','student-documents')
    and public is false;
  if v_count <> 4 then
    raise exception 'Acceptance reset post-check failed: private Storage bucket baseline changed.';
  end if;
end
$$;

-- REVIEW GATE: intentionally non-destructive in repository form.
-- Replace only this final ROLLBACK with COMMIT after Technical Lead approval.
rollback;
