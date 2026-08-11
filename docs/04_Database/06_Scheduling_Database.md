# Scheduling Database

Milestone 14 is introduced by:

- `202608090001_scheduling_foundation.sql`
- `202608090002_scheduling_workflows.sql`

The schema adds ministry schedules, schedule locations, required positions,
volunteer assignments, and recurring rotations. Existing profiles, volunteer
profiles, availability, people, events, and audit events remain authoritative.

Event references are optional. Assignments retain responsibility, location,
time window, lifecycle, conflict codes, override reason, assigning manager, and
optional source rotation. Cancelled assignments are retained. A unique
rotation/occurrence-date key makes generation idempotent and protects history.

All Scheduling tables enable and force RLS without direct client policies.
Public RPC privileges are revoked, and only protected workflows are granted to
authenticated users. Each workflow enforces manager or volunteer self-scope
authorization server-side.

