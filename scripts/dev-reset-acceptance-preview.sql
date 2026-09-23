-- Youth Ministries Platform - acceptance reset preview (READ ONLY)
-- Approved target only: development project txjwwxzlsltbwixrscfp.
-- Run this before scripts/dev-reset-acceptance-data.sql.

select
  u.id as auth_user_id,
  u.email,
  p.id as profile_id,
  p.person_id,
  p.primary_role,
  p.status as account_status
from auth.users u
left join public.profiles p on p.id = u.id
where lower(u.email) in (
  'louisbuilds2026@gmail.com',
  'vandermolenlouis@gmail.com',
  'volunteer.test@example.com'
)
order by lower(u.email);

-- Any result here is an additional Auth account that the reset would remove.
select u.id, u.email, u.created_at
from auth.users u
where lower(coalesce(u.email, '')) not in (
  'louisbuilds2026@gmail.com',
  'vandermolenlouis@gmail.com',
  'volunteer.test@example.com'
)
order by u.created_at;

-- Exact public-table counts. Planner estimates are not reliable enough for a
-- destructive-reset review, so every current public table is counted directly.
select 'announcements' as table_name, count(*) as exact_rows from public.announcements union all
select 'attendance_records', count(*) from public.attendance_records union all
select 'attendance_sessions', count(*) from public.attendance_sessions union all
select 'audit_events', count(*) from public.audit_events union all
select 'care_categories', count(*) from public.care_categories union all
select 'care_follow_ups', count(*) from public.care_follow_ups union all
select 'care_notes', count(*) from public.care_notes union all
select 'check_in_records', count(*) from public.check_in_records union all
select 'communication_deliveries', count(*) from public.communication_deliveries union all
select 'communication_recipients', count(*) from public.communication_recipients union all
select 'communication_templates', count(*) from public.communication_templates union all
select 'communications', count(*) from public.communications union all
select 'curriculum_plan_lessons', count(*) from public.curriculum_plan_lessons union all
select 'curriculum_plans', count(*) from public.curriculum_plans union all
select 'custom_form_answers', count(*) from public.custom_form_answers union all
select 'custom_form_assignments', count(*) from public.custom_form_assignments union all
select 'custom_form_fields', count(*) from public.custom_form_fields union all
select 'custom_form_submissions', count(*) from public.custom_form_submissions union all
select 'custom_form_templates', count(*) from public.custom_form_templates union all
select 'custom_form_versions', count(*) from public.custom_form_versions union all
select 'document_paper_evidence_events', count(*) from public.document_paper_evidence_events union all
select 'document_review_events', count(*) from public.document_review_events union all
select 'document_template_versions', count(*) from public.document_template_versions union all
select 'document_templates', count(*) from public.document_templates union all
select 'event_checklist_items', count(*) from public.event_checklist_items union all
select 'event_document_requirements', count(*) from public.event_document_requirements union all
select 'event_participation_overrides', count(*) from public.event_participation_overrides union all
select 'event_registrations', count(*) from public.event_registrations union all
select 'event_reminders', count(*) from public.event_reminders union all
select 'event_volunteer_assignments', count(*) from public.event_volunteer_assignments union all
select 'events', count(*) from public.events union all
select 'family_check_in_tokens', count(*) from public.family_check_in_tokens union all
select 'household_memberships', count(*) from public.household_memberships union all
select 'households', count(*) from public.households union all
select 'in_app_notifications', count(*) from public.in_app_notifications union all
select 'lessons', count(*) from public.lessons union all
select 'library_resource_versions', count(*) from public.library_resource_versions union all
select 'library_resources', count(*) from public.library_resources union all
select 'member_tag_assignments', count(*) from public.member_tag_assignments union all
select 'member_tags', count(*) from public.member_tags union all
select 'ministry_schedules', count(*) from public.ministry_schedules union all
select 'people', count(*) from public.people union all
select 'prayer_requests', count(*) from public.prayer_requests union all
select 'profile_capability_grants', count(*) from public.profile_capability_grants union all
select 'profiles', count(*) from public.profiles union all
select 'report_saved_configurations', count(*) from public.report_saved_configurations union all
select 'resource_categories', count(*) from public.resource_categories union all
select 'schedule_assignments', count(*) from public.schedule_assignments union all
select 'schedule_locations', count(*) from public.schedule_locations union all
select 'schedule_positions', count(*) from public.schedule_positions union all
select 'schedule_rotations', count(*) from public.schedule_rotations union all
select 'school_year_medical_requirements', count(*) from public.school_year_medical_requirements union all
select 'student_document_submissions', count(*) from public.student_document_submissions union all
select 'student_relationships', count(*) from public.student_relationships union all
select 'students', count(*) from public.students union all
select 'teaching_resources', count(*) from public.teaching_resources union all
select 'visitor_card_links', count(*) from public.visitor_card_links union all
select 'visitor_card_rate_limits', count(*) from public.visitor_card_rate_limits union all
select 'visitor_card_review_events', count(*) from public.visitor_card_review_events union all
select 'visitor_cards', count(*) from public.visitor_cards union all
select 'visitor_check_ins', count(*) from public.visitor_check_ins union all
select 'volunteer_availability', count(*) from public.volunteer_availability union all
select 'volunteer_certifications', count(*) from public.volunteer_certifications union all
select 'volunteer_profiles', count(*) from public.volunteer_profiles union all
select 'volunteer_skill_assignments', count(*) from public.volunteer_skill_assignments union all
select 'volunteer_skills', count(*) from public.volunteer_skills
order by table_name;

-- Storage inventory. Objects are removed through the trusted Storage API, not SQL.
select b.id, b.public, b.file_size_limit, b.allowed_mime_types, count(o.id) as object_count
from storage.buckets b
left join storage.objects o on o.bucket_id = b.id
group by b.id, b.public, b.file_size_limit, b.allowed_mime_types
order by b.id;

-- Review the actual public foreign-key graph before approval.
select
  con.conrelid::regclass as referencing_table,
  con.conname,
  con.confrelid::regclass as referenced_table,
  pg_get_constraintdef(con.oid) as definition
from pg_constraint con
where con.contype = 'f'
  and con.connamespace = 'public'::regnamespace
order by 1::text, con.conname;
