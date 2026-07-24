# Functional Requirements

# Event Management

**Document ID:** FR-EVENT

**Document Version:** 1.0

**Status:** Draft

**Milestone:** 0 – Foundation

---

# Document Metadata

| Property | Value |
|----------|-------|
| Owner | Product Owner |
| Related Requirements | FR-HOUSEHOLD, FR-STUDENT, FR-ATTENDANCE, FR-CHECKIN |
| Related Architecture | ARCH-001 (Core Domain Model) |
| Related Database | DB-EVENTS *(Future)* |
| Related APIs | API-EVENTS *(Future)* |
| Related Testing | TEST-EVENTS *(Future)* |

---

# 1. Purpose

The Event Management module provides the foundation for planning, organizing, and executing ministry activities.

Every ministry activity shall be managed as an Event, allowing attendance, check-in, registration, volunteer assignments, communications, and reporting to operate from a common workspace.

---

# 2. Scope

This document includes:

- Event creation
- Event scheduling
- Event lifecycle
- Event types
- Event locations
- Capacity management
- Volunteer assignments
- Event dashboard
- Event workspace
- Event timeline
- Event statistics

Registration, attendance, and permission forms are defined in their respective documents.

---

# 3. Business Objectives

The Event module shall:

- Centralize ministry planning.
- Improve volunteer coordination.
- Track participation.
- Support ministry reporting.
- Maintain historical records.
- Provide one workspace for each ministry activity.

---

# 4. Event Lifecycle

Events progress through the following states.

### Draft

Event is being prepared.

Not visible for registration.

---

### Published

Visible to authorized users and available for registration.

---

### Active

Event is currently taking place.

Attendance and Check-In are active.

---

### Completed

Event has concluded.

Statistics and reports remain available.

---

### Archived

Historical event retained for reporting.

No additional modifications except by authorized administrators.

---

# 5. Event Types

The platform shall support configurable event types.

Examples include:

- Weekly Youth Night
- Sunday School
- Bible Study
- Small Group
- Retreat
- Camp
- Mission Trip
- Lock-In
- Service Project
- Fellowship Event
- Parent Meeting
- Volunteer Training
- Special Event

Administrators may define additional event types.

---

# 6. Business Rules

## BR-EVENT-001

Every event shall have a unique identifier.

---

## BR-EVENT-002

Every event shall have a scheduled date and time.

---

## BR-EVENT-003

Events may optionally define:

- Registration window
- Capacity
- Waitlist
- Required permission forms

---

## BR-EVENT-004

Attendance and Check-In records shall reference an event.

---

## BR-EVENT-005

Completed events shall remain available for historical reporting.

---

## BR-EVENT-006

Events shall never be permanently deleted through the application.

---

# 7. Functional Requirements

## FR-EVENT-001 — Create Event

Authorized users shall create events.

Required information:

- Event Name
- Event Type
- Date
- Start Time
- End Time

---

## FR-EVENT-002 — Edit Event

Authorized users may update event information.

Significant changes shall be recorded in the audit log.

---

## FR-EVENT-003 — Event Location

Events may include:

- Campus
- Building
- Room
- Address
- Meeting Instructions

---

## FR-EVENT-004 — Capacity Management

Events may define:

- Maximum Capacity
- Registration Capacity
- Waitlist Capacity

---

## FR-EVENT-005 — Volunteer Assignments

Events shall support assigning volunteers to roles.

Examples:

- Check-In Volunteer
- Small Group Leader
- Teacher
- Security
- Hospitality
- Worship Leader
- Photographer (if approved by ministry policy)

Volunteer assignments shall not require storing or publishing photos of minors.

---

## FR-EVENT-006 — Event Workspace

Each event shall include a workspace containing:

- Overview
- Registrations
- Attendance
- Check-In Status
- Volunteer Assignments
- Required Permission Forms
- Communications
- Notes
- Timeline
- Statistics
- Quick Actions

---

## FR-EVENT-007 — Event Dashboard

The dashboard shall display:

- Total Registrations
- Capacity Remaining
- Attendance
- Visitors
- Volunteers Assigned
- Outstanding Forms
- Active Alerts

---

## FR-EVENT-008 — Event Timeline

Every event shall maintain a timeline of significant activity.

Examples:

- Event Created
- Registration Opened
- Volunteer Assigned
- Communication Sent
- Attendance Recorded
- Event Completed

---

## FR-EVENT-009 — Event Search

Authorized users shall search by:

- Event Name
- Event Type
- Date
- Campus
- Status

---

## FR-EVENT-010 — Event Statistics

Each event shall display:

- Registration Count
- Attendance Count
- Visitor Count
- Volunteer
```