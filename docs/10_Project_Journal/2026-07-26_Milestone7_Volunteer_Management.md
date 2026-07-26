# Milestone 7 — Volunteer Management

**Date:** 2026-07-26
**Release:** v0.8.0
**Status:** Complete

## Outcome

Milestone 7 replaces the volunteer placeholder with an operational directory
and protected volunteer workspace. Ministry managers can maintain profiles,
background-check tracking, certifications, skills, recurring availability,
and assignments to existing events. Volunteers receive a self-only workspace
and can confirm or decline their own assignments.

Operational volunteer service is intentionally separate from a permanent
account role. Staff or administrators may therefore serve as volunteers
without changing their authorization role.

## Boundaries

The platform stores only non-sensitive background-check status, dates, and a
provider reference. It does not store reports, identity documents, government
identifiers, or uploaded certification files. Event creation remains
Milestone 9; recurring rotations and calendar integration remain Milestone 14.

## Verification

The complete automated regression suite and production build passed.
Connected Supabase and browser acceptance passed with separate administrator
and family accounts using synthetic data.

Milestone 8 — Attendance was not started.
