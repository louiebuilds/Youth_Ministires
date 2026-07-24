# Security Architecture

> **Document ID:** ARCH-006  
> **Section:** Platform Architecture  
> **Version:** v0.2.0  
> **Status:** Draft  
> **Owner:** Product Owner (Louie)  
> **Technical Lead & Solution Architect:** ChatGPT  
> **Last Updated:** 2026-07-22  
> **Next Review:** Milestone 1 Completion

---

# Purpose

This document defines the high-level security architecture for the Youth Ministries Platform.

The platform will store and process sensitive information involving minors, parents, guardians, volunteers, ministry leaders, attendance, authorized pickup relationships, permission forms, and communications.

Security and privacy must therefore be incorporated into every architectural layer rather than treated as optional features added after implementation.

This document establishes the security boundaries, access-control model, data-protection expectations, audit requirements, and architectural safeguards that guide the platform.

Detailed security policies, controls, and implementation requirements will be documented during Milestone 4 – Security.

---

# Objectives

The security architecture is designed to:

- Protect minors and their personal information.
- Protect parent, guardian, volunteer, and staff information.
- Prevent unauthorized access to ministry records.
- Ensure users can access only the information required for their responsibilities.
- Preserve the confidentiality, integrity, and availability of platform data.
- Provide traceability for sensitive and administrative actions.
- Reduce the risk of accidental disclosure.
- Support secure development and deployment practices.
- Maintain clear separation between authentication and authorization.
- Establish privacy-first defaults throughout the platform.

---

# Security Principles

The Youth Ministries Platform follows these core security principles:

- Security by design
- Privacy by default
- Least privilege
- Defense in depth
- Deny by default
- Strong authentication
- Server-side authorization
- Data minimization
- Secure failure
- Complete auditability
- Environment isolation
- Separation of duties
- No trust based solely on the user interface

---

# Security Architecture Overview

```text
User
  │
  ▼
Secure Browser Session
  │
  ▼
Next.js Application
  │
  ├── Authentication Check
  ├── Authorization Check
  ├── Input Validation
  └── Secure Error Handling
  │
  ▼
Service Layer
  │
  ├── Business Rule Enforcement
  ├── Permission Evaluation
  ├── Data Filtering
  └── Audit Event Creation
  │
  ▼
Repository Layer
  │
  ▼
Supabase Security Boundary
  │
  ├── Supabase Auth
  ├── PostgreSQL Row-Level Security
  ├── Storage Policies
  ├── Database Constraints
  └── Secure Environment Configuration
```

Security controls exist at multiple layers so that failure at one layer does not automatically expose protected data.

---

# Security Boundaries

The platform contains several security boundaries.

## User Device Boundary

The user's browser is considered an untrusted environment.

Client-side code may improve usability, but it must never be the only location where authorization or validation occurs.

The browser must not contain:

- Administrative secrets
- Service-role credentials
- Private database credentials
- Sensitive internal configuration
- Unrestricted storage credentials

---

## Application Boundary

The Next.js application is responsible for:

- Verifying authenticated sessions
- Restricting protected routes
- Validating submitted data
- Calling approved services
- Returning only authorized information
- Preventing sensitive details from appearing in user-facing errors

---

## Service Boundary

The Service Layer is responsible for:

- Enforcing business permissions
- Evaluating role and relationship access
- Applying privacy rules
- Coordinating audit logging
- Preventing unauthorized workflows
- Ensuring that repositories receive approved requests only

---

## Database Boundary

The PostgreSQL database provides an independent enforcement layer through:

- Row-Level Security
- Database roles
- Foreign-key constraints
- Unique constraints
- Required fields
- Controlled functions
- Transaction boundaries
- Restricted direct access

Application authorization must not replace database-level protections.

---

## Storage Boundary

Supabase Storage must enforce access policies independently from the application interface.

Files must not become publicly accessible unless a documented business requirement explicitly allows public access.

---

## External Provider Boundary

External systems such as email or SMS providers must receive only the minimum information needed to complete the requested action.

Third-party credentials must remain server-side and environment-specific.

---

# Authentication Architecture

Authentication establishes the identity of a user.

Version 1 will use Supabase Auth.

Authentication capabilities include:

- Secure login
- Secure logout
- Session creation
- Session validation
- Password recovery
- Email verification where required
- Session expiration
- Secure token handling

Future authentication capabilities may include:

- Multi-factor authentication
- Single sign-on
- Passkeys
- Organization-managed identity providers

---

# Authentication Requirements

The platform must:

- Require authentication for protected application areas.
- Validate sessions on the server for protected operations.
- Expire invalid or revoked sessions.
- Prevent inactive or disabled accounts from accessing protected resources.
- Avoid exposing authentication tokens in logs.
- Avoid storing passwords within application tables.
- Use secure provider-supported password handling.
- Support account recovery without exposing whether unrelated accounts exist.

---

# Authentication and Authorization Separation

Authentication answers:

```text
Who is the user?
```

Authorization answers:

```text
What is the user permitted to do?
```

A valid login does not automatically grant access to all platform data.

Every protected action must pass both authentication and authorization checks.

---

# Authorization Architecture

The platform will use a layered authorization model combining:

- Role-based permissions
- Relationship-based permissions
- Resource-level permissions
- Ministry or organizational scope
- Database Row-Level Security

This model is required because ministry access cannot always be represented by roles alone.

---

# Role-Based Access Control

Roles provide broad access categories.

Initial role concepts may include:

- Platform Administrator
- Ministry Administrator
- Ministry Leader
- Event Leader
- Check-In Volunteer
- General Volunteer
- Parent or Guardian
- Read-Only Reporter

Final roles and permissions will be defined during the Security milestone.

Roles must not be hard-coded into individual UI components.

---

# Relationship-Based Access Control

Some access decisions depend on a user's relationship to a person or record.

Examples include:

- A parent viewing their own student's information.
- A guardian completing a permission form for an authorized student.
- An event leader viewing students registered for their event.
- A check-in volunteer viewing only the information required for check-in.
- A ministry leader accessing students assigned to their ministry area.

Relationship-based access must be evaluated by approved authorization logic and supported by database policies where practical.

---

# Resource-Level Authorization

Authorization must be evaluated against the specific resource being requested.

Examples include:

- A user may view one event but not another.
- A volunteer may perform check-in but not edit medical information.
- A parent may update permitted household information but not administrative notes.
- A report viewer may access aggregated data without accessing full student profiles.

Possession of a record identifier does not grant permission to access that record.

---

# Deny-by-Default Model

Access is denied unless an explicit rule allows it.

The platform must not depend on hiding buttons or navigation links as a security control.

A user who manually submits a request to a hidden route must still be denied when they lack permission.

---

# Row-Level Security

Row-Level Security must be enabled for protected Supabase tables.

Policies should evaluate:

- Authenticated user identity
- Assigned role
- Organizational scope
- Ministry scope
- Event relationship
- Household or guardian relationship
- Ownership where applicable
- Record status

The use of unrestricted authenticated-user policies should be avoided.

Policies must be tested for both allowed and denied access.

---

# Sensitive Data Categories

The platform may process several categories of sensitive information.

## Student Information

Examples:

- Legal and preferred names
- Birth date
- Contact information
- Household relationships
- Attendance history
- Event registrations
- Permission status
- Authorized pickup relationships
- Ministry assignments

---

## Health and Safety Information

Examples may include:

- Allergies
- Medical notes
- Emergency instructions
- Accessibility needs
- Safety alerts

Access to health and safety information must be restricted to users with a documented operational need.

---

## Parent and Guardian Information

Examples:

- Contact information
- Household relationships
- Communication preferences
- Pickup authorization
- Permission-form submissions

---

## Volunteer and Staff Information

Examples:

- Contact details
- Ministry assignments
- Training status
- Background-check status
- Administrative permissions

Detailed background-check reports should not be stored unless a later approved requirement explicitly requires them.

---

## Operational Information

Examples:

- Attendance
- Check-in and check-out history
- Event rosters
- Communication logs
- Audit records
- Internal notes

---

# Data Minimization

The platform must collect only information required for approved ministry operations.

Before introducing a new field, the project should determine:

- Why the information is required
- Who may access it
- How long it should be retained
- Whether a less sensitive alternative exists
- Whether it belongs in Version 1

Optional collection of sensitive information should be minimized.

---

# Privacy of Minors

The privacy of minors is a central architectural requirement.

Version 1 must follow these rules:

