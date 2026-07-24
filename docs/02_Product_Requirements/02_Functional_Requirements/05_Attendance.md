# Functional Requirements

# Attendance Management

**Document ID:** FR-ATTENDANCE

**Document Version:** 1.0

**Status:** Draft

**Milestone:** 0 – Foundation

---

# Document Metadata

| Property | Value |
|----------|-------|
| Owner | Product Owner |
| Related Requirements | FR-AUTH, FR-USER, FR-STUDENT, FR-HOUSEHOLD |
| Related Architecture | ARCH-001 (Core Domain Model) |
| Related Database | DB-ATTENDANCE *(Future)* |
| Related APIs | API-ATTENDANCE *(Future)* |
| Related Testing | TEST-ATTENDANCE *(Future)* |

---

# 1. Purpose

The Attendance Management module records and maintains participation in ministry activities.

Attendance is more than a record of presence—it provides insight into engagement, supports student safety, assists ministry planning, and supplies historical information for reporting.

---

# 2. Scope

This document includes:

- Attendance recording
- Attendance correction
- Attendance history
- Attendance reporting
- Attendance status
- Attendance notes
- Attendance audit history
- Attendance dashboard

Attendance does not include physical arrival or departure times. Those are managed by the Check-In / Check-Out module.

---

# 3. Business Objectives

The Attendance module shall:

- Record ministry participation.
- Provide accurate attendance history.
- Improve ministry planning.
- Support reporting.
- Assist with follow-up communication.
- Maintain historical records.

---

# 4. Attendance Lifecycle

Every attendance record progresses through one of the following states.

### Pending

Attendance has not yet been finalized.

---

### Present

Student attended the activity.

---

### Absent

Student did not attend.

---

### Excused

Student was unable to attend but should not be counted as an unexcused absence.

---

### Corrected

Attendance was modified after the event.

Original values remain available through the audit log.

---

# 5. Business Rules

## BR-ATTENDANCE-001

Each attendance record shall reference:

- Student
- Event
- Attendance Date

---

## BR-ATTENDANCE-002

Only authorized users may modify attendance.

---

## BR-ATTENDANCE-003

Attendance corrections shall be recorded in the audit log.

---

## BR-ATTENDANCE-004

Attendance records shall never be permanently deleted.

---

## BR-ATTENDANCE-005

Each student shall have at most one attendance record per event occurrence.

---

## BR-ATTENDANCE-006

Attendance history shall remain available even if the student or household becomes inactive or archived.

---

# 6. Functional Requirements

## FR-ATTENDANCE-001 — Record Attendance

Authorized users shall record attendance for a student.

---

## FR-ATTENDANCE-002 — Update Attendance

Authorized users may correct attendance.

All corrections shall be audited.

---

## FR-ATTENDANCE-003 — Attendance Notes

Attendance records may include optional notes.

Examples:

- Left early
- Arrived late
- Visitor
- Parent notified leader

---

## FR-ATTENDANCE-004 — Attendance History

Every student shall maintain attendance history.

---

## FR-ATTENDANCE-005 — Household Attendance

Household Workspace shall summarize attendance for all students within the household.

---

## FR-ATTENDANCE-006 — Event Attendance

Every event shall display attendance statistics.

Examples:

- Registered
- Present
- Absent
- Visitors

---

## FR-ATTENDANCE-007 — Attendance Search

Authorized users shall search attendance by:

- Student
- Household
- Event
- Date
- Status

---

## FR-ATTENDANCE-008 — Attendance Dashboard

The platform shall provide attendance summaries including:

- Weekly Attendance
- Monthly Attendance
- Year-to-Date Attendance
- Average Attendance
- New Visitors
- Returning Visitors

---

## FR-ATTENDANCE-009 — Attendance Timeline

Attendance shall appear in:

- Student Timeline
- Household Timeline
- Event Timeline

---

## FR-ATTENDANCE-010 — Attendance Reports

The platform shall support reports including:

- Event Attendance
- Student Attendance
- Household Attendance
- Attendance Trends
- Visitor Reports

---

# 7. Attendance Metrics

The platform should support calculations for:

- Attendance Percentage
- Consecutive Attendance
- Consecutive Absences
- First Visit
- Most Recent Visit
- Total Visits

These metrics support ministry follow-up but do not determine member status.

---

# 8. Validation Rules

Required:

- Student
- Event
- Attendance Date
- Attendance Status

Optional:

- Attendance Notes

---

# 9. Privacy Requirements

Attendance information shall only be accessible to authorized users.

Historical attendance shall be preserved for reporting and ministry purposes.

---

# 10. Error Handling

The system shall gracefully handle:

- Duplicate attendance entries
- Invalid event references
- Invalid student references
- Unauthorized modifications
- Invalid attendance status changes

---

# 11. Dependencies

This feature depends on:

- Authentication
- User Management
- Student Management
- Household Management
- Event Management
- Audit Logging

---

# 12. Acceptance Criteria

| ID | Requirement |
|----|-------------|
| AC-ATTENDANCE-001 | Attendance can be recorded. |
| AC-ATTENDANCE-002 | Attendance can be corrected. |
| AC-ATTENDANCE-003 | Attendance history is maintained. |
| AC-ATTENDANCE-004 | Attendance appears in Student, Household, and Event Workspaces. |
| AC-ATTENDANCE-005 | Attendance reports can be generated. |
| AC-ATTENDANCE-006 | Attendance modifications are audited. |

---

# 13. Future Considerations

Future versions may include:

- QR code attendance
- Self-service kiosk attendance
- NFC badge attendance
- Automated attendance trends
- Ministry engagement scoring
- Predictive follow-up recommendations

These enhancements are outside the approved Version 1 scope.

---

# Revision History

| Version | Date | Description |
|----------|------|-------------|
| 1.0 | Initial | Initial Attendance Management functional requirements. |