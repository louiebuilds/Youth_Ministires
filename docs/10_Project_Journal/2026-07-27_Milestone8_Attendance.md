# Milestone 8 — Attendance

**Date:** 2026-07-27
**Release:** v0.9.0
**Status:** Complete

## Outcome

Milestone 8 replaces the Attendance, Check-In, and Reports placeholders with
operational ministry workflows. Authorized staff can create event-linked class
sessions, record and correct manual attendance, finalize session rosters,
manage student custody, track temporary visitors, use emergency rosters, and
review date-filtered operational summaries.

Families can create a short-lived, one-use QR pass that identifies an
accessible household. The pass never checks in a student or authorizes pickup;
staff review care alerts and explicitly confirm each custody action. Authorized
pickup remains a child-specific permission.

## Reconciled Member Relationship Gap

Acceptance testing found that a second household parent could not be connected
to an existing child through the application. The milestone includes a guarded,
audited workflow for adding an existing household adult to a child and
explicitly selecting guardian, pickup, information, form, and communication
permissions. No permission is inferred from household membership alone.

## Boundaries

Event creation remains Milestone 9. Camera-based mobile QR scanning remains
Milestone 19; the current staff workflow accepts a scanner or pasted fallback
value. Reports are operational summaries only; trends and cross-ministry
analytics remain Milestone 16.

## Verification

Focused synthetic database verification covers authorization, manual
attendance, finalization, one-use tokens, care-safe custody transitions,
visitor handling, corrections, corrected-record re-entry, and reporting.
The complete regression suite, lint, integrity checks, and production build
passed. Connected acceptance passed with separate administrator and family
accounts using synthetic data.

Milestone 9 — Events was not started.
