# Reporting Database

Milestone 16 implementation uses:

- `202608110001_reporting_foundation.sql`
- `202608110002_reporting_workflows.sql`

The foundation adds `report_saved_configurations`, a forced-RLS,
deny-by-default table containing creator-owned report names, types, and JSON
configuration. Results and export files are never stored. Active names are
case-insensitively unique per creator and deletion uses retained archival.

Protected workflows provide aggregate Attendance, Event, Volunteer,
Scheduling, Growth, and overview projections plus saved-report lifecycle and
export auditing. All public and anonymous function privileges are revoked;
authenticated execution still requires an active approved Reporting role in
the workflow itself.

Every projection accepts the same validated inclusive `from` and `to` window,
with a maximum span of 366 days. Regression fixtures prove July 26 records are
excluded from an August 3–9 request across projections and exports.

The migrations reuse authoritative Attendance, check-in, Events, Member,
Volunteer, and Scheduling objects. They do not include paused Milestone 15 form
or medical data.
