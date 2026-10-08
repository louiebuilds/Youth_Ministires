# Milestone 15 Closure Gap Review

**Date:** October 4, 2026
**Milestone:** 15 — Forms, Documentation & Registration Integration
**Status:** Active; migrations applied, Product Owner acceptance pending

## Outcome

Milestone 15's essential protected workflows are implemented and covered by
automated regression tests. The latest real-document migrations are applied to
development and the complete post-application technical gate passes. Milestone
15 is technically ready for the Product Owner role-based acceptance checklist;
the milestone is not finally accepted or closed until that testing is complete.

The older status statement that Visitor Card operational workflows and UI are
unfinished is stale. Visitor creation, protected review, follow-up, duplicate
assistance, linking, conversion evidence, retention, audit behavior, and the
dedicated `/visitors` workspace are implemented.

## Implemented Scope

- Event registration, cancellation, capacity, and waitlisting
- Document templates and immutable versions
- Private blank-master and completed-document storage
- Permission Slip and Medical Release submissions
- Digital upload and retained replacement history
- Paper Copy On File evidence and revocation
- Medical verification and final authorization boundaries
- Derived Event documentation readiness and Check-In enforcement
- Participation overrides with retained evidence
- Custom Form design, publication, assignment, drafts, submission, and review
- Subject-owned Custom Form submission correction
- Visitor Card manager operations and dedicated Visitors workspace
- Parent relationship-scoped Forms access
- Staff capability-grant support for approved medical operations
- Paper-only Medical Release and Event waiver implementation

## Development Migration Application — October 5, 2026

After the approved backup and dry run, these four migrations were applied
individually in numeric order to the linked development project:

1. `202609290004_enforce_account_lifecycle_transitions.sql`
2. `202609290005_restrict_final_medical_release_authorization.sql`
3. `202610040001_medical_release_independent_completion_paths.sql`
4. `202610040003_paper_only_event_waiver_intake.sql`

Each exact transaction completed successfully before its migration-history
entry was repaired to applied. A final read-only migration list confirmed that
all four versions now match locally and remotely. The later dashboard migration
`202610040004` remains installed, verified, and reconciled; it was not replayed.

Historical blank remote entries through `202608160001` remain intentionally
unchanged.

### Post-Application Verification — October 5, 2026

The complete post-migration technical gate passed against the repository state
after the four migrations were applied and recorded:

- All 17 `scripts/verify-*.mjs` regression suites — Passed
- ESLint (`npm run lint`) — Passed
- Optimized production build (`npm run build`) — Passed
- TypeScript validation performed by the production build — Passed
- `git diff --check` — Passed

The Reporting and Scheduling suites emitted informational Node module-format
performance warnings only. `git diff --check` emitted informational Windows
LF-to-CRLF warnings only. Neither represented a test or integrity failure. No
application, migration, or generated-type correction was required at that
post-migration checkpoint.

### Live Acceptance Correction — Retained Event Registration Presentation

Administrator acceptance then exercised register → cancel → re-register on the
same retained Event registration row. The database correctly reactivated the
existing row and the roster correctly returned to `registered`, but three UI
decisions still treated retained history as current operational state:

- the roster badge counted every retained row as registered, including
  cancelled rows;
- cancelled rows continued rendering READY/NOT READY documentation state; and
- the roster's separately mounted cancellation action state survived the
  sibling Add registrations refresh and redisplayed “Registration cancelled.”
  after re-registration.

The roster now counts only `registered` and `confirmed` rows in its registered
badge, displays cancelled readiness as **Not applicable**, and suppresses
readiness actions for inactive registrations. Successful registration and
cancellation action results carry the lifecycle status that produced them; the
retained roster row displays a cancellation result only while its current
status is `cancelled`, so a successful re-registration supersedes that stale
message. Registration, waitlist, and cancellation success text remains
action-specific.

The retained row, cancellation history, capacity/waitlist behavior, readiness
derivation, Parent relationship scope, authorization, RPCs, and database schema
are unchanged. No migration was created or modified. All 17 regression suites,
ESLint, TypeScript, and the optimized production build passed after the
correction. `git diff --check` passed with informational Windows line-ending
warnings only. Product Owner retesting remains required; Milestone 15 is not
accepted or closed.

