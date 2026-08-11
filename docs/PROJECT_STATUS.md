# Youth Ministries Platform — Project Status

> Primary handoff checkpoint for Louie, ChatGPT, and Codex.

## Current Version

**v0.15.0**

## Last Completed Milestone

**Milestone 14 — Scheduling**

**Completed:** August 11, 2026

**Status:** Complete; Product Owner acceptance passed

Milestone 14 delivered protected internal scheduling: draft and published
schedules, locations, required positions, availability-aware volunteer
assignments, explicit audited conflict overrides, retained cancellation
history, recurring rotations, duplicate-safe occurrence generation, and a
volunteer My Schedule view.

## Verification

- `npm run scheduling:test` — Passed
- `npm run lint` — Passed
- `npm run build` — Passed, including TypeScript
- `git diff --check` — Passed
- Product Owner live acceptance — All 23 checks passed

The first sandboxed build attempt was unable to fetch the configured Google
Fonts. The approved network-enabled rerun passed.

## Acceptance Corrections

- Corrected successful PostgreSQL `void` RPC handling.
- Corrected assignment projection and listing.
- Applied established proper-name display with profile fallback.
- Added protected listing for newly created unattached schedule locations.
- Confirmed malformed synthetic timestamps were test input, not an application
  defect.

## Security and Architecture

- Scheduling managers: `platform_administrator`, `youth_pastor`, and
  `staff_member`.
- Volunteers: self-scoped published assignments only.
- Parents and anonymous users: denied.
- Scheduling tables: forced RLS and deny-by-default direct client access.
- Protected RPCs: server-side authorization and audit enforcement.
- Overrides: explicit reasons with retained conflict and audit evidence.
- Rotations: prospective changes; historical generated schedules unchanged.
- Events: optional references to the existing event domain.
- Calendar foundation: internal and provider-independent.

## Documentation

- `docs/09_Testing/2026-08-11_Milestone14_Scheduling_Test_Report.md`
- `docs/10_Project_Journal/2026-08-11_Milestone14_Scheduling.md`
- `docs/11_Release_Notes/v0.15.0_Milestone14_Scheduling.md`
- `docs/03_Platform_Architecture/09_Scheduling_Architecture.md`
- `docs/04_Database/06_Scheduling_Database.md`
- Scheduling requirements, security controls, roadmap, and section indexes

## Current Milestone

**None active.** Milestone 14 is complete. Milestone 15 has not begun.

## Next Step

Stop and wait for Technical Lead and Product Owner approval. Do not begin
Milestone 15 until it is separately planned and approved.

_Last updated: August 11, 2026_
