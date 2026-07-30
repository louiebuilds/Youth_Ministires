# Security Change Log

## v0.11.0 — 2026-07-30

### Added

- Added ministry-only curriculum capabilities and database authorization.
- Added volunteer read-only published-content access and family denial.
- Added private storage policies, validated uploads, short-lived downloads,
  and download-authorization auditing.

## v0.8.0 — 2026-07-26

### Added

- Added ministry-manager, volunteer-self, and family-denial boundaries.
- Added protected background-check references and audited volunteer mutations.
- Revoked direct volunteer and event-assignment mutations.

## v0.7.0 — 2026-07-24

### Added

- Added relationship-scoped family and child workspace projections.
- Added legal-guardian medical-summary access enforcement.
- Added ministry-only member tags and management workflows.
- Added audited family, child, contact, relationship, and tag mutations.
- Revoked direct authenticated core member-data and tag mutations.

## v0.6.1 — 2026-07-24

### Added

- Added audited self-service display-name updates.
- Added database-enforced Platform-Administrator account search and management.
- Removed direct authenticated profile mutation grants.
- Added administrator self-demotion and self-deactivation protection.

## v0.5.0 — 2026-07-23

### Added

- Defined the final five-role permission model and account-lifecycle rules.
- Defined relationship and event-assignment authorization boundaries.
- Implemented centralized application capabilities and protected routes.
- Implemented 19 resource-specific PostgreSQL RLS policies.
- Added private authorization helpers with controlled execution privileges.
- Added audit immutability and security-oversight controls.
- Added threat modeling, incident response, access review, retention, export,
  rate-limit, session, MFA, and deferred-control decisions.
- Added PII minimization rules for accounts, households, and students.
- Added the shared first-name and last-initial student display formatter.
- Added automated and Product Owner security acceptance tests.
