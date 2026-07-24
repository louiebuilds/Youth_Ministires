# Youth Ministries Platform — Implementation Project Blueprint

> **Document ID:** DEV-001  
> **Section:** Development  
> **Version:** v0.3.0-alpha  
> **Status:** Draft  
> **Owner:** Product Owner — Louie  
> **Technical Lead & Solution Architect:** ChatGPT  
> **Last Updated:** 2026-07-22  
> **Next Review:** Sprint 1 Completion

---

# Purpose

This document defines the implementation structure and development conventions for the Youth Ministries Platform.

It translates the approved platform architecture into practical rules for building the application.

This blueprint governs:

- Project organization
- Folder structure
- Feature structure
- File naming
- Component responsibilities
- Service responsibilities
- Repository responsibilities
- Validation
- Type definitions
- Authentication boundaries
- Import conventions
- Error handling
- Testing organization
- Environment configuration
- Documentation expectations

The goal is to ensure that the application remains consistent, understandable, testable, and maintainable as new features are added.

---

# Related Documents

This implementation blueprint is governed by:

- ARCH-001 — System Architecture
- ARCH-002 — Application Architecture
- ARCH-004 — Service Architecture
- ARCH-005 — Data Flow
- ARCH-006 — Security Architecture
- ARCH-007 — Deployment Architecture
- ARCH-008 — Integration Architecture
- ARCH-009 — Architecture Principles

Where this document conflicts with an approved architecture document, the architecture document takes precedence.

---

# Technology Stack

The Youth Ministries Platform will use:

| Area | Technology |
|---|---|
| Application Framework | Next.js App Router |
| Programming Language | TypeScript |
| UI Library | React |
| Styling | Tailwind CSS |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| File Storage | Supabase Storage |
| Realtime | Supabase Realtime |
| Validation | Zod |
| Icons | Lucide React |
| Notifications | Sonner |
| Hosting | Vercel |
| Source Control | Git and GitHub |
| Package Manager | npm |

Additional libraries must not be added without a defined need.

---

# Architectural Style

The platform uses a:

- Feature-first project structure
- Service-layer architecture
- Repository-based data-access layer
- Component-based user interface
- Schema-based validation strategy
- Server-first Next.js architecture
- Secure-by-default authorization model

The standard request flow is:

```text
Page or Component
        │
        ▼
Server Action or Route Handler
        │
        ▼
Feature Service
        │
        ▼
Feature Repository
        │
        ▼
Supabase
```

External services use this flow:

```text
Page or Component
        │
        ▼
Server Action or Route Handler
        │
        ▼
Feature Service
        │
        ▼
Integration Service
        │
        ▼
External Provider
```

Application code must not bypass these boundaries without an approved architectural reason.

---

# Root Project Structure

The initial application structure will be:

```text
youth-ministries-platform/
├── app/
├── components/
├── config/
├── features/
├── hooks/
├── integrations/
├── lib/
├── public/
├── repositories/
├── services/
├── styles/
├── types/
├── docs/
├── supabase/
├── tests/
├── .env.example
├── .env.local
├── .gitignore
├── components.json
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── README.md
├── tsconfig.json
└── CHANGELOG.md
```

Some folders may initially remain empty until their first implementation is required.

---

# App Router Structure

The `app` folder contains routes, layouts, loading states, error boundaries, and route-specific server behavior.

```text
app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx
│   ├── register/
│   │   └── page.tsx
│   ├── forgot-password/
│   │   └── page.tsx
│   ├── reset-password/
│   │   └── page.tsx
│   └── layout.tsx
│
├── (platform)/
│   ├── dashboard/
│   │   ├── loading.tsx
│   │   └── page.tsx
│   ├── students/
│   ├── families/
│   ├── volunteers/
│   ├── events/
│   ├── attendance/
│   ├── check-in/
│   ├── permission-forms/
│   ├── communications/
│   ├── reports/
│   ├── settings/
│   └── layout.tsx
│
├── api/
│   └── health/
│       └── route.ts
│
├── auth/
│   └── callback/
│       └── route.ts
│
├── error.tsx
├── global-error.tsx
├── globals.css
├── layout.tsx
├── loading.tsx
├── not-found.tsx
└── page.tsx
```

---

# Route Groups

