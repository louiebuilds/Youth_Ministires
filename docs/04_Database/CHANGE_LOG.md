# Database Change Log

## v0.6.1 — 2026-07-24

### Added

- Added restricted functions for self-service profile updates, administrator
  account search, and audited existing-account administration.
- Removed direct authenticated profile insert, update, and delete grants.
- Added synthetic-data execution tests and a privacy-safe connected acceptance
  query.

## v0.5.0 — 2026-07-23

### Added

- Added the Milestone 4 authorization migration.
- Added private fixed-search-path authorization helpers.
- Added active-account, permanent-role, household, student-relationship,
  event-assignment, and audit-oversight policies.
- Added clean-database and connected-Supabase security verification.

## v0.4.0 — 2026-07-23

### Added

- Added the approved core database design.
- Added the first version-controlled Supabase migration.
- Added people, profiles, households, students, relationships, events,
  event-scoped volunteer assignments, and audit events.
- Added integrity constraints, indexes, timestamp triggers, existing-user
  profile backfill, and future Auth-user profile creation.
- Added forced Row-Level Security and the own-profile baseline policy.
- Added automated migration execution and Product Owner acceptance checks.
