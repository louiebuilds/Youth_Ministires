# Group Chat — Family Adults production preflight

This is an inspection deliverable for the existing October 25 release, not
production approval or milestone closure. No hosted database was accessed.

## Run

1. Open the intended **production** project in the Supabase SQL Editor and
   confirm its project identity. Use the database administrator (`postgres`)
   role so catalog access and row visibility are complete.
2. Paste the complete contents of
   `supabase/inspections/20261025_family_adults_production_preflight.sql`.
   It opens a consistent read-only transaction, selects catalogs and technical
   identifiers, and ends with `ROLLBACK`. It does not execute application RPCs.
3. Retain all numbered result sets. If the Editor displays only the final
   result, run numbered SELECT statements individually between the script's
   opening transaction/settings and closing `ROLLBACK`. Keep CTEs with their
   SELECT. Separately run sections use separate snapshots; rerun the full
   inspection close to any later approved release.
4. Any permission, missing-object, timeout, or other SQL error means
   **incomplete**, never pass. Run `ROLLBACK;` to clear an aborted transaction.
   Inspect catalog sections 01–10 separately if later table queries fail.
   Do not create missing objects or repair history as part of this inspection.

The script intentionally returns no person names, contact details, birth dates,
household names, message bodies, or audit payloads. Technical identifiers still
belong in restricted release evidence. Function/trigger definitions are inspected
as source code; review any unexpected custom definitions before sharing results.

## Interpretation and blockers

| Sections | Required interpretation |
| --- | --- |
| 01 | Read-only must be `on`. Confirm the intended project independently; a database name alone is not proof. Insufficient runner visibility blocks completion. |
| 02–03 | Required relations and column types must exist. Review nullability/defaults, particularly non-null `is_parent_managed DEFAULT false`. All five chat tables must have enabled and forced RLS. A catalog `PASS` only checks that specific property. |
| 04 | Confirm the listed person, household, room and profile foreign keys, PKs, student/person uniqueness, and household/person uniqueness. Missing, altered or unvalidated constraints require review before release. Check room source/archive and member-removal checks against migration `202609250001`. |
| 05 | Confirm the valid, ready, unique active membership index on `(room_id, profile_id) WHERE removed_at IS NULL`. Unexpected unique indexes can reject legitimate retained membership operations. |
| 06–08 | All prerequisite signatures must exist. All three new RPC signatures must be absent before applying `202610250001`; existing targets block its plain `CREATE FUNCTION`, even without history entries. Review every unexpected overload or non-function object with a matching name for API ambiguity/conflicts. |
| 09 | Expect no direct anon/authenticated table or column privileges on the five chat tables. Review every applicable policy, including private Realtime authorization. Unexpected grants or permissive policies are security blockers until reviewed. |
| 10 | Review insert column requirements, constraints, triggers/rules, enum labels, schema privileges, default function ACLs and DDL event triggers. Extra required columns without defaults, changed enum labels, rejecting triggers, or unreviewed automatic grants can block safe application/operation. |
| 11 | Each of `202609250001`, `202609250002`, `202610080001`, `202610080002` must have exactly one history entry **and** matching schema/definitions. Both October 25 targets should be absent. A target already recorded means stop and reconcile its actual state; do not replay it. Unrelated historical blank entries are outside this task. |
| 12–13 | Any **unremoved** student-linked membership is a release security blocker pending an approved remediation decision, including archived students, inactive profiles, and archived rooms. Removed membership history alone is retained evidence, not proof of current access. All student records participate in the linkage. |
| 14 | Duplicate memberships or orphan relationships block readiness. Missing owner memberships and student-linked private-room creators need explicit review, including archived rooms. These counts do not authorize deleting records. |

### RPC compatibility review

For the existing functions replaced by these migrations, verify section 07:

- `public.create_chat_room(text, public.chat_room_type, public.chat_source_access, uuid, uuid)`
  returns scalar `uuid`, with input names `p_name`, `p_room_type`,
  `p_source_access`, `p_event_id`, `p_schedule_id`. The last three defaults
  are `'explicit'`, `NULL`, `NULL`.
- `public.add_chat_room_member(uuid, uuid)` returns scalar `uuid`, with input
  names `p_room_id`, `p_profile_id`, no defaults.
- `public.list_chat_member_candidates(uuid)` has input `p_room_id` and returns
  the ordered table columns `profile_id uuid`, `display_name text`,
  `primary_role public.account_role`, `is_member boolean`.
- Required private helpers return their expected boolean or account-role value.
  `private.can_view_household(uuid)` must retain existing family authorization;
  Parent invitation opt-in must not grant household access.

Changed input names or return types can prevent `CREATE OR REPLACE FUNCTION`.
Overloads/default arguments can create ambiguous RPC calls. Compare definitions
to the four prerequisite migration files and any separately approved later
changes. In particular, `can_parent_invite_to_chat` must contain the October 8
discovery preference logic, not just the earlier shared-room logic. History
presence does not establish that a function body is correct.

Review owners and runner ownership privileges. The runner must be able to
replace existing functions and create functions in `public`. Security-definer
owners must have the needed table access and RLS bypass for `row_security=off`.
Expected protected chat functions use an empty fixed `search_path`; inspect
`function_settings`. Public chat RPCs allow authenticated execution and deny
PUBLIC/anon execution. Private chat helpers are not client-executable. Review
extra role grants and default ACLs; a NULL explicit ACL can still imply PUBLIC
execution, which section 08 expands.

### Student access is not repaired by these migrations

Migration `202610250002` rejects future student-linked private-group creation
and explicit member additions. Neither migration removes existing memberships
or changes the retained membership read authorization. Archived rooms still
have retained readable history. Do not interpret future-write guards as
remediation of existing student access. Section 13 provides only the technical
IDs needed for a separate review; do not automatically remove owners or records.

## Evidence and limits

The complete script was executed successfully against an isolated local
PostgreSQL-compatible PGlite database populated from the repository's prerequisite
migrations. The clean prerequisite state had no catalog blockers; installing
`202610250001` locally caused all three existing CREATE targets to be flagged.
This validates SQL execution against that fixture, not production compatibility.

The preflight does not simulate DDL, invoke mutating RPCs, prove all possible
runtime paths, or replace authenticated acceptance testing. Unexpected custom
objects require Technical Lead review. A clean inspection is one release gate;
Product Owner acceptance, Technical Lead review, backups and separate deployment
authorization remain required. No commit, push, deployment, hosted migration,
record change or history repair is part of this deliverable.
