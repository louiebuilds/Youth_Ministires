# Project Journal — Milestone 15 Forms, Documentation & Registration Integration

**Date:** August 12, 2026<br>
**Project:** Youth Ministries Platform<br>
**Milestone:** 15 — Forms, Documentation & Registration Integration<br>
**Checkpoint:** Phases 1–5 Complete, Applied, Verified, and Phase 5 Accepted<br>
**Status:** Active — Remaining Milestone 15 phases not yet started

---

## Summary

Milestone 15 resumed after the earlier pause for Product Owner consultation
regarding paper versus electronic permission and medical documentation.

Phases 1–4 established the authorization, document, Storage, completed-document,
readiness, participation-override, and Check-In enforcement foundation.

The architecture deliberately separates:

- Registration
- Document submission
- Digital document acceptance
- Paper Copy On File evidence
- Medical verification
- Documentation readiness
- Participation overrides
- Check-In authorization

A digital upload alone does not represent completed documentation.

Registration also remains independent from documentation readiness.

---

## Phase 1 — Forms & Registration Foundation

**Status:** Complete, applied, and verified

Phase 1 established the database and authorization foundation for Forms.

### Authorization

Added Forms capabilities including:

- `forms.documents.manage`
- `forms.documents.paper_confirm`
- `forms.medical.view`
- `forms.medical.verify`
- `forms.participation.override`
- `custom_forms.manage`
- `custom_forms.submit`
- `visitor_cards.manage`

Sensitive Staff capabilities use retained individual grants.

Grant history records:

- Capability
- Granting actor
- Grant timestamp
- Reason
- Optional expiration
- Revocation actor
- Revocation timestamp
- Revocation reason

Changing an account away from Staff permanently invalidates effective sensitive
Forms grants. Returning the account to Staff does not resurrect an old grant.

### Document Domain

Established:

- Document templates
- Immutable template versions
- Student document submissions
- Paper evidence
- Review history
- Event document requirements
- Participation override evidence

Event requirements pin an exact document template version.

Submission integrity enforces the authoritative Student/Household relationship.

Replacement chains retain historical submissions and prevent:

- Branching replacements
- Link mutation
- Cycles
- Lifecycle inconsistencies

### Custom Forms Foundation

Established controlled:

- Templates
- Versions
- Fields
- Assignments
- Submissions
- Answers

Submissions use:

`draft → submitted → archived`

Required-field completeness is enforced before a submission may become
`submitted`.

Published form definitions remain immutable.

### Visitor Cards Foundation

Established retained Visitor Card intake records with:

- Staff and self-service sources
- Review history
- Explicit relationship links
- Conversion evidence
- Hashed rate-limit counters
- Source-aware privacy acknowledgment

Visitor Cards contain no medical architecture and do not automatically create or
merge Member records.

### Phase 1 Migrations

- `202608120001_milestone15_authorization_foundation.sql`
- `202608120002_document_domain_foundation.sql`
- `202608120003_custom_forms_foundation.sql`
- `202608120004_visitor_cards_foundation.sql`

---

## Phase 2 — Document Template Management

**Status:** Complete, applied, and verified

Phase 2 implemented operational management of blank Permission Slip and Medical
Release masters.

### Private Storage

Created:

`form-template-masters`

Configuration:

- Private
- PDF only
- 15 MB maximum
- UUID-only paths

Path format:

`templates/{template-id}/{version-id}/{object-id}.pdf`

Authenticated clients have INSERT-only Storage access.

There are no authenticated SELECT, UPDATE, or DELETE policies.

### Template Lifecycle

Authorized managers can:

- Create templates
- Create draft versions
- Edit draft versions
- Prepare master uploads
- Finalize uploads
- Publish versions
- Retire versions
- Archive templates
- View retained history
- Securely download masters

Version numbers are assigned under database locking rather than being
client-controlled.

### Binary Validation

Trusted server finalization:

1. Resolves the prepared object.
2. Reads the actual stored bytes.
3. Enforces the 15 MB limit.
4. Requires the `%PDF-` signature.
5. Computes SHA-256 server-side.
6. Sanitizes the filename.
7. Finalizes metadata through trusted database authority.

The browser cannot authoritatively supply MIME type, size, or checksum.

### Downloads

Blank-master downloads:

