# Youth Ministries Platform — Project Status

> Primary handoff checkpoint for Louie, ChatGPT, and Codex.

## Current Version

**v0.16.0**

## Current Implementation — Native Group Chat Phases 1A–1C (September 25, 2026)

Native Group Chat Phases 1A–1C are implemented and have passed Product Owner
live acceptance. Migration `202609250001_native_group_chat_phase1.sql` is
applied to development and must not be modified. No milestone or final platform
acceptance is closed here.

Announcements remain separate from private rooms. Active Platform
Administrators and Youth Pastors alone manage rooms and moderate. Staff,
Volunteers, and Parents participate through eligible retained membership. Chat
tables deny direct access and protected RPCs supply content.

The Phase 1B room-management workspace is implemented locally at
`/communications/chat`. It keeps Chat separate from Announcements, lists only
authorized rooms, and exposes create, rename, archive, and retained membership
management only to Platform Administrators and Youth Pastors. Staff, Parents,
and Volunteers receive read-only room metadata only when the protected RPCs
authorize them. Archived rooms retain visible read-only history.

Phase 1C supplies the protected conversation workspace. Live acceptance passed
for Administrator/Volunteer two-way messaging, current-user and other-user
alignment, same-room replies, manager moderation, removed-message placeholders,
archived read-only behavior, compact Room settings, and corrected Chat
navigation active state.

Dynamic Event/Schedule room-linking UI, Realtime delivery signals, and unread
badge/presentation work remain for later approved Phase 1D checkpoints.

Deferred: direct messages, youth participation, attachments, reactions,
message editing, push/email notifications, Parent Community, and GroupMe.

## Current Development and Acceptance Strategy — September 23, 2026

The Prayer & Care current-platform acceptance checkpoint is **COMPLETED / PASSED
WITH DOCUMENTED FOLLOW-UP ENHANCEMENTS**. This is evidence for the current
implementation, not final production acceptance. The platform as a whole is not
accepted or production-ready, and Prayer & Care will be exercised again after
the remaining feature set and approved workflow improvements are complete.

The Product Owner has ended the broader current-platform acceptance campaign at
this checkpoint. Work now returns to feature development because continued
module-by-module acceptance was identifying improvements that would change
already-tested areas. The approved sequence is:

1. Complete the Prayer & Care checkpoint.
2. Return to feature development.
3. Complete remaining platform features and approved workflow/UX improvements.
4. Prepare or reset clean synthetic acceptance data.
5. Run comprehensive end-to-end final platform acceptance.
6. Complete Production Readiness.

Previously accepted or checkpointed modules remain useful evidence, but final
platform acceptance will be rerun against the finished feature set. Do not mark
additional modules finally accepted during this development phase.

### Prayer & Care Checkpoint Results

- Phase 1 manager enhancements are implemented and live-accepted: authorized
  managers can edit active Care Records and Follow-ups, create a linked
  Follow-up from a Care Record, and review protected lifecycle actor/timestamp
  and retained outcome details. Applied migration
  `202609230001_prayer_care_manager_workflow_enhancements.sql` is immutable.
- Live acceptance changed a Care Record Person from Gillian to Katie and
  confirmed propagation to its linked Follow-up without changing the source
  relationship. Follow-up edits persisted the revised title, High priority,
  and In progress status; completion moved it to retained history with its
  timestamp and actor while confidential instructions/outcome stayed collapsed.
- Acceptance found and corrected two client-state defects: the Care Record
  Person selector now uses controlled state, and Follow-up Priority/Status use
  controlled state. Edit Follow-up validation also accepts an omitted optional
  `careNoteId`.

- The focused Overview, Prayer Requests, Care & Visits, Follow-ups, and Archived
  workspace passed live use; creation and management forms remain hidden until
  intentionally opened.
- Public, leadership, and private prayer visibility boundaries passed. The
  controlled Visibility correction prevents the displayed selection from
  submitting a different value, and manager cards show readable stored labels.
- Migration `202609220001_edit_prayer_request_workflow.sql` is applied to the
  development database and recorded as applied. It must not be modified.
- Authorized prayer editing passed for Person, Category, Visibility, Title, and
  Details while retaining request identity and keeping answer/archive actions
  separate.
- Parent sanitized-summary privacy passed, including direct URL confinement:
  public summaries expose no Person identity, details, assignments, care data,
  or management controls; leadership/private requests remain excluded.
- Answer and archive lifecycle passed with retained request, Person, visibility,
  original details, and answer summary.
- Confidential Hospital care-note creation, intentional reveal, archival, and
  retained protected history passed.
- Follow-up creation, assignment, due date, priority, confidential-instruction
  reveal, completion, and retained history passed.
- Acceptance-data reconciliation preserved canonical Person
  `591cba95-a32d-4ca4-a7ac-d9b422a6db60` as active with one household
  membership, two student relationships, and the Parent profile link. Duplicate
  `75b2a220-170a-485b-ab01-049a18b38966` is archived with no active household,
  student, or profile relationships. The picker now shows one active Louie.

### Feature and UX Backlog Identified at This Checkpoint

- Parent family-scoped prayer submission and moderated update workflow
- Verification and design of eligible caregiver derivation
- Display stored follow-up status as `In progress` rather than the raw
  `in_progress` enum value
- Deliberate existing-Person selection/reconciliation in Family creation; never
  auto-merge solely by email
- Platform UX Consistency Pass prioritizing current records above creation forms
  across all major workspaces
- Administration, Parent Community, Communications group/channel direction,
  responsive/PWA completion, AI
  Ministry Assistant, and remaining real-document Forms & Registrations work

Parent Community remains distinct from official Communications. The planned
The Platform Calendar is implemented locally as a role-aware
Month/Week/Agenda projection of authorized Events, Schedules, and family
registrations with deep links—not a new scheduling engine. Migration
`202609240001_platform_calendar.sql` and Product Owner live acceptance remain
pending. Future Communications work must retain official
announcements while separately designing moderated group/channel conversations.

No release notes or milestone commit have been created for this checkpoint.
Known historical migration drift must not be casually repaired. If Supabase
types are regenerated, preserve the application compatibility footer/overlay.
Before any eventual acceptance reset commit, ensure the reset utility is again
rollback-by-default.

