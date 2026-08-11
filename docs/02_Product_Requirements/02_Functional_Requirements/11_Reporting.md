# Reporting & Analytics

**Document ID:** FR-REPORTING

**Document Version:** 2.1

**Status:** Implemented and accepted

**Milestone:** 16 — Reporting & Analytics

**Date:** 2026-08-11

## Purpose

Provide authorized ministry managers with live, transparent operational and
historical reporting while preserving domain authorization and aggregate-first
privacy boundaries.

## Access Model

Full Reporting access requires `reports.view` and an active account with one of
these roles:

- Platform Administrator
- Youth Pastor
- Staff Member

Parents and volunteers receive no ministry-wide analytics. Application route
visibility is not sufficient authorization; protected RPCs enforce the same
boundary server-side. Reporting tables remain deny-by-default.

## Workspace

The unified `/reports` workspace includes:

- Overview
- Attendance
- Events
- Volunteers
- Growth
- Ministry Health
- Saved Reports
- CSV, Excel, and print-friendly exports

Supported ranges are Last 30 days, Last 90 days, Year to date, Last 12 months,
and a custom range. Server-side validation limits every request to 366 days.

## Canonical Metrics

### Attendance

Finalized Attendance records with status `present` are authoritative.

- Trend counts include finalized present records only.
- A youth counts once per reporting day for unique-attendee measures.
- Session reports retain session-specific totals.
- Check-in activity remains separately labeled and is not merged into
  Attendance.
- First-time participants are youth whose earliest finalized present Attendance
  date occurs in the selected range.
- Visitor activity counts visitor check-in records. Returning-visitor continuity
  is not claimed because the visitor domain has no durable identity.

### Events

Event reports show registration status totals, finalized Attendance, Event
capacity utilization, volunteer staffing, participation, and upcoming Events.
Registration and Attendance remain distinct. Capacity uses the existing Event
Registration workflow's authoritative `events.capacity` field.

### Volunteers and Scheduling

Reports show service history, upcoming and historical assignment activity, and
required/filled/unfilled position coverage. Scheduling is authoritative where
an Event has Scheduling records. Legacy Event assignments support historical
Events without Scheduling and must not be added to Scheduling assignments.
Cancelled schedules and assignments are excluded from current coverage while
remaining eligible for clearly labeled historical activity.

### Growth

- Active youth and households use existing Member Management `active` states.
- New youth and households are records created in the selected range.
- First-time participants use earliest finalized present Attendance.
- Event participation is based on Attendance and remains distinct from Event
  registrations.
- Visitor activity does not imply returning-visitor identity.

### Ministry Health

Ministry Health groups transparent individual metrics for Participation,
Growth, Events, and Volunteer Operations. It must not calculate a composite or
artificial score. Prayer & Care data is excluded.

## Saved Reports

Saved reports are private to their creator. They store only validated report
type, range, filters, and configuration—not results or export files. Names are
case-insensitively unique per creator. Protected workflows support create,
list, rename, load/run, and retained archive/delete. Running a saved report
always queries current authorized data.

## Exports

CSV and Excel exports are generated server-side from the same validated
projections shown on screen. Exports:

- Allow at most 10,000 rows and a 366-day range.
- Neutralize values beginning with `=`, `+`, `-`, or `@`.
- Exclude hidden and sensitive fields.
- Are never stored by the platform.
- Produce a safe audit event with requester, type, format, range, and row count.

Print-friendly browser output is supported. Generated PDF is deferred.

## Security and Privacy

General Reporting must not expose medical, allergy, dietary, custody, Prayer &
Care, background-check, certification-reference, credential, or paused
Milestone 15 data. Aggregate results are the default. Identifiable operational
activity may link only to existing authorized domain workspaces; Reporting does
not create a generalized people browser.

## Deferred and Excluded

- Permission Reports, medical releases, custom-form analytics, and visitor-card
  identity are deferred with paused Milestone 15.
- Returning-visitor analytics are deferred until durable visitor identity is
  separately approved.
- Giving and financial analytics are excluded from Version 1.
- Generated PDF, AI insights, predictive analytics, scheduled reports, email
  delivery, shared reports, and organization-wide saved reports are deferred.

## Acceptance Criteria

Milestone acceptance requires protected manager reporting, preserved Attendance
reports, approved aggregate metrics, role denial, private saved reports, safe
exports, print output, dashboard manager-summary reconciliation, automated
verification, Product Owner acceptance, and closure documentation.

Product Owner acceptance passed, including the corrected custom-range workflow,
all report domains, private saved-report lifecycle, exports, print output, and
family-account authorization boundaries.

When a schedule contains no required positions, coverage currently displays
100%. This was not an acceptance blocker; a future UX refinement may display
`N/A` or “No positions required.”

## Revision History

| Version | Date | Description |
|---|---|---|
| 2.1 | 2026-08-11 | Recorded completed implementation, Product Owner acceptance, corrected custom-range behavior, and deferred zero-position coverage label refinement. |
| 2.0 | 2026-08-11 | Reconciled the Foundation draft with approved Milestone 16 scope, metric definitions, authorization, saved reports, exports, and deferrals. |
| 1.0 | Initial | Initial Reporting requirements. |
