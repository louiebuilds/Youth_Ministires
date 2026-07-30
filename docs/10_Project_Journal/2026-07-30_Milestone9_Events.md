# Milestone 9 — Events

**Date:** 2026-07-30
**Release:** v0.10.0
**Status:** Complete

## Outcome

Milestone 9 replaces the Events placeholder with a role-scoped event calendar
and event workspaces. Authorized ministry managers can create, edit, publish,
and archive events; configure registration windows, capacity, and waitlists;
review registrations and promote the next waitlisted student; assign
volunteers; and maintain in-app reminders and checklists.

Families can discover published or active events, open the full event card,
register eligible linked students, see registration or waitlist status, and
cancel registrations. Draft and archived events remain undiscoverable to
families. Archived events are retained and cannot be edited.

## Security and Boundaries

Database functions enforce active-account, role, family-relationship, event
state, registration-window, capacity, chronological waitlist, and archive
rules. Direct writes are restricted and material changes are audited.
Development and acceptance used synthetic data only.

Reminders are in-app planning records only. Email and SMS delivery remain
Milestone 11. Permission forms remain Milestone 15, recurring rotations and
calendar integration remain Milestone 14, analytics remain Milestone 16, and
mobile camera features remain Milestone 19.

## Verification

The full migration chain executes from a clean synthetic database. Automated
coverage verifies event visibility and lifecycle, family registration and
cancellation, capacity controls, volunteer roster access, reminders, and
checklists. All earlier regression suites, ESLint, TypeScript, and the
production build passed.

The Product Owner verified event creation, editing, archiving, separate
administrator and family visibility, capacity and waitlisting, cancellation,
manual waitlist promotion, volunteer assignment and status changes, reminders,
and checklist completion/reopening.

Milestone 10 — Curriculum & Lessons was not started.