### Live Acceptance Correction — Event Waiver Requirement Form State

Administrator acceptance on the Halloween Party Event successfully assigned a
published Waiver / Permission Form version. The protected write archived any
prior active requirement, pinned the selected published version, returned a
successful action result, and the refreshed page rendered the assigned blank
waiver download link. However, both configuration controls visually returned
to “No waiver required” and the version placeholder.

The database requirement projection, Event page load, and route revalidation
were correct. The controls used one-time uncontrolled `defaultValue` props, so
their browser state survived the server-action refresh and ignored the updated
authoritative requirement prop. They now use controlled state inside a keyed
input boundary. When revalidation, navigation, or a full refresh supplies a
different required flag or pinned version, that boundary remounts from the
authoritative projection while the surrounding action result remains mounted.
Selecting “No waiver required” also clears the submitted version value.

Regression coverage verifies the exact published-version pin, authoritative
`required` projection, Event-route revalidation, controlled initialization,
removal state, retained archived history, and the existing transition to NOT
READY for an active registration without qualifying permission-slip evidence.
The focused Attendance/Event and Forms/registration suites, all 17 repository
regression suites, ESLint, TypeScript, and the optimized production build
passed during correction. `git diff --check` passed with informational Windows
line-ending warnings only. No migration was created or modified. Authorization,
Parent visibility, downloads, readiness, audit behavior, and database semantics
remain unchanged. Product Owner retesting is required; Milestone 15 remains
active and unaccepted.

### Live Acceptance Correction — Parent Medical & Waivers Status

Administrator acceptance showed two current Medical Releases as COMPLETE, but
the linked Parent view reported both as needing authorization and counted both
as needing attention. The Parent action panel remained correctly restricted to
authorized self-service operations.

The detailed protected submission projection intentionally returns
`medical_verified = false` to Parents so it cannot disclose protected medical
authorization detail. The shared queue UI interpreted that privacy placeholder
as authoritative missing authorization. An application-only inference could
not safely distinguish an authorized-but-hidden record from a genuinely pending
record, so forward migration
`202610060001_parent_document_operational_status.sql` adds a separate protected
projection containing only the submission ID and one sanitized state:
`complete`, `ministry_processing`, `parent_action_required`, or
`retained_history`.

The projection repeats the existing active-account, role/capability, linked-
family, and authorized-version boundaries. It exposes no authorization actor,
reason, medical review detail, or manager capability. Parent status rendering
now uses that projection: an authoritatively complete Medical Release displays
COMPLETE; ministry review or authorization still in progress displays
MINISTRY REVIEW PENDING without increasing Parent attention; and missing,
expired, rejected, or replacement-required evidence remains Parent-actionable.
Manager detail and controls remain unchanged.

The Forms landing description and completed-document labels are also role-
aware. Managers retain creation, management, review, and queue wording. Parents
see linked-family completion/viewing language, **Family documents**, and
**Completed forms and documents**. Parent rows no longer render review or
authorization detail, and template, assignment, response-review, Visitor,
paper-confirmation, review, and authorization controls remain denied or hidden.

All 17 repository regression suites, including Forms/registration, privacy,
security, and database verification, passed. ESLint, TypeScript, the optimized
production build, and `git diff --check` passed. On October 7, 2026, the
forward migration was reviewed, applied individually to the linked development
project, and recorded as applied for version `202610060001`; the known
historical blank migration-history entries through `202608160001` remained
untouched.

Product Owner retesting then passed for both completion paths. Administrator
view retained the detailed Gillian digital path—Digital Accepted, Paper Not
confirmed, Review Accepted, Authorization Authorized, COMPLETE—and the Katie
paper path—Digital Missing, Paper On file, Authorization Authorized, COMPLETE.
The linked Parent saw both Medical Releases as COMPLETE without an incorrect
authorization requirement or attention count. Parent rows used the approved
family-oriented wording and exposed only established self-service actions:
Gillian's stored files could be downloaded securely, while Katie's paper-only
records correctly stated that no digital file was stored. No authorization
actor, reason, medical-review detail, or manager control was exposed. This
specific acceptance correction is passed; Milestone 15 as a whole remains
active and unaccepted pending the remaining role-based checklist.

