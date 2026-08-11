# Scheduling

**Document ID:** FR-SCHEDULING  
**Version:** 1.0  
**Status:** Complete  
**Milestone:** 14 — Scheduling  
**Date:** 2026-08-09

## Purpose

Milestone 14 provides centralized ministry scheduling for volunteers,
classrooms, recurring rotations, availability, and calendar-based schedule
coordination.

Scheduling builds on the volunteer, event, and availability capabilities
already implemented in earlier milestones.

Milestone 14 must extend those existing systems rather than create duplicate
volunteer, event, or availability records.

---

## Objectives

The Scheduling feature will allow authorized ministry leaders to:

- Build volunteer schedules
- Assign volunteers to ministry responsibilities
- Assign classrooms or ministry locations
- Create recurring volunteer rotations
- Use existing volunteer availability when scheduling
- Identify scheduling conflicts
- Publish schedules
- Allow volunteers to view their assigned schedule
- Provide calendar-oriented schedule views
- Maintain an auditable history of scheduling changes

---

## Existing Platform Integration

Milestone 14 builds on existing platform capabilities.

### Volunteer Management

Existing volunteer profiles, skills, availability, and volunteer assignments
remain authoritative.

Scheduling must reuse those records rather than introduce a second volunteer
profile or availability system.

### Events

Existing ministry events remain authoritative.

A schedule may reference an existing event when appropriate.

Milestone 14 must not create a competing event-management system.

### Communications

Existing Communication Center functionality remains responsible for ministry
communications.

Milestone 14 may create scheduling-related in-app information or workflow
events, but expansion into automated email/SMS scheduling notifications
requires separately approved communication integration.

### Audit Logging

Scheduling actions must use the existing platform audit architecture.

---

# Access Model

## Platform Administrator

May:

- View all schedules
- Create schedules
- Edit schedules
- Publish schedules
- Cancel schedules
- Manage recurring rotations
- Assign volunteers
- Assign classrooms or locations
- Resolve scheduling conflicts
- View scheduling history

## Youth Pastor

May:

- View all schedules
- Create schedules
- Edit schedules
- Publish schedules
- Cancel schedules
- Manage recurring rotations
- Assign volunteers
- Assign classrooms or locations
- Resolve scheduling conflicts
- View scheduling history

## Staff Member

May manage ministry scheduling according to the approved ministry-management
permissions.

Staff scheduling access must remain authorization-controlled and must not rely
only on hidden UI controls.

## Volunteer

May:

- View their own published assignments
- View relevant schedule details required to perform their assignment
- View their existing availability
- Respond to assignments when an assignment-response workflow is available
  through the existing volunteer-management model

Volunteers may not:

- Manage another volunteer's schedule
- Create ministry-wide schedules
- Publish schedules
- Manage rotations
- Assign classrooms
- Override scheduling conflicts

## Parent / Guardian

Parents or guardians do not receive general volunteer scheduling management
access.

Family-facing event information remains part of the existing Events
experience.

---

# Schedule Lifecycle

A ministry schedule supports the following lifecycle states:

- Draft
- Published
- Cancelled
- Completed

## Draft

Draft schedules are visible only to authorized scheduling managers.

Volunteers must not see draft assignments as confirmed responsibilities.

## Published

Published schedules become visible to the volunteers assigned to them.

## Cancelled

Cancelled schedules are retained for history and audit purposes.

Cancellation must not delete the historical schedule record.

## Completed

Past schedules may be marked completed or become operationally complete
according to the approved scheduling workflow.

Completed schedules remain available to authorized ministry managers for
history.

---

# Volunteer Scheduler

Authorized managers can create a ministry schedule for a defined date or
date/time period.

A schedule may include:

- Schedule name
- Date
- Start time
- End time
- Ministry context
- Optional existing event
- Classroom or location assignments
- Volunteer assignments
- Assignment role or responsibility
- Schedule notes
- Lifecycle status

The scheduler should provide a clear view of:

- Assigned volunteers
- Unfilled positions
- Volunteer availability
- Conflicts
- Classroom/location assignments

---

# Volunteer Assignments

Authorized managers may assign eligible volunteers to schedule positions.

An assignment includes:

- Volunteer
- Schedule
- Responsibility or role
- Optional classroom/location
- Start time
- End time
- Assignment status

Scheduling must reuse existing volunteer records.

The platform must prevent unauthorized users from assigning volunteers.

---

# Classroom and Location Assignments

Schedules may include classrooms or other ministry locations.

Examples include:

- Youth classroom
- Small-group room
- Check-in station
- Fellowship space
- Worship area
- Event location

A classroom/location assignment may include:

- Location name
- Schedule
- Assigned volunteer or volunteers
- Ministry responsibility
- Start time
- End time

Milestone 14 does not require a full facilities-management or room-reservation
system.

Locations are scheduling references for ministry operations.

---

# Recurring Rotations

Authorized managers may create recurring volunteer rotations.

Examples include:

- Every Sunday
- Every other Sunday
- First Sunday of each month
- Weekly ministry night
- Defined recurring ministry pattern

A rotation includes:

- Rotation name
- Recurrence pattern
- Start date
- Optional end date
- Assigned volunteers
- Responsibilities
- Optional classroom/location
- Rotation status

Rotations must generate or coordinate schedule assignments without destroying
the underlying rotation definition.

Changes to one generated assignment must not silently rewrite historical
assignments.

---

# Rotation Changes

Authorized managers must be able to:

- Pause a rotation
- Resume a rotation
- End a rotation
- Modify future rotation behavior
- Replace a volunteer for a future occurrence

Historical schedule assignments must remain intact.

Changes to a recurring rotation apply prospectively unless an authorized
workflow explicitly changes a future generated assignment.

---

# Availability Integration

Milestone 14 must use the existing volunteer availability system.

The scheduler should identify when a proposed assignment conflicts with known
volunteer availability.

Availability information may include existing recurring availability and other
approved volunteer availability records.

The scheduling system must not create a second independent availability model.

---

# Scheduling Conflicts

The system should identify scheduling conflicts before publication.

Potential conflicts include:

- Volunteer marked unavailable
- Volunteer assigned to overlapping responsibilities
- Volunteer assigned to multiple locations at the same time
- Assignment outside the applicable schedule time
- Duplicate volunteer assignment

A conflict should be visible to authorized managers.

Where an override is permitted, the override must be intentional and auditable.

The system must not silently ignore known conflicts.

---

# Unfilled Positions

Schedules may contain required positions that have not yet been assigned.

Examples:

- Small-group leader
- Check-in volunteer
- Classroom assistant
- Event support
- Setup volunteer

Authorized managers should be able to identify unfilled positions before a
schedule is published.

Whether publication with unfilled positions is allowed must be an explicit
manager decision.

---

# Volunteer Schedule View

Volunteers receive a simplified view of their own published schedule.

The volunteer view should show:

- Date
- Time
- Assignment
- Ministry responsibility
- Classroom/location
- Related event when applicable
- Relevant non-confidential notes
- Assignment status

Volunteers must not receive access to confidential information about other
volunteers or ministry participants.

---

# Calendar View

Milestone 14 includes an internal calendar-oriented scheduling view.

Authorized users should be able to view scheduling information by date.

Calendar views may include:

- Day
- Week
- Month

The calendar should distinguish relevant schedule assignments without exposing
unauthorized information.

---

# Calendar Integration

Milestone 14 establishes calendar integration for ministry schedules.

The initial implementation should prioritize safe internal calendar
coordination.

External calendar integration must not expose confidential ministry
information.

If external calendar export or synchronization is implemented, only approved
non-confidential schedule information may be included.

Credentials, private calendar tokens, and privileged integration secrets must
never be exposed to the client.

---

# Search and Filtering

Authorized managers should be able to filter scheduling information by:

- Date or date range
- Volunteer
- Schedule
- Ministry context
- Classroom/location
- Assignment status
- Schedule lifecycle

Volunteers receive only filters applicable to their own authorized schedule
information.

---

# Audit Requirements

Significant scheduling actions must be audited.

Examples include:

- Schedule creation
- Schedule modification
- Schedule publication
- Schedule cancellation
- Volunteer assignment
- Volunteer reassignment
- Assignment removal
- Rotation creation
- Rotation modification
- Rotation pause/resume
- Conflict override

Audit records must not copy unnecessary confidential information.

---

# Security Requirements

Scheduling authorization must be enforced server-side.

UI visibility alone is not an authorization control.

The implementation must enforce:

- Active-account checks
- Role/capability checks
- Manager versus volunteer boundaries
- Volunteer self-access boundaries
- Schedule lifecycle visibility
- Rotation-management authorization
- Assignment-management authorization
- Direct table-access restrictions where required by platform architecture

Volunteers must not be able to modify another volunteer's schedule.

Parents must not gain scheduling-management access.

Anonymous users receive no Scheduling access.

---

# Privacy and Safeguarding

Scheduling should contain only the information necessary for ministry
operations.

Scheduling must not expose:

- Student medical information
- Confidential prayer/care information
- Background-check details
- Private family information
- Credentials
- Sensitive volunteer records unrelated to the assignment

Development and acceptance testing must use synthetic data.

---

# Milestone Boundary

Milestone 14 includes:

- Volunteer scheduler
- Classroom/location assignments
- Recurring rotations
- Existing availability integration
- Scheduling conflict detection
- Volunteer schedule view
- Internal calendar-oriented schedule views
- Approved calendar integration foundation

Milestone 14 does not include:

- A replacement for Volunteer Management
- A replacement for Event Management
- A replacement availability system
- Permission slips
- Medical-release forms
- Custom forms
- Cross-ministry reporting and analytics
- AI scheduling recommendations
- Native mobile/offline scheduling
- General facilities-management software
- Payroll or employee scheduling
- Public scheduling pages

These remain owned by other milestones or outside Version 1 scope.

---

# Acceptance Criteria

Milestone 14 is complete when:

- Authorized managers can create a draft ministry schedule.
- Authorized managers can assign volunteers to schedule responsibilities.
- Authorized managers can assign classrooms or locations.
- Existing volunteer availability is used during scheduling.
- Known availability conflicts are surfaced.
- Overlapping volunteer assignments are detected.
- Conflict overrides, when permitted, are intentional and audited.
- Authorized managers can create recurring rotations.
- Rotation changes preserve historical assignments.
- Managers can identify unfilled schedule positions.
- Managers can publish schedules.
- Volunteers can view their own published assignments.
- Volunteers cannot view or manage unauthorized scheduling information.
- Parents cannot access scheduling-management workflows.
- Anonymous users cannot access Scheduling.
- Calendar-oriented schedule views respect authorization.
- Significant scheduling changes are audited.
- Direct unauthorized data access is denied.
- Automated verification passes.
- ESLint passes.
- Production build passes.
- Product Owner acceptance testing passes using synthetic data.

---

# Verification Expectations

Automated verification should cover at minimum:

- Schedule lifecycle
- Manager authorization
- Volunteer self-access
- Parent denial
- Anonymous denial
- Availability integration
- Conflict detection
- Overlapping assignments
- Classroom/location assignments
- Recurring rotation behavior
- Historical assignment preservation
- Schedule publication
- Volunteer published-schedule visibility
- Audit workflows
- Direct-access restrictions

---

# Milestone Status

**Complete — August 11, 2026**

Automated verification and all 23 Product Owner acceptance checks passed.
Milestone 15 has not begun.
