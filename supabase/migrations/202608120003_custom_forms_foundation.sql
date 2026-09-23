begin;

create type public.custom_form_status as enum ('draft','active','archived');
create type public.custom_form_version_status as enum ('draft','published','retired');
create type public.custom_form_field_type as enum (
  'short_text','long_text','yes_no','single_choice','multiple_choice','date','acknowledgment'
);
create type public.custom_form_assignment_type as enum ('event','student','household','volunteer','general_ministry');
create type public.custom_form_submission_status as enum ('draft','submitted','archived');

create table public.custom_form_templates (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check(length(btrim(name)) between 1 and 200),
  description text check(description is null or length(btrim(description)) between 1 and 2000),
  status public.custom_form_status not null default 'draft',
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  archived_at timestamptz,archived_by_profile_id uuid references public.profiles(id) on delete restrict,
  constraint custom_form_templates_archive_check check (
    (status='archived' and archived_at is not null and archived_by_profile_id is not null)
    or (status<>'archived' and archived_at is null and archived_by_profile_id is null)
  )
);
create table public.custom_form_versions (
  id uuid primary key default extensions.gen_random_uuid(),
  template_id uuid not null references public.custom_form_templates(id) on delete restrict,
  version_number integer not null check(version_number>0),
  title text not null check(length(btrim(title)) between 1 and 200),
  instructions text check(instructions is null or length(btrim(instructions)) between 1 and 5000),
  status public.custom_form_version_status not null default 'draft',
  published_at timestamptz,published_by_profile_id uuid references public.profiles(id) on delete restrict,
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique(template_id,version_number),
  constraint custom_form_versions_publish_check check (
    (status='draft' and published_at is null and published_by_profile_id is null)
    or (status in ('published','retired') and published_at is not null and published_by_profile_id is not null)
  )
);
create table public.custom_form_fields (
  id uuid primary key default extensions.gen_random_uuid(),
  version_id uuid not null references public.custom_form_versions(id) on delete restrict,
  field_key text not null check(field_key ~ '^[a-z][a-z0-9_]{0,63}$'),
  field_type public.custom_form_field_type not null,
  label text not null check(length(btrim(label)) between 1 and 300),
  help_text text check(help_text is null or length(btrim(help_text)) between 1 and 1000),
  is_required boolean not null default false,display_order integer not null check(display_order>=0),
  minimum_length integer,maximum_length integer,
  minimum_date date,maximum_date date,choice_options jsonb,
  unique(version_id,field_key),unique(version_id,display_order),
  constraint custom_form_fields_length_check check (
    (minimum_length is null or minimum_length>=0) and
    (maximum_length is null or maximum_length between 1 and 10000) and
    (minimum_length is null or maximum_length is null or maximum_length>=minimum_length)
  ),
  constraint custom_form_fields_date_check check(minimum_date is null or maximum_date is null or maximum_date>=minimum_date),
  constraint custom_form_fields_options_check check (
    (field_type in ('single_choice','multiple_choice') and jsonb_typeof(choice_options)='array'
      and jsonb_array_length(choice_options) between 1 and 100 and pg_column_size(choice_options)<=16384)
    or (field_type not in ('single_choice','multiple_choice') and choice_options is null)
  )
);
create table public.custom_form_assignments (
  id uuid primary key default extensions.gen_random_uuid(),
  version_id uuid not null references public.custom_form_versions(id) on delete restrict,
  assignment_type public.custom_form_assignment_type not null,
  event_id uuid references public.events(id) on delete restrict,
  student_id uuid references public.students(id) on delete restrict,
  household_id uuid references public.households(id) on delete restrict,
  volunteer_profile_id uuid references public.profiles(id) on delete restrict,
  is_general_ministry boolean not null default false,
  assigned_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  assigned_at timestamptz not null default now(),archived_at timestamptz,
  archived_by_profile_id uuid references public.profiles(id) on delete restrict,
  constraint custom_form_assignments_target_check check (
    (assignment_type='event' and event_id is not null and student_id is null and household_id is null and volunteer_profile_id is null and not is_general_ministry)
    or (assignment_type='student' and event_id is null and student_id is not null and household_id is null and volunteer_profile_id is null and not is_general_ministry)
    or (assignment_type='household' and event_id is null and student_id is null and household_id is not null and volunteer_profile_id is null and not is_general_ministry)
    or (assignment_type='volunteer' and event_id is null and student_id is null and household_id is null and volunteer_profile_id is not null and not is_general_ministry)
    or (assignment_type='general_ministry' and event_id is null and student_id is null and household_id is null and volunteer_profile_id is null and is_general_ministry)
  ),
  constraint custom_form_assignments_archive_check check (
    (archived_at is null and archived_by_profile_id is null) or
    (archived_at is not null and archived_by_profile_id is not null)
  )
);
create table public.custom_form_submissions (
  id uuid primary key default extensions.gen_random_uuid(),
  assignment_id uuid not null references public.custom_form_assignments(id) on delete restrict,
  version_id uuid not null references public.custom_form_versions(id) on delete restrict,
  submitted_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  subject_student_id uuid references public.students(id) on delete restrict,
  subject_household_id uuid references public.households(id) on delete restrict,
  subject_volunteer_profile_id uuid references public.profiles(id) on delete restrict,
  status public.custom_form_submission_status not null default 'draft',
  submitted_at timestamptz,archived_at timestamptz,
  archived_by_profile_id uuid references public.profiles(id) on delete restrict,
  constraint custom_form_submissions_archive_check check (
    (status='archived' and archived_at is not null and archived_by_profile_id is not null)
    or (status='submitted' and submitted_at is not null and archived_at is null and archived_by_profile_id is null)
    or (status='draft' and submitted_at is null and archived_at is null and archived_by_profile_id is null)
  )
);
create table public.custom_form_answers (
  id uuid primary key default extensions.gen_random_uuid(),
  submission_id uuid not null references public.custom_form_submissions(id) on delete restrict,
  field_id uuid not null references public.custom_form_fields(id) on delete restrict,
  text_value text,boolean_value boolean,date_value date,choice_value text,multiple_choice_value jsonb,
  created_at timestamptz not null default now(),unique(submission_id,field_id),
  constraint custom_form_answers_one_value_check check (
    num_nonnulls(text_value,boolean_value,date_value,choice_value,multiple_choice_value)=1
    and (text_value is null or length(text_value)<=10000)
    and (choice_value is null or length(choice_value)<=500)
    and (multiple_choice_value is null or
      (jsonb_typeof(multiple_choice_value)='array' and jsonb_array_length(multiple_choice_value) between 1 and 100
        and pg_column_size(multiple_choice_value)<=16384))
  )
);