Route groups organize the application without affecting URLs.

## Authentication Group

```text
app/(auth)/
```

Contains public authentication pages such as:

- Login
- Registration
- Forgot password
- Reset password

These pages use a simplified layout and do not display the platform navigation.

---

## Platform Group

```text
app/(platform)/
```

Contains authenticated application routes.

These routes share:

- Application shell
- Sidebar
- Header
- User menu
- Protected-session handling
- Consistent content layout

---

# Root Route Behavior

The root route:

```text
app/page.tsx
```

should not contain the full dashboard implementation.

Its responsibility is to redirect users based on authentication state:

```text
Authenticated user → /dashboard
Unauthenticated user → /login
```

This keeps the dashboard route explicit and prevents duplicated page behavior.

---

# Feature-First Structure

Each major business capability belongs inside the `features` folder.

```text
features/
├── auth/
├── dashboard/
├── students/
├── families/
├── volunteers/
├── events/
├── attendance/
├── check-in/
├── permission-forms/
├── communications/
├── reports/
├── settings/
└── audit/
```

Each feature owns the code specific to that capability.

---

# Standard Feature Structure

A mature feature may use the following structure:

```text
features/
└── students/
    ├── actions/
    │   ├── create-student-action.ts
    │   ├── update-student-action.ts
    │   └── archive-student-action.ts
    │
    ├── components/
    │   ├── student-card.tsx
    │   ├── student-form.tsx
    │   ├── student-list.tsx
    │   └── student-profile-header.tsx
    │
    ├── repositories/
    │   └── student-repository.ts
    │
    ├── schemas/
    │   ├── create-student-schema.ts
    │   └── update-student-schema.ts
    │
    ├── services/
    │   └── student-service.ts
    │
    ├── types/
    │   └── student.ts
    │
    ├── utils/
    │   └── format-student-name.ts
    │
    ├── tests/
    │   ├── student-service.test.ts
    │   └── student-repository.test.ts
    │
    └── index.ts
```

A feature does not need every folder immediately.

Folders should be introduced when they contain actual code.

Empty placeholder folders should be avoided unless needed for project setup.

---

# Shared Components

Reusable application-wide UI components belong in:

```text
components/
```

Recommended structure:

```text
components/
├── layout/
│   ├── app-header.tsx
│   ├── app-shell.tsx
│   ├── app-sidebar.tsx
│   ├── breadcrumb-navigation.tsx
│   ├── mobile-navigation.tsx
│   └── user-menu.tsx
│
├── navigation/
│   ├── navigation-group.tsx
│   └── navigation-item.tsx
│
├── feedback/
│   ├── empty-state.tsx
│   ├── error-state.tsx
│   ├── loading-state.tsx
│   └── status-badge.tsx
│
└── ui/
    ├── button.tsx
    ├── card.tsx
    ├── dialog.tsx
    ├── input.tsx
    ├── label.tsx
    ├── select.tsx
    ├── table.tsx
    └── textarea.tsx
```

Feature-specific components must remain inside their feature folder.

A component should move into `components/` only when it is truly shared across multiple features.

---

# Component Responsibilities

React components are responsible for:

- Rendering user interfaces
- Receiving typed props
- Displaying data
- Capturing user input
- Triggering approved actions
- Managing local presentation state
- Supporting accessibility

React components must not contain:

- Direct Supabase database queries
- Complex business rules
- Authorization decisions
- Provider-specific integration logic
- Large data-transformation workflows
- Secret credentials

---

# Server and Client Components

Server Components are the default.

Use a Client Component only when it requires:

- Browser APIs
- Interactive state
- Event handlers
- Client-side effects
- Client-side form behavior
- Realtime subscriptions
- Client-only libraries

Client Components must begin with:

```typescript
"use client";
```

Do not mark an entire route or layout as a Client Component merely because one child requires interactivity.

Keep the client boundary as small as practical.

---

# Page Responsibilities

A page file should:

- Resolve route parameters
- Confirm authentication when required
- Request data through a service
- Compose feature components
- Handle route-level redirects
- Provide route metadata where appropriate

A page file should not become a large feature implementation.

Example:

```typescript
export default async function StudentsPage() {
  const students = await getStudents();

  return <StudentList students={students} />;
}
```

---

# Layout Responsibilities

Layouts provide shared route structure.

The authenticated platform layout may provide:

- AppShell
- Sidebar
- Header
- Main content container
- User-session context
- Navigation
- Toast provider

Layouts must avoid feature-specific business logic.

---

# Server Actions

Server Actions may be used for trusted data-changing operations initiated by forms or application controls.

Server Actions are responsible for:

- Receiving form data
- Validating input
- Confirming authentication
- Calling the appropriate service
- Revalidating affected routes
- Returning a safe result

Server Actions must not:

- Contain raw SQL
- Duplicate service rules
- Expose secrets
- Trust client-submitted identifiers without authorization checks

---

# Route Handlers

Route Handlers belong in:

```text
app/api/
```

Use Route Handlers for:

- Webhooks
- Public or internal HTTP endpoints
- Health checks
- File responses
- Provider callbacks
- Integrations requiring HTTP routes

Normal application forms should generally use Server Actions unless an HTTP endpoint is more appropriate.

---

# Services

Services contain business logic.

A service is responsible for:

- Enforcing business rules
- Coordinating repositories
- Coordinating integrations
- Confirming required authorization context
- Applying workflow rules
- Returning typed domain results
- Translating lower-level failures into application errors

Example responsibilities:

```text
StudentService
- Create a student
- Update a student
- Archive a student
- Validate ministry-level rules
- Coordinate household relationships
- Record an audit event
```

Services must not render UI.

---

# Repositories

Repositories isolate database access.

A repository is responsible for:

- Reading database records
- Creating records
- Updating records
- Archiving or deleting records
- Executing approved database functions
- Mapping database rows to application types
- Returning typed results

Repositories must not contain:

- UI logic
- Toast notifications
- Route redirects
- General business workflows
- Provider-specific integration behavior

---

# Repository Access Rule

Application pages and components must not query Supabase tables directly.

The required flow is:

```text
Component or Page
        │
        ▼
Service
        │
        ▼
Repository
        │
        ▼
Supabase
```

Exceptions require an explicit technical reason and architectural review.

---

# Shared Repository Folder

The root-level folder:

```text
repositories/
```

is reserved for database utilities shared across multiple features.

Examples:

```text
repositories/
├── base-repository.ts
├── pagination.ts
└── repository-errors.ts
```

Feature-specific repositories belong inside their corresponding feature folders.

---

# Shared Service Folder

The root-level folder:

```text
services/
```

is reserved for cross-feature platform services.

Examples:

```text
services/
├── audit-service.ts
├── authorization-service.ts
├── notification-service.ts
└── user-context-service.ts
```

Feature-specific services belong inside their corresponding feature folders.

---

# Integration Structure

External provider logic belongs inside:

```text
integrations/
```

Recommended structure:

```text
integrations/
├── email/
│   ├── email-provider.ts
│   ├── email-service.ts
│   └── types.ts
├── sms/
├── storage/
├── monitoring/
└── calendar/
```

Feature services may call integration services.

Feature components must not call providers directly.

---

# Supabase Structure

Supabase-specific project files belong in:

```text
supabase/
├── migrations/
├── seed.sql
└── config.toml
```

Example:

```text
supabase/
└── migrations/
    ├── 202607220001_create_profiles.sql
    ├── 202607220002_create_people.sql
    └── 202607220003_enable_people_rls.sql
```

All schema changes must be represented by version-controlled migrations.

---

# Supabase Client Structure

Supabase client utilities belong in:

```text
lib/supabase/
```

Recommended structure:

```text
lib/
└── supabase/
    ├── client.ts
    ├── middleware.ts
    ├── server.ts
    └── types.ts
```

## Browser Client

```text
client.ts
```

Used only in browser-compatible Client Components.

It must use browser-safe credentials.

---

## Server Client

```text
server.ts
```

Used in:

- Server Components
- Server Actions
- Route Handlers

It manages authenticated server-side Supabase requests.

---

## Middleware Client

```text
middleware.ts
```

Used by Next.js middleware to refresh sessions and support protected routing.

---

# Configuration

Application configuration belongs in:

```text
config/
```

Example:

```text
config/
├── app-config.ts
├── navigation-config.ts
├── permissions-config.ts
└── feature-flags.ts
```

Configuration should be typed and centralized.

Do not scatter navigation definitions, application names, or operational constants across unrelated components.

---

# Environment Variables

The project will use:

```text
.env.local
```

for local secrets and environment-specific configuration.

The repository must include:

```text
.env.example
```

with placeholder values.

Initial expected variables:

```dotenv
NEXT_PUBLIC_APP_NAME="Youth Ministries Platform"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_ANON_KEY=""

SUPABASE_SERVICE_ROLE_KEY=""
```

The service-role key must never be exposed to Client Components.

---

# Environment Validation

Environment variables should be validated during application startup.

The application must fail clearly when required configuration is missing.

Environment validation should:

- Distinguish public and server-only variables
- Reject missing required values
- Avoid displaying secret values in errors
- Provide actionable development messages

---

# Types

Types should live as close as possible to the domain they describe.

Feature-specific types:

```text
features/students/types/student.ts
```

Shared application types:

```text
types/
├── action-result.ts
├── authenticated-user.ts
├── pagination.ts
└── select-option.ts
```

Database-generated types may be placed in:

```text
lib/supabase/types.ts
```

---

# TypeScript Rules

TypeScript must be used strictly.

Avoid:

```typescript
any
```

Prefer:

- Explicit interfaces
- Explicit return types for services
- Typed props
- Typed action results
- Generated database types
- Narrow union types
- Type guards where necessary

Use `unknown` rather than `any` when receiving untrusted values.

---

# Validation

Zod will be used for runtime validation.

Validation schemas belong inside the appropriate feature:

```text
features/students/schemas/create-student-schema.ts
```

Validation must occur:

- At form boundaries
- At Server Action boundaries
- At Route Handler boundaries
- For environment variables
- For external provider payloads
- For webhook payloads
- For imported data

TypeScript types alone do not validate runtime data.

---

# Naming Conventions

## Folders

Use lowercase kebab-case.

```text
permission-forms
check-in
student-management
```

---

## TypeScript Files

Use lowercase kebab-case.

```text
student-service.ts
student-card.tsx
create-student-action.ts
```

---

## React Components

Use PascalCase names inside files.

```typescript
export function StudentCard() {}
```

File:

```text
student-card.tsx
```

---

## Functions

Use camelCase.

```typescript
getStudents()
createStudent()
archiveStudent()
```

---

## Types and Interfaces

Use PascalCase.

```typescript
type Student = {};
interface StudentProfile {}
```

Do not prefix interfaces with `I`.

Avoid:

```typescript
interface IStudent {}
```

---

## Constants

Use uppercase snake case for true constants.

```typescript
const DEFAULT_PAGE_SIZE = 25;
```

Configuration objects may use camelCase.

---

## Database Names

Use lowercase snake_case.

```text
people
household_relationships
event_registrations
created_at
```

---

# Import Conventions

Use the `@/` path alias for application imports.

Example:

```typescript
import { Button } from "@/components/ui/button";
import { getStudents } from "@/features/students/services/student-service";
```

Avoid deeply nested relative imports.

Avoid:

```typescript
import { Button } from "../../../../components/ui/button";
```

Relative imports may be used for files within the same small module.

---

# Import Order

Use this general order:

1. React and Next.js
2. Third-party packages
3. Shared application modules
4. Feature modules
5. Local relative modules
6. Type-only imports

Example:

```typescript
import Link from "next/link";

import { UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getStudents } from "@/features/students/services/student-service";

import { StudentCard } from "./student-card";

import type { Student } from "@/features/students/types/student";
```

---

# Barrel Files

Feature-level `index.ts` files may expose the public API of a feature.

Example:

```typescript
export { StudentCard } from "./components/student-card";
export { getStudents } from "./services/student-service";
export type { Student } from "./types/student";
```

Barrel files should not create circular dependencies.

Internal files should import directly when that improves clarity.

---

# Error Handling

Errors should be handled at the correct layer.

## Repository Errors

Repositories may identify:

- Database failure
- Record not found
- Constraint violation
- Permission failure
- Connectivity failure

---

## Service Errors

Services translate technical failures into meaningful domain failures.

Examples:

- StudentNotFoundError
- DuplicateRegistrationError
- CheckInNotAllowedError
- PermissionDeniedError

---

## User-Facing Errors

