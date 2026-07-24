# Security Controls and Authorization

**Document ID:** SEC-001
**Version:** v0.5.0
**Status:** Implemented
**Milestone:** 4 — Security
**Date:** 2026-07-23

---

## Purpose

This document defines the detailed Version 1 security controls for the Youth
Ministries Platform. It translates the approved defense-in-depth architecture
into an enforceable permission model for the core schema created in Milestone
3.

Milestone 4 secures only capabilities supported by the current schema and
application shell. Feature workflows, storage buckets, exports, attendance,
check-in, registrations, permission forms, communications, and reports remain
outside this milestone.

---

## Security Objectives

- Protect student and household information by default.
- Deny access unless an explicit role, relationship, or assignment permits it.
- Prevent self-assigned privilege and role escalation.
- Block suspended, disabled, archived, and not-yet-active accounts.
- Enforce authorization in the application and PostgreSQL independently.
- Preserve immutable audit records.
- Keep privileged credentials out of browser code.
- Test denied access as thoroughly as allowed access.

---

## Permanent Roles

Each account has exactly one permanent role.

| Database role | Display name | Security purpose |
|---|---|---|
| `platform_administrator` | Platform Administrator | Account, role, security, and full platform administration |
| `youth_pastor` | Youth Pastor | Full youth-ministry operational oversight |
| `staff_member` | Staff Member | Day-to-day youth-ministry operations |
| `volunteer` | Volunteer | Event-scoped service with minimum necessary access |
| `parent` | Parent or Guardian | Access through approved household and student relationships |

A person who requires both personal and administrative contexts uses separate
accounts. Temporary event service is represented by
`event_volunteer_assignments` and never changes the permanent role.

---

## Account Lifecycle

Only a profile whose status is `active` may use protected platform
capabilities.

| Status | Protected access |
|---|---|
| `invited` | Denied until account activation is complete |
| `active` | Evaluated against role, relationship, and resource rules |
| `suspended` | Denied |
| `disabled` | Denied |
| `archived` | Denied |

The application loads the database profile after verifying the Supabase Auth
session. A valid Auth session without one active application profile is not an
authorized platform session.

---

## Application Capabilities

Capabilities are stable authorization identifiers. Routes and services use
capabilities rather than comparing role strings directly.

| Capability | Platform Administrator | Youth Pastor | Staff Member | Volunteer | Parent |
|---|:---:|:---:|:---:|:---:|:---:|
| `dashboard.view` | Allow | Allow | Allow | Allow | Allow |
| `students.view` | Allow | Allow | Allow | Deny | Related only |
| `families.view` | Allow | Allow | Allow | Deny | Related only |
| `volunteers.view` | Allow | Allow | Allow | Own assignments | Deny |
| `events.view` | Allow | Allow | Allow | Assigned events | Published events |
| `attendance.manage` | Allow | Allow | Allow | Assigned workflow only | Deny |
| `check_in.manage` | Allow | Allow | Allow | Assigned workflow only | Deny |
| `permission_forms.manage` | Allow | Allow | Allow | Deny | Related submissions only |
| `communications.manage` | Allow | Allow | Allow | Deny | Deny |
| `reports.view` | Allow | Allow | Allow | Deny | Deny |
| `settings.manage` | Allow | Allow | Deny | Deny | Deny |
| `accounts.manage` | Allow | Deny | Deny | Deny | Deny |
| `audit.view` | Allow | Allow | Deny | Deny | Deny |

Entries referring to future feature records define the authorization boundary
for later milestones; they do not create those workflows in Milestone 4.

---

## Core Data Access Matrix

The database enforces the current core-schema subset of the capability model.

| Resource | Platform Administrator | Youth Pastor | Staff Member | Volunteer | Parent |
|---|---|---|---|---|---|
| Own profile | Read | Read | Read | Read | Read |
| Other profiles | Manage | Read | Read | Deny | Deny |
| People | Manage | Manage | Manage | Deny | Read own related people |
| Households | Manage | Manage | Manage | Deny | Read own households |
| Household memberships | Manage | Manage | Manage | Deny | Read own household memberships |
| Students | Manage | Manage | Manage | Deny | Read students with explicit view permission |
| Student relationships | Manage | Manage | Manage | Deny | Read relationships for permitted students |
| Events | Manage | Manage | Manage | Read assigned events | Read published or active events |
| Event assignments | Manage | Manage | Manage | Read own assignments | Read own assignments |
| Audit events | Read only | Read only | Deny | Deny | Deny |

`Manage` means database `select`, `insert`, `update`, and `delete` are available
to the role when a later approved service invokes them. Application workflows
must archive core ministry records instead of deleting them. Direct audit
updates and deletes remain unavailable to every application role.

---

## Relationship Rules

A parent account receives relationship-based access only when:

1. the profile is active;
2. the profile is linked to a `person`;
3. that person belongs to the requested household, or has an explicit student
   relationship; and
4. student access has `may_view_student_information = true`.

These rules do not allow directory-style browsing. A parent cannot see another
household merely by knowing its identifier.

Parent access to a student includes the student's core row and the related
person record. The current student row contains health and safety summaries.
That access is permitted only for the explicitly authorized relationship and
must be narrowed by later feature projections when operational screens are
implemented.

---

## Event Assignment Rules

A volunteer may read only:

- their own assignment records; and
- events referenced by assignments whose status is `assigned`, `confirmed`, or
  `completed`.

An assignment does not grant access to all students, households, or medical
information. Later event, attendance, and check-in milestones must add
resource-specific records and minimum-necessary projections before volunteers
receive operational student data.

Parents may read events whose status is `published` or `active`. Draft,
completed, and archived events are not exposed through the parent policy.

---

## Administrative Controls

- Only the Platform Administrator role may assign permanent roles or change
  account lifecycle status.
- Accounts cannot update their own role, lifecycle status, or linked person.
- No client-supplied registration value can assign a privileged role.
- Administrative account changes must use a later audited administrative
  service; Milestone 4 does not add a user-management screen.
- Platform Administrator and Youth Pastor accounts can read audit events but
  cannot modify or delete them.
- Database helper functions expose boolean authorization decisions only and
  are not data-bypass APIs.

---

## Authentication, Password, Session, and MFA Policy

- Supabase Auth remains the system of record for credentials.
- Passwords are never stored or validated in application tables.
- Registration and reset inputs are validated on the server.
- Authentication errors remain generic and do not disclose account existence.
- Provider-managed secure tokens and the existing server-side claims
  verification remain in use.
- Protected application access requires both a valid Auth session and an
  active application profile.
- Logout terminates the current provider session.
- Password complexity, lockout, email verification, and token lifetime use
  the configured Supabase Auth policy and must be reviewed before production.
- MFA remains outside the approved Version 1 scope. The architecture preserves
  the option to require it in a later approved milestone.
- Reauthentication for exports or highly sensitive administrative operations
  will be defined when those workflows exist.

---

## Data Classification

| Classification | Current examples | Minimum control |
|---|---|---|
| Public | Published event name and schedule | Explicit public-purpose rule; no student data |
| Internal | Event assignments and operational schedules | Active account plus role or assignment |
| Confidential | Names, contact details, household data, attendance context | Role or explicit relationship |
| Highly Confidential | Birth dates, medical, allergy, dietary, pickup, and permission data | Documented need, narrow projection, audit where required |

Student photographs, public student profiles, and production data in
development remain prohibited in Version 1.

---

## PII Display and Disclosure Rules

Personally identifiable information for accounts, households, and students
must be minimized in every interface and response.

### Student names

The default student label is:

```text
Preferred or first name + last-name first letter
```

Example:

```text
Jordan S.
```

Student lists, search suggestions, dashboard activity, attendance summaries,
volunteer views, routine notifications, and other general-purpose surfaces
must use this minimized label.

A full legal student name may appear only when an explicitly authorized
safety, identity-verification, legal, or administrative workflow requires it.
The service and UI for that workflow must document the need and limit the
audience. Full student names must not be placed in URLs, browser titles,
general logs, analytics, or broad communications.

The shared `formatMinimizedStudentName` formatter is the default application
implementation. Feature code must not create its own casual student-name
format.

### Account and household PII

- Account email addresses are displayed only to the account owner or an
  authorized account administrator.
- Household addresses, phone numbers, email addresses, and relationship
  details are returned only when the workflow and permission require them.
- Lists and search results request only the fields needed to identify the
  record safely.
- Contact details and household addresses are excluded from URLs, client-side
  telemetry, general application logs, and routine error messages.
- Volunteers receive task-specific projections rather than complete household
  or account records.
- Communications use the minimum recipient and student information required
  for delivery.

---

## Retention and Export Controls

No destructive retention automation or export feature is introduced in this
milestone.

- Core records follow archive-before-delete.
- Audit events are retained indefinitely until an approved legal and
  operational schedule supersedes this rule.
- Authentication retention follows the managed provider configuration.
- Future exports require an explicit capability, selected scope, audit event,
  protected generation, and limited download retention.
- Future file records require private storage and independent storage
  policies.

---

## Rate Limiting and Abuse Protection

Supabase Auth provider controls are the first boundary for login, registration,
and password recovery abuse. Before production, the Product Owner must verify
provider rate-limit and bot-protection settings.

