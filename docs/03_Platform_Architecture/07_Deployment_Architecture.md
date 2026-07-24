# Deployment Architecture

> **Document ID:** ARCH-007  
> **Section:** Platform Architecture  
> **Version:** v0.2.0  
> **Status:** Draft  
> **Owner:** Product Owner (Louie)  
> **Technical Lead & Solution Architect:** ChatGPT  
> **Last Updated:** 2026-07-22  
> **Next Review:** Milestone 1 Completion

---

# Purpose

This document defines the deployment architecture for the Youth Ministries Platform.

It establishes how application code, database changes, configuration, and supporting services move safely from development into production.

The deployment architecture is intended to provide:

- Repeatable releases
- Environment isolation
- Controlled production changes
- Automated validation
- Rollback capability
- Secure configuration management
- Clear release ownership
- Minimal disruption to ministry operations

This document describes the architectural deployment model. Detailed release procedures and operational runbooks will be created during later development and production-readiness milestones.

---

# Objectives

The deployment architecture is designed to:

- Produce consistent deployments across environments.
- Prevent unreviewed changes from reaching production.
- Detect defects before release.
- Protect production data.
- Support rapid rollback when necessary.
- Keep application and database changes synchronized.
- Maintain a traceable deployment history.
- Reduce manual deployment errors.
- Support future growth in contributors and environments.

---

# Deployment Architecture Overview

```text
Developer Workstation
        │
        ▼
Feature Branch
        │
        ▼
Pull Request
        │
        ├── Static Analysis
        ├── Type Checking
        ├── Automated Tests
        ├── Build Validation
        └── Security Checks
        │
        ▼
Code Review and Approval
        │
        ▼
Main Branch
        │
        ▼
Staging Deployment
        │
        ├── Integration Testing
        ├── Database Migration Validation
        ├── Acceptance Testing
        └── Release Verification
        │
        ▼
Production Approval
        │
        ▼
Production Deployment
        │
        ├── Application Release
        ├── Database Migration
        ├── Smoke Testing
        └── Monitoring
```

Every production release must pass through the approved deployment pipeline.

---

# Deployment Platforms

Version 1 will use the following deployment platforms:

| Component | Deployment Platform |
|---|---|
| Next.js Application | Vercel |
| Source Repository | GitHub |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| File Storage | Supabase Storage |
| Realtime Services | Supabase Realtime |
| Database Migrations | Version-controlled migration files |
| Environment Configuration | Vercel and Supabase environment configuration |

Managed platforms reduce infrastructure maintenance while still requiring disciplined release controls.

---

# Source-Control Strategy

Git and GitHub will serve as the authoritative source for application code and deployment-related configuration.

The repository should contain:

- Application source code
- Database migrations
- Seed scripts
- Configuration templates
- Automated tests
- Documentation
- Deployment scripts where applicable
- Release history
- CHANGELOG files

Secrets and production credentials must never be committed to the repository.

---

# Branching Strategy

The project will use a lightweight feature-branch workflow.

```text
main
 ├── feature/student-management
 ├── feature/event-registration
 ├── fix/checkin-validation
 ├── docs/security-architecture
 └── chore/dependency-update
```

## Main Branch

The `main` branch represents the approved release line.

Requirements for `main`:

- Protected from unauthorized direct changes
- Updated through reviewed pull requests
- Required automated checks must pass
- Production deployments originate from this branch
- Commit history must remain traceable

---

## Feature Branches

Feature branches are used for isolated development work.

Feature branches should:

- Be created from the latest approved `main` branch
- Contain one coherent feature, fix, or documentation change
- Use descriptive names
- Remain short-lived where practical
- Be merged only after verification
- Be deleted after successful merge

---

# Branch Naming Standard

Recommended branch prefixes include:

