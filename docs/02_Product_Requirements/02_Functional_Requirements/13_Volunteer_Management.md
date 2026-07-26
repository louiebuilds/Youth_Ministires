# Volunteer Management

**Document ID:** FR-VOLUNTEER
**Version:** 1.0
**Status:** Implemented
**Milestone:** 7 — Volunteer Management
**Date:** 2026-07-26

## Scope

Authorized ministry users can maintain volunteer profiles, background-check
status and dates, certification metadata, skills, recurring availability, and
assignments to existing events. An operational volunteer profile is separate
from the account's permanent authorization role.

Volunteers can view only their own workspace, add their own skills and
availability, and confirm or decline their own event assignments. Parent or
Guardian accounts cannot access volunteer records.

## Privacy and Security

- Background-check reports, identity documents, government identifiers, and
  certification files are not stored.
- Provider and certification references are visible only to ministry managers.
- Direct authenticated writes are closed; reauthorizing database functions
  perform and audit approved changes.
- Platform Administrators, Youth Pastors, and Staff Members manage ministry
  volunteer records and assignments.
- A volunteer cannot read or change another volunteer's workspace or schedule.

## Scheduling Boundary

Milestone 7 assigns volunteers to events that already exist. Event creation,
registration, capacity, reminders, and checklists remain Milestone 9.
Recurring rotations, classroom assignment, and calendar integration remain
Milestone 14.

## Acceptance Criteria

| ID | Requirement |
|---|---|
| AC-VOL-001 | Ministry managers can create and maintain volunteer profiles. |
| AC-VOL-002 | Background-check status and non-sensitive references are protected. |
| AC-VOL-003 | Certifications, skills, and availability can be recorded. |
| AC-VOL-004 | Volunteers receive only their own workspace and schedule. |
| AC-VOL-005 | Managers can assign volunteers to existing events. |
| AC-VOL-006 | Volunteers can confirm or decline their own assignments. |
| AC-VOL-007 | Volunteer mutations and assignment responses are audited. |
| AC-VOL-008 | Family-only accounts cannot access volunteer information. |
