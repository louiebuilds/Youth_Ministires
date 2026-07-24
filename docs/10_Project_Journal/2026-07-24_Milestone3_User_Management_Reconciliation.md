# Milestone 3 — Authentication & User Management Reconciliation

**Date:** 2026-07-24
**Release:** v0.6.1
**Status:** Complete

## Outcome

The Product Owner returned to the authoritative original roadmap after
Milestone 5 and directed completion of the outstanding Milestone 3 workflows.
The reconciliation preserves the later-approved security model instead of
restoring obsolete role names.

The platform now provides self-service profile editing, authenticated password
changes followed by secure sign-out, and Platform-Administrator-only search and
audited management of existing accounts. Both the database and interface
protect an administrator from self-demotion or self-deactivation.

The permanent roles remain Platform Administrator, Youth Pastor, Staff Member,
Volunteer, and Parent or Guardian. Family and administrative contexts continue
to use separate accounts. Student logins remain excluded from Version 1.

## Security Boundary

Browser code never receives a service-role credential. Controlled PostgreSQL
functions reauthorize each request, validate input, update the minimum necessary
fields, and append safe audit metadata. Direct authenticated profile mutation
grants were removed.

Creating or inviting Supabase Auth identities and sending
administrator-triggered recovery emails require privileged provider access and
remain separately gated future work.

## Verification

The full database, security, privacy, dashboard, user-management, lint, and
production-build suite passed. The Product Owner confirmed all eight connected
database checks and accepted the workflows using both family and administrator
accounts.

## Roadmap

Milestone 3 is complete. Milestones 4 and 5 remain complete. Milestone 6 —
Member Management has not started.