### Development Dry-Run Result

The October 4 `supabase db push --include-all --dry-run` made no database
changes and confirmed that a normal push is unsafe for the linked development
project. Because the known historical versions through `202608160001` have
blank remote history entries, the CLI proposed replaying the entire historical
chain in addition to the four intended migrations.

The approved development approach is therefore:

1. Preserve an approved backup outside the repository.
2. Apply only the four exact reviewed SQL files in numeric order.
3. Stop on the first failure and preserve the error evidence.
4. Verify each installed definition and behavior.
5. Repair migration history only for the exact successfully installed version.
6. Confirm the final migration list and rerun the full verification gate.

Do not use a blanket `db push` against the linked development project.

### Development Backup Evidence

Before migration application, a timestamped linked-development backup was
created outside the Git repository at:

`C:\Users\vande\Youth-Ministries-Platform-Backups\20261004-200239`

The backup contains a public-schema dump and a data-only dump. SHA-256 checksums
were generated for both files without printing their contents. PostgreSQL
reported circular foreign-key relationships for Resource Library versions,
document versions/submissions, and Chat messages during the data-only export.
This is a restore-procedure warning, not a dump failure: any restoration must
use a controlled schema-first process with appropriate trigger/constraint
handling and post-restore verification. The backup may contain development
participant information and must remain outside source control with restricted
local access.

## Product Owner Acceptance Remaining

Use clean synthetic records and test at least these roles: Platform
Administrator, Youth Pastor, granted Staff, ungranted Staff, Parent, Volunteer,
inactive account, and signed-out user.

- [ ] Administrator and Parent Event registration/cancellation behavior
- [ ] Parent relationship-scoped Forms and My Forms access
- [ ] Shared-subject Custom Form draft resume and choice restoration
- [ ] Custom Form assignment uniqueness and human-readable targets
- [ ] Permission Slip digital path
- [ ] Permission Slip paper-only path
- [x] Medical Release digital completion plus final authorization
- [x] Medical Release paper completion plus final authorization
- [ ] Youth Pastor primary and Administrator backup authorization evidence
- [ ] Staff medical capability grant and revocation boundaries
- [ ] Missing/unconfigured requirement remains fail-closed
- [ ] Readiness and participation override behavior
- [ ] Check-In allowed, blocked, and override-assisted paths
- [ ] Visitor creation, review, follow-up, linking, and conversion evidence
- [ ] Parent, Volunteer, anonymous, and inactive denial boundaries
- [ ] Private document upload/download authorization
- [ ] Sanitized audit evidence without document or medical content

## Approved First-Release Deferrals

### Anonymous/Self-Service Visitor Intake

The database model recognizes a `self_service` source, but the current
application intentionally exposes only protected staff/manager Visitor Card
operations. A public anonymous form would require an approved minimum-data
contract, privacy notice, abuse and spam protection, rate limiting, retention
rules, and operational ownership.

**Decision:** Deferred with Product Owner approval on October 4, 2026. Retain
staff-assisted Visitor Card entry for Version 1. Public intake may be designed
after launch with explicit privacy, abuse-prevention, retention, and operational
requirements.

### Communication Center Reminder Integration

Events already support operational reminders and Communications supports
authorized announcements. There is no dedicated workflow that derives a
recipient group from missing Milestone 15 documentation and sends a reminder.
Adding it requires explicit recipient authorization, audience preview,
deduplication, delivery-channel, audit, and sensitive-inference decisions.

**Decision:** Deferred with Product Owner approval on October 4, 2026. Managers
may use existing authorized Communications workflows without exposing a
student's medical or documentation state. Any future automation requires an
approved recipient and sensitive-inference design.

## Closure Gate

Milestone 15 may close when:

1. The Product Owner completes the role-based acceptance checklist.
2. Any acceptance defect is corrected and retested.
3. The approved anonymous-intake and automated-reminder deferrals remain
   documented as post-launch work.
4. Final project status, roadmap, journal, test evidence, release notes, and user
   guidance are updated consistently.

The migration-application and automated-verification gate is complete. This is
technical readiness evidence and does not replace Product Owner acceptance.