| Prefix | Purpose | Example |
|---|---|---|
| `feature/` | New application capability | `feature/student-profile` |
| `fix/` | Defect correction | `fix/attendance-duplicate` |
| `security/` | Security-related change | `security/rls-policy-update` |
| `docs/` | Documentation updates | `docs/deployment-architecture` |
| `test/` | Test additions or corrections | `test/checkin-service` |
| `refactor/` | Internal restructuring | `refactor/event-service` |
| `chore/` | Maintenance work | `chore/update-dependencies` |
| `release/` | Release preparation when required | `release/v1.0.0` |

---

# Pull-Request Workflow

All significant changes should be introduced through pull requests.

A pull request should include:

- Clear summary
- Reason for the change
- Scope of affected features
- Verification steps
- Testing results
- Database impact
- Security impact
- Screenshots for relevant UI changes
- Documentation changes
- Rollback considerations when appropriate

A pull request should not combine unrelated work.

---

# Required Deployment Checks

Before merge or deployment, the pipeline should verify:

- Dependency installation
- Code formatting
- Linting
- TypeScript compilation
- Unit tests
- Integration tests where available
- Production build
- Database migration validity
- Environment-variable references
- Security-policy tests where applicable
- No committed secrets
- No prohibited sensitive test data

A failed required check blocks deployment until corrected.

---

# Environment Model

The platform will use four logical environments:

```text
Local Development
        │
        ▼
Testing
        │
        ▼
Staging
        │
        ▼
Production
```

Each environment has a distinct purpose and security posture.

---

# Local Development Environment

The local development environment supports active implementation.

It includes:

- Developer workstation
- Local Next.js development server
- Development-only environment variables
- Development Supabase project or approved local Supabase instance
- Synthetic or approved test data
- Development logging

Local development must not depend on production credentials.

Production data should not be downloaded into local development environments.

---

# Testing Environment

The testing environment supports automated and manual verification.

It may be used for:

- Unit tests
- Integration tests
- Repository tests
- Authorization tests
- Row-Level Security tests
- File-policy tests
- Regression testing
- Controlled workflow verification

The testing environment must use non-production data.

Tests should be repeatable and should clean up or isolate generated records.

---

# Staging Environment

The staging environment provides a production-like release-validation environment.

Staging should mirror production where practical in:

- Application configuration
- Database schema
- Authentication configuration
- Storage policies
- Deployment process
- Runtime behavior
- External integration structure

Staging should use separate credentials and non-production data.

Release candidates should be validated in staging before production deployment.

---

# Production Environment

Production serves approved ministry users and contains live ministry data.

Production requires:

- Restricted access
- Approved releases
- Secure configuration
- Monitoring
- Auditability
- Backup coverage
- Rollback readiness
- Controlled database changes
- Documented incident handling

Development and experimentation must not occur directly in production.

---

# Environment Isolation

Each environment must have independent resources where practical.

These include:

- Supabase project
- PostgreSQL database
- Authentication users
- Storage buckets
- Environment variables
- Provider credentials
- Webhook secrets
- Deployment URLs
- Logging configuration
- Email or SMS settings

A defect or test action in one environment must not affect another environment.

---

# Environment Configuration

Configuration should be managed through environment variables and approved platform configuration systems.

Examples include:

- Supabase project URL
- Supabase browser-safe key
- Server-only service credentials
- Application URL
- Email provider credentials
- SMS provider credentials
- Error-reporting configuration
- Feature flags
- Webhook secrets

Each environment must maintain its own values.

---

# Environment Variable Classification

Environment variables should be classified as:

## Public Configuration

Values explicitly designed to be included in browser bundles.

Examples may include:

- Public application URL
- Supabase project URL
- Browser-safe Supabase anonymous key

Public configuration must still be protected by server-side authorization, Row-Level Security, and storage policies.

---

## Server-Only Configuration

Values available only in trusted server environments.

Examples include:

- Supabase service-role key
- Email provider secret
- SMS provider secret
- Webhook signing secret
- Administrative API credentials

Server-only values must never use a client-exposed naming convention.

---

## Operational Configuration

Values that control deployment or runtime behavior.

Examples include:

- Environment name
- Logging level
- Feature flags
- Maintenance-mode setting
- Integration enablement
- Release identifier

---

# Deployment Pipeline

The deployment pipeline should follow these stages:

## Stage 1 – Source Validation

Triggered when code is pushed or a pull request is created.

Checks include:

- Repository integrity
- Dependency installation
- Formatting
- Linting
- Type checking

---

## Stage 2 – Automated Testing

The pipeline runs available automated tests.

Tests may include:

- Unit tests
- Service tests
- Repository tests
- Integration tests
- Authorization tests
- Database-policy tests
- UI tests
- Accessibility checks

---

## Stage 3 – Build Validation

The Next.js production build must complete successfully.

This confirms:

- Application compilation
- Route generation
- Server and client boundaries
- Type compatibility
- Required configuration references
- Build-time dependency validity

---

## Stage 4 – Preview Deployment

Pull requests may generate temporary Vercel preview deployments.

Preview deployments support:

- UI review
- Functional verification
- Stakeholder feedback
- Responsive-layout review
- Accessibility review

Preview deployments must not connect to production data.

---

## Stage 5 – Staging Deployment

Approved changes are deployed to staging.

Staging validation includes:

- Application startup
- Database connectivity
- Authentication
- Major workflow testing
- Migration validation
- Storage access
- Integration verification
- Security checks
- Smoke testing

---

## Stage 6 – Production Approval

Production deployment requires explicit approval after staging verification.

Approval confirms:

- Scope is understood
- Required testing passed
- Database migrations were reviewed
- Documentation was updated
- Rollback plan is available
- Release notes are prepared
- Known risks are accepted

---

## Stage 7 – Production Deployment

The approved release is deployed to production.

Deployment includes:

- Application release
- Database migration execution
- Configuration validation
- Service connectivity verification
- Post-deployment smoke testing

---

## Stage 8 – Post-Deployment Monitoring

After deployment, the team monitors:

- Application errors
- Failed requests
- Authentication failures
- Database errors
- Performance degradation
- Integration failures
- User-reported issues

The release remains under increased observation for an appropriate period.

---

# Application Deployment

The Next.js application will be deployed through Vercel.

Application deployment should support:

- Git-based deployments
- Preview deployments
- Staging and production targets
- Environment-specific configuration
- Deployment logs
- Build logs
- Rollback to a prior deployment
- Domain and HTTPS management

The production deployment must originate from an approved repository state.

---

# Database Deployment

Database changes must be applied through version-controlled migrations.

Database changes include:

- Table creation
- Column changes
- Indexes
- Constraints
- Functions
- Triggers
- Row-Level Security policies
- Storage-related database policies
- Seed or reference data where appropriate

Manual production schema changes should be avoided.

---

# Migration File Standard

Migration files should:

- Have unique ordered identifiers
- Use descriptive names
- Contain one coherent schema change
- Be committed with related application code
- Be tested before production
- Include safe failure behavior where practical
- Avoid destructive changes without explicit review

Example:

```text
supabase/
└── migrations/
    ├── 202607220001_create_people_tables.sql
    ├── 202607220002_create_household_relationships.sql
    └── 202607220003_enable_people_rls.sql
```

---

# Migration Sequence

Migrations must execute in a deterministic order.

```text
Existing Schema
      │
      ▼
Migration 001
      │
      ▼
Migration 002
      │
      ▼
Migration 003
      │
      ▼
Updated Schema
```

A migration must not assume that an uncommitted manual change already exists.

---

# Forward-Compatible Database Changes

Where practical, database changes should use an expand-and-contract approach.

## Expand

Introduce new structures without immediately removing old ones.

Examples:

- Add a nullable column.
- Add a new table.
- Add a new service path.
- Support both old and new representations temporarily.

## Migrate

Move application behavior and existing data to the new structure.

## Contract

Remove obsolete structures only after they are no longer used.

This reduces downtime and compatibility risk.

---

# Destructive Database Changes

Destructive changes require additional review.

Examples include:

- Dropping tables
- Dropping columns
- Removing policies
- Changing identifiers
- Deleting stored data
- Making nullable columns required
- Changing relationship behavior

A destructive migration should include:

- Impact assessment
- Backup confirmation
- Data-migration plan
- Application compatibility review
- Rollback or restoration plan
- Explicit approval

---

# Database Migration Validation

Before production, migrations should be tested against:

- A clean database
- The current staging schema
- Representative test data
- Existing Row-Level Security policies
- Relevant services and repositories
- Rollback or recovery procedures where applicable

Migration tests should verify that existing workflows continue to function.

---

# Seed Data

Seed data may be used for development and testing.

Seed data should include only synthetic information.

Seed data may provide:

- Sample users
- Sample students
- Sample households
- Sample volunteers
- Sample events
- Attendance records
- Permission-form templates
- Reference values

Production seed operations must be narrowly controlled and reviewed.

---

# Authentication Deployment

Authentication settings are part of the deployment architecture.

Environment-specific authentication configuration may include:

- Site URL
- Redirect URLs
- Email templates
- Allowed providers
- Session behavior
- Password recovery routes
- Email-verification settings

Authentication configuration changes must be tested before production.

---

# Storage Deployment

Supabase Storage configuration includes:

- Bucket creation
- Public or private classification
- Object naming conventions
- File-size restrictions
- Allowed file types
- Row-Level Security policies
- Access rules
- Retention behavior

Storage policy changes should be deployed and tested alongside related application changes.

---

# External Integration Deployment

External integrations must use environment-specific credentials and endpoints.

Examples include:

- Development email sandbox
- Test SMS destination restrictions
- Staging webhook endpoint
- Production provider credentials

Non-production environments should avoid sending real messages to ministry families unless explicitly approved.

---

# Feature Flags

Feature flags may be used to separate deployment from feature release.

A feature flag can allow code to reach production while remaining unavailable to users.

Feature flags may support:

- Gradual rollout
- Administrative preview
- Campus-specific enablement
- Emergency disablement
- Controlled beta testing

Feature flags must not replace authorization controls.

Unused flags should be removed after rollout is complete.

---

# Release Strategy

The platform will use incremental releases.

A release should contain a manageable, verified set of changes rather than a large collection of unrelated features.

Incremental releases provide:

- Lower deployment risk
- Easier verification
- Simpler rollback
- Faster feedback
- Clearer troubleshooting

---

# Versioning

The project will use semantic versioning where practical.

```text
MAJOR.MINOR.PATCH
```

Examples:

```text
1.0.0
1.1.0
1.1.1
```

## Major Version

Used for significant incompatible or platform-wide changes.

## Minor Version

Used for backward-compatible features or meaningful milestones.

## Patch Version

Used for backward-compatible fixes and small corrections.

Documentation milestone versions may precede the initial production release.

---

# Release Candidate

A release candidate may be identified before production.

Example:

```text
v1.0.0-rc.1
```

A release candidate indicates that the build is believed to be ready for production but still requires final validation.

---

# Release Package

Each formal release should include:

- Approved application code
- Database migrations
- Configuration requirements
- Automated test results
- Verification checklist
- Release Notes
- CHANGELOG update
- Project Journal entry
- Known issues
- Rollback information
- Git commit and tag

---

# Deployment Approval

Production deployment approval belongs to the Product Owner or an explicitly delegated release authority.

Technical validation should confirm:

- Build success
- Test success
- Migration readiness
- Security review
- Documentation completion
- Rollback readiness

Approval should be recorded through the repository, deployment platform, release documentation, or another approved process.

---

# Deployment Timing

Production deployments should consider ministry operations.

High-impact releases should avoid:

- Active check-in periods
- Major events
- Registration deadlines
- High-traffic communication windows
- Times when technical support is unavailable

Deployment timing should reduce disruption and ensure support availability.

---

# Maintenance Mode

The platform may support a maintenance mode for operations that require temporary user restrictions.

Maintenance mode may:

- Display a clear status message
- Prevent data-changing actions
- Preserve authorized administrative access
- Provide expected restoration timing
- Avoid exposing technical details

Routine deployments should not require maintenance mode when the architecture supports zero-downtime releases.

---

# Zero-Downtime Goal

The platform should pursue zero-downtime application deployments where practical.

This requires:

- Backward-compatible application changes
- Safe database migrations
- Environment validation
- Managed hosting capabilities
- Gradual activation where necessary

Some major database operations may still require controlled maintenance.

---

# Smoke Testing

Every staging and production deployment should include smoke testing.

Minimum smoke tests include:

- Application loads
- Login works
- Protected routes are protected
- Dashboard loads
- Database connection works
- Authorized data can be read
- Unauthorized access is denied
- Critical forms submit correctly
- File access works when applicable
- Logout works

Additional smoke tests should cover features included in the release.

---

# Rollback Strategy

The deployment architecture must support rollback when a release causes significant problems.

Rollback options include:

- Restore previous Vercel deployment
- Disable a feature flag
- Revert application code
- Apply a corrective database migration
- Restore from backup when necessary
- Disable an external integration
- Place the application in maintenance mode

Rollback actions must prioritize data integrity.

---

# Application Rollback

Application rollback may return production to a previously known-good deployment.

Before rollback, determine whether the previous application version remains compatible with any newly applied database changes.

Application rollback is unsafe when the database has changed incompatibly.

---

# Database Rollback

Database migrations should not rely solely on automatic down-migrations.

In many cases, the safer recovery method is a new forward migration that corrects the issue.

Database recovery options include:

- Corrective migration
- Data restoration
- Point-in-time recovery where supported
- Backup restoration
- Temporary compatibility changes

The recovery method must be selected based on data impact.

---

# Failed Deployment Handling

When deployment fails:

1. Stop the release process.
2. Preserve logs and failure evidence.
3. Determine whether production was affected.
4. Roll back or correct the release.
5. Verify system stability.
6. Document the incident.
7. Update tests or procedures to prevent recurrence.

Repeated deployment attempts should not occur without understanding the failure.

---

# Monitoring After Release

Post-release monitoring should include:

- Error rate
- Response time
- Database failures
- Authentication issues
- Storage failures
- External provider failures
- Background workflow failures
- User support reports

Critical failures should trigger rollback or incident-response evaluation.

---

# Deployment Audit Trail

The platform should maintain a traceable release history.

The audit trail should identify:

- Release version
- Commit identifier
- Deployment time
- Deployment environment
- Approver
- Included migrations
- Verification results
- Rollback actions
- Known issues

GitHub, Vercel, Supabase, release notes, and project documentation may collectively provide this history.

---

# Access Control for Deployment

Deployment permissions must follow least privilege.

Access categories may include:

- Repository contributor
- Pull-request reviewer
- Staging deployer
- Production deployer
- Database migration administrator
- Environment-secret administrator
- Release approver

A user should receive only the access required for their responsibilities.

---

# Production Access

Production access should be limited and periodically reviewed.

Production maintainers must avoid:

- Casual database browsing
- Untracked data modifications
- Sharing production credentials
- Using production as a test environment
- Downloading sensitive data without approval

Emergency production access should be documented.

---

# Secret Rotation

Secrets should be rotated when:

- Exposure is suspected
- A maintainer leaves the project
- A third-party provider reports compromise
- A credential appears in source control
- Access responsibilities change
- Scheduled security policy requires rotation

Rotation must update all affected deployment environments safely.

---

# Dependency Deployment

Dependency updates should pass the standard deployment pipeline.

High-risk updates include:

- Next.js major versions
- React major versions
- Supabase client major versions
- Authentication libraries
- Validation libraries
- File-processing libraries
- Database tooling
- Build-system changes

Major updates should be tested separately from unrelated feature work.

---

# Emergency Releases

An emergency release may be required for:

- Security vulnerability
- Production outage
- Data-integrity issue
- Authentication failure
- Critical check-in failure
- Serious privacy exposure

