\set ON_ERROR_STOP on

-- DESTRUCTIVE DEVELOPMENT/ACCEPTANCE UTILITY -- ROLLBACK-ONLY BY DEFAULT.
-- Do not change the final transaction statement without separate Technical Lead
-- authorization after reviewing dev-reconcile-duplicate-parent-preview.sql.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '5min';

do $$
declare
  canonical_id constant uuid := '591cba95-a32d-4ca4-a7ac-d9b422a6db60';
  duplicate_id constant uuid := '75b2a220-170a-485b-ab01-049a18b38966';
  parent_profile_id constant uuid := '6e9f7c76-0849-467b-b6cd-a67dc7d6dffb';
  administrator_id constant uuid := '5cf33e7d-5021-4da5-a041-59bd1885786a';
  reference_record record;
  reference_count bigint;
begin
  -- Lock both identities first. This prevents new FK references from being
  -- established while the reconciliation is in progress.
  perform 1
  from public.people
  where id in (canonical_id, duplicate_id)
  order by id
  for update;

  if (select count(*) from public.people
      where id in (canonical_id, duplicate_id)
        and status = 'active' and archived_at is null) <> 2 then
    raise exception 'Reconciliation stopped: expected active Person records changed.';
  end if;

  if not exists (
    select 1 from public.people
    where id = canonical_id
      and first_name = 'Louis'
      and preferred_name = 'Louie'
      and last_name = 'VanderMolen'
  ) or not exists (
    select 1 from public.people
    where id = duplicate_id
      and first_name = 'Louis'
      and preferred_name = 'Louie'
      and last_name = 'VanderMolen'
  ) then
    raise exception 'Reconciliation stopped: Person identity fingerprint changed.';
  end if;

  perform 1
  from public.household_memberships
  where id = '58853d21-41b7-4f89-a98b-21a10c225840'::uuid
  for update;

  if (select count(*) from public.household_memberships
      where id = '58853d21-41b7-4f89-a98b-21a10c225840'::uuid
        and household_id = 'e5328f94-0233-465b-9975-c218cc739561'::uuid
        and person_id = duplicate_id
        and relationship_label = 'Father'
        and is_responsible_adult) <> 1
    or (select count(*) from public.household_memberships
        where person_id = duplicate_id) <> 1
    or exists (
      select 1 from public.household_memberships
      where person_id = canonical_id
    ) then
    raise exception 'Reconciliation stopped: household membership state changed.';
  end if;

  perform 1
  from public.student_relationships
  where id in (
    '587656ea-3cd3-46aa-8f6a-e96416973d92'::uuid,
    'a71bda65-4a9a-4d56-94a1-d1dbcc11d884'::uuid
  )
  order by id
  for update;

  if (select count(*) from public.student_relationships
      where id in (
        '587656ea-3cd3-46aa-8f6a-e96416973d92'::uuid,
        'a71bda65-4a9a-4d56-94a1-d1dbcc11d884'::uuid
      )
        and person_id = duplicate_id
        and is_legal_guardian
        and may_view_student_information) <> 2
    or (select count(*) from public.student_relationships
        where person_id = duplicate_id) <> 2
    or exists (
      select 1 from public.student_relationships
      where person_id = canonical_id
    ) then
    raise exception 'Reconciliation stopped: guardian relationship state changed.';
  end if;

  perform 1
  from public.profiles
  where id in (parent_profile_id, administrator_id)
  order by id
  for update;

  if not exists (
    select 1 from public.profiles
    where id = parent_profile_id
      and person_id = duplicate_id
      and primary_role = 'parent'
      and status = 'active'
  ) or (select count(*) from public.profiles
        where person_id in (canonical_id, duplicate_id)) <> 1
    or exists (
      select 1 from public.profiles
    where id <> parent_profile_id
      and person_id in (canonical_id, duplicate_id)
      and status = 'active'
  ) then
    raise exception 'Reconciliation stopped: Parent profile link state changed.';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = administrator_id
      and primary_role = 'platform_administrator'
      and status = 'active'
  ) then
    raise exception 'Reconciliation stopped: approved audit actor is not active.';
  end if;

  if exists (
    select 1
    from pg_constraint as constraint_record
    join pg_class as source
      on source.oid = constraint_record.conrelid
    join pg_namespace as source_ns
      on source_ns.oid = source.relnamespace
    where constraint_record.contype = 'f'
      and constraint_record.confrelid = 'public.people'::regclass
      and source_ns.nspname = 'public'
      and (
        array_length(constraint_record.conkey, 1) <> 1
        or array_length(constraint_record.confkey, 1) <> 1
      )
  ) then
    raise exception 'Reconciliation stopped: an unsupported composite Person FK exists.';
  end if;

  -- Fail closed if either Person has any unexpected public-table FK reference.
  for reference_record in
    select
      source_ns.nspname as source_schema,
      source.relname as source_table,
      source_column.attname as source_column
    from pg_constraint as constraint_record
    join pg_class as source
      on source.oid = constraint_record.conrelid
    join pg_namespace as source_ns
      on source_ns.oid = source.relnamespace
    join pg_attribute as source_column
      on source_column.attrelid = source.oid
     and source_column.attnum = constraint_record.conkey[1]
    where constraint_record.contype = 'f'
      and constraint_record.confrelid = 'public.people'::regclass
      and source_ns.nspname = 'public'
      and array_length(constraint_record.conkey, 1) = 1
      and array_length(constraint_record.confkey, 1) = 1
  loop
    execute format(
      'select count(*) from %I.%I where %I in ($1, $2)',
      reference_record.source_schema,
      reference_record.source_table,
      reference_record.source_column
    ) into reference_count using canonical_id, duplicate_id;

    if reference_count > 0 and reference_record.source_table not in (
      'profiles', 'household_memberships', 'student_relationships'
    ) then
      raise exception
        'Reconciliation stopped: unexpected reference in %.%.',
        reference_record.source_table,
        reference_record.source_column;
    end if;
  end loop;
end;
$$;

-- Preserve the existing membership/relationship row IDs and created_at values.
-- The unique (household_id, person_id) and (student_id, person_id) constraints
-- were checked above before these in-place moves.
update public.household_memberships
set person_id = '591cba95-a32d-4ca4-a7ac-d9b422a6db60'::uuid
where id = '58853d21-41b7-4f89-a98b-21a10c225840'::uuid
  and person_id = '75b2a220-170a-485b-ab01-049a18b38966'::uuid;

update public.student_relationships
set person_id = '591cba95-a32d-4ca4-a7ac-d9b422a6db60'::uuid
where id in (
  '587656ea-3cd3-46aa-8f6a-e96416973d92'::uuid,
  'a71bda65-4a9a-4d56-94a1-d1dbcc11d884'::uuid
)
  and person_id = '75b2a220-170a-485b-ab01-049a18b38966'::uuid;

-- Use the deployed protected workflow for the Parent profile relink so its
-- explicit confirmation, reason, authorization checks, and audit event remain
-- authoritative. SQL Editor has no end-user JWT, so this transaction adopts
-- the one expected active Platform Administrator solely for this RPC call.
select set_config(
  'request.jwt.claim.sub',
  '5cf33e7d-5021-4da5-a041-59bd1885786a',
  true
);

select public.link_parent_account_to_person(
  '6e9f7c76-0849-467b-b6cd-a67dc7d6dffb'::uuid,
  '591cba95-a32d-4ca4-a7ac-d9b422a6db60'::uuid,
  true,
  'Reconcile duplicate acceptance Person identity after reviewed relationship transfer'
);

do $$
declare
  duplicate_id constant uuid := '75b2a220-170a-485b-ab01-049a18b38966';
  reference_record record;
  reference_count bigint;
begin
  -- A Person cannot be retired while any current public-table FK still points
  -- to it. Historical audit entity IDs/metadata are intentionally not FKs and
  -- are retained unchanged.
  for reference_record in
    select
      source_ns.nspname as source_schema,
      source.relname as source_table,
      source_column.attname as source_column
    from pg_constraint as constraint_record
    join pg_class as source
      on source.oid = constraint_record.conrelid
    join pg_namespace as source_ns
      on source_ns.oid = source.relnamespace
    join pg_attribute as source_column
      on source_column.attrelid = source.oid
     and source_column.attnum = constraint_record.conkey[1]
    where constraint_record.contype = 'f'
      and constraint_record.confrelid = 'public.people'::regclass
      and source_ns.nspname = 'public'
      and array_length(constraint_record.conkey, 1) = 1
      and array_length(constraint_record.confkey, 1) = 1
  loop
    execute format(
      'select count(*) from %I.%I where %I = $1',
      reference_record.source_schema,
      reference_record.source_table,
      reference_record.source_column
    ) into reference_count using duplicate_id;

    if reference_count <> 0 then
      raise exception
        'Reconciliation stopped: duplicate remains referenced by %.%.',
        reference_record.source_table,
        reference_record.source_column;
    end if;
  end loop;
end;
$$;

-- people.status/archived_at is the repository's supported Person retirement
-- state. No protected Person-archive RPC currently exists.
update public.people
set status = 'archived', archived_at = now(), updated_at = now()
where id = '75b2a220-170a-485b-ab01-049a18b38966'::uuid
  and status = 'active'
  and archived_at is null;