### Development Migration-History Checkpoint — September 23, 2026

The Product Owner's read-only `supabase migration list` establishes the current
development migration-history state below. Applied migration files are immutable
and must not be edited, renamed, deleted, replayed, or casually repaired.

| Migration range/version | Current development history state |
|---|---|
| `202607230001` through `202608160001` | Known historical drift: local files have blank Remote entries. Leave unchanged; do not apply or repair merely to align history. |
| `202608220001` | Local and Remote match. |
| `202608230001` | Local and Remote match. |
| `202608230002` | Local and Remote match. |
| `202608230003` | Local and Remote match. |
| `202608230004` | Local and Remote match. |
| `202609070001` | Local and Remote match. |
| `202609140001` | Local and Remote match. |
| `202609150001` | Local and Remote match. |
| `202609150002` | Local and Remote match. |
| `202609210001` | Local and Remote match. |
| `202609220001` | Local and Remote match. |
| `202609230001` | Applied Prayer & Care manager workflow enhancement; immutable. |
| `202609240001` | Local Platform Calendar migration; not yet applied. |

This checkpoint supersedes earlier current-state wording that described any of
the matching migrations as local or unapplied. Historical journal entries may
retain the state that was accurate when those entries were written.

## Last Completed Milestone

**Milestone 16 — Reporting & Analytics**

**Completed:** August 11, 2026

**Status:** Complete; Product Owner live acceptance passed

Milestone 16 delivered unified, live, authorized reporting for Overview,
Attendance, check-in, Events, Volunteers/Scheduling, Growth, and transparent
Ministry Health; creator-private saved reports; CSV and Excel exports; and
print-friendly output.

## Milestone 16 Acceptance and Verification

- Product Owner live acceptance — Passed
- Custom date filtering — Passed after correction and retest
- August 3–9 regression excluded July 26 Attendance, check-in, and Event data
- Saved-report ownership and lifecycle — Passed
- Volunteer and parent reporting authorization boundaries — Passed
- `npm run reporting:test` — Passed
- `npm run lint` — Passed
- `npm run build` — Passed, including TypeScript
- `git diff --check` — Passed

## Milestone 16 Acceptance Correction

The unified page initially honored explicit `from` and `to` only with
`preset=custom`, while the form submitted `preset=30`. A centralized validated
resolver now gives explicit dates precedence, rejects invalid ranges visibly,
drives every projection and export, and clamps trend labels to the selected
window. Product Owner retesting passed.

## Milestone 16 Deferred Follow-up

- Zero-required-position schedules display 100% coverage. Consider `N/A` or
  “No positions required” as a future UX refinement.
- Production dependency audit: seven advisories (five high, two moderate),
  primarily existing Next.js/PostCSS/Sharp dependencies; ExcelJS includes a
  moderate advisory through `uuid`. Forced or breaking upgrades belong to
  Production Readiness and were not made during Milestone 16.

---

## Milestone 15 — Forms, Documentation & Registration Integration

**Status:** Active — Phases 1–5 complete; Phase 5 Product Owner accepted

Milestone 15 was previously paused pending Product Owner consultation regarding
paper versus electronic permission and medical documentation. Work resumed
after Product Owner approval.

### Manual Acceptance Blocker Correction — Event Registration Management

**Status:** Migration `202608230002` is applied and recorded remotely; the acceptance campaign continued with later corrections

Manual acceptance testing found that Event Registration tables, capacity and waitlist behavior, retained cancellation, audit history, and protected RPCs already existed, but the Event workspace exposed registration only to linked families. Platform Administrators could view the roster but could not select and register an existing student.

The existing registration option, registration, and cancellation RPC contracts now include an active Platform Administrator branch. The Event workspace reuses the existing registration component to show eligible active students, create a registered or waitlisted record under existing capacity rules, display it in the roster, and cancel it through the retained `cancelled` lifecycle. Existing Parent authority remains relationship-scoped; Youth Pastor, Staff, and Volunteer authority was not broadened. Milestone 15 readiness consumes the resulting registration through the existing Event Registration relationship.

Medical/permission/readiness migration `202608230001` and Administrator Event
Registration migration `202608230002` are applied to the linked development
Supabase project and recorded remotely. `lib/supabase/database.types.ts` was
regenerated with its compatibility footer retained. Milestone 15 remains active
and no checkpoint commit has been created.
### Live Acceptance Correction — Unconfigured Medical Requirement Roster

After an Administrator registered a student for Fall Retreat 2026, the Event roster passed the intentional null standing-medical `requirementId` into a hidden React input. The roster now displays “Medical Form requirement is not configured for this school year,” remains NOT READY, and suppresses participation-override controls whenever any blocking unmet requirement lacks an authoritative UUID. Configured blockers retain the existing override workflow. No database or migration change was required, fail-closed readiness and Check-In remain unchanged, and Milestone 15 is not accepted.
### Live Acceptance Correction — Registration Action Message State

Live retesting confirmed Administrator registration, cancellation, retained lifecycle, and re-registration, but the student card continued displaying the earlier green “Registration cancelled.” result after re-registration. The card maintained separate registration and cancellation `useActionState` values and always preferred the cancellation message once present. Registration and cancellation now share one intent-aware action-state channel, so each completed action replaces the previous result. Registration, waitlist, and cancellation messages remain action-specific. Database lifecycle, authorization, capacity, waitlisting, migrations, readiness, and generated types were unchanged. Verification passed; Milestone 15 remains active and unaccepted.
The approved documentation model requires explicit operational evidence rather
than treating a digital upload alone as complete documentation.

### Phase 1 — Forms & Registration Foundation

**Status:** Complete and verified

Delivered:

- Forms capability authorization foundation
- Sensitive capability grants and retained grant history
- Permission Slip and Medical Release document-domain foundation
- Immutable document/version relationships
- Event requirements pinned to exact document versions
- Participation-override evidence foundation
- Custom Forms database foundation
- Visitor Card database and privacy foundation
- Forced RLS and direct-table access denial
- Existing Event Registration protections preserved

### Phase 2 — Document Template Management

**Status:** Complete, applied, and verified

Delivered:

- Private `form-template-masters` Storage bucket
- PDF-only blank masters with 15 MB maximum
- Server-generated UUID-only object paths
- Authenticated INSERT-only Storage policy
- Template creation and version management
- Draft editing
- Server-side binary PDF validation
- Server-derived SHA-256
- Filename sanitization
- Immutable publication
- Version retirement
- Template archival
- Audited, authorized master downloads
- Retained version and master history

### Phase 3 — Completed Student Documents

**Status:** Complete, applied, and verified

Delivered:

- Private `student-documents` Storage bucket
- PDF, JPEG, and PNG completed-document uploads
- 20 MB maximum
- Server-generated UUID-only paths
- Parent and authorized Staff upload workflows
- Authorization revalidation at Storage INSERT and trusted finalization
- Server-side binary inspection
- Server-derived MIME type, size, and SHA-256
- Filename hardening
- Immutable replacement chains
- Secure server-streamed completed-document downloads
- Paper Copy On File confirmation and revocation
- Acceptance, rejection, and replacement-request workflows
- Medical verification and revocation
- Separate medical-view and medical-verification capabilities
- Retained review, paper, medical, and replacement history
- Sanitized audit records

### Phase 4 — Documentation Readiness & Participation Enforcement

**Status:** Complete, applied, and verified

**Migration:** `202608120009_document_readiness_participation.sql`

Delivered:

- Derived Event documentation readiness
- No mutable readiness snapshot or boolean
- Event roster documentation status
- Operational missing-evidence categories
- Retained participation overrides
- Override expiration and revocation
- Database-authoritative Check-In enforcement
- Audit-preserving blocked Check-In behavior
- Override-assisted Check-In
- Existing registration, capacity, waitlist, custody, checkout, correction,
  visitor, and attendance behavior preserved

### Documentation Readiness Rules

A Permission Slip is READY only when:

- The submission is current and valid
- Digital document is accepted
- Paper Copy On File is confirmed

A Medical Release is READY only when:

- The submission is current and valid
- Digital document is accepted
- Paper Copy On File is confirmed
- Medical verification is current

Digital upload alone does not satisfy documentation readiness.

Registration remains independent from documentation readiness.

### Participation Overrides

Participation overrides:

- Require effective `forms.participation.override`
- Apply only to an active Event Registration
- Must exactly match the current unmet blocking requirement set
- Require an explicit reason
- Retain actor and lifecycle evidence
- May expire or be explicitly revoked
- Become inapplicable automatically when readiness or requirements change

Historical override evidence is retained.

### Check-In Enforcement

Check-In now derives documentation readiness server-side.

- READY — Check-In proceeds normally
- NOT READY without an applicable override — Check-In is blocked
- NOT READY with an applicable override — Check-In is permitted while
  documentation remains NOT READY
- Events without blocking document requirements remain unaffected

Blocked Check-In returns no Check-In record while retaining a sanitized denial
audit event.

### Phase 5 — Custom Forms Workflows

**Status:** Complete, applied to development, technically verified, and Product
Owner accepted August 22, 2026

**Migration:** `202608160001_custom_forms_workflows.sql`

The Custom Forms lifecycle currently requires an assigned published version to
be handled in this order: archive the Custom Form template before retiring that
assigned version. This reviewed lifecycle rule is documented as current
behavior and was not redesigned during development-database integration.

### Phase 1–5 Verification

Post-migration verification passed:

- Milestone 15 Phase 1 tables, enums, RLS, and direct-access denial — Passed
- Role defaults and sensitive grant/revoke authority/history — Passed
- Document immutability, supersession, and pinned Event versions — Passed
- Controlled Custom Form fields and Visitor Card privacy foundation — Passed
- Existing Event Registration schema protection — Passed
- Phase 2 private Storage, template versioning, authorization, lifecycle, and
  audit controls — Passed
- Phase 3 completed-document upload, replacement, streamed retrieval, review,
  paper, and medical controls — Passed
- Phase 4 derived readiness, retained participation overrides, and
  authoritative Check-In enforcement — Passed
- Phase 5 Custom Form management, assignments, respondent drafts, immutable
  submissions, oversight, and audit controls — Passed
- `npm run lint` — Passed
- `npx tsc --noEmit` — Passed
- `npm run build` — Passed
- `git diff --check` — Passed

`git diff --check` reported informational Windows LF-to-CRLF warnings only.

### Live Schema

Phase 5 migration `202608160001` was successfully applied to the linked
development Supabase project with no SQL errors.

`lib/supabase/database.types.ts` was regenerated from the live public schema
after migration application. The repository-specific compatibility aliases and
nullable-RPC compatibility overlay were restored afterward.

Application TypeScript and production build verification passed after the
compatibility restoration.

All 19 Phase 5 public Custom Forms RPCs are present in the regenerated types.

The linked development project records both `202608230001` and `202608230002`
as applied. Known earlier migration-history drift remains intentionally
unchanged as documented in the current migration-history checkpoint above.

### Milestone 15 Remaining Scope

The following Milestone 15 work has not yet been completed:

- Visitor Card operational workflows and UI
- Anonymous/self-service Visitor Card intake
- Communication Center reminder integration
- Final Milestone 15 acceptance and closure documentation

Do not begin Milestone 17 until Milestone 15 is completed or the Product Owner
and Technical Lead explicitly approve a sequencing change.

## Current Active Milestone

**Feature development — remaining platform scope and approved workflow/UX
improvements**

Milestone 15 remains active for its unfinished Forms & Registrations work. The
broader acceptance campaign is paused by Product Owner decision until the
feature set is complete.

## Next Step

Plan and approve the next feature-development assignment from the documented
backlog. Do not automatically start Administration, another milestone, or any
new Prayer & Care workflow without Product Owner and Technical Lead scope
approval.

### Full Platform Acceptance Defect — Parent Account/Person Linking

After the clean development reset, an Administrator created the VanderMolen family and added Louie VanderMolen as a responsible adult using the Parent login email. The Parent still saw “No related family found.” The authenticated profile remained linked to the preserved pre-reset Person while family creation correctly created a separate Person; family authorization deliberately follows `profiles.person_id` relationships and never email coincidence.

