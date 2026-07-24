# Functional Requirements

# Check-In / Check-Out

**Document ID:** FR-CHECKIN

**Document Version:** 1.0

**Status:** Draft

**Milestone:** 0 – Foundation

---

# Document Metadata

| Property | Value |
|----------|-------|
| Owner | Product Owner |
| Related Requirements | FR-AUTH, FR-USER, FR-STUDENT, FR-HOUSEHOLD, FR-ATTENDANCE |
| Related Architecture | ARCH-001 (Core Domain Model) |
| Related Database | DB-CHECKIN *(Future)* |
| Related APIs | API-CHECKIN *(Future)* |
| Related Testing | TEST-CHECKIN *(Future)* |

---

# 1. Purpose

The Check-In / Check-Out module manages the safe transfer of responsibility for students during ministry activities.

The module is designed to provide a fast, reliable, and auditable process for volunteers while ensuring parents have confidence that their children are being cared for appropriately.

Unlike Attendance Management, which records participation in an activity, Check-In / Check-Out records when a student enters and leaves the care of the ministry.

---

# 2. Scope

This document includes:

- Student Check-In
- Student Check-Out
- Volunteer Check-In Dashboard
- Household Search
- Visitor Check-In
- Authorized Pickups
- Medical Alerts
- Safety Alerts
- Pickup Verification
- Audit History

This document does not define Attendance Management, which is documented separately.

---

# 3. Business Objectives

The Check-In / Check-Out module shall:

- Protect student safety.
- Provide a fast volunteer workflow.
- Reduce check-in time.
- Verify authorized pickups.
- Record custody transfer.
- Support emergency accountability.
- Maintain complete audit history.

---

# 4. Check-In Lifecycle

Each check-in record progresses through one of the following states.

### Expected

The student is registered but has not arrived.

---

### Checked In

The student is currently under ministry supervision.

---

### Checked Out

The student has been released to an authorized individual.

---

### Exception

A manual override or special circumstance occurred.

Examples include:

- Emergency release
- Leader-approved alternate pickup
- Parent verification issue

All exceptions require audit logging.

---

# 5. Business Rules

## BR-CHECKIN-001

Each check-in record shall reference:

- Student
- Household
- Event
- Date
- Time

---

## BR-CHECKIN-002

Only authorized volunteers or staff may check students in or out.

---

## BR-CHECKIN-003

Students may only be released to authorized pickup contacts unless an approved override is recorded.

---

## BR-CHECKIN-004

Every check-in and check-out action shall be recorded in the audit log.

---

## BR-CHECKIN-005

Check-in records shall never be permanently deleted.

---

## BR-CHECKIN-006

Medical and safety alerts shall be displayed before completing check-in.

---

## BR-CHECKIN-007

A standard student check-in should require no more than three user interactions.

---

# 6. Functional Requirements

## FR-CHECKIN-001 — Household Search

Authorized volunteers shall search by:

- Student Name
- Household Name
- Parent Name

Search results should display the household as the primary result.

---

## FR-CHECKIN-002 — Household Overview

Selecting a household shall display:

- Responsible Adults
- Students
- Authorized Pickups
- Medical Alerts
- Outstanding Forms
- Today's Event Registration
- Household Status

---

## FR-CHECKIN-003 — Student Check-In

Authorized volunteers shall check in one or more students from the household.

The system shall record:

- Date
- Time
- Event
- Volunteer
- Check-In Status

---

## FR-CHECKIN-004 — Medical Alerts

Medical alerts shall be displayed prominently before check-in is completed.

Examples:

- Food allergies
- Medication requirements
- Emergency medical conditions

Medical alerts shall remain visible while the student is checked in.

---

## FR-CHECKIN-005 — Safety Alerts

The system shall display safety-related alerts such as:

- Custody restrictions
- Pickup restrictions
- Missing emergency contact
- Missing required forms

---

## FR-CHECKIN-006 — Visitor Check-In

The platform shall support first-time visitors by allowing temporary household and student records to be created during check-in.

Visitor records may be converted into permanent records later.

---

## FR-CHECKIN-007 — Student Check-Out

Authorized volunteers shall record:

- Time
- Authorized Pickup Person
- Volunteer Completing Release

---

## FR-CHECKIN-008 — Pickup Verification

Before check-out, the system shall verify that the selected individual is authorized to pick up the student.

If verification fails, the system shall prevent check-out unless an authorized override is completed.

---

## FR-CHECKIN-009 — Exception Handling

Authorized leaders may perform an override when necessary.

Overrides shall require:

- Reason
- Leader Identity
- Timestamp

---

## FR-CHECKIN-010 — Check-In Dashboard

The dashboard shall display:

- Students Expected
- Students Checked In
- Students Checked Out
- Visitors
- Medical Alerts
- Pickup Exceptions
- Outstanding Forms
- Emergency Alerts

---

## FR-CHECKIN-011 — Emergency Roster

At any time, authorized leaders shall be able to generate a live roster of all students currently checked in.

The roster shall include:

- Student
- Household
- Check-In Time
- Medical Alert Indicator
- Emergency Contact Information

---

## FR-CHECKIN-012 — Audit History

The platform shall maintain a complete history of all check-in and check-out activities.

---

# 7. Volunteer Workflow

A standard workflow should be:

1. Search for Household.
2. Select Household.
3. Review Alerts.
4. Check In Student(s).
5. Confirm.

The workflow should be optimized for speed while ensuring required safety checks are completed.

---

# 8. Validation Rules

Required:

- Student
- Event
- Check-In Time
- Volunteer Identity

Required for Check-Out:

- Authorized Pickup
- Check-Out Time

---

# 9. Privacy & Security Requirements

The system shall:

- Restrict access based on user roles.
- Protect student information.
- Display sensitive information only to authorized users.
- Record all overrides and exceptions.
- Prevent unauthorized releases.

---

# 10. Error Handling

The system shall gracefully handle:

- Duplicate check-ins
- Duplicate check-outs
- Unauthorized pickup attempts
- Missing household information
- Invalid event assignments
- Offline synchronization failures (future enhancement)

---

# 11. Dependencies

This feature depends on:

- Authentication
- User Management
- Student Management
- Household Management
- Attendance Management
- Event Management
- Audit Logging

---

# 12. Acceptance Criteria

| ID | Requirement |
|----|-------------|
| AC-CHECKIN-001 | Students can be checked in. |
| AC-CHECKIN-002 | Students can be checked out. |
| AC-CHECKIN-003 | Authorized pickups are verified. |
| AC-CHECKIN-004 | Medical alerts are displayed. |
| AC-CHECKIN-005 | Visitor check-in is supported. |
| AC-CHECKIN-006 | Emergency roster is available. |
| AC-CHECKIN-007 | Audit history is maintained. |
| AC-CHECKIN-008 | Standard check-in requires no more than three interactions. |

---

# 13. Future Considerations

Future versions may include:

- QR code family check-in
- Self-service kiosk mode
- Mobile volunteer check-in
- Temporary printed or digital name badges
- SMS "Your child has been checked in" notifications
- Barcode or NFC pickup verification
- Offline mode with automatic synchronization

These enhancements are outside the approved Version 1 scope.

---

# Revision History

| Version | Date | Description |
|----------|------|-------------|
| 1.0 | Initial | Initial Check-In / Check-Out functional requirements. |