# Production Readiness — Repository Stabilization and Migration Audit

**Date:** October 4, 2026
**Status:** Active; production deployment is not approved

## Outcome

Production-readiness work began with repository stabilization. An applied
historical migration that had been edited locally was restored byte-for-byte to
its committed content. Current behavior remains implemented only through later
forward migrations, preserving the immutable migration-history rule.

Five stale source-contract checks were updated to validate current behavior
without depending on one-line formatting or the retired Volunteer Compliance
tab. No application authorization or runtime behavior was loosened.

The complete automated gate passed:

- 17 of 17 focused regression suites
- Full clean migration-chain verification
- ESLint
- TypeScript
- Optimized production build
- Diff integrity

## Migration Audit

A read-only linked Supabase history check initially found that local and remote
history matched through `202609290003`, with five later migrations unrecorded:

- `202609290004`
- `202609290005`
- `202610040001`
- `202610040003`
- `202610040004`

The Product Owner previously ran the dashboard SQL and received a successful
no-row result, but `202610040004` was not recorded in migration history.

After Docker Desktop was started, a linked schema-only dump confirmed both
dashboard function bodies exactly match the repository migration, including
their fixed security settings and execution grants. Migration history was then
repaired for `202610040004` only, and a follow-up list confirmed it now matches
locally and remotely. Four migrations remain pending: `202609290004`,
`202609290005`, `202610040001`, and `202610040003`. A blanket database push is
still not approved at this checkpoint.

Detailed evidence, ordering, safety findings, and release gates are recorded in
`docs/09_Testing/2026-10-04_Production_Readiness_Migration_Audit.md`.

## Next Step

Rehearse the four remaining migrations in numeric order in staging or a
production-equivalent clone before production approval. Do not replay the
already-reconciled `202610040004` dashboard migration.

## Milestone 15 First-Release Scope Decision

The Product Owner approved deferring public anonymous Visitor intake and
automated missing-document Communication reminders until after the initial
production release. Version 1 retains protected staff-assisted Visitor Card
entry and existing authorized Communications workflows. These deferrals reduce
public abuse, privacy, sensitive-inference, and recipient-targeting risk while
preserving the essential Forms, registration, readiness, and Visitor operations
needed for launch.