- Accept only a version UUID.
- Authorize through PostgreSQL.
- Record sanitized audit evidence.
- Use trusted server Storage authority.
- Produce a short-lived 60-second signed URL.

Direct authenticated Storage reads are not allowed.

### Phase 2 Migrations

- `202608120005_form_template_master_storage.sql`
- `202608120006_document_template_workflows.sql`

---

## Phase 3 — Completed Student Documents

**Status:** Complete, applied, and verified

Phase 3 implemented completed Permission Slip and Medical Release workflows.

### Private Storage

Created:

`student-documents`

Configuration:

- Private
- 20 MB maximum
- PDF
- JPEG
- PNG
- UUID-only object paths

Path format:

`submissions/{student-id}/{submission-id}/{object-id}.{ext}`

Authenticated clients receive INSERT-only access to their exact prepared path.

No authenticated SELECT, UPDATE, or DELETE policy exists.

### Upload Authorization

Parent uploads require a current authoritative relationship to the Student and
Household.

Staff uploads require current effective:

`forms.documents.manage`

Authorization is revalidated both during Storage insertion and trusted
finalization.

Prepared authority therefore does not survive:

- Account suspension
- Role change
- Parent relationship removal
- Staff capability loss

### Completed-Document Validation

Trusted server processing:

- Reads actual stored bytes
- Detects PDF, JPEG, or PNG by signature
- Enforces the 20 MB limit
- Computes SHA-256
- Sanitizes filenames
- Revalidates actor authority
- Finalizes through service-role-only database authority

### Replacement Model

Replacement creates:

- A new submission
- A new immutable Storage object
- A retained supersession link

Historical submissions and files remain retained.

### Secure Retrieval

Completed documents are server-streamed.

The application does not expose:

- Storage paths
- Service-role credentials
- Permanent public URLs
- Signed Storage URLs to unauthorized callers

Downloads use:

- `Content-Disposition: attachment`
- `X-Content-Type-Options: nosniff`
- `Cache-Control: private, no-store`

### Paper Evidence

Implemented explicit:

- Paper Copy On File confirmation
- Paper confirmation revocation

Digital upload does not create paper evidence automatically.

### General Review

Implemented:

- Acceptance
- Rejection
- Replacement request

Review history remains retained.

### Medical Verification

Medical access remains separated into:

- `forms.medical.view`
- `forms.medical.verify`

Medical verification requires an accepted general-review state.

Rejection, replacement request, or supersession invalidates the current medical
verification projection without deleting historical verification evidence.

### Phase 3 Migrations

- `202608120007_student_document_storage.sql`
- `202608120008_completed_document_workflows.sql`

---

## Phase 4 — Documentation Readiness & Participation Enforcement

**Status:** Complete, applied, and verified

Phase 4 connected the document foundation to Event operations and Check-In.

### Derived Readiness

Documentation readiness is calculated dynamically.

No mutable readiness boolean or snapshot was introduced.

The calculation uses:

- Active Event requirements
- Exact pinned template version
- Current non-superseded submission
- Digital acceptance
- Current Paper Copy On File evidence
- Medical verification when required
- Expiration
- Replacement state

### Permission Slip Readiness

A Permission Slip is READY only when:

- The submission is current and valid
- Digital document is accepted
- Paper Copy On File is confirmed

### Medical Release Readiness

A Medical Release is READY only when:

- The submission is current and valid
- Digital document is accepted
- Paper Copy On File is confirmed
- Medical verification is current

### Event Roster

Event Registration now displays registration and documentation independently.

Operational states include:

- `READY`
- `NOT READY`
- Missing evidence categories
- Applicable participation override

No document or medical contents are exposed through the readiness projection.

### Participation Overrides

Overrides require:

`forms.participation.override`

An override must:

- Reference an active Event Registration
- Match the Event and Student
- Match the exact current unmet blocking requirement set
- Include an explicit reason

Override evidence is retained.

An override becomes inapplicable when:

- It is revoked
- It expires
- Registration becomes inactive
- Requirements change
- The unmet blocking set changes
- Documentation becomes ready

### Check-In Enforcement

Check-In derives readiness server-side.

Behavior:

- READY → Check-In proceeds normally
- NOT READY without applicable override → Check-In blocked
- NOT READY with applicable override → Check-In allowed
- Event without blocking document requirements → existing behavior preserved

A blocked Check-In creates no Check-In record.

The workflow returns a null record identifier rather than raising an exception so
the sanitized denial audit event remains committed.

### Phase 4 Migration

- `202608120009_document_readiness_participation.sql`

The migration was successfully applied to the linked Supabase project.

---

## Security Architecture

Across Phases 1–4:

- Forms tables use forced RLS.
- Direct client table access remains denied where protected RPCs are authoritative.
- Storage buckets remain private.
- Authenticated Storage access is INSERT-only where required.
- Sensitive authorization is revalidated at execution time.
- Medical viewing and medical verification remain separate capabilities.
- Historical evidence is retained rather than destructively rewritten.
- Audit metadata is intentionally sanitized.

Audit records exclude:

- Document contents
- Medical contents
- Raw filenames
- Storage paths
- Tokens
- Signed URLs
- Emergency instructions
- Contact information

---

## Post-Migration Type Regeneration

After Phase 4 was applied, Supabase public-schema types were regenerated from
the linked live project.

File:

`lib/supabase/database.types.ts`

Supabase CLI generation removed repository-specific compatibility definitions,
including `ApplicationDatabase` and application enum aliases.

The established compatibility footer and nullable-RPC compatibility overlay were
restored.

After restoration:

- TypeScript passed
- Production build passed

The generated live schema and application expectations are aligned.

---

## Verification

Final Phases 1–4 verification:

- Milestone 15 Phase 1 tables, enums, RLS, and direct-access denial — Passed
- Role defaults and sensitive grant/revoke authority/history — Passed
- Document immutability, supersession, and pinned Event versions — Passed
- Controlled Custom Form fields and Visitor Card privacy foundation — Passed
- Existing Event Registration schema protection — Passed
- Phase 2 private Storage, template versioning, authorization, lifecycle, and
  audit controls — Passed
- Phase 3 completed-document upload, replacement, streamed retrieval, review,
  paper, and medical controls — Passed
- Phase 4 derived readiness, retained participation overrides, and authoritative
  Check-In enforcement — Passed
- `npm run lint` — Passed
- `npx tsc --noEmit` — Passed
- `npm run build` — Passed
- `git diff --check` — Passed

`git diff --check` produced informational LF-to-CRLF warnings only.

---

## Architecture Decisions Confirmed

1. Registration is independent from documentation readiness.
2. Digital upload alone does not constitute completed documentation.
3. Paper Copy On File is explicit retained evidence.
4. Medical verification is explicit retained evidence.
5. Readiness is derived rather than stored.
6. Event requirements pin exact immutable template versions.
7. Replacements retain prior submissions and files.
8. Participation overrides do not change documentation status.
9. Check-In enforcement is database authoritative.
10. Blocked Check-In preserves sanitized denial audit evidence.
11. Sensitive medical capabilities remain separated.
12. No medical data is stored in Visitor Cards.

---

## Remaining Milestone 15 Scope

The following work remains:

- Visitor Card operational workflows and UI
- Anonymous/self-service Visitor Card intake
- Communication Center reminder integration
- Final Milestone 15 acceptance
- Final milestone documentation and release closure

Milestone 17 has not started.

---

## Current Checkpoint

**Milestone 15 remains active.**

**Phases 1–5 are complete, applied, and verified. Phase 5 Product Owner
acceptance passed.**

The next Milestone 15 phase must be planned and approved before implementation.

Do not automatically begin Milestone 17.

---

## Phase 5 — Custom Forms Operational Workflows & UI

**Status:** Complete, applied to development, technically verified, and Product
Owner accepted

Phase 5 implemented protected Custom Form operations using the existing Phase 1
domain model. It did not introduce a competing schema.

Delivered:

- Template and immutable-version creation
- Controlled draft field creation
- Publication and retirement
- Template and assignment archival
- Student, Household, Volunteer, Event, and General Ministry assignments
- Event Registration qualification for Event responses
- My Forms listing, draft opening, saving, resumption, and submission
- Required-field and required boolean-acknowledgment enforcement
- Immutable submitted answers
- Retained management oversight and submission archival
- Sanitized lifecycle audit evidence
- Medical Release guidance and readiness/Check-In separation

Migration `202608160001_custom_forms_workflows.sql` was applied successfully to
development project `txjwwxzlsltbwixrscfp`. Types were regenerated from the
development schema with the compatibility overlay retained. All 19 Phase 5
public RPCs are represented.

