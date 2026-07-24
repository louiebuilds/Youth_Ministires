# Functional Requirements

# User Management

**Document ID:** FR-USER  
**Document Version:** 1.1
**Status:** Partially implemented
**Milestone:** 3 — Authentication & User Management

---

# Document Metadata

| Property | Value |
|----------|-------|
| Owner | Product Owner |
| Related Requirements | FR-AUTH |
| Related Architecture | ARCH-USER *(Future)* |
| Related Database | DB-USERS *(Future)* |
| Related APIs | API-USERS *(Future)* |
| Related Testing | Milestone 3 User Management Reconciliation Test Report |

---

# 1. Purpose

This document defines the functional requirements for managing user accounts within the Youth Ministries Platform.

User Management is responsible for the lifecycle of staff, volunteers, parents, and administrators who require authenticated access to the platform.

Student records are managed separately under **Student Management**.

---

# 2. Scope

This document includes:

- User account creation *(requires a future privileged identity-provider gateway)*
- User profile management
- User activation
- User deactivation
- Role assignment
- Account recovery
- Administrative account management

This document does not define authentication workflows, which are covered in **FR-AUTH**.

---

# 3. Business Objectives

The User Management module shall:

- Maintain accurate user records.
- Simplify account administration.
- Support role-based access.
- Protect user information.
- Maintain a complete audit history of account changes.

---

# 4. Supported User Types

The approved Version 1 role model supports:

- Platform Administrator
- Youth Pastor
- Staff Member
- Volunteer
- Parent

Student accounts are intentionally excluded from Version 1.

---

# 5. Business Rules

## BR-USER-001

Every user account shall be associated with exactly one primary role.

---

## BR-USER-002

Each email address shall be unique.

---

## BR-USER-003

Inactive users shall not be permitted to authenticate.

---

## BR-USER-004

User account changes shall be recorded for auditing.

---

## BR-USER-005

Only authorized administrative roles may create, edit, deactivate, or reactivate user accounts.

---

# 6. Functional Requirements

## FR-USER-001 — Create User

Authorized administrators shall be able to create new user accounts.

**Implementation note:** Deferred pending separate approval of a privileged
identity-provider gateway. The Milestone 3 reconciliation manages existing
accounts only.

---

## FR-USER-002 — Edit User

Authorized administrators shall be able to modify user profile information.

---

## FR-USER-003 — Deactivate User

Authorized administrators shall be able to deactivate user accounts without deleting historical records.

---

## FR-USER-004 — Reactivate User

Previously deactivated accounts may be restored by authorized administrators.

---

## FR-USER-005 — Assign Role

Authorized administrators shall assign an approved system role to each user.

---

## FR-USER-006 — Update Contact Information

Users may update their own contact information unless restricted by administrative policy.

---

## FR-USER-007 — Administrative Password Reset

Authorized administrators may initiate password reset procedures for users.

**Implementation note:** Deferred with the privileged identity-provider gateway.
Self-service forgot-password and authenticated password-change workflows are
implemented.

---

## FR-USER-008 — View User Profile

Authorized users shall be able to view profile information appropriate to their permissions.

---

## FR-USER-009 — Search Users

Authorized administrators shall be able to search and filter user accounts.

---

## FR-USER-010 — Audit History

The system shall maintain a history of significant account changes.

---

# 7. User Workflow

## Create User

1. Administrator selects **Create User**.
2. Required information is entered.
3. A role is assigned.
4. The account is created.
5. The user receives an invitation or password setup email.

---

## Edit User

1. Administrator opens a user profile.
2. Updates profile information.
3. Saves changes.
4. Changes are validated and recorded.

---

## Deactivate User

1. Administrator selects **Deactivate**.
2. Confirmation is displayed.
3. Account status changes to inactive.
4. Authentication access is revoked.
5. Historical data remains intact.

---

# 8. Validation Rules

- First name is required.
- Last name is required.
- Email address is required.
- Email address must be unique.
- Role is required.
- Account status must always be defined.

---

# 9. Error Handling

The system shall gracefully handle:

- Duplicate email addresses.
- Invalid role assignments.
- Missing required fields.
- Attempts to modify protected accounts.
- Unauthorized administrative actions.

---

# 10. Security Considerations

User Management shall support:

- Role-based authorization.
- Administrative audit logging.
- Secure handling of personal information.
- Least-privilege access.
- Protection against unauthorized account modification.

---

# 11. Dependencies

This feature depends on:

- Authentication
- Role Management
- Audit Logging
- Notification Services

---

# 12. Acceptance Criteria

| ID | Requirement |
|----|-------------|
| AC-USER-001 | Authorized administrators can create user accounts. |
| AC-USER-002 | User profiles can be updated. |
| AC-USER-003 | Duplicate email addresses are rejected. |
| AC-USER-004 | Accounts can be deactivated and reactivated. |
| AC-USER-005 | Role assignments are enforced. |
| AC-USER-006 | Administrative actions are auditable. |

The implemented Milestone 3 subset satisfies AC-USER-002, AC-USER-004,
AC-USER-005, and AC-USER-006 for existing accounts. AC-USER-001 and the
administrator-triggered recovery portion remain separately gated.

---

# 13. Future Considerations

Future versions may include:

- Multiple roles per user.
- Delegated administration.
- Organizational hierarchies.
- Bulk user import/export.
- User groups and teams.
- Integration with external identity providers.

These enhancements are outside the approved Version 1 scope.

---

# Revision History

| Version | Date | Description |
|----------|------|-------------|
| 1.1 | 2026-07-24 | Recorded the approved role model, implemented existing-account workflows, and privileged identity-provider deferrals. |
| 1.0 | Initial | Initial functional requirements for User Management. |
