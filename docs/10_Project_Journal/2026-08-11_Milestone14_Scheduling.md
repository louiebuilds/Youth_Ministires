# Project Journal

## Milestone 14 — Scheduling

**Date:** August 11, 2026  
**Version:** v0.15.0  
**Status:** Complete

Milestone 14 delivered internal ministry scheduling with draft and published
schedules, locations and required positions, volunteer assignments,
availability-aware conflict checks, explicit audited overrides, recurring
rotations, and a self-scoped volunteer schedule view.

Scheduling managers are Platform Administrators, Youth Pastors, and Staff
Members. Volunteers see only their own published responsibilities and
locations. Parents and anonymous users receive no Scheduling access.

Completed work includes optional existing-event references, retained assignment
cancellation history, unfilled-position publication safeguards, conflict-safe
and duplicate-safe rotation generation, rotation pause/resume/end, prospective
rotation changes, and a provider-independent internal calendar foundation.

Acceptance corrected null-return handling for successful PostgreSQL `void`
RPCs, assignment projection/listing, volunteer proper-name display, and
protected listing of unattached schedule locations. Malformed synthetic
timestamps seen during testing were test-input errors, not an application
defect.

The Scheduling test suite, ESLint, production build, TypeScript validation, and
diff check passed. The Product Owner completed all 23 acceptance checks.

No external calendar provider, automated email/SMS, facilities management,
payroll scheduling, AI scheduling, public schedules, or Milestone 15 work was
added.

**Milestone 14 — Scheduling is complete.**