- Do not store student photographs.
- Do not expose student records publicly.
- Do not use minors' information for unrelated purposes.
- Do not include sensitive student data in URLs.
- Do not include unnecessary student data in notifications.
- Do not expose full student records to volunteers who need only operational information.
- Do not allow unrestricted directory-style browsing by parents or volunteers.
- Do not display one household's information to another household.

Future proposals involving photographs, facial recognition, location tracking, or public student profiles require a separate security and privacy review.

---

# Data Classification

Platform information should be classified according to sensitivity.

| Classification | Description | Examples |
|---|---|---|
| Public | Approved for unrestricted distribution | Public event descriptions |
| Internal | Intended for ministry staff and volunteers | Internal schedules |
| Confidential | Personal or operational information requiring restricted access | Contact details and attendance |
| Highly Confidential | Information with elevated safety, privacy, or legal sensitivity | Medical notes and pickup authorization |

Security controls should increase with the sensitivity of the information.

---

# Data Protection in Transit

All production communication must use HTTPS.

Connections between the application and managed services must use encrypted transport.

Unencrypted production endpoints are not permitted.

---

# Data Protection at Rest

The platform will rely on managed-provider encryption for:

- PostgreSQL data
- Supabase Storage
- Application hosting infrastructure
- Backup infrastructure

Highly sensitive fields may require additional application-level protection if identified during detailed security design.

---

# Secret Management

Secrets must never be committed to source control.

Examples include:

- Service-role keys
- Database credentials
- Email provider credentials
- SMS provider credentials
- Webhook secrets
- Private API keys
- Encryption keys

Secrets must be:

- Stored in approved environment-variable systems
- Separated by environment
- Accessible only to authorized maintainers
- Rotated when compromised
- Excluded from client-side bundles
- Excluded from logs and screenshots

---

# Public and Private Keys

Only credentials explicitly designed for browser use may appear in client-side code.

The Supabase anonymous key may be used in the browser only when protected by correctly configured Row-Level Security and storage policies.

The Supabase service-role key must remain server-side and must never be exposed to the browser.

---

# Input Validation

All external input must be treated as untrusted.

Validation is required for:

- Forms
- Route parameters
- Query parameters
- Uploaded files
- API requests
- Search terms
- Imported data
- External integration payloads

Validation must occur on the server or Service Layer even when client-side validation is also present.

---

# Output Protection

The platform must safely render user-provided or externally supplied content.

Security controls should address:

- Cross-site scripting
- Unsafe HTML
- Injection attacks
- Malicious filenames
- Unexpected content types
- Sensitive data exposure
- Unsafe redirects

Raw HTML should not be rendered unless it has been reviewed, sanitized, and explicitly approved.

---

# Database Security

Database security must include:

- Row-Level Security
- Least-privilege access
- Strong schema constraints
- Parameterized database operations
- Controlled migrations
- Restricted production access
- Auditable administrative changes
- Separate environments
- Backup and recovery procedures

The application should not execute database operations using unrestricted credentials except for narrowly approved server-side workflows.

---

# File Security

File uploads must be treated as untrusted.

The File Service must validate:

- File type
- File size
- Filename
- Storage destination
- Ownership
- Access permissions
- Associated record
- Upload authorization

Additional controls may include malware scanning when supported by the chosen infrastructure.

Files should use generated storage names rather than relying only on user-supplied filenames.

---

# Permission Form Security

Permission-form workflows must protect:

- Template integrity
- Submission ownership
- Guardian identity
- Signature records
- Submission timestamps
- Approval status
- Historical versions

A submitted form must remain associated with the exact template version that was completed.

Unauthorized users must not be able to alter another household's submission.

---

# Check-In and Check-Out Security

Check-in and check-out workflows involve elevated safety requirements.

The architecture must support:

- Authorized operator access
- Pickup authorization verification
- Clear student identification
- Complete time records
- Audit history
- Prevention of unauthorized checkout
- Controlled correction workflows
- Protection against casual exposure of family information

Check-in volunteers should receive only the information necessary to perform check-in duties.

---

# Communication Security

Communication workflows must respect:

- Household relationships
- Contact preferences
- Recipient eligibility
- Ministry scope
- Opt-out requirements where applicable
- Protection of recipient addresses
- Delivery logging
- Message authorization

Bulk email messages must avoid exposing recipient email addresses to other recipients.

Sensitive student information should not be included in general email or SMS messages.

---

# Audit Logging

Security-relevant and administrative actions must generate audit records.

Audit events may include:

- Login success and failure
- Account activation or deactivation
- Role changes
- Permission changes
- Student record creation or modification
- Household relationship changes
- Medical or safety information access
- Permission-form status changes
- Attendance corrections
- Check-in and check-out actions
- Authorized pickup changes
- File access or deletion
- Administrative exports
- Security-policy changes

---

# Audit Record Requirements

Audit records should include:

- Event identifier
- Event type
- Timestamp
- Acting user
- Affected resource
- Action performed
- Success or failure
- Approved context metadata
- Previous and new values when appropriate

Audit records must avoid storing secrets or unnecessary sensitive information.

Audit records should be append-only and protected from ordinary modification or deletion.

---

# Logging and Privacy

Application logs must not contain:

- Passwords
- Authentication tokens
- Service credentials
- Full medical notes
- Full permission-form contents
- Unnecessary personal information
- Complete request payloads containing confidential data

Logs should provide enough information for troubleshooting without creating a secondary source of sensitive information.

---

# Error Handling

Security failures must fail safely.

User-facing messages should be understandable without revealing:

- Internal database details
- Stack traces
- Security-policy logic
- Secret values
- Other users' record existence
- Internal identifiers where unnecessary

Example:

```text
You do not have permission to access this record.
```

Instead of:

```text
RLS policy guardian_household_read failed for household ID 83b...
```

Detailed errors may be recorded securely for authorized administrators.

---

# Session Security

Session controls should include:

- Secure provider-managed tokens
- Session expiration
- Logout support
- Revocation support
- Protected server-side operations
- Reauthentication for highly sensitive actions where appropriate

Future detailed security design will determine whether inactivity timeouts or forced reauthentication are required for specific workflows.

---

# Administrative Security

Administrative capabilities require elevated protection.

Administrative actions may include:

- Creating or disabling user accounts
- Assigning roles
- Changing permissions
- Exporting ministry data
- Correcting check-in records
- Managing security settings
- Accessing audit reports

Administrative access should be limited, auditable, and reviewed periodically.

---

# Account Lifecycle

The platform must support a controlled account lifecycle.

```text
Invited
   │
   ▼
Active
   │
   ├── Suspended
   ├── Disabled
   └── Archived
```

Inactive, suspended, or disabled accounts must not retain active platform access.

Role changes should take effect promptly.

---

# Environment Security

Development, testing, staging, and production must remain separated.

Each environment should have:

- Independent configuration
- Independent credentials
- Independent databases where practical
- Appropriate test data
- Controlled access
- Separate deployment authorization

Production data should not be copied into non-production environments without an approved sanitization process.

---

# Deployment Security

Deployment controls should include:

- Protected production branches
- Pull-request review
- Automated validation
- Secure environment variables
- Dependency review
- Migration review
- Deployment logs
- Rollback capability
- Restricted production permissions

Direct, undocumented production changes should be avoided.

---

# Dependency Security

Third-party dependencies must be managed carefully.

The project should:

- Use actively maintained packages.
- Avoid unnecessary dependencies.
- Review security advisories.
- Apply security updates.
- Remove abandoned packages.
- Pin or lock dependency versions through the package manager.
- Evaluate high-risk dependencies before adoption.

---

# API and Server Action Security

All API routes, server actions, and server-side operations must:

- Authenticate the caller where required.
- Authorize the requested action.
- Validate input.
- Limit returned information.
- Handle errors securely.
- Generate audit events when appropriate.
- Avoid trusting client-supplied role or ownership claims.

---

# Rate Limiting and Abuse Protection

Sensitive operations should support abuse controls where appropriate.

Examples include:

- Login attempts
- Password recovery
- Invitation acceptance
- Public form access
- Search endpoints
- Message sending
- File uploads
- External webhooks

Detailed thresholds will be defined during implementation and security design.

---

# Data Export Security

Exports create additional disclosure risk.

Export operations should require:

- Explicit permission
- Approved scope
- Clear data selection
- Audit logging
- Secure file generation
- Controlled download access
- Limited retention where applicable

Exports should include only the information required for the approved purpose.

---

# Record Retention and Deletion

Security architecture must support future retention rules for:

- Student records
- Attendance
- Check-in history
- Permission forms
- Communications
- Audit logs
- Uploaded files
- Archived users

Detailed retention schedules will be defined with ministry operations and security requirements.

Deletion must consider legal, operational, audit, and restoration needs.

---

# Incident Response Readiness

The platform should support investigation and response to security incidents.

Required capabilities include:

- Centralized logging
- Audit history
- Account disabling
- Credential rotation
- Session revocation
- Deployment rollback
- Database restoration
- Access review
- Documented escalation procedures

A detailed incident-response process will be created during later security and production-readiness milestones.

---

# Backup Security

Backups must receive protections equivalent to production data.

Backup access should be restricted and auditable.

Restoration testing should occur periodically to confirm that backups are usable.

Backup copies must not become an uncontrolled source of sensitive information.

---

# Security Testing

Security validation should include:

- Authentication tests
- Authorization tests
- Row-Level Security tests
- Storage-policy tests
- Input-validation tests
- Permission-boundary tests
- Role-escalation tests
- Relationship-access tests
- File-access tests
- Error-disclosure tests
- Audit-event tests

Tests must verify denied access as carefully as permitted access.

---

# Security Review Triggers

A focused security review is required when introducing:

- New roles or permissions
- New sensitive fields
- Public access
- External integrations
- File-upload capabilities
- Data exports
- Payment processing
- Mobile applications
- Location tracking
- Student photographs
- Artificial intelligence features
- New authentication providers
- Cross-organization data sharing

---

# Threat Categories

The platform architecture should account for threats such as:

- Account compromise
- Unauthorized record access
- Privilege escalation
- Broken access control
- Data leakage
- Malicious file uploads
- Injection attacks
- Cross-site scripting
- Session misuse
- Accidental disclosure
- Insecure external integrations
- Misconfigured Row-Level Security
- Excessive administrative access
- Lost or stolen user devices

Detailed threat modeling will occur during Milestone 4 – Security.

---

# Security Responsibilities by Layer

| Layer | Security Responsibilities |
|---|---|
| User Interface | Safe rendering, basic validation, appropriate data display |
| Next.js Routes and Server Actions | Authentication, authorization, input validation |
| Service Layer | Business permissions, relationship rules, audit coordination |
| Repository Layer | Approved data access and parameterized operations |
| PostgreSQL | Row-Level Security, constraints, transaction integrity |
| Supabase Storage | Bucket and object access policies |
| Hosting Platform | HTTPS, deployment controls, environment protection |
| External Providers | Secure delivery and minimum necessary data exchange |

No single layer is solely responsible for platform security.

---

# Architecture Decision

The Youth Ministries Platform adopts a defense-in-depth security architecture.

Security will be enforced through:

- Authentication
- Role-based authorization
- Relationship-based authorization
- Resource-level permission checks
- Service-layer business rules
- PostgreSQL Row-Level Security
- Storage policies
- Secure environment configuration
- Audit logging
- Privacy-first data handling

Client-side restrictions alone are never considered sufficient security.

---

# Related Documents

- ARCH-001 – System Architecture
- ARCH-002 – Application Architecture
- ARCH-003 – Hosting Architecture
- ARCH-004 – Service Architecture
- ARCH-005 – Data Flow
- ARCH-007 – Deployment Architecture
- FR-001 – Authentication
- FR-002 – User Management
- FR-003 – Student Management
- FR-004 – Household Management
- FR-006 – Check-In / Check-Out
- FR-009 – Permission Forms
- FR-010 – Communication
- FR-012 – Audit Logging
- ADR-001 – Standard Application Architecture
- ADR-004 – Service-Oriented Business Logic
- ADR-005 – Standardized Request Pipeline

---

# Open Items for Detailed Security Design

The following decisions will be finalized during Milestone 4 – Security:

- Final role definitions
- Permission matrix
- Relationship-access rules
- Row-Level Security policy design
- Password and session policies
- Multi-factor authentication requirements
- Sensitive-field classification
- Data-retention periods
- Export controls
- Rate-limiting thresholds
- Incident-response procedures
- Security testing standards
- Administrative access review process
- Audit-retention requirements

These open items do not change the architectural direction established by this document.

---

# Revision History

| Version | Date | Description |
|---|---|---|
| 0.2.0 | 2026-07-22 | Created Security Architecture document. |