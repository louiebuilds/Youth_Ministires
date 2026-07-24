# Member Management Database

**Document ID:** DB-002
**Version:** v0.7.0
**Status:** Complete
**Milestone:** 6 — Member Management
**Date:** 2026-07-24

## Scope

The Milestone 6 migration extends the core person, household, student, and
relationship model with:

- reusable ministry member tags and assignments;
- privacy-filtered member and family directory functions;
- authorized family and child workspace projections;
- audited family, adult-contact, child, relationship-permission, and tag
  mutations; and
- family/child creation with required responsible-adult and guardian
  relationships.

## Security Boundaries

All public member-management functions reauthorize the active account in
PostgreSQL. Ministry mutation functions require Platform Administrator, Youth
Pastor, or Staff Member. Parent accounts receive only related family and child
records.

Child names are minimized in routine lists and workspaces. Medical summaries
are returned only to ministry management roles or an explicitly related legal
guardian with child-view permission. Internal ministry tags and relationship
administration are not returned to parent accounts.

Direct authenticated mutations on people, households, household memberships,
students, student relationships, tags, and tag assignments are revoked.
Approved mutations append audit events without copying medical-note content.

## Migration

```text
supabase/migrations/202607240002_member_management_foundation.sql
```

The migration is additive and was tested from a clean database after all prior
migrations.

## Verification

Synthetic tests cover directory filtering, expanded family search,
relationship-scoped reads, known-identifier denial, medical visibility,
creation, lifecycle changes, contact preferences, relationship permissions,
tags, audit events, direct-mutation denial, and parent-account denial.

The connected acceptance query returns only boolean schema and privilege
checks.
