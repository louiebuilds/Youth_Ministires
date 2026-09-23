# Project Journal

## Milestone 12 — Prayer & Care

**Date:** August 4, 2026

**Version:** v0.13.0

## Objective

Deliver secure prayer-request coordination and tightly restricted pastoral-care
workflows without exposing confidential information to families, volunteers,
or unauthorized staff.

## Features Completed

- Sanitized public prayer summaries
- Leadership and private prayer-request visibility
- Prayer creation, answered state, archival, and retained answer history
- Confidential care notes and hospital-visit records
- Caregiver assignment and scoped staff access
- Follow-up creation, completion, cancellation, and read-only history
- Confidential-note archival
- Proper first-and-last-name display for linked volunteer accounts
- FUMC Youth Ministries login branding

## Security and Privacy

Direct table access remains blocked. Fixed-search-path protected functions
enforce active-account, role, submitter, and assignment rules. Confidential
content is excluded from public summaries, general notifications, and audit
metadata. Development and acceptance used synthetic data only.

## Verification

All database and authorization verification scripts through Milestone 12
passed. ESLint, TypeScript, and the production build passed. The Product Owner
completed administrator and family-account acceptance and approved the
milestone on 2026-08-04.

## Future Proposal

A moderated ministry community for parents and youth was requested for future
planning. It was not implemented. Before approval it requires decisions for
student-account scope, parental consent, safeguarding, moderation, reporting,
retention, and emergency escalation.

## Milestone Status

**Complete. Milestone 13 has not started.**

## Full Platform Acceptance UX Correction — September 21, 2026

Full Platform Acceptance identified a usability defect in the original Prayer
Center: multiple large creation forms, confidential records, follow-up work,
history, and lifecycle controls all appeared on one long page before leaders
could see what required attention.

The application-only correction introduces a responsive, deep-linkable
workspace with Overview, Prayer Requests, Care & Visits, Follow-ups, and
Archived sections. Manager creation forms are absent by default and open only
through mutually exclusive New prayer request, New care note, and New follow-up
panels. Cancel returns to the clean section. Lifecycle operations and
confidential bodies are intentionally revealed rather than permanently open.

Overview contains only safe operational counts, due/overdue and priority
signals, current-user assignment counts, and a care-activity count/date. Prayer
details, care-note bodies, follow-up instructions, completion notes, and
cancellation reasons remain excluded. Hospital visits continue using the
existing confidential care-note model and Hospital category.

The retrieval layer now distinguishes valid empty results from protected-RPC
failures for workspace lists and creation pickers. Users receive a generic safe
retry message; server diagnostics contain only operation name, safe code, and a
sanitized category. Existing RLS, direct-table denial, protected RPCs,
visibility rules, role boundaries, archival retention, and sanitized audit
metadata remain unchanged. No migration was required.

The existing Volunteer access discrepancy remains a separate Product Owner
decision: the database public-summary workflow can safely serve active
authenticated accounts, while the application does not currently grant
Volunteers `prayer_care.view`. This correction did not broaden that boundary.

Automated Prayer & Care verification, lint, TypeScript, production build, and
diff validation passed. Prayer & Care is not yet accepted under Full Platform
Acceptance; Product Owner live testing of the revised workspace is required.

## Live Acceptance Correction — Visibility Submission

The first workspace acceptance pass found that **Prayer for a Good School
Week** was created as `leadership` even though the browser visibly showed
**Public signed-in summary**. The database row and sanitized creation audit
confirmed that `leadership` reached the protected RPC, while schema, action,
service, RPC insertion, and manager projection mappings were all direct and
correct. The failure was therefore a client form-state/submission defect.

The creation form now controls Visibility explicitly, beginning at
`leadership`, binding the select to that state, and updating the same state on
selection so the visible choice and submitted FormData cannot diverge. Manager
cards translate the stored projection value into the human-readable Public
signed-in summary, Ministry leadership, or Private oversight label. Parent
sanitized-summary contents and filtering are unchanged.

The original acceptance request was not modified and remains `leadership` as
useful lifecycle evidence. No migration, database, authorization, RLS,
capability, server contract, or live-data change was made. Prayer & Care remains
pending Product Owner live acceptance with a new public-request retest.

## Full Platform Acceptance Functional Gap — Edit Prayer Request

Live acceptance then confirmed that **Manage request** exposed only the
answered-prayer lifecycle action. Managers could not correct Person, Category,
Visibility, Title, or Details on an active request without recreating it.

The workspace now provides an intentional **Edit request** action inside
**Manage request**. Its form is hidden until opened, Cancel returns to the
normal card, and **Mark answered** remains a separate action. Successful edits
preserve the existing prayer-request identifier.

Forward migration `202609220001_edit_prayer_request_workflow.sql` replaces the
original five-argument protected update RPC with the approved six-argument
contract that includes Person. A new migration is required because the earlier
migration is already part of project history and must remain immutable. The
replacement retains manager-only active-account authorization, fixed search
path, row-security handling, active-request validation, and authenticated-only
execution. Audit metadata records only the request identifier, resulting
visibility, and field names; confidential values are excluded.

Automated coverage includes edit authorization, inactive and anonymous denial,
field validation and persistence, all Visibility values, identifier retention,
active-only editing, sanitized audit behavior, and lifecycle regression. No
existing acceptance request or live data was changed. Implementation is
complete. The Product Owner subsequently passed the live retest documented in
the checkpoint below.

## Current-Platform Acceptance Checkpoint — September 22, 2026

**Status:** COMPLETED / PASSED WITH DOCUMENTED FOLLOW-UP ENHANCEMENTS

This checkpoint validates the current Prayer & Care implementation before the
project returns to feature development. It is not final production acceptance;
Prayer & Care and the complete platform will be retested after the remaining
feature set and approved workflow improvements are complete.

### Prayer Requests

Live acceptance passed the focused workspace navigation, intentional creation
panels, all three visibility choices, readable stored-visibility labels, active
request editing, answered lifecycle, archival, and retained read-only history.
Migration `202609220001_edit_prayer_request_workflow.sql` was manually applied
to development and recorded with `npx supabase migration repair --status
applied 202609220001`; the applied migration is immutable.

The existing Katie **Prayer for Encouragement** request was changed from
Ministry leadership to Public signed-in summary through the protected edit
workflow. Refresh confirmed the stored public label. It was then marked
answered with the synthetic answer summary “Katie had a positive and
encouraging week at school.” and archived. The archived record retained its
Person association, visibility, original details, and answer summary without a
restore workflow.

The Parent account saw only the sanitized public summary. It did not receive
Katie’s identity, request details, assignments, confidential care information,
or management controls. **Prayer for a Good School Week** remained leadership
only and did not appear. A direct `?section=care` URL remained confined to the
sanitized Prayer List.

The earlier visibility defect—Public appearing selected while Leadership was
submitted—was corrected with controlled React state. The retained leadership
request remains useful authorization-boundary evidence.

### Care & Visits

Using synthetic data, the Product Owner created **Hospital Visit Follow-up** for
Gillian under the Hospital category with an occurred time of September 22,
2026 at 8:00 AM. The operational card hid its confidential narrative until
**View confidential note** was intentionally opened. Management remained in a
separate collapsed panel. Archive removed the record from the active list while
retaining it in Archived with its confidential body protected behind **View
retained confidential note**.

### Follow-ups

The Product Owner created a normal-priority Gillian follow-up assigned to Admin
and due September 25, 2026 at 6:00 PM. The active record showed correct Person,
assignee, priority, pending status, and due time. Confidential instructions
remained hidden until deliberately opened. Complete and Cancel remained
separate actions; completion accepted the synthetic completion note and moved
the item to retained completed/cancelled history with status `completed`.

### Acceptance-Data Reconciliation

The duplicate Louie acceptance identity was reconciled without rewriting
historical audit evidence. Canonical Person
`591cba95-a32d-4ca4-a7ac-d9b422a6db60` remains active and owns one household
membership, two student relationships, and Parent profile
`6e9f7c76-0849-467b-b6cd-a67dc7d6dffb`. Duplicate Person
`75b2a220-170a-485b-ab01-049a18b38966` is archived with no active household,
student, or profile relationships. Prayer & Care now lists one active Louie.

### Follow-up Enhancements Discovered

These items were documented but not implemented at this checkpoint:

- A family-scoped, moderated Parent prayer-submission and update workflow
- Editing for active confidential care records
- Editing for active follow-ups
- Display the follow-up title as the card heading
- Show protected completion/cancellation notes, timestamps, and appropriate
  actor history in retained lifecycle records
- Create or link a follow-up from a care record without copying confidential
  narrative into ordinary metadata
- Confirm eligible caregiver derivation from active Prayer & Care authority
- Add a deliberate existing-Person path to Family creation; never merge solely
  by email

### Product Strategy Decision

The Product Owner ended the broader current-platform acceptance campaign after
this checkpoint. The team will return to feature development, complete the
remaining platform scope and approved UX/workflow improvements, prepare clean
synthetic acceptance data, rerun comprehensive final platform acceptance, and
then proceed to Production Readiness. Earlier acceptance remains useful
evidence but is not a substitute for the final rerun.