Emergency releases may use an expedited process, but they still require:

- Clear scope
- Technical review
- Verification
- Deployment tracking
- Post-release documentation
- Follow-up retrospective

Urgency does not remove the need for traceability.

---

# Release Documentation

Every milestone or production release should update:

- Root CHANGELOG
- Relevant section CHANGELOG
- Project Journal
- Release Notes
- ADRs when decisions changed
- User guides when behavior changed
- Deployment notes when configuration changed

Documentation should be committed with or immediately adjacent to the release.

---

# Deployment Responsibilities

| Role | Responsibility |
|---|---|
| Product Owner | Approves scope and production release |
| Technical Lead | Confirms architecture and technical readiness |
| Developer | Implements and verifies changes |
| Reviewer | Reviews code, migrations, and risks |
| Release Operator | Executes or supervises deployment |
| Ministry Representative | Performs acceptance verification where applicable |

One person may hold multiple roles during early project stages, but the responsibilities remain distinct.

---

# Deployment Readiness Checklist

Before production deployment, verify:

- [ ] Scope is approved.
- [ ] Pull request is reviewed.
- [ ] Required checks pass.
- [ ] Production build succeeds.
- [ ] Automated tests pass.
- [ ] Staging verification is complete.
- [ ] Database migrations are reviewed.
- [ ] Row-Level Security changes are tested.
- [ ] Storage-policy changes are tested.
- [ ] Environment variables are configured.
- [ ] Secrets remain server-side.
- [ ] Release Notes are prepared.
- [ ] CHANGELOG is updated.
- [ ] Rollback approach is documented.
- [ ] Production backup status is acceptable.
- [ ] Deployment timing is appropriate.
- [ ] Post-deployment verification steps are ready.

---

# Post-Deployment Checklist

After production deployment, verify:

- [ ] Application is reachable.
- [ ] Login succeeds.
- [ ] Protected routes remain protected.
- [ ] Critical workflows succeed.
- [ ] Database operations succeed.
- [ ] Unauthorized access remains denied.
- [ ] File access behaves correctly.
- [ ] External integrations behave correctly.
- [ ] No unexpected errors appear in logs.
- [ ] Monitoring is stable.
- [ ] Release status is documented.
- [ ] Stakeholders are informed when appropriate.

---

# Architecture Decision

The Youth Ministries Platform adopts a controlled, Git-based deployment model.

All significant changes will move through:

```text
Feature Branch
→ Pull Request
→ Automated Validation
→ Review
→ Staging
→ Acceptance Verification
→ Production Approval
→ Production Deployment
→ Post-Deployment Monitoring
```

Application code and database changes must remain version controlled and traceable.

Direct undocumented production changes are prohibited except during an approved emergency response.

---

# Related Documents

- ARCH-001 – System Architecture
- ARCH-002 – Application Architecture
- ARCH-003 – Hosting Architecture
- ARCH-004 – Service Architecture
- ARCH-005 – Data Flow
- ARCH-006 – Security Architecture
- ARCH-008 – Integration Architecture
- ARCH-009 – Architecture Principles
- ADR-001 – Standard Application Architecture
- ADR-003 – Cloud-Native Hosting Strategy
- ADR-006 – Defense-in-Depth Security

---

# Open Items for Detailed Deployment Design

The following items will be finalized during application development and production readiness:

- Exact GitHub branch-protection settings
- Required pull-request approval count
- Continuous-integration provider configuration
- Automated test commands
- Vercel project configuration
- Supabase environment count
- Migration execution procedure
- Production approval mechanism
- Deployment notification process
- Maintenance-window expectations
- Monitoring provider
- Alert thresholds
- Backup-retention details
- Recovery-time objectives
- Recovery-point objectives
- Feature-flag implementation
- Emergency-release procedure

These open items do not change the deployment model established by this document.

---

# Revision History

| Version | Date | Description |
|---|---|---|
| 0.2.0 | 2026-07-22 | Created Deployment Architecture document. |