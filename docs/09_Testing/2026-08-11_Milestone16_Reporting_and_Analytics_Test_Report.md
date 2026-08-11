# Milestone 16 — Reporting & Analytics Test Report

**Date:** August 11, 2026  
**Version:** v0.16.0  
**Result:** Passed

## Automated Verification

- `npm run reporting:test` — Passed
- `npm run lint` — Passed
- `npm run build` — Passed, including TypeScript and route generation
- `git diff --check` — Passed

Verification covers Overview, Attendance trends and sessions, check-in, Events,
Volunteer activity, Scheduling coverage, Growth, Ministry Health inputs, saved
report live reruns, CSV, Excel, and role denial.

## Acceptance Correction and Regression

Initial custom-range testing displayed July 26 records for an August 3–9
selection. The page honored `from` and `to` only with `preset=custom`, while the
form submitted `preset=30`.

The correction centralized validation, gave explicit dates precedence, made
the contract consistent across projections and exports, visibly rejected
invalid ranges, and clamped trend labels. Fixtures place July 26 Attendance,
check-in, Event, registration, volunteer, and Scheduling records outside an
August 3–9 request and verify their records and aggregates are absent from every
report domain, CSV, and Excel. Product Owner retesting passed.

## Product Owner Acceptance

The unified workspace; custom filtering; Attendance; check-in; Events;
Volunteer/Scheduling; non-zero Scheduling coverage; Growth; separate New Youth
Added and First-Time Participants; transparent Ministry Health without a
composite score; saved-report create, private ownership, restore, rename, and
archive/delete; CSV; Excel; print output; volunteer route/navigation denial;
parent authorization; and final verification all passed.

## Non-blocking Observation

Schedules with zero required positions display 100% coverage. Acceptance did
not treat this as a blocker; `N/A` or “No positions required” is a future UX
candidate.

## Dependency Audit

The production audit reported seven advisories: five high and two moderate,
primarily in existing Next.js/PostCSS/Sharp dependencies. ExcelJS includes a
moderate advisory through `uuid`. Breaking or forced upgrades were deferred to
Production Readiness and did not fail Milestone 16 acceptance.