-- Record only structural IDs and counts. Existing historical audit rows are
-- never updated or deleted.
insert into public.audit_events (
  actor_profile_id,
  action,
  entity_type,
  entity_id,
  result,
  source,
  metadata
)
values (
  '5cf33e7d-5021-4da5-a041-59bd1885786a'::uuid,
  'acceptance.person_reconciled',
  'person',
  '75b2a220-170a-485b-ab01-049a18b38966'::uuid,
  'success',
  'web',
  jsonb_build_object(
    'canonicalPersonId', '591cba95-a32d-4ca4-a7ac-d9b422a6db60'::uuid,
    'householdMembershipsMoved', 1,
    'guardianRelationshipsMoved', 2,
    'parentProfileRelinked', true
  )
);

\echo '=== Post-change Person lifecycle (inside rollback-only transaction) ==='
select id, status, archived_at
from public.people
where id in (
  '591cba95-a32d-4ca4-a7ac-d9b422a6db60'::uuid,
  '75b2a220-170a-485b-ab01-049a18b38966'::uuid
)
order by id;

\echo '=== Post-change operational ownership ==='
select 'household_memberships' as relationship_type, count(*) as canonical_count
from public.household_memberships
where person_id = '591cba95-a32d-4ca4-a7ac-d9b422a6db60'::uuid
union all
select 'student_relationships', count(*)
from public.student_relationships
where person_id = '591cba95-a32d-4ca4-a7ac-d9b422a6db60'::uuid
union all
select 'active_parent_profile', count(*)
from public.profiles
where id = '6e9f7c76-0849-467b-b6cd-a67dc7d6dffb'::uuid
  and person_id = '591cba95-a32d-4ca4-a7ac-d9b422a6db60'::uuid
  and primary_role = 'parent'
  and status = 'active';

\echo '=== Post-change Prayer & Care picker identity count ==='
select count(*) as active_louie_selector_rows
from public.people
where status <> 'archived'
  and concat_ws(
    ' ',
    coalesce(nullif(preferred_name, ''), first_name),
    last_name
  ) = 'Louie VanderMolen';

do $$
begin
  if not exists (
    select 1 from public.people
    where id = '591cba95-a32d-4ca4-a7ac-d9b422a6db60'::uuid
      and status = 'active' and archived_at is null
  ) or not exists (
    select 1 from public.people
    where id = '75b2a220-170a-485b-ab01-049a18b38966'::uuid
      and status = 'archived' and archived_at is not null
  ) then
    raise exception 'Post-check failed: Person lifecycle is incorrect.';
  end if;

  if (select count(*) from public.household_memberships
      where person_id = '591cba95-a32d-4ca4-a7ac-d9b422a6db60'::uuid) <> 1
    or (select count(*) from public.student_relationships
        where person_id = '591cba95-a32d-4ca4-a7ac-d9b422a6db60'::uuid) <> 2
    or not exists (
      select 1 from public.profiles
      where id = '6e9f7c76-0849-467b-b6cd-a67dc7d6dffb'::uuid
        and person_id = '591cba95-a32d-4ca4-a7ac-d9b422a6db60'::uuid
        and primary_role = 'parent'
        and status = 'active'
    ) then
    raise exception 'Post-check failed: canonical operational relationships are incomplete.';
  end if;

  if exists (
    select 1 from public.household_memberships
    where person_id = '75b2a220-170a-485b-ab01-049a18b38966'::uuid
  ) or exists (
    select 1 from public.student_relationships
    where person_id = '75b2a220-170a-485b-ab01-049a18b38966'::uuid
  ) or exists (
    select 1 from public.profiles
    where person_id = '75b2a220-170a-485b-ab01-049a18b38966'::uuid
  ) then
    raise exception 'Post-check failed: duplicate retains operational relationships.';
  end if;

  if (select count(*) from public.people
      where status <> 'archived'
        and concat_ws(
          ' ',
          coalesce(nullif(preferred_name, ''), first_name),
          last_name
        ) = 'Louie VanderMolen') <> 1 then
    raise exception 'Post-check failed: Prayer & Care picker identity count is not one.';
  end if;

  if not exists (
    select 1 from public.audit_events
    where action = 'account.person_relinked'
      and entity_type = 'profile'
      and entity_id = '6e9f7c76-0849-467b-b6cd-a67dc7d6dffb'::uuid
      and metadata ->> 'newPersonId' = '591cba95-a32d-4ca4-a7ac-d9b422a6db60'
  ) or not exists (
    select 1 from public.audit_events
    where action = 'acceptance.person_reconciled'
      and entity_type = 'person'
      and entity_id = '75b2a220-170a-485b-ab01-049a18b38966'::uuid
  ) then
    raise exception 'Post-check failed: reconciliation audit evidence is incomplete.';
  end if;
end;
$$;

rollback;