Application-specific rate limits will be added when public forms, search,
messaging, uploads, exports, or webhooks exist. No arbitrary thresholds are
added before those traffic patterns and providers are known.

---

## Audit Policy

Audit records are append-only.

Current database controls:

- ordinary authenticated accounts cannot insert audit rows directly;
- Platform Administrators and Youth Pastors may read audit rows;
- no authenticated role may update or delete audit rows; and
- metadata must never contain credentials, tokens, full medical notes, or
  complete confidential request payloads.

Authentication-provider events and application audit-writing services remain
future implementation work because no secure server audit gateway or
administrative workflow exists in the current application.

---

## Threat Model

| Threat | Primary controls | Required verification |
|---|---|---|
| Self-assigned privilege | Least-privilege profile trigger; no self-update grant | Registration and profile-update denial |
| Inactive account access | Active-profile checks in app and RLS | Suspended/disabled account denial |
| Cross-household disclosure | Relationship-aware RLS | Related allow and unrelated deny |
| Volunteer overreach | Event-assignment policy only | Assigned-event allow and other-event deny |
| Identifier guessing | Resource-specific RLS | Known identifier still denied |
| Role-policy recursion or bypass | Private `security definer` decision helpers with fixed search path | Function privileges and policy execution |
| Audit tampering | No update/delete grants or policies | Update and delete denial |
| Secret exposure | Server-only configuration and bundle boundary | Source and build review |
| Client-only authorization | Server route checks plus RLS | Direct database denial |
| Sensitive error disclosure | Generic authentication and authorization failures | Runtime error review |

---

## Incident Response

For a suspected security incident:

1. Preserve relevant logs and audit evidence.
2. Disable affected application profiles.
3. Revoke affected Supabase Auth sessions.
4. Rotate compromised credentials.
5. Identify affected resources and users.
6. Contain access through configuration, policy, or deployment rollback.
7. Restore from a verified backup if integrity is affected.
8. Document timeline, decisions, impact, and corrective actions.
9. Notify ministry and church leadership according to approved policy.
10. Complete a post-incident security review before normal access resumes.

Production notification contacts and legal reporting procedures require church
leadership approval before launch.

---

## Administrative Access Review

Before production and at least quarterly thereafter, the Product Owner reviews:

- all Platform Administrator accounts;
- all Youth Pastor and Staff Member accounts;
- suspended, disabled, invited, and archived accounts;
- permanent-role changes;
- active event assignments that should have ended;
- service credentials and maintainer access; and
- unusual or denied audit activity.

The review outcome must be dated and retained with operational security
records.

---

## Security Test Standard

Milestone security verification must:

- execute migrations from a clean database;
- verify RLS is enabled and forced on every protected table;
- verify every expected policy and grant;
- test all five permanent roles;
- test active and inactive account states;
- test related and unrelated household/student access;
- test assigned and unassigned event access;
- test role-escalation denial;
- test audit update/delete denial;
- verify application capability mapping and protected-route behavior;
- run TypeScript, ESLint, and a production build; and
- include Product Owner acceptance testing against the connected development
  Supabase project.

All test identities and ministry records must be clearly synthetic.

---

## Deferred Security Work

The following controls require later feature or production-readiness
milestones and are not implemented here:

- storage buckets and object policies;
- audit-writing service and authentication-event ingestion;
- user-management screens and administrative invitation workflow;
- attendance and check-in projections for assigned volunteers;
- permission-form ownership and signature controls;
- communication, reporting, and export controls;
- production monitoring and alerting;
- backup restoration exercises;
- production provider configuration review; and
- church-approved incident contacts and legal retention schedule.

Deferral does not grant access. Every absent capability remains denied.

---

## Requirement Traceability

| Control | Source |
|---|---|
| Five permanent roles | FR-AUTH; FR-USER; Milestone 3 schema |
| One role per account | BR-AUTH-001; BR-USER-001; ADR-006 |
| Separate account contexts | ADR-006 |
| Active-account enforcement | BR-USER-003; ARCH-006 Account Lifecycle |
| Server and database authorization | ARCH-006; Implementation Blueprint |
| Relationship-aware parent access | Core Domain Model; ARCH-006 |
| Event-scoped volunteer access | ADR-006; ARCH-006 |
| Immutable audit records | BR-AUDIT-001; BR-AUDIT-002 |
| Privacy and data minimization | Project Charter; ARCH-006 |
| Student first-name and last-initial display | Product Owner decision, 2026-07-23 |
| Deny by default | ARCH-006; Milestone 3 database design |

---

## Revision History

| Version | Date | Description |
|---|---|---|
| v0.5.0 | 2026-07-23 | Defined and implemented the Milestone 4 security control model. |
