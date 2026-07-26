# Volunteer Management Database

**Document ID:** DB-003
**Version:** v0.8.0
**Status:** Complete
**Milestone:** 7 — Volunteer Management
**Date:** 2026-07-26

## Additive Migrations

- `202607240003_volunteer_management_foundation.sql`
- `202607240004_volunteer_management_workflows.sql`
- `202607260001_volunteer_scheduling.sql`

The migrations add volunteer profiles, certification metadata, a skill
catalog and assignments, recurring availability, protected workspace
projections, and audited mutations. Scheduling reuses the existing events and
event-volunteer-assignment tables.

## Security Boundary

Row-Level Security gives ministry managers authorized ministry visibility and
volunteers self-only visibility. Parent accounts receive no volunteer data.
Provider references are omitted from volunteer self projections. Direct
authenticated writes to volunteer and assignment tables are revoked.

Security-definer functions repeat role, lifecycle, ownership, input, and
target-record checks before changing data. Audit metadata records identifiers,
status, and operational classifications without copying sensitive documents or
notes.

## Verification

The synthetic execution test covers migration execution, constraints,
directory and workspace boundaries, family denial, cross-volunteer denial,
manager mutations, volunteer self-service, event scheduling, responses,
direct-write denial, and audit records.