Users should receive:

- Clear messages
- Safe messages
- Actionable guidance
- No database details
- No secrets
- No stack traces

---

# Action Result Pattern

Server Actions should return a predictable typed result.

Example:

```typescript
export type ActionResult<T = undefined> =
  | {
      success: true;
      data: T;
      message?: string;
    }
  | {
      success: false;
      message: string;
      fieldErrors?: Record<string, string[]>;
    };
```

This pattern provides consistent success and failure handling.

---

# Logging

Application logging should capture operationally useful information without exposing sensitive personal data.

Logs may include:

- Event name
- Feature
- User identifier when appropriate
- Request identifier
- Record identifier
- Error classification
- Timestamp
- Environment

Logs must not include:

- Passwords
- Authentication tokens
- Service keys
- Complete sensitive forms
- Unnecessary information about minors
- Private documents

---

# Audit Logging

Audit logging is distinct from technical logging.

Auditable actions may include:

- Student record creation
- Student record changes
- Household relationship changes
- Permission updates
- Check-in and check-out actions
- Attendance corrections
- User-role changes
- Sensitive record access
- Administrative exports

Audit logging will be implemented through a dedicated audit service.

---

# Authentication

Authentication is managed through Supabase Auth.

Initial authentication capabilities include:

- Login
- Registration
- Logout
- Forgot password
- Password reset
- Session refresh
- Protected routes

Future capabilities may include:

- Invitation-only registration
- Email verification
- Multi-factor authentication
- Single sign-on

---

# Authorization

Authentication answers:

```text
Who is the user?
```

Authorization answers:

```text
What is the user allowed to do?
```

Authorization must be enforced through multiple layers:

- Route protection
- Service-level checks
- Database Row-Level Security
- Storage policies
- Role and permission evaluation

Hidden UI elements alone do not provide authorization.

---

# Role Model

Initial platform roles may include:

- Platform Administrator
- Ministry Administrator
- Ministry Leader
- Check-In Volunteer
- Attendance Volunteer
- Communication Coordinator
- Read-Only Viewer

The final role and permission model will be established during Security and Database implementation.

Roles should not be hardcoded throughout UI components.

---

# Person-Centric Domain Model

The platform uses a person-centric model.

A person may participate as:

- Student
- Parent or guardian
- Volunteer
- Staff member
- Authorized pickup person
- Emergency contact

Specialized roles are represented through profiles and relationships rather than isolated duplicate person records.

---

# Household Terminology

The internal domain term is:

```text
Household
```

The user interface may display:

```text
Family
```

This distinction supports varied family structures while keeping the interface familiar to ministry users.

---

# Sensitive Data

The platform handles sensitive information involving minors and families.

Development rules include:

- Use synthetic test data.
- Do not commit personal information.
- Do not copy production data into local development.
- Do not store photographs of minors in Version 1.
- Limit displayed information to what each workflow requires.
- Protect exported reports.
- Keep storage private by default.

---

# Data Mutation Rules

All data-changing workflows should:

1. Validate input.
2. Confirm the authenticated user.
3. Confirm authorization.
4. Execute through a service.
5. Use a repository.
6. Preserve data integrity.
7. Record an audit event where required.
8. Revalidate affected application routes.
9. Return a typed result.

---

# Data Query Rules

Queries should:

- Request only required columns.
- Use pagination for large collections.
- Use filters on the server.
- Avoid returning sensitive fields unnecessarily.
- Use database indexes for frequently filtered values.
- Respect Row-Level Security.
- Return typed domain data.

---

# Archive Before Delete

Core ministry records should generally be archived rather than permanently deleted.

Examples:

- Students
- Households
- Volunteers
- Events
- Permission-form templates

Permanent deletion should be limited to approved cases and may require elevated authorization.

---

# Date and Time Handling

Database timestamps should use UTC.

The application should convert timestamps for user display.

Use:

- ISO 8601 strings at application boundaries
- PostgreSQL timestamp with time zone where appropriate
- Explicit ministry or campus timezone configuration

Do not depend on the developer workstation timezone.

---

# Forms

Forms should use:

- Accessible labels
- Clear required-field indicators
- Server-side validation
- Client-side enhancement where useful
- Safe error messages
- Disabled submission during processing
- Confirmation feedback