create or replace function private.prevent_published_custom_form_change()
returns trigger language plpgsql set search_path='' as $$ declare version_status public.custom_form_version_status; begin
  if tg_table_name='custom_form_versions' then version_status:=old.status;
  else select status into version_status from public.custom_form_versions where id=old.version_id; end if;
  if version_status in ('published','retired') and (
    tg_table_name<>'custom_form_versions' or tg_op='DELETE' or
    to_jsonb(new)-'status' is distinct from to_jsonb(old)-'status' or
    not (old.status='published' and new.status='retired')
  ) then
    raise exception 'Published Custom Form versions and fields are immutable.' using errcode='55000';
  end if; return new;
end $$;
create trigger custom_form_versions_immutable before update or delete on public.custom_form_versions
for each row execute function private.prevent_published_custom_form_change();
create trigger custom_form_fields_immutable before update or delete on public.custom_form_fields
for each row execute function private.prevent_published_custom_form_change();

create or replace function private.validate_custom_form_assignment_version()
returns trigger language plpgsql set search_path='' as $$ begin
  if not exists(select 1 from public.custom_form_versions where id=new.version_id and status='published') then
    raise exception 'Custom Form assignments require an immutable published version.' using errcode='23514';
  end if;
  return new;
end $$;
create trigger custom_form_assignments_version before insert or update on public.custom_form_assignments
for each row execute function private.validate_custom_form_assignment_version();

create or replace function private.validate_custom_form_submission_assignment()
returns trigger language plpgsql set search_path='' as $$ declare assignment_record record; begin
  select * into assignment_record from public.custom_form_assignments where id=new.assignment_id;
  if assignment_record.version_id is distinct from new.version_id then
    raise exception 'Custom Form submission must use its assignment version.' using errcode='23514';
  end if;
  if assignment_record.archived_at is not null then
    raise exception 'Archived Custom Form assignments cannot receive submissions.' using errcode='23514';
  end if;
  if not (
    (assignment_record.assignment_type='student'
      and new.subject_student_id=assignment_record.student_id
      and new.subject_household_id is null and new.subject_volunteer_profile_id is null)
    or (assignment_record.assignment_type='household'
      and new.subject_student_id is null and new.subject_household_id=assignment_record.household_id
      and new.subject_volunteer_profile_id is null)
    or (assignment_record.assignment_type='volunteer'
      and new.subject_student_id is null and new.subject_household_id is null
      and new.subject_volunteer_profile_id=assignment_record.volunteer_profile_id)
    or (assignment_record.assignment_type='event'
      and new.subject_student_id is not null and new.subject_household_id is not null
      and new.subject_volunteer_profile_id is null
      and exists(select 1 from public.event_registrations registrations
        where registrations.event_id=assignment_record.event_id
          and registrations.student_id=new.subject_student_id
          and registrations.household_id=new.subject_household_id
          and registrations.status in ('registered','waitlisted','confirmed','completed')))
    or (assignment_record.assignment_type='general_ministry'
      and new.subject_student_id is null and new.subject_household_id is null
      and new.subject_volunteer_profile_id is null)
  ) then
    raise exception 'Custom Form submission subject does not match its assignment.' using errcode='23514';
  end if;
  if tg_op='UPDATE' and old.status<>'draft' and new is distinct from old then
    if not (old.status='submitted' and new.status='archived') then
      raise exception 'Completed Custom Form submissions are immutable except for archival.' using errcode='55000';
    end if;
  end if;
  return new;
end $$;
create trigger custom_form_submissions_assignment before insert or update on public.custom_form_submissions
for each row execute function private.validate_custom_form_submission_assignment();

create or replace function private.validate_custom_form_submission_completeness()
returns trigger language plpgsql set search_path='' as $$ declare missing_count integer; begin
  if new.status='submitted' then
    select count(*) into missing_count from public.custom_form_fields fields
    where fields.version_id=new.version_id and fields.is_required and not exists (
      select 1 from public.custom_form_answers answers
      where answers.submission_id=new.id and answers.field_id=fields.id
        and (fields.field_type<>'acknowledgment' or answers.boolean_value is true)
        and (fields.field_type not in ('short_text','long_text') or char_length(answers.text_value)>0)
    );
    if missing_count>0 then
      raise exception 'All required Custom Form fields must be satisfied before submission.' using errcode='23514';
    end if;
  end if;
  return null;
end $$;
create constraint trigger custom_form_submissions_complete
after insert or update on public.custom_form_submissions
deferrable initially deferred for each row
execute function private.validate_custom_form_submission_completeness();

create or replace function private.validate_custom_form_answer()
returns trigger language plpgsql set search_path='' as $$ declare selected record; selected_count integer; distinct_count integer; begin
  select f.field_type,f.choice_options,f.minimum_length,f.maximum_length,
    f.minimum_date,f.maximum_date,s.version_id,s.status as submission_status,
    f.version_id as field_version into selected
  from public.custom_form_fields f join public.custom_form_submissions s on s.id=new.submission_id where f.id=new.field_id;
  if selected.version_id is distinct from selected.field_version then raise exception 'Answer field version mismatch.' using errcode='23514'; end if;
  if not ((selected.field_type in ('short_text','long_text') and new.text_value is not null)
    or (selected.field_type in ('yes_no','acknowledgment') and new.boolean_value is not null)
    or (selected.field_type='date' and new.date_value is not null)
    or (selected.field_type='single_choice' and new.choice_value is not null and selected.choice_options ? new.choice_value)
    or (selected.field_type='multiple_choice' and new.multiple_choice_value is not null
      and not exists(select 1 from jsonb_array_elements_text(new.multiple_choice_value) value where not selected.choice_options ? value))) then
    raise exception 'Answer value does not match its controlled field.' using errcode='23514';
  end if;
  if selected.submission_status<>'draft' then
    raise exception 'Answers for completed Custom Forms are immutable.' using errcode='55000';
  end if;
  if new.text_value is not null and (
    (selected.minimum_length is not null and char_length(new.text_value)<selected.minimum_length)
    or (selected.maximum_length is not null and char_length(new.text_value)>selected.maximum_length)
  ) then raise exception 'Text answer length is outside the configured bounds.' using errcode='23514'; end if;
  if new.date_value is not null and (
    (selected.minimum_date is not null and new.date_value<selected.minimum_date)
    or (selected.maximum_date is not null and new.date_value>selected.maximum_date)
  ) then raise exception 'Date answer is outside the configured bounds.' using errcode='23514'; end if;
  if new.multiple_choice_value is not null then
    select count(*),count(distinct value) into selected_count,distinct_count
      from jsonb_array_elements_text(new.multiple_choice_value) value;
    if selected_count<>distinct_count then
      raise exception 'Multiple-choice answers cannot contain duplicate values.' using errcode='23514';
    end if;
  end if;
  return new;
end $$;
create trigger custom_form_answers_validate before insert or update on public.custom_form_answers
for each row execute function private.validate_custom_form_answer();

create index custom_form_versions_template_idx on public.custom_form_versions(template_id,version_number desc);
create index custom_form_fields_version_order_idx on public.custom_form_fields(version_id,display_order);
create index custom_form_assignments_event_idx on public.custom_form_assignments(event_id) where archived_at is null;
create index custom_form_assignments_student_idx on public.custom_form_assignments(student_id) where archived_at is null;
create index custom_form_assignments_household_idx on public.custom_form_assignments(household_id) where archived_at is null;
create index custom_form_assignments_volunteer_idx on public.custom_form_assignments(volunteer_profile_id) where archived_at is null;
create index custom_form_submissions_version_idx on public.custom_form_submissions(version_id,submitted_at desc);

do $$ declare table_name text; begin foreach table_name in array array[
  'custom_form_templates','custom_form_versions','custom_form_fields','custom_form_assignments',
  'custom_form_submissions','custom_form_answers'
] loop execute format('alter table public.%I enable row level security',table_name);
  execute format('alter table public.%I force row level security',table_name);
  execute format('revoke all on table public.%I from public, anon, authenticated',table_name);
end loop; end $$;

commit;
