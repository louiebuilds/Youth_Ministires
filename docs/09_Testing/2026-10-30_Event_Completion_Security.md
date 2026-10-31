# Step 26 — Event Completion Security Hardening

Implemented October 30, 2026. LOCAL development and LOCAL Supabase only.
Product Owner manual UI acceptance and Technical Lead review remain pending.

## Finding and implementation

The previous trigger trusted `app.event_lifecycle_transition`, which an
authenticated database role can set. Forward migration
`202610300001_event_completion_security.sql` replaces that authorization check.
The historical migration is unchanged; its obsolete setting references remain
as migration history and in the attack regression test and inspection snippets.

The trigger is explicitly SECURITY INVOKER and checks PostgreSQL `current_user`.
Only `complete_event(uuid)` and `reopen_event(uuid)` are owned by the dedicated
NOLOGIN, NOINHERIT, non-superuser, non-BYPASSRLS `event_lifecycle_owner` role.
No application role has membership. The owner receives SELECT on events, UPDATE
on lifecycle columns only, INSERT on audit events, identity-sequence usage,
and explicit RLS policies. It cannot create schema objects. PostgreSQL 17 retains
an ADMIN-only membership for the trusted migration operator after its ordinary
membership is revoked; this does not give application roles access.

The RPCs retain active-profile and Administrator/Youth Pastor checks, row locks,
future/archived/state validation, and atomic audit writes. Search paths are empty
and RLS remains enabled. A private read-only SECURITY DEFINER identity helper
uses the migration owner's existing auth access because Supabase's managed auth
schema does not allow that operator to grant schema usage. Application roles
cannot execute the helper. RPC grants are revoked before ownership transfer,
including Supabase's inherited service_role grant, then explicitly granted to
authenticated. No client flag authorizes a transition.

Ordinary completed inserts, transitions into/out of Completed, editing Completed
events, and lifecycle-metadata forgery are rejected. The trigger is ENABLE ALWAYS.
The manual UI, server actions, RPC signatures, and generated types are unchanged.
Trusted database administrators retain their normal ability to alter schema and
privileges. As elsewhere in Supabase, RPC actor identity relies on authenticated
JWT claims supplied by the trusted gateway; direct database credentials must not
be distributed to end users.

## Inspection and dependent data

Reviewed event pages, lifecycle form, actions, service RPC calls, event migrations,
RLS, grants, and attendance regression fixtures. Lifecycle actions use Next server
actions rather than a separate event API route. Existing event RLS permits active
ministry management including Staff; the trigger adds the narrower lifecycle
boundary even for existing SECURITY DEFINER event-editing RPCs.

Dependencies include attendance sessions/records and check-in data, registrations,
volunteer assignments, registration settings, document requirements/participation
overrides, custom forms, checklist items, reminders, and audit history. The patch
changes no child tables, foreign keys, registration statuses, permissions, or
child-data workflows.

## Verification

- Expanded `node scripts/verify-attendance-foundation.mjs`: PASS, including
  spoofed flag, completed insert, metadata forgery, direct completion/reopen,
  completed edit, denied roles/inactive leaders, both authorized roles, and no
  authority leakage after RPC completion within the same transaction.
- `node scripts/verify-security-authorization.mjs`: PASS.
- LOCAL PostgreSQL 17 rollback SQL checks: PASS, including role-assumption denial,
  exact JSON comparisons of every other public table, lifecycle state and audits.
  Run `scripts/verify-local-event-completion-security.sql` through psql inside
  `supabase_db_Youth-Ministries-Platform` as its local test administrator
  `supabase_admin` with ON_ERROR_STOP. All SQL fixtures roll back.
- `node scripts/verify-local-event-completion-security.mjs`: PASS against
  `http://127.0.0.1:54321`. Five-role authenticated REST checks, inactive leaders,
  direct writes, and exactly four lifecycle audit records. Temporary accounts,
  event, and lifecycle audit fixtures are removed in finally cleanup.
- Focused ESLint and `git diff --check`: PASS.

The migration was applied individually to the named LOCAL container. Its final
ownership assertions passed there and version 202610300001 was recorded in LOCAL
migration history without replaying the patch. No CLI database push was used. No hosted database operation, GitHub
push, commit, or Vercel deployment was performed. Existing unrelated working-tree
changes were retained. No milestone closure or manual UI acceptance is claimed.

PostgreSQL semantics reference:
https://www.postgresql.org/docs/current/functions-info.html
and https://www.postgresql.org/docs/current/sql-createfunction.html