Complex forms may use feature-specific form components and schemas.

---

# UI State Standards

Every data-driven screen should consider:

- Loading state
- Empty state
- Error state
- Success state
- Permission-denied state
- Archived state where applicable

Do not leave users with blank screens.

---

# Design System Direction

Sprint 1 will establish a neutral, welcoming ministry-oriented design system.

The interface should feel:

- Safe
- Organized
- Friendly
- Professional
- Calm
- Easy to learn

The interface should avoid:

- Excessive visual clutter
- Childish styling
- Overly corporate presentation
- Low-contrast text
- Unnecessary animation
- Ministry-specific branding that has not been approved

---

# Accessibility

The application should target WCAG 2.1 AA practices where practical.

Requirements include:

- Keyboard navigation
- Visible focus indicators
- Semantic HTML
- Form labels
- Appropriate color contrast
- Screen-reader support
- Meaningful button text
- Accessible dialogs
- Responsive layouts

Accessibility is part of feature completion.

---

# Responsive Design

The platform should support:

- Desktop computers
- Laptops
- Tablets
- Mobile devices

Check-in workflows may require special tablet-friendly layouts.

Responsive behavior must be considered while building each feature rather than added after completion.

---

# Performance

Implementation should favor:

- Server Components
- Server-side filtering
- Pagination
- Minimal client JavaScript
- Efficient Supabase queries
- Optimized image usage
- Route-level loading states
- Selective realtime subscriptions

Performance optimization should remain practical and evidence-based.

---

# Realtime

Realtime may enhance:

- Check-in dashboards
- Attendance activity
- Administrative notifications
- Event registration totals

Core workflows must continue working when realtime connections are unavailable.

Realtime subscriptions should be narrowly scoped and properly cleaned up.

---

# File Storage

Supabase Storage will be accessed through storage services.

Files must use:

- Private buckets by default
- Approved file types
- File-size limits
- Structured object paths
- Authorized access
- Safe generated filenames
- Metadata records when required

UI components must not construct privileged storage URLs directly.

---

# Testing Structure

Tests will be organized by responsibility.

```text
tests/
├── integration/
├── security/
├── smoke/
└── e2e/
```

Feature-specific unit tests may remain inside the feature:

```text
features/students/tests/
```

---

# Testing Priorities

Testing should focus first on:

- Authentication
- Authorization
- Row-Level Security
- Student data changes
- Household relationships
- Event registration
- Attendance
- Check-in and check-out
- Permission forms
- Audit logging

Safety-related and privacy-related workflows receive the highest testing priority.

---

# Test Data

All automated and manual test data must be synthetic.

Recommended names should clearly communicate that records are fictional.

Example:

```text
Student: Test Student One
Guardian: Sample Guardian
Household: Example Household
```

Do not use actual ministry participant information in development documentation or tests.

---

# Code Comments

Comments should explain:

- Why a non-obvious decision exists
- Security-sensitive behavior
- Business-rule reasoning
- Workarounds
- Provider limitations

Comments should not repeat obvious code.

Avoid:

```typescript
// Set name
const name = student.name;
```

Prefer:

```typescript
// Preserve the original registration name for the audit record
// even when the student's preferred name is updated later.
```

---

# Documentation Expectations

Each implemented feature should update relevant documentation.

Possible documentation updates include:

- Functional requirements
- Database documentation
- API documentation
- Security documentation
- User guides
- Project Journal
- Release Notes
- CHANGELOG
- ADRs

Documentation should be updated within the same milestone as the implementation.

---

# Git Workflow

Development should use short-lived branches.

Example:

```text
feature/sprint-1-foundation
```

Commit messages should be clear and scoped.

Examples:

```text
feat: create authenticated application shell
feat: add Supabase authentication
fix: refresh expired user sessions
docs: add implementation project blueprint
test: add login flow validation
```

---

# Definition of Done for a Sprint Step

A Sprint step is complete when:

- Implementation is finished.
- Application builds successfully.
- User verifies expected behavior.
- Errors are resolved.
- Security implications are reviewed.
- Relevant documentation is updated.
- Complete-file replacements were provided where files changed.
- Git commands are supplied when the step is ready to commit.

---

# Definition of Done for Sprint 1

Sprint 1 — Foundation is complete when the platform includes:

- [x] Next.js project created
- [x] TypeScript configured
- [x] Tailwind CSS configured
- [x] Supabase project connected
- [x] Environment variables validated
- [x] Authentication pages implemented
- [x] Login verified
- [x] Registration verified
- [x] Password reset workflow implemented
- [x] Protected platform routes
- [x] Session refresh handling
- [x] Root redirect behavior
- [x] Application shell
- [x] Sidebar navigation
- [x] Header and user menu
- [x] Responsive navigation
- [x] Foundation dashboard
- [x] Shared UI components
- [x] Loading and error states
- [x] Accessibility review
- [x] Build verification
- [x] Sprint documentation completed
- [x] Project Journal created
- [x] Release Notes created
- [x] CHANGELOG updated
- [x] Git commit supplied

---

# Sprint 1 Planned Sequence

Sprint 1 will proceed in this order:

```text
Step 1  — Implementation Project Blueprint
Step 2  — Create Next.js Project
Step 3  — Verify Initial Application
Step 4  — Install Foundation Dependencies
Step 5  — Configure Environment Variables
Step 6  — Configure Supabase Clients
Step 7  — Add Session Middleware
Step 8  — Build Authentication Layout
Step 9  — Build Login
Step 10 — Build Registration
Step 11 — Build Password Recovery
Step 12 — Protect Platform Routes
Step 13 — Build Application Shell
Step 14 — Build Sidebar Navigation
Step 15 — Build Header and User Menu
Step 16 — Build Foundation Dashboard
Step 17 — Responsive and Accessibility Review
Step 18 — Sprint Verification
Step 19 — Sprint Documentation and Git Commit
```

Only one active step should be implemented at a time.

Each step must be verified before proceeding when verification is required.

---

# Implementation Rules

The following rules apply throughout development:

1. Complete the current Sprint step before starting another.
2. Explain the purpose of a change before implementing it.
3. Provide complete file contents for created or modified files.
4. Do not provide partial replacement snippets for project files.
5. Reuse the latest known file contents.
6. Ask for a current file only when its contents are genuinely unavailable or may have changed.
7. Keep business logic out of React components.
8. Keep database access inside repositories.
9. Validate all untrusted input.
10. Enforce authorization on the server and database.
11. Use synthetic development data.
12. Do not introduce optional enhancements during an active milestone.
13. Verify application behavior before documenting completion.
14. Update milestone documentation before moving forward.
15. Preserve the approved architecture unless a new ADR changes it.

---

# Architectural Guardrails

Implementation must not introduce:

- Direct database access from UI components
- Service-role credentials in browser code
- Sensitive data in logs
- Production data in test environments
- Business logic duplicated across components
- Authentication-only authorization
- Public storage buckets without explicit approval
- Unvalidated Server Actions
- Unreviewed destructive migrations
- Dependencies without a defined need
- Major features outside the active sprint
- Photos of minors in Version 1

---

# Initial Navigation Model

Sprint 1 will establish navigation for:

```text
Dashboard
Students
Families
Volunteers
Events
Attendance
Check-In
Permission Forms
Communications
Reports
Settings
```

Routes may initially display foundation or placeholder pages until their feature sprint begins.

Navigation visibility will eventually be controlled by permissions.

---

# Initial Dashboard Model

The foundation dashboard may include placeholder cards for:

- Active Students
- Registered Families
- Active Volunteers
- Upcoming Events
- Today's Attendance
- Current Check-In Status

It may also include:

- Upcoming events
- Recent activity
- Quick actions
- Platform status

Placeholder data must be clearly separated from real database data and removed as features are implemented.

---

# Blueprint Decision

The Youth Ministries Platform adopts this document as the authoritative implementation blueprint for Sprint 1 and future application development.

The platform will use:

```text
Feature-first organization
+
Service-layer business logic
+
Repository-based data access
+
Server-first Next.js architecture
+
Supabase security controls
+
Strict TypeScript
+
Runtime validation
+
Incremental verified delivery
```

Changes to these implementation foundations require review and may require an Architecture Decision Record.

---

# Revision History

| Version | Date | Description |
|---|---|---|
| 0.3.0-alpha | 2026-07-22 | Created the initial implementation project blueprint for Sprint 1. |