Local additive migration `202609070001_parent_account_person_linking.sql` adds narrowly protected candidate-listing and atomic link/relink workflows for active Platform Administrators and Youth Pastors only. Ordinary Staff, Parents, Volunteers, anonymous users, and inactive actors are denied. Target accounts must be active verified Parent accounts, and target People must be active responsible adults in active households. Email is advisory only; managers explicitly select the account, provide a reason, confirm identity, and explicitly confirm any relink. The workflow changes only `profiles.person_id`, creates no Person or membership, and records sanitized old/new identifier audit evidence.

The Family manager UI shows link status, account and existing-family context, mismatch/ambiguity warnings, and the protected action only to the two approved roles. Unlinked Parents receive administrator/Youth Pastor guidance, cannot self-link, and no longer receive a check-in-pass entry link without an accessible family. Database family and token authorization remains fail closed.

Focused verification passes. Migration `202609070001` is applied to development and represented in regenerated database types with the compatibility footer preserved. Deployment did not change the live VanderMolen Parent/Person link; the Product Owner must perform that deliberate operation through the new UI. Full Platform Acceptance and Milestone 15 remain active pending Product Owner retesting.

### Live Acceptance Usability Correction — Custom Form Assignment Targets

Live acceptance found that Custom Form managers had to enter raw UUIDs when assigning a published form to an Event, Student, Household, or Volunteer. The database workflow was already authoritative; the missing piece was a usable target-selection interface.

The assignment form now presents human-readable choices from the existing protected Event, Member, Family, and Volunteer directory workflows. Only active/eligible records are offered, while General Ministry remains explicitly targetless. The server action now rejects a missing or malformed target with a clear validation message before calling the existing protected assignment RPC. No Custom Forms tables, assignment semantics, authorization boundaries, migration, readiness rules, or generated database types changed. Milestone 15 remains active pending acceptance retest.

### Live Acceptance Information Architecture Correction — Visitors

Product Owner acceptance testing identified that Visitor Follow-Up was presented inside Forms even though it is a people-entry, ministry follow-up, duplicate-review, linking, and conversion workflow. Forms should remain focused on documents, templates, Custom Forms, assignments, submissions, Medical Forms, and Permission Slips.

Visitor management now has a first-class `/visitors` navigation destination and protected detail routes. The existing Visitor Cards workspace, actions, services, schemas, types, RPCs, retained review history, audit behavior, and database model are reused without duplication. The Forms page no longer loads or renders Visitor Follow-Up. Navigation visibility and direct route access continue to require `visitor_cards.manage`; Parent and Volunteer roles remain denied. No migration or generated-type change was required. Verification passed, and Milestone 15 remains active pending acceptance retest.

### Live Acceptance Data-Integrity Correction — Custom Form Assignment Uniqueness

Product Owner testing created two identical active Event assignments for the same published Custom Form version and Event. The existing target-shape constraint ensured that each assignment used the correct target column, but neither the table nor `create_custom_form_assignment` enforced uniqueness among active rows.

Migration `202608230003_custom_form_assignment_active_uniqueness.sql`, now
recorded locally and remotely, adds one partial unique index across version,
assignment type, and all authoritative target columns using `NULLS NOT
DISTINCT`, scoped to `archived_at is null`. This prevents duplicate active
Event, Student, Household, Volunteer, and targetless General Ministry
assignments while allowing retained archived history and a later replacement
assignment. The protected RPC and server action return “This form is already
assigned to that target.” instead of exposing constraint details. Authorization
is unchanged.

The migration has not been applied. It deliberately fails closed if duplicate active data already exists and does not delete or silently archive either live-test row. Before application, a manager must review the duplicate Event assignments, preserve the intended row, and archive the other through the established assignment lifecycle so actor and timestamp evidence are retained. Read-only development inspection found duplicate Event assignment IDs `8f400e02-8188-49fc-bcdb-b9c07cc4fca0` (created first; retains draft submission `6d502e4e-fa9a-4a21-b58e-5a29210c2670`) and `0a185bab-3eab-441d-8c34-4e83f9a96c1d` (created later; no submissions). The safe cleanup recommendation is to preserve the first row and archive the later row through the existing manager action/RPC before applying the migration. Verification passed, but Milestone 15 remains active pending Technical Lead approval, development cleanup, migration application, and acceptance retest.

### Parent Live Acceptance Blocker — Forms Respondent Route

Product Owner testing found that an authenticated Parent could select Forms but received a 404 before reaching the existing Custom Forms respondent workflow. The respondent architecture was already complete: Parent and Volunteer roles have `custom_forms.submit`; `list_my_custom_forms` resolves Event assignments through qualifying registrations and relationship-scoped student access; and the existing My Forms route supports draft opening, resumption, required-field validation, immutable submission, and retained response access.

The entry contract was inconsistent. Forms navigation was keyed to manager-only `forms.documents.manage` and supplemented by a broad role-list bypass, while the page independently evaluated document, management, and respondent access. Forms navigation now uses `custom_forms.submit`, and the page explicitly accepts any approved document, Custom Forms manager, or Custom Forms respondent path. Parents receive only relationship-scoped document operations and My Forms; template/version/field/assignment management, oversight, Medical Forms management, Visitor management, and direct manager template routes remain capability- or role-protected. No database, migration, RPC, RLS, or generated-type change was required. Verification passed; Milestone 15 remains active pending acceptance retest.

### Second Parent Live Acceptance Failure — Respondent Draft Collision

The prior navigation correction did not resolve Louie’s Parent-session 404. Runtime logs proved that `/permission-forms` rendered and the failure occurred only after following the My Forms link to `/permission-forms/my/[assignmentId]`. That route caught every `open_custom_form_assignment` error, converted it to `null`, and called `notFound()`.

