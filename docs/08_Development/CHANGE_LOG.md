# Development Change Log

## v0.5.0 — 2026-07-23

### Added

- Added centralized typed capabilities for all five permanent roles.
- Added active-profile loading to the authenticated server session.
- Added role-filtered desktop and mobile navigation.
- Added server-side capability guards to every protected platform route.
- Added a shared PII-minimized student-name formatter.

### Verified

- Core database regression suite
- Security authorization suite
- Student PII display suite
- TypeScript
- ESLint
- Next.js production build
- Product Owner connected-Supabase and browser acceptance

## v0.4.0 — 2026-07-23

### Added

- Added strict TypeScript definitions for the core database schema.
- Applied the database type contract to browser, server, and proxy Supabase
  clients.
- Added an in-process PostgreSQL migration verification command.

### Verified

- Core migration execution
- Existing and future Auth-user profile creation
- RLS policy and grant boundaries
- Database constraints
- TypeScript
- ESLint
- Next.js production build

## v0.3.0 — 2026-07-23

### Added

- Completed the Milestone 2 Next.js and Supabase foundation.
- Added validated environment configuration.
- Added authentication, session refresh, and protected routing.
- Added the authenticated application shell and complete initial navigation.
- Added responsive navigation, foundation routes, loading states, and error
  states.

### Verified

- ESLint
- TypeScript
- Next.js production build
- Anonymous and authenticated routing
- Desktop and mobile runtime behavior
- Product Owner acceptance testing
