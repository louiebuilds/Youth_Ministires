begin;

select plan(28);

select has_type('public', 'account_role', 'account_role enum exists');
select has_type('public', 'account_status', 'account_status enum exists');
select has_type('public', 'person_status', 'person_status enum exists');
select has_type('public', 'household_status', 'household_status enum exists');
select has_type('public', 'student_status', 'student_status enum exists');
select has_type('public', 'event_status', 'event_status enum exists');
select has_type(
  'public',
  'volunteer_assignment_status',
  'volunteer assignment status enum exists'
);
select has_type('public', 'audit_result', 'audit result enum exists');
select has_type('public', 'audit_source', 'audit source enum exists');

select has_table('public', 'people', 'people table exists');
select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'households', 'households table exists');
select has_table(
  'public',
  'household_memberships',
  'household memberships table exists'
);
select has_table('public', 'students', 'students table exists');
select has_table(
  'public',
  'student_relationships',
  'student relationships table exists'
);
select has_table('public', 'events', 'events table exists');
select has_table(
  'public',
  'event_volunteer_assignments',
  'event volunteer assignments table exists'
);
select has_table('public', 'audit_events', 'audit events table exists');

select col_is_pk('public', 'profiles', 'id', 'profiles use auth user id');
select col_not_null(
  'public',
  'profiles',
  'primary_role',
  'every account has one permanent role'
);
select col_has_default(
  'public',
  'profiles',
  'primary_role',
  'new accounts receive a least-privilege role'
);
select col_not_null(
  'public',
  'students',
  'primary_household_id',
  'every student has a primary household'
);
select col_is_unique(
  'public',
  'students',
  'person_id',
  'a person has at most one student profile'
);
select col_not_null(
  'public',
  'event_volunteer_assignments',
  'event_id',
  'volunteer assignments are event scoped'
);

select policies_are(
  'public',
  'profiles',
  array['profiles_read_own'],
  'profiles expose only the own-profile baseline policy'
);
select policies_are(
  'public',
  'students',
  array[]::text[],
  'students have no broad baseline policy'
);
select policies_are(
  'public',
  'event_volunteer_assignments',
  array[]::text[],
  'event assignments have no broad baseline policy'
);
select policies_are(
  'public',
  'audit_events',
  array[]::text[],
  'audit events have no client policy'
);

select * from finish();

rollback;
