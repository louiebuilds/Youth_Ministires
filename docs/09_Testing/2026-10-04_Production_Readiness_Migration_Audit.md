# Production Readiness Migration Audit — October 4, 2026

## Purpose

This report records the database-migration audit performed before assembling a
production release candidate. It is a readiness checkpoint, not production
approval and not evidence that the remaining migrations have been applied.

## Evidence Reviewed

- Every version-controlled migration through
  `202610040004_live_dashboard_birthdays.sql`
- Read-only linked-development history from `supabase migration list`
- Full clean-chain database verification
- All 17 repository regression suites
- ESLint, TypeScript, and the optimized production build
- Working-tree integrity with `git diff --check`

## Current Linked-Development History

The read-only October 4 history check confirms:

- The known historical blank remote entries from `202607230001` through
  `202608160001` remain unchanged. They must not be casually repaired or
  replayed.
- `202608220001` through `202609290003` are aligned locally and remotely.
- The following four local migrations have blank remote history entries:

| Order | Migration | State | Primary effect |
|---:|---|---|---|
| 1 | `202609290004_enforce_account_lifecycle_transitions.sql` | Not recorded remotely | Enforces account status/role transitions, final-administrator protection, and Staff capability revocation. |
| 2 | `202609290005_restrict_final_medical_release_authorization.sql` | Not recorded remotely | Restricts final Medical Release authorization and preserves audited review evidence. |
| 3 | `202610040001_medical_release_independent_completion_paths.sql` | Not recorded remotely | Supports independent digital or paper Medical Release completion while retaining final authorization. |
| 4 | `202610040003_paper_only_event_waiver_intake.sql` | Not recorded remotely | Adds protected paper-only Event waiver intake. |

Migration `202610040004_live_dashboard_birthdays.sql` is installed and now
recorded remotely after the reconciliation described below.

The missing `202610040002` version is an intentional numbering gap. Migration
ordering remains unambiguous.

## Manual Dashboard Migration Reconciliation

The Product Owner reported that the SQL for `202610040004` completed with
“Success. No rows returned,” while the Supabase migration-history table did not
record that version as applied.

The Docker-backed linked schema dump subsequently confirmed:

- Both expected function signatures are installed.
- Both function bodies exactly match the version-controlled migration.
- Both functions retain `SECURITY DEFINER`, empty `search_path`, and
  `row_security=off`.
- Public execution is revoked and authenticated execution is granted.

The approved command
`supabase migration repair --status applied 202610040004` then recorded only
that exact version as applied. A follow-up history check confirmed the local and
remote `202610040004` entries match. The reusable read-only SQL Editor query is
retained at
`supabase/tests/database/manual_20261004_dashboard_migration_reconciliation.sql`.

A blanket `supabase db push` remains blocked because the four earlier pending
migrations require an ordered staging rehearsal and must not be skipped merely
because the later dashboard migration is already recorded.

## Migration Safety Review

- All five pending files are transactional (`begin`/`commit`).
- No pending file drops a table, column, or type.
- Function changes use fixed empty `search_path` and explicit execution grants.
- Direct authenticated table writes are not introduced.
- Account-lifecycle changes are fail-closed and protect the final active
  Platform Administrator.
- Medical changes preserve final authorization, retained evidence, and audit
  events while changing completion-path semantics.
- Dashboard functions expose display-safe birthday data and aggregate
  Prayer & Care counts only to authorized manager roles.
- The broader migration chain contains two intentional data transitions that
  are already recorded as applied in development: invited Volunteer profile
  backfill and legacy family-pass revocation. They must still be called out in
  any first production rollout assembled from the full repository history.

## Required Application Order

Apply or reconcile the five versions in numeric order. Do not run the later
Forms or dashboard application code against a database that is missing its
required migration contract.

1. Account lifecycle enforcement — `202609290004`
2. Final Medical Release authorization restriction — `202609290005`
3. Independent Medical Release completion paths — `202610040001`
4. Paper-only Event waiver intake — `202610040003`
5. Live dashboard projections — `202610040004` (already reconciled; do not
   replay)

The preferred release sequence is database-first for these additive and
restrictive contracts, followed immediately by the matching application
deployment and role-specific smoke tests.

## Verification Result

| Check | Result |
|---|---|
| Full migration-chain verification | Passed |
| Repository regression suites | Passed — 17 of 17 |
| ESLint | Passed |
| TypeScript through production build | Passed |
| Optimized production build | Passed |
| `git diff --check` | Passed |
| Linked migration-history inspection | Completed; four unrecorded versions remain |
| Docker-backed linked schema comparison | Passed |
| Development reconciliation of manually run `202610040004` | Passed; exact bodies and grants verified, history repaired |
| Staging migration rehearsal | Pending |
| Production backup/restore evidence | Pending |
| Production approval | Not granted |

## Release Gate

Migration readiness remains **blocked** until the four pending versions are
rehearsed in numeric order against staging or a production-equivalent clone.
The already-recorded `202610040004` must not be replayed. Production deployment
must also have a
verified backup, forward-correction plan, application rollback compatibility
review, and post-deployment smoke checklist.

The read-only Supabase project inventory found no dedicated Youth Ministries
Platform staging project. The linked development project must not be used as a
staging substitute, and the unrelated inactive training project is out of
scope. Environment setup and rehearsal steps are documented in
`docs/12_Ministry_Operations/01_Staging_and_Production_Release_Runbook.md`.

The read-only Supabase project inventory found no dedicated Youth Ministries
Platform staging project. The linked development project must not be used as a
staging substitute, and the unrelated inactive training project is out of
scope. Environment setup and rehearsal steps are documented in
`docs/12_Ministry_Operations/01_Staging_and_Production_Release_Runbook.md`.

## Docker's Role

Docker Desktop is a local operator dependency for Supabase CLI operations that
run PostgreSQL tooling in a container, including the linked schema-only dump
used by this audit. Docker is not part of the planned production application
runtime. Vercel runs the Next.js application and Supabase runs the managed
PostgreSQL, Auth, Storage, and Realtime services. The release operator may use
Docker on a trusted workstation or CI runner for pre-deployment verification;
production users and the production web server do not install or manage Docker
Desktop.
