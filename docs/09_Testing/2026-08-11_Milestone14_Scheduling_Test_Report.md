# Milestone 14 Scheduling Test Report

**Date:** 2026-08-11  
**Milestone:** 14 — Scheduling  
**Version:** v0.15.0  
**Result:** Passed

## Automated Verification

- `npm run scheduling:test` — Passed
- `npm run lint` — Passed
- `npm run build` — Passed, including TypeScript and page generation
- `git diff --check` — Passed; only informational line-ending warnings appeared

The Scheduling suite verified migrations and deny-by-default tables; manager,
volunteer, parent, and anonymous authorization; protected location listing;
schedule and assignment lifecycles; unfilled-position controls; availability,
overlap, and duplicate conflicts; explicit overrides and audit evidence;
conflict-safe rotation generation; duplicate prevention; history preservation;
and rotation pause, resume, and end behavior.

The first sandboxed build attempt could not fetch the configured Google Fonts.
The approved network-enabled rerun passed; this was not a code failure.

## Product Owner Acceptance

All 23 approved live-application acceptance scenarios passed. They covered the
Scheduling workspace, draft schedules, locations and positions, unfilled
publication controls, conflict blocking and explicit override, retained
cancellation history, published display, rotation lifecycle and idempotent
generation, proper volunteer names, unattached location selection, availability,
successful publication, volunteer My Schedule self-access, and manager-control
denial for volunteers.

## Acceptance Corrections

- Successful PostgreSQL `void` RPCs return null data. Success is now determined
  by the absence of an RPC error.
- Assignment projection/join behavior was corrected so assignments display.
- Volunteer names use preferred/first/last names with profile display-name
  fallback.
- A protected explicit schedule-location listing workflow makes newly created
  unattached locations selectable.
- Malformed synthetic schedule timestamps encountered during manual testing
  were caused by test input, not an application defect.

## Security and Code Review

- Managers are `platform_administrator`, `youth_pastor`, and `staff_member`.
- Volunteers receive only their own published assignments.
- Parents and anonymous users are denied.
- Scheduling tables force RLS and expose no direct client policies.
- Protected RPC workflows enforce authorization server-side.
- Conflict overrides require reasons and retain conflict and audit evidence.
- Rotation changes do not rewrite previously generated schedules.
- Existing events remain optional and the calendar foundation is
  provider-independent.

The complete milestone diff was reviewed for security regressions,
authorization gaps, accidental direct table access, TypeScript issues, stale or
dead Scheduling code, unrelated changes, and verification coverage. No
unresolved Milestone 14 issue remains. Pre-existing login/sidebar branding
changes and local development logs were observed but not modified by closure.

## Final Result

**PASSED — Milestone 14 is approved for closure.**

