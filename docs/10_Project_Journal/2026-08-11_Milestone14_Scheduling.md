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

## Full Platform Acceptance UX Follow-up — September 14, 2026

Full Platform Acceptance later identified an information-architecture problem: the Scheduling landing page rendered calendar review, schedule creation, positions, assignments, lifecycle controls, and recurring rotations together. This did not reopen or change the accepted Scheduling business rules, but it made normal ministry use unnecessarily dense.

The local correction separates those established workflows into a focused Scheduling dashboard, dedicated schedule and rotation creation routes, a rotations management route, and an individual schedule workspace with Overview, Positions, Assignments, Conflicts, and Lifecycle sections. The sections are deep-linkable and the navigation scrolls horizontally on narrow screens. Event selection and weekdays are human-readable, and monthly ordinal input is conditional on the monthly recurrence pattern.

The refactor reuses the existing server actions, protected RPC workflows, authorization roles, publication validation, conflict evidence, retained cancellation history, and rotation lifecycle. It introduces no migration or live-data change. Automated verification was rerun after implementation; live Product Owner acceptance of the revised workspace remains pending as part of Full Platform Acceptance and does not mark Milestone 15 complete.

## Final Acceptance Corrections — September 15, 2026

Live acceptance passed the Scheduling information architecture, creation and management flows, timezone correction, active coverage, publication and conflict rules, role boundaries, responsive behavior, and weekly, biweekly, and monthly rotation operations. A final defect appeared after cancelling an explicitly overridden conflicting assignment: the row and its evidence remained in `schedule_assignments`, but the active-only workspace projection excluded cancelled rows and the Conflicts section consequently reported no retained conflicts.

Local forward migration `202609150001_scheduling_conflict_history.sql` introduces a separate manager-only conflict-history RPC rather than weakening the current-assignment projection. The projection requires an active Scheduling manager and retains the established `SECURITY DEFINER`, empty `search_path`, forced server-side authorization, and least-privilege execution posture. It returns only assignments with conflict evidence, including cancelled history, actual override reasons, locations, statuses, and timestamps. Volunteers, Parents, anonymous users, and inactive profiles are denied.

The workspace now distinguishes active assignments from historical conflict review, displays linked Event names where the existing manager Event projection authorizes them, uses accurate empty-state wording, and applies singular/plural grammar to nearby counts. Regression coverage confirms cancelled assignments remain outside active coverage while their conflict history remains manager-visible. Final live Product Owner retesting remains pending; Scheduling is not yet marked finally accepted.