Read-only development inspection established the exact collision. Active Parent profile `6e9f7c76-0849-467b-b6cd-a67dc7d6dffb` has role `parent`; Gillian is active and relationship-visible; registration `f37d3323-6997-4bb0-a9cd-6ee9f3ba6aa1` is `registered` for the assigned Event; and assignment `8f400e02-8188-49fc-bcdb-b9c07cc4fca0` is active. However, Administrator respondent testing had already created draft `6d502e4e-fa9a-4a21-b58e-5a29210c2670` for the same assignment and Student. Phase 5’s student submission unique index covered only `(assignment_id, subject_student_id)`, while the RPC deliberately opens/resumes drafts by assignment, subject, and `submitted_by_profile_id`. The Parent insert therefore raised a unique violation, which the route hid as the standard Next.js 404.

The initial local proposal for
`202608230004_custom_form_submission_respondent_uniqueness.sql` was superseded
during Technical Lead review by the approved Model B design described below.
The final migration is now recorded locally and remotely. Existing submissions
remain retained and attributed; authorization, assignment visibility, manager
controls, Visitor separation, submitted-answer immutability, and assignment
uniqueness remain unchanged.

*Last updated: August 23, 2026*

### Full Platform Acceptance Reset Preparation — Read-Only

A read-only inventory of linked development project `txjwwxzlsltbwixrscfp`
confirmed exactly three Auth accounts: the Platform Administrator, Parent, and
Volunteer acceptance identities. Their Auth IDs, profile roles/statuses, and
the Parent account's linked Person row were recorded as reset invariants.

Two review artifacts were prepared under `scripts/`: a read-only inventory and
dependency preview, and an explicit dependency-ordered reset transaction. The
reset preserves the three Auth/profile identities, login-linked Person data,
the eight repository-seeded Prayer & Care categories, schema/migrations, and
private Storage bucket definitions. It removes operational module data,
non-preserved identities, custom lookup data, and (after backup approval) the
old audit trail. Storage objects must be handled separately through the trusted
Storage API; the live inventory currently reports zero objects in all four
private buckets.

The reset script contains exact environment/account preconditions, post-reset
assertions, no `TRUNCATE ... CASCADE`, and an intentional final `ROLLBACK` review
gate. It has not been run and no development data has been changed. Technical
Lead approval, a database backup, final Storage recheck, and deliberate review
of changing the final statement to `COMMIT` are required before execution.

Milestone 15 remains active. Full Platform Acceptance has not started, and no
milestone has been marked complete by this preparation work.


### Technical Lead Architecture Correction - Subject-Owned Custom Form Submissions

Technical Lead review rejected the initial local `202608230004` proposal to make Student, Household, Volunteer, and Event submissions unique per respondent. The original Phase 5 schema establishes one authoritative submission per assignment and subject; only targetless General Ministry assignments are respondent-owned.

Migration `202608230004_custom_form_submission_respondent_uniqueness.sql`, now
recorded locally and remotely, leaves every Phase 5 unique index unchanged and
replaces the five coordinated respondent RPC contracts. Student, Household,
Volunteer, and Event workflows find or create the single authoritative subject
submission. An eligible Parent, guardian, or manager may open and operate the
same draft only while current relationship, registration, capability,
assignment, template, and version authorization remains valid. General Ministry
continues resolving submissions by `submitted_by_profile_id`.

`submitted_by_profile_id` remains the initiating actor and is never overwritten. Sanitized audit events identify the actual answer-saving and submitting actor without storing answer content. Reopening a submitted form returns the same locked retained submission and never creates another row.

The respondent route now validates UUID inputs and preserves 404 concealment for malformed, missing, or unauthorized assignments. Unexpected operational failures render a sanitized temporary-unavailability state instead of being mislabeled as missing routes.

The final approved migration is recorded locally and remotely. Database
generated types did not require regeneration because the public function
signatures and generated schema types did not change. Milestone 15 remains
active pending its remaining real-document workflow and acceptance work.

### Full Platform Acceptance Usability Correction — Scheduling Workspace

Full Platform Acceptance identified that Scheduling combined calendar review, schedule creation, position and assignment management, lifecycle controls, and recurring rotations on one long page. The local application now keeps `/scheduling` as a focused calendar/list dashboard with date filters and links to dedicated creation and management routes.

Schedule creation now lives at `/scheduling/new` and uses the existing protected schedulable-Events projection to present human-readable Event choices. Recurring rotations live under `/scheduling/rotations`, with creation at `/scheduling/rotations/new`; weekday choices use names and the monthly ordinal control appears only for monthly patterns. Each schedule opens at `/scheduling/[scheduleId]` with URL-addressable Overview, Positions, Assignments, Conflicts, and Lifecycle sections.

Existing server-side Scheduling authorization, protected RPCs, conflict overrides, publication safeguards, cancellation history, rotations, and volunteer self-scoping remain authoritative. No database, migration, live-data, or role/capability change was made. Full Platform Acceptance and Milestone 15 remain active pending Product Owner retesting of the revised Scheduling experience.

### Prayer & Care Full Platform Acceptance UX Correction

Full Platform Acceptance found the Prayer Center operationally complete but too
long and busy because prayer creation, confidential care creation, follow-up
creation, record lists, history, and lifecycle forms were simultaneously
visible. The application now presents a responsive, deep-linkable Prayer & Care
workspace with Overview, Prayer Requests, Care & Visits, Follow-ups, and
Archived sections. Overview answers “What needs my attention?” with operational
counts only; it never receives or displays prayer-detail bodies, confidential
care-note content, follow-up instructions, completion notes, or cancellation
reasons.

Manager creation forms are hidden by default and open through mutually
exclusive New prayer request, New care note, and New follow-up query-driven
panels. Care content retains a persistent confidentiality warning and is
revealed intentionally. Prayer, care-note, and follow-up lifecycle controls are
collapsed until requested. Existing protected RPCs, audit behavior, direct-table
denial, visibility filtering, and current Platform Administrator, Youth Pastor,
Staff, Parent, Volunteer, anonymous, and inactive-account boundaries are
unchanged.

Prayer & Care list and picker services now distinguish a successful empty result
from an RPC failure. The browser receives one generic retry message, while
server diagnostics contain only the fixed operation name, safe error code, and
sanitized authorization/unavailable category. No prayer, care, follow-up,
identity, or raw database content is logged.