The six Custom Forms tables retain forced RLS and deny direct anonymous and
authenticated DML. Protected RPCs remain authoritative.

Product Owner acceptance passed on August 22, 2026.

Current lifecycle behavior requires the template to be archived before an
assigned published version is retired. This behavior was documented rather
than redesigned.

The linked development migration history was subsequently repaired and is aligned remotely through applied migration `202608230001`.

No commit was created and no later Milestone 15 phase or Milestone 17 was
started.

---

## August 23 Manual Acceptance Blocker — Event Registration Management

Platform Administrator acceptance testing could not establish the real Event Registration required by document readiness and Check-In. The registration schema and protected workflows already supported duplicate rejection, capacity/waitlist placement, audited creation, roster projection, and retained cancellation, but the existing UI and relationship-scoped RPC branches exposed creation only to Parents.

The correction extends those same RPC contracts only for active Platform Administrators and reuses the existing Event registration component in manager mode. Administrators can select an eligible active student, register or waitlist them according to current Event settings, see the result in the roster, and cancel without deleting history. Existing Parent authority remains scoped to eligible linked youth. Youth Pastor, Staff, and Volunteer permissions were not broadened.

Regression coverage verifies administrator eligibility listing, registration, duplicate handling, capacity/waitlist behavior, roster visibility, retained cancellation and actor attribution, Milestone 15 readiness consumption, and Staff/Volunteer denial. Forms/Registrations Phases 1–6, Event, Member/Student, full lint, TypeScript, production build, and diff verification passed after the temporary generated-types artifact was removed.

Medical/permission/readiness migration `202608230001` is already applied to development, its remote migration history is aligned, and `lib/supabase/database.types.ts` has already been regenerated and restored with its compatibility footer. Administrator registration changes are isolated in new local migration `202608230002_admin_event_registration_management.sql`, which has not been applied. Live acceptance is pending that migration. No types were regenerated during this packaging correction, no commit was created, and Milestone 15 remains active.
### Live Acceptance Correction — Null Standing-Medical Requirement

Live testing after Administrator registration for Fall Retreat 2026 exposed a React warning because the roster mapped the intentional null `requirementId` for an unconfigured school-year Medical Form into a hidden override input. The database projection was correct and remains unchanged.

The Event roster now renders a clear missing-configuration message and blocks the entire participation-override form when any blocking unmet item has no authoritative requirement UUID. It never renders a null hidden input, including mixed configured and unconfigured blocker sets. Configured unmet requirements retain the approved override path. Regression coverage passed without a database migration or generated-type change. Milestone 15 remains active pending acceptance retest.
### Live Acceptance Correction — Stale Registration Success Message

Product Owner retesting verified that Administrator registration, cancellation, retained history, and re-registration were correct, but a re-registered student card still showed the prior “Registration cancelled.” message. Two independent `useActionState` instances retained both results, and message selection always preferred the cancellation state.

The registration card now submits register and cancel intents through one server-action dispatcher and one action-state instance. The latest action therefore replaces the prior result: registration shows the current registration success, waitlisting keeps its specific success text, and cancellation shows “Registration cancelled.” Regression coverage verifies the shared state channel, all three messages, retained cancellation, and re-registration on the same historical row. No database, migration, authorization, readiness, capacity, waitlist, or generated-type change was made. Milestone 15 remains active pending acceptance retest.
### Live Acceptance Usability Correction — Custom Form Assignment Targets

Product Owner testing found that the published Custom Form assignment workflow exposed a raw Target ID field. Although the existing protected RPC correctly enforced assignment integrity, the UI did not provide a practical way to discover valid identifiers and surfaced database constraint text for an incomplete target.

The correction reuses authorized Event, active Student, active Household, and active Volunteer directory services to populate labeled selectors. The selected UUID remains an internal form value and is passed to the unchanged Custom Form assignment RPC. General Ministry is deliberately targetless. Server-side schema validation now prevents missing, malformed, or stale target combinations from reaching the database and returns a concise operator-facing message. Regression coverage verifies all five assignment modes, protected-list reuse, absence of direct table reads, and the existing Phase 1–6 behavior. No migration was created or applied, database types were not regenerated, and Milestone 15 remains active pending acceptance retest.
### Live Acceptance Information Architecture Correction — Visitors

Product Owner acceptance testing found that Visitor Follow-Up was nested in the Forms workspace. That placement reflected the milestone in which Visitor Cards were delivered, not the operational domain: visitors are people entering and being followed up by the ministry, while Forms is responsible for documents and structured information collection.

The existing Visitor Cards workspace is now reused at `/visitors`, with its review detail at `/visitors/[visitorCardId]`, and Visitors appears in primary navigation only through the existing `visitor_cards.manage` capability. The Forms page no longer loads Visitor data or renders the Visitor workspace. Creation, follow-up, duplicate review, linking, conversion evidence, retention, audit, RPC, RLS, and authorization behavior were unchanged. No database migration or generated-type update was required. Regression coverage confirms route protection, capability-gated navigation, established service/action reuse, removal from Forms, and absence of a duplicate implementation. Milestone 15 remains active pending acceptance retest.
### Live Acceptance Data-Integrity Correction — Duplicate Active Custom Form Assignments

Product Owner acceptance testing exposed two active assignments with the same published version, assignment type, and Event target. The original schema enforced target shape and retained archival evidence but had no active-row uniqueness rule; the assignment RPC therefore accepted identical rows.

Local, unapplied migration `202608230003_custom_form_assignment_active_uniqueness.sql` adds database-authoritative active uniqueness across version, assignment type, Event, Student, Household, and Volunteer target columns with `NULLS NOT DISTINCT`. The partial predicate excludes archived rows, so history remains intact and an archived assignment does not prevent a deliberate replacement. The RPC performs a friendly precheck and translates unique-index races; the server action also sanitizes duplicate-key failures to “This form is already assigned to that target.” Existing `custom_forms.manage` authorization is unchanged.

The migration contains a preflight guard and will not conceal the two known development duplicates. Before applying it, the manager must review those rows and archive the unwanted duplicate through `archive_custom_form_assignment`, retaining `archived_at`, `archived_by_profile_id`, and audit evidence. No hard deletion is planned. Read-only development inspection found duplicate Event assignment IDs `8f400e02-8188-49fc-bcdb-b9c07cc4fca0` (created first; retains draft submission `6d502e4e-fa9a-4a21-b58e-5a29210c2670`) and `0a185bab-3eab-441d-8c34-4e83f9a96c1d` (created later; no submissions). The safe cleanup recommendation is to preserve the first row and archive the later row through the existing manager action/RPC before applying the migration. Regression coverage verifies all five assignment types, database enforcement for null-target General Ministry assignments, retained archived history, replacement creation, friendly application messaging, and all existing Phase 1–6 behavior. Milestone 15 remains active pending review, cleanup, migration application, and acceptance retest.
### Parent Live Acceptance Blocker — Forms Respondent Route

Live acceptance using Gillian’s Parent account reached a 404 from the Forms navigation item even though the assigned Fall Retreat Event Custom Form and qualifying registration existed. Inspection confirmed that the established respondent model already grants Parents `custom_forms.submit`, projects only assignments authorized by family relationships and Event Registration, and supports protected draft/resume/submit workflows. No new Event-assignment semantics were needed.

The Forms navigation item had been modeled around manager-only `forms.documents.manage` with a role-array escape hatch, creating an inconsistent entry contract with the capability-aware Forms page. Navigation now keys directly to `custom_forms.submit`; the route explicitly combines approved document, Custom Forms management, and respondent access paths and renders each section only for its existing authorization flag. Parent access exposes relationship-scoped document submission and My Forms, never manager template/version/field/assignment controls, submission oversight, Medical Forms management, or Visitors. Direct manager routes remain protected. Regression coverage confirms Parent reachability, manager-control suppression, Administrator/Youth Pastor/Staff/Volunteer behavior, Event-target respondent resolution, existing draft/submission immutability, duplicate-assignment protection, and the separate Visitors workspace. No migration or type regeneration was required. Milestone 15 remains active pending acceptance retest.
### Second Parent Live Acceptance Failure — Exact 404 Runtime Path

Immediate Parent retesting disproved the earlier assumption that capability-aligned navigation alone corrected the 404. The Next development runtime showed `/permission-forms` rendering successfully and then compiling `/permission-forms/my/[assignmentId]`. In `MyCustomFormPage`, `openCustomForm(...).catch(() => null)` converted the underlying RPC error into `notFound()`.

