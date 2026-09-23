# Prayer & Care

**Document ID:** FR-PRAYER-CARE
**Version:** 1.2
**Status:** Current-platform checkpoint passed; further features planned
**Milestone:** 12 — Prayer & Care
**Approved:** 2026-08-03
**Accepted:** 2026-08-04

## Purpose

Milestone 12 provides prayer-request coordination, confidential pastoral-care
notes, follow-up assignments, hospital-visit records, and answered-prayer
history. Because the feature may contain sensitive information about minors and
families, database authorization must be narrower than ordinary ministry data.

## Approved Access Model

### Public prayer summaries

- Every active signed-in account may view requests explicitly marked `public`.
- The public projection contains only the request identifier, title, category,
  status, and dates needed to display the prayer list.
- Person identity, request details, assignments, private notes, and audit data
  are never included in the public projection.
- Anonymous access remains denied.

### Leadership prayer requests

- Platform Administrators, Youth Pastors, and Staff Members may view requests
  marked `public` or `leadership`.
- Full request details are available only through an authorized server-side
  database workflow.
- Volunteers and parents cannot view leadership request details.

### Private prayer requests

- Platform Administrators and Youth Pastors may view every private request.
- A Staff Member may view a private request only when they submitted it or are
  its assigned caregiver.
- Volunteers and parents cannot view private request details.

### Care and confidential notes

- Platform Administrators and Youth Pastors may manage confidential care notes.
- A Staff Member may access a confidential note only when explicitly assigned.
- Volunteers and parents are denied.
- Note contents must never be copied into notifications, general
  communications, or audit metadata.

### Follow-ups and hospital visits

- Platform Administrators and Youth Pastors may manage all follow-ups.
- Staff Members may access and complete only follow-ups assigned to them.
- Hospital visits are recorded as confidential care activity and follow the
  same access rules as care notes.
- Volunteers and parents are denied follow-up and hospital-visit records.

## Security Requirements

- Direct table access remains revoked from anonymous and authenticated roles.
- Row-level security remains enabled and forced on every Prayer & Care table.
- All application access uses explicit security-definer workflows with fixed
  search paths and role, lifecycle, visibility, ownership, or assignment checks.
- Private audit helpers are not directly executable by application roles.
- Audit metadata may identify the record and action but may not copy prayer or
  care content.
- Archived records remain retained and unavailable to ordinary active lists.
- Development and acceptance testing use synthetic data only.

## Milestone Boundary

- General documents and media remain Milestone 13.
- Scheduling remains Milestone 14.
- Custom forms remain Milestone 15.
- Analytics remain Milestone 16.
- AI analysis or recommendations remain Milestone 18.
- Milestone 13 must not begin during this work.

## Acceptance Criteria

- Active parents and volunteers can read only sanitized public prayer summaries.
- Staff can read leadership requests and only their own submitted or assigned
  private requests.
- Staff cannot browse another caregiver's confidential notes or follow-ups.
- Platform Administrators and Youth Pastors can perform approved oversight.
- Platform Administrators and Youth Pastors can edit the Person, Category,
  Visibility, Title, and Details of an active prayer request without replacing
  its identifier; answering remains a separate lifecycle action.
- Anonymous, inactive, suspended, disabled, and archived accounts are denied.
- Direct-table and audit-helper access is denied.
- Automated synthetic tests and separate administrator/family acceptance pass.

## Full Platform Acceptance Gap — Active Request Editing

Full Platform Acceptance found that the manager workspace could create, answer,
and archive prayer requests but could not correct an active request. The
approved correction adds an intentional **Edit request** workflow for the five
editable fields while preserving the prayer-request identifier. The form stays
hidden until opened from **Manage request**, and Cancel returns to the normal
request card.

The workflow retains the existing Platform Administrator and Youth Pastor
management boundary. Staff Members, Volunteers, Parents, anonymous users, and
inactive accounts gain no edit access. Each successful edit records the request
identifier, resulting visibility, and names of the changed-capable fields in
audit metadata; titles, details, person values, and category values are not
copied into the audit event. The edit workflow passed live Product Owner
retesting in September 2026.

## Planned Follow-up Requirements

The September current-platform checkpoint identified additional product work.
These requirements are approved planning direction, not current behavior:

- Parents may eventually submit prayer requests and family-scoped updates
  without receiving manager access. Leadership must moderate lifecycle and any
  public or answered summary.
- Active confidential care records need an authorized edit workflow for Person,
  Category, Title, occurred time, and confidential note while retaining record
  identity and sanitized auditing.
- Active follow-ups need authorized editing for Person, caregiver, Title,
  Priority, due time, and confidential instructions.
- Follow-up cards should lead with their Title. Authorized retained history
  should expose applicable completion notes, cancellation reasons, lifecycle
  timestamps, and appropriate actor attribution.
- Authorized caregivers should be able to link a follow-up to its originating
  care record without copying confidential narrative into ordinary task or
  audit metadata.
- Caregiver eligibility must derive from current active Prayer & Care authority,
  not a broad account list.

The current Parent sanitized-summary boundary remains authoritative until a
separately approved family participation workflow is implemented.

## September 2026 Checkpoint Status

The Prayer & Care current-platform acceptance checkpoint passed with the
follow-up enhancements above documented. This is not final production
acceptance. Comprehensive acceptance will be repeated after the remaining
platform features and workflow improvements are complete.
