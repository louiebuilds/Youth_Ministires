# Milestone 3 Core Database Foundation Test Report

**Date:** 2026-07-23  
**Release:** v0.4.0  
**Result:** Passed  
**Product Owner acceptance:** Passed

---

## Scope

This report records final verification for Milestone 3 — Core Database
Foundation.

The tested scope included:

- migration execution;
- core tables, enums, indexes, constraints, and triggers;
- permanent primary account roles;
- existing and future Auth-user profile creation;
- event-scoped volunteer assignments;
- forced Row-Level Security;
- own-profile access and cross-profile denial;
- denial of direct access to protected ministry and audit tables;
- strict Supabase database typing;
- application regression checks.

---

## Automated Verification

| Check | Result |
|---|---|
| Core migration executes in PostgreSQL-compatible runtime | Passed |
| Nine approved core tables exist | Passed |
| RLS is enabled and forced on every core table | Passed |
| Only the own-profile baseline policy exists | Passed |
| Existing Auth users receive a profile during migration | Passed |
| Future Auth users receive a `parent` profile | Passed |
| Authenticated user reads only their own profile | Passed |
| Authenticated user cannot change their permanent role | Passed |
| Student and audit tables deny direct authenticated access | Passed |
| Invalid event time order is rejected | Passed |
| Future student birth dates are rejected | Passed |
| TypeScript check | Passed |
| ESLint | Passed |
| Next.js production build | Passed |
| Repository whitespace check | Passed |

The repeatable database command is:

```text
npm run db:test
```

---

## Product Owner Acceptance

The Product Owner applied the version-controlled migration to the connected
development Supabase project and ran the read-only acceptance query.

All six acceptance results returned `true`:

- all nine tables have forced RLS;
- all nine tables exist;
- only one baseline policy exists;
- the own-profile policy exists;
- every Auth user has a profile;
- all initial profiles use the least-privilege role.

No personal profile details were returned by the acceptance query.

---

## Deferred Testing

The following remain intentionally deferred:

- final permission matrix;
- relationship-aware and role-aware RLS policies;
- feature repository and service workflows;
- attendance, registration, check-in, permission-form, and communication
  tables;
- storage policies;
- production deployment testing.

These belong to later approved milestones.

---

## Conclusion

Milestone 3 satisfies its database design, migration, security-baseline,
typing, automated verification, and Product Owner acceptance requirements.
