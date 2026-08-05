begin;

-- Installed migrations are immutable. Repair the overly broad helper grant
-- introduced by 202607300020 without replacing the public care workflows.
revoke all on function private.write_care_audit(text, text, uuid, jsonb)
  from public, anon, authenticated;

-- System-provided categories must not depend on an administrator account
-- already existing when the migration chain is replayed on a clean project.
alter table public.care_categories
  alter column created_by_profile_id drop not null;

insert into public.care_categories (
  name,
  description,
  sort_order,
  created_by_profile_id
)
values
  ('General', 'General prayer, encouragement, or ministry care.', 10, null),
  ('Illness', 'Illness, medical treatment, recovery, or health concerns.', 20, null),
  ('Hospital', 'Hospital visits, procedures, or inpatient care.', 30, null),
  ('Family', 'Family relationships, household needs, or family transitions.', 40, null),
  ('Bereavement', 'Grief, loss, funeral support, or bereavement care.', 50, null),
  ('Counseling', 'Pastoral counseling, mentoring, or confidential support.', 60, null),
  ('School', 'School, academic, social, or educational concerns.', 70, null),
  ('Celebration', 'Answered prayer, milestone, achievement, or joyful event.', 80, null)
on conflict (name) do nothing;

comment on function private.write_care_audit(text, text, uuid, jsonb) is
  'Internal security-definer helper. It is callable only by owning database workflows and is never granted directly to application roles.';

comment on column public.care_categories.created_by_profile_id is
  'Null only for system-provided categories; user-created categories retain their authenticated creator.';

commit;