The previously identified Volunteer discrepancy remains an explicit Product
Owner decision: the database sanitized-summary RPC permits active authenticated
profiles, but the current application capability configuration does not grant
Volunteers `prayer_care.view`. This refactor intentionally preserves that
effective route/navigation behavior. Automated verification passed; Prayer &
Care remains pending Product Owner live acceptance.

### Prayer Request Visibility Submission Correction

Live acceptance found that **Prayer for a Good School Week** visually had
**Public signed-in summary** selected, but the creation workflow received and
stored `leadership`. Read-only inspection confirmed the database row and its
sanitized creation audit both contained `leadership`; the protected RPC and
manager projection behaved correctly. The defect was isolated to client form
state/submission behavior.

The Visibility select is now explicitly controlled from an initial
`leadership` state, and the displayed selection is the same value serialized in
FormData. Manager prayer cards also present the stored projection value with
the human-readable Public signed-in summary, Ministry leadership, or Private
oversight label. Parent summaries remain unchanged and still contain no
identity, detail body, assignment, or visibility field.

No database, migration, RLS, capability, action, service, RPC, default, or live
acceptance-data change was made. The existing request remains intentionally
stored as `leadership` for later leadership-visibility testing. Automated
verification passed. The subsequent September checkpoint confirmed the new
public-request path and leadership boundary; see the current strategy section
above.

### Scheduling Final Acceptance Corrections — September 15, 2026

Live acceptance passed the refactored dashboard and workspace, dedicated creation flow, Event selector, locations and positions, timezone-safe assignment workflow, assignment details, coverage counts, publication safeguards, conflict enforcement and overrides, manager/Volunteer/Parent authorization boundaries, responsive layout, and weekly/biweekly/monthly rotation lifecycles including duplicate prevention.

Cancellation correctly retained assignment rows but the active-only
`list_ministry_schedules` projection intentionally stopped returning them,
causing retained conflict evidence to disappear from the manager Conflicts
section. Migration `202609150001_scheduling_conflict_history.sql`, now recorded
locally and remotely, adds a separate manager-only protected history
projection. It preserves active coverage semantics while returning current and
cancelled assignments that retain conflict codes, override evidence, reasons,
locations, and authoritative timestamps. The UI now shows the retained override
reason, calls the active empty state “No active assignments,” resolves the linked
Event name through the existing manager-authorized Event projection, and uses
count-aware position and assignment labels.

Automated verification passed. Final live Product Owner retesting is pending after Technical Lead review and approved development application of the new migration. Scheduling is not yet marked finally accepted, and Full Platform Acceptance remains active.

### Platform Calendar — September 24, 2026

The approved Platform Calendar is implemented locally at `/calendar` with
responsive Month, Week, and Agenda views, date navigation, a Today action,
Event/Schedule visual distinction, and deep links back to the authoritative
Event or Schedule workspace. Calendar is read-only and does not introduce a
second event or scheduling data model.

Forward migration `202609240001_platform_calendar.sql` adds one fixed-search-
path, security-definer projection. Managers receive authorized non-archived
Events and non-cancelled Schedules. Volunteers receive published/active Events
and only their own published Scheduling responsibilities. Parents receive
published/active Events plus relationship-authorized child registration
context and no Schedule rows. Inactive profiles, anonymous users, invalid
ranges, direct-table access, existing Event rules, and existing Scheduling
rules remain fail-closed.

Dedicated Calendar verification, lint, and TypeScript pass. The migration has
not been applied to development and live Product Owner acceptance has not yet
run, so this is implemented—not finally accepted.


### Live Acceptance Correction - Choice Draft Restoration

Product Owner testing confirmed the Model B shared-subject correction and showed that text draft values resumed, but the saved T-Shirt Size select returned visually to its placeholder. Read-only development inspection confirmed that the existing Gillian draft retained `choice_value = "Adult M"` for the published `single_choice` field and that the value exactly matched its configured options. No live data was changed.

The defect was application-only. Choice controls relied on uncontrolled one-time `defaultValue`/`defaultChecked` state across a React server-action reset and client navigation, while the save action revalidated a path built from the submission ID instead of the actual assignment route. Single- and multiple-choice controls now use controlled state initialized from the returned answer, and draft saves carry the assignment ID so the correct respondent route is revalidated.

Database validation, immutable published options, submitted-answer immutability, Model B subject ownership, General Ministry respondent ownership, and actor auditing are unchanged. No migration or generated-type change was required. Automated verification passed. Milestone 15 remains active pending Product Owner retesting; acceptance is not complete.

### Full Platform Acceptance Usability Correction — Event Workspace

Full Platform Acceptance identified that the Event workspace rendered event details, registration, volunteer staffing, Forms, planning tools, editing, and archival as one long page. The local application now presents those existing workflows in URL-addressable Overview, Registration, Volunteers, Forms, Planning, and Settings sections. Overview remains the default and retains the event identity, dates, location, capacity, description, meeting instructions, and registration summary.

Draft events expose a prominent Publish event action that submits through the existing validated event-update action and protected RPC. Registration, volunteer, Forms, planning, settings, and archival behavior retain their existing server-side authorization; management sections are not exposed to accounts without established event permissions. Archive remains visually separated as a destructive action. No migration, data-model change, registration change, readiness change, or live Event update was made.

Automated verification passed locally. The Product Owner must still retest the Draft acceptance event `Youth Fall Kickoff` and role-specific section visibility. Events acceptance, Full Platform Acceptance, and Milestone 15 remain open.

### Full Platform Acceptance Correction — Communications Draft Retrieval

Live acceptance found that a newly created Parent announcement draft appeared immediately but was reported as missing after navigation and exact-title search. Read-only development inspection confirmed that the draft and its sanitized creation audit remained intact, unpublished, unexpired, and unarchived. The application service was converting every `list_announcements` RPC failure into an empty list, causing the page to present a retrieval failure as “No visible announcements.”

The Communications service now returns a discriminated success/failure result. A successful zero-row response retains the established empty state, while an RPC failure produces a safe retry message and a sanitized server diagnostic containing only the fixed operation name, safe error code, and failure category. The authoritative RPC, manager draft visibility, audience rules, RLS, and direct-table denial are unchanged. Automated verification passed; live Product Owner retesting with the retained `Parent Fall Kickoff Information` draft remains pending, so Communications and Full Platform Acceptance are not marked finally accepted.