The live Parent, Student relationship, registered Event, and active assignment all satisfied authorization. The actual failure was a Phase 5 uniqueness mismatch: `open_custom_form_assignment` identifies a respondent draft using `submitted_by_profile_id`, but `custom_form_submission_student_once_idx` omitted that column. An Administrator had already opened the Event assignment for Gillian, so the Parent’s otherwise-authorized draft insert collided with the Administrator-owned draft and raised a unique violation. This explains why `/permission-forms` and automated capability checks passed while the live assignment link returned 404.

Local migration `202608230004_custom_form_submission_respondent_uniqueness.sql` recreates Student/Event, Household, and Volunteer uniqueness indexes with `submitted_by_profile_id`, preserving one retained submission per assignment, subject, and authorized respondent. It neither rewrites nor deletes the Administrator draft. Regression coverage now reproduces the actual condition by opening an Event/Student draft as Administrator and then opening/submitting a separately attributed Parent draft; unauthorized assignment access, manager boundaries, immutable submissions, Visitor separation, and duplicate active-assignment protection remain intact. The migration has not been applied, types were not regenerated, and live acceptance remains pending.


### Technical Lead Architecture Decision - Shared Subject Submission

Technical Lead review determined that the first draft of local migration `202608230004` would have contradicted the original Custom Forms data model by allowing separate Administrator, Parent, and guardian submissions for the same assignment and Student. That respondent-owned proposal was rejected before application.

The approved Model B implementation preserves the original unique indexes: Student, Household, Volunteer, and Event assignments retain one authoritative submission per assignment and resolved subject, while General Ministry remains respondent-owned because it has no separate subject. Five RPCs were replaced together in the still-unapplied migration: `open_custom_form_assignment`, `list_my_custom_forms`, `save_custom_form_answer`, `submit_custom_form`, and `get_custom_form_submission`.

An eligible actor now reuses the authoritative subject draft regardless of who initiated it. Every operation revalidates current server-side authorization. `submitted_by_profile_id` remains the initiating actor; sanitized answer-save and submission audit events capture the actual acting profile without copying answers. Submitted content remains immutable, subsequent authorized opens return the same locked row, and General Ministry respondents continue receiving separate drafts.

The respondent detail route separately classifies concealed malformed/missing/denied access and sanitized temporary operational failures. No applied migration was changed, no migration was applied, no types were regenerated, and no commit was created. Automated verification passed. Live acceptance remains pending Technical Lead approval, migration application, and Gillian Parent-account retesting.


### Live Acceptance Defect - Choice Field Draft Resume

Live Parent testing of Fall Retreat 2026 passed shared-subject opening and text draft restoration but showed T-Shirt Size returning to Select after reopening. A read-only query of submission `6d502e4e-fa9a-4a21-b58e-5a29210c2670` proved that field `8a34cdda-2407-4d47-a10d-8bc2cafd29ce` retained `choice_value = "Adult M"`, exactly matching the immutable option list. Persistence, RPC projection, and choice representation were correct.

The respondent UI used uncontrolled choice inputs, and the save action invalidated `/permission-forms/my/{submissionId}` even though the real route is keyed by assignment ID. Choice inputs now use controlled state initialized from the returned single- or multiple-choice answer, explicit option values, and an answer-derived component key. The save form includes the assignment ID and revalidates the correct assignment route.

Regression coverage verifies initial save, database persistence, returned projection, selected rendering contract, draft update and reopen, invalid-option denial, required-choice enforcement, text and acknowledgment behavior, submitted immutability, Model B sharing, General Ministry isolation, and existing Phase 1-6 behavior. No migration was created or changed, no types were regenerated, live evidence was not modified, and no commit was created.

### August 31 — Full Platform Acceptance Reset Plan

Before beginning a clean full-platform acceptance cycle, the linked development
project was inspected without mutation. Project `txjwwxzlsltbwixrscfp` contains
exactly the three intended acceptance login accounts: Platform Administrator
`louisbuilds2026@gmail.com`, Parent `vandermolenlouis@gmail.com`, and Volunteer
`volunteer.test@example.com`. All three profiles are active with the expected
permanent roles. The Parent identity is linked to the retained Louis VanderMolen
Person row; the other two profiles currently have no Person link.

The operational inventory covers all public feature tables and four private
Storage buckets. The buckets currently contain no objects. The database does
contain acceptance/development records across Events, attendance and Check-In,
members/households, volunteers, schedules, Prayer & Care, resources,
communications, reporting, Custom Forms, Visitor Cards, and audit history.

`scripts/dev-reset-acceptance-preview.sql` provides read-only identity, table,
Storage, and foreign-key review. `scripts/dev-reset-acceptance-data.sql` proposes
an explicit child-before-parent reset. It preserves the three exact Auth/profile
accounts, their login-linked Person rows, schema and migration objects, private
bucket definitions, and the eight system Prayer & Care categories. It does not
use cascade truncation. Old audit events are included in the proposed reset so
the acceptance run begins with a clean evidence boundary, but only after a
backup is retained. Storage object deletion remains a separate trusted-API step.

For accidental-run protection, the checked-in reset transaction ends in
`ROLLBACK`. No reset SQL or Storage deletion was executed. The next step is
Technical Lead review of preserved identities, delete order, audit-retention
choice, backup procedure, and post-reset checks before explicitly authorizing a
one-time development execution. Milestone 15 remains active and Full Platform
Acceptance has not yet begun.

### September 7 — Full Platform Acceptance Parent Identity-Link Correction

Following the committed clean-baseline reset, an Administrator created the VanderMolen family and a new Louie VanderMolen responsible-adult Person using the existing Parent login email. The Parent account authenticated but could not see the family because its profile remained linked to the preserved Person. This confirmed that relationship authorization was functioning correctly and matching contact email was never an identity link.

The approved correction introduces local additive migration `202609070001_parent_account_person_linking.sql`. Active Platform Administrators and Youth Pastors can inspect verified Parent account candidates for an active responsible adult and deliberately link or relink one account. Staff, Parent, Volunteer, anonymous, inactive-actor, invalid-target, inactive-target, non-Parent, and non-responsible-adult paths fail closed. Email matching is advisory; shared-email counts and current Person/family associations support manager review. Relinking requires explicit confirmation and a bounded reason.

The protected transaction updates only `profiles.person_id` and appends sanitized `account.person_linked` or `account.person_relinked` evidence containing identifiers and reason, not names, email addresses, or family details. It does not merge or create People or memberships. The Family workspace exposes controls only to Administrator/Youth Pastor, and the unlinked Parent empty state directs the user to those roles. Check-in-pass entry is withheld when no family is accessible while server-side token authorization remains unchanged.

Isolated PostgreSQL regression coverage confirms role and active-state boundaries, verified Parent and responsible-adult requirements, ambiguity without automatic linking, explicit relink confirmation/reason, no duplicate domain records, audit evidence, and family access only after the correct link. Technical Lead subsequently approved and applied migration `202609070001` to development. Database types were regenerated with the compatibility footer preserved. Deployment did not change any live account-to-Person relationship, and no commit was created. Product Owner acceptance remains pending the deliberate manager UI relink and Parent-session retest.

### September 14 — Full Platform Acceptance Event Workspace Usability Correction

Full Platform Acceptance found that the Event detail page combined its summary, registration roster and settings, volunteer staffing, permission-slip controls, reminders, checklist, full edit form, and archive action into one long workspace. All functions existed, but the information architecture required excessive scrolling and did not provide a focused small-screen workflow.

The Event workspace was refactored locally into deep-linkable Overview, Registration, Volunteers, Forms, Planning, and Settings sections. Each request loads only the data needed by the selected section. Overview remains the default. A Draft manager now receives a prominent Publish event action near the Event heading; it posts the Event's existing validated values with published status through `updateEventAction`, so the protected `update_event` RPC, lifecycle validation, audit behavior, and authorization remain authoritative. Settings retains full editing and places Archive in a distinct destructive-action panel.

Section visibility preserves existing access: event managers receive operational management sections, permission managers and eligible Parents receive Forms, and unauthorized Parent or Volunteer accounts gain no management controls. Registration, capacity/waitlist behavior, volunteer eligibility, document readiness, and permission/medical policy were not changed. No migration was created and the live `Youth Fall Kickoff` Draft was not altered. Automated verification passed; Product Owner live acceptance remains pending, and Milestone 15 and Full Platform Acceptance remain active.
