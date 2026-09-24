# Platform Calendar Test Report

**Date:** September 24, 2026

**Status:** Automated verification and Product Owner live acceptance passed

## Covered

- Protected migration execution from a clean database
- Manager Event and Schedule projection
- Published Event visibility for Volunteers and Parents
- Volunteer Schedule self-scope
- Parent relationship-authorized registration context
- Draft Event denial outside management roles
- Parent Schedule denial
- Anonymous and invalid-range denial
- Month, Week, and Agenda UI contract
- Responsive Month overflow behavior
- Authoritative Event and Schedule deep links
- Safe service-layer failure handling

## Results

- `npm run calendar:test` — Passed
- `npm run scheduling:test` — Passed
- Event/registration regression verification — Passed
- `npm run security:test` — Passed
- `npm run lint` — Passed
- `npx tsc --noEmit` — Passed
- `npm run build` — Passed, including the new `/calendar` route
- `git diff --check` — Passed

Migration `202609240001_platform_calendar.sql` is applied to development and
matches the repaired remote migration-history entry. Manager, Parent, and
Volunteer live acceptance passed. The Volunteer Schedule-card subtitle
`Location added.` is recorded as a non-blocking usability backlog item; the
whole platform still requires its later comprehensive acceptance rerun.