### Full Platform Acceptance UX Correction — Communications Manager Inbox

The Product Owner found that rendering every announcement’s complete message and edit form on the main Communications page would not scale as history grows. Managers now receive a compact, responsive inbox-style list with human-readable audience and lifecycle labels, authoritative last-updated dates, search, and focused links to create and manage announcements. Creation moved to `/communications/new`; individual message review, editing, publication, and archival moved to `/communications/[announcementId]`. Parents and Volunteers retain the existing audience-scoped reader experience and cannot enter either manager route.

The existing protected projection lacked `created_at` and `updated_at`, so
forward migration `202609150002_communication_announcement_projection.sql`
adds only those two return columns while preserving the existing authorization,
filtering, ordering, security-definer configuration, and authenticated-only
execution grant. The migration is recorded locally and remotely, and generated
database types include the deployed projection. Groups, channels, chat, direct
messaging, and external integrations remain future Communication Center
direction rather than current scope.

### Full Platform Acceptance Security Correction — Cross-Account Session Isolation

Communications acceptance exposed a platform-wide identity-transition defect: after Administrator → Parent → Volunteer → Administrator switching, the shared header reflected the final Administrator while the Communications child route reused the Volunteer-rendered Router Cache payload. Stored profiles, capabilities, announcement data, and protected RPC authorization remained correct; the stale child payload caused the apparent authorization downgrade and demonstrated a reverse-transition disclosure risk.

Successful sign-in and sign-out now return sanitized action states after the server-side Supabase mutation and root-layout invalidation. The shared client boundaries perform full-document `window.location.replace(...)` navigation only after confirmed success. This discards the prior identity’s Router Cache, prefetched RSC payloads, preserved layouts, and client component state across every authenticated workspace. Failed mutations remain in place with sanitized errors. No database, migration, role, capability, RLS, or live-data change was required. Automated verification passed; live multi-account Product Owner retesting remains pending.

### Communications Acceptance UX Correction — Template Management

The Product Owner found that the Communication Templates management page was
dominated by creation and inline-edit forms. Template management now follows
the preferred platform direction **List → intentional Create** and **View →
intentional Edit** through a responsive manager list and focused New Template,
read-only detail, and Edit routes. The shared form shows Email subject only for
Email templates. Existing protected RPCs, validation, audit behavior,
Communications authorization, RLS, and live data are unchanged. This pattern
should be applied selectively when management/detail pages become overloaded;
it is not authorization by presentation. Live Product Owner verification is
pending, and Communications is not fully accepted.

### Communications Acceptance Correction — Applying Templates in Compose

Live Product Owner testing found that selecting an active, channel-compatible
template in Compose recorded only its reference and left the editable content
blank. Compose now copies the selected template’s message into In-app, Email,
and SMS communications and copies the existing subject for Email. Copied
content remains editable. Switching templates replaces blank or unchanged
template-derived content immediately; replacing manual edits requires explicit
confirmation. Selecting No template removes only the reference and preserves
the current content. Recipient preview, channel filtering, archived-template
exclusion, synthetic delivery, history, authorization, audit behavior, RLS,
and live data are unchanged.

The first live retest still showed Youth Event Reminder selected with a blank
Message. Runtime investigation found that the browser can restore a select
element’s visible value across the Compose GET navigation or an already-open
development tab without firing React’s change handler; the first correction
only applied content inside that handler. The component now reconciles a
browser-restored selection on initial display and `pageshow` through the same
guarded application logic. The behavior is factored into a runtime helper that
is tested using actual protected-projection rows and UUID option values, rather
than only source-code pattern assertions. A second In-app-only Product Owner
retest is pending; Communications is not accepted.

### Communications — Final Full Platform Acceptance Checkpoint

**Status:** Functionally accepted by the Product Owner on September 20, 2026

This final checkpoint supersedes the earlier pending-retest wording retained in
the defect and correction history above. Live acceptance passed for:

- durable manager draft creation, navigation/reload persistence, exact-title
  draft search, editing, publication, and published display;
- Entire Ministry, Parents and Guardians, and Volunteers audience isolation
  across Administrator, Parent, and Volunteer accounts;
- retained archival, manager Include archived retrieval, search, and clear
  Archived status;
- automatic expiration after the configured time without manual archival;
- synthetic Parent recipient preview, In-app and SMS delivery history, and the
  guarantee that no real Email or SMS was sent;
- Parent in-app notification delivery, unread count, mark-as-read, and retained
  read state;
- template creation, editing, archival, archived-template exclusion, In-app and
  SMS content application, editable copied content, No template preservation,
  and the manual-replacement safeguard;
- Parent and Volunteer 404 concealment for `/communications/new` and
  `/communications/templates`;
- narrow/mobile Volunteer layout, collapsed navigation, usable search, wrapped
  announcement text, and no obvious horizontal overflow.

The retained acceptance announcement `Expiration Acceptance Test` was visible
to the Parent before its expiration and disappeared after the expiration time
and refresh without an edit or archive action. The previously missing manager
draft appeared after structured announcement retrieval error handling. The
second template-application correction passed with Youth Event Reminder after
reconciling browser-restored select state.

Email-template subject/message application has automated regression coverage
but was not live-tested because no active Email template existed in the
acceptance data. This is recorded as unverified live coverage, not a failure of
the accepted current feature set. Real provider Email/SMS delivery remains
outside the synthetic-delivery acceptance scope.

Migration `202609150002_communication_announcement_projection.sql` is applied
to development, migration history is aligned, and generated database types
include the deployed `created_at` and `updated_at` projection fields with the
repository compatibility overlay preserved.

Deferred, non-blocking UX direction: evolve Parent, Volunteer, and manager
Communications toward a familiar responsive email/message application with a
compact inbox, unread/read state, sender/audience/context, timestamps, dedicated
reading views, and clearer Inbox/Announcements/Notifications separation.
Role-aware composition must remain authoritative. Broader GroupMe-like ministry
communication remains roadmap work. Neither redesign was implemented here.

### Curriculum Acceptance Correction — Private File Classification

Full Platform Acceptance found that a PDF selected in the private teaching
resource form could retain the UI's `document` category even though the
protected database finalizer correctly requires the canonical `pdf` resource
type. The file reached the private bucket, finalization failed closed, and the
exact-object cleanup succeeded; read-only verification found no orphaned object
or partial resource row from the failed attempt.

Private Curriculum uploads now derive their canonical classification from the
selected file's matching extension and MIME type before Storage authorization:
PDF maps to `pdf`, MP4 to `video`, and DOCX/PPTX/TXT to `document`. Unsupported
or mismatched files are rejected before upload, and the UI displays the
detected type. The existing private bucket, signed upload, protected RPC,
manager authorization, database validation, download authorization, and audit
behavior are unchanged. Automated verification passed; live Product Owner
retesting remains pending, so Curriculum acceptance is not yet closed.

### Curriculum Acceptance Correction — Lesson Workspace Usability

Live acceptance found the lesson-detail page functionally complete but too long
and visually busy because resources, creation forms, all lesson content, and the
entire editor shared one screen. The lesson detail now uses deep-linkable
Overview, Lesson Content, Discussion, Resources, and Preparation sections with
horizontal scrolling navigation on narrow screens. Overview is read-only;
content is presented for reading; the full editor appears only after **Edit
lesson**; and Draft lessons expose an explicit **Publish lesson** action through
the existing audited update workflow. Resource creation and private upload
forms are revealed only through intentional actions.

The Curriculum data model, protected RPCs, authorization, RLS, private Storage,
signed upload/download behavior, canonical file classification, archiving, and
auditing are unchanged. Automated verification passed. Product Owner live
retesting remains pending, so Curriculum is not finally accepted.

### Curriculum Acceptance Correction — Resources Panel State

The first live retest of the redesigned Resources section found both large
management forms visible instead of the approved clean resource list. The
initial implementation used two independent client booleans, which allowed
both panels to become active and permitted that invalid combination to survive
preserved client/router state. Resources now uses one mutually exclusive panel
state: no form is open by default, **Add resource** opens only the external-link
form, **Upload private file** opens only the private upload form, switching an
action replaces the prior panel, and **Cancel** returns to the clean view.

Existing resource cards remain visible throughout. Resource authorization,
protected RPCs, canonical file classification, private signed upload/download,
archiving, auditing, RLS, and Storage are unchanged. Automated verification
passed; another Product Owner live retest is required and Curriculum remains
unaccepted.

### Curriculum Acceptance Correction — Plan Lesson Reordering

Live acceptance found that Curriculum Plans stored and displayed ordered lesson
relationships but provided only Add and Remove controls. Managers can now use
boundary-aware **Move up** and **Move down** controls while preserving the same
relationship and lesson IDs. New forward migration
`202609210001_curriculum_plan_lesson_reordering.sql` adds a protected,
plan-locking adjacent-swap RPC and one sanitized
`curriculum.plan_lesson_reordered` audit event. Existing Add and Remove RPCs are
unchanged; Volunteers remain read-only and Parents remain denied.

Automated verification covers persisted up/down movement, boundaries,
relationship retention, sequence integrity, authorization, direct-table denial,
auditing, and existing add/remove behavior. Migration
`202609210001_curriculum_plan_lesson_reordering.sql` was manually applied to
the linked development project, and migration history was explicitly recorded
as applied for version `202609210001`. The deployed RPC is represented in the
local database types without changing the repository compatibility overlay.

### Curriculum & Lessons — Current-Platform Acceptance Passed

Product Owner live acceptance of the currently implemented Curriculum &
Lessons scope is **PASSED**. This records acceptance of the present feature set;
it does not preclude future approved Curriculum enhancements. Overall Full
Platform Acceptance remains in progress.

Administrator acceptance passed for the Curriculum library; lesson create,
edit, publish, and five-section responsive workspace; external resources;
private PDF upload with canonical `pdf` classification; protected download;
clean and mutually exclusive resource panels; plan create/edit/publish; adding
existing Draft and Published lessons as permitted by plan state; persisted
lesson sequencing; boundary-aware Move up/down controls; and reorder auditing.
The accepted published plan is **Fall 2026 Middle School Faith Series** for
Grades 6–8, with published lessons ordered as **Faith When Life Gets Difficult**
then **Prayer in Everyday Life**.

Volunteer acceptance passed for read-only access to published plans, lessons,
the published lesson sequence, and all five lesson workspace sections. Draft
content and every lesson, resource, plan, reorder, remove, and creation control
remained hidden. Parent acceptance passed with Curriculum navigation hidden and
direct `/curriculum` access concealed as 404.

Responsive acceptance passed at narrow/mobile width for the library, published
plan workspace, and individual lesson workspace. Navigation remained usable;
headers, filters, cards, summaries, sequence content, lesson content, and the
At-a-glance presentation wrapped or stacked without observed clipping or broken
horizontal layout.

The private-resource correction passed live with a PDF upload, canonical PDF
classification, and protected download. The plan sequencing acceptance defect
also passed live: Lesson 2 moved to Lesson 1, persisted after refresh, and Move
down restored the accepted sequence while boundaries and Volunteer read-only
behavior remained correct.

### Prayer & Care Acceptance Correction — Active Request Editing

Full Platform Acceptance found that authorized Prayer & Care managers could
create, answer, and archive prayer requests but could not correct an active
request. The local application now exposes an intentional **Edit request** form
inside **Manage request** for Person, Category, Visibility, Title, and Details.
Cancel returns to the normal card, Mark answered remains separate, and edits
preserve the existing prayer-request identifier.

Forward migration `202609220001_edit_prayer_request_workflow.sql` evolves the
existing protected update RPC to include Person without modifying applied
migration history. Existing manager authorization, active-account and
active-request checks, fixed search path, direct-table denial, and role
boundaries remain intact. Edit audits contain the request identifier, resulting
visibility, and field names only; confidential prayer values are excluded.
Existing Katie acceptance requests and other live data were not changed.

Implementation and automated coverage are complete. The subsequent September
checkpoint passed live editing and public/leadership/private visibility
persistence; the checkpoint remains non-final because further features are
planned before comprehensive acceptance.
