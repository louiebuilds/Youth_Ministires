# Reporting Architecture

Milestone 16 uses a server-only `features/reporting/` boundary and protected
PostgreSQL RPC projections. The `/reports` route is the primary analytics
workspace. Existing Attendance report services remain in the Attendance domain
and are reused without organizational churn.

Reporting projections aggregate live authoritative Attendance, Events,
Scheduling, Volunteer, Student, and Household records. They do not create a
warehouse or persist report results. Saved reports retain only creator-private
validated configuration. CSV and Excel files are generated on demand, audited,
and not stored.

The manager Dashboard consumes the same protected overview projection while
parent and volunteer dashboards remain outside ministry-wide Reporting.

All workspace sections, saved-report reruns, and exports receive one validated
reporting range. Explicit `from` and `to` values take precedence over presets,
invalid ranges are visibly rejected, and requests are limited to 366 days.
Trend buckets are clamped to the selected window.

## Status

Implemented and accepted in Milestone 16 (`v0.16.0`). No external analytics
provider, report warehouse, scheduled delivery, or generated PDF was added.
