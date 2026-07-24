# Milestone 4 Security Test Report

**Date:** 2026-07-23
**Release:** v0.5.0
**Result:** Passed
**User acceptance:** Passed

---

## Scope

This report records final verification for Milestone 4 — Security.

The tested scope included:

- five permanent account roles;
- active and inactive account lifecycle enforcement;
- centralized application capabilities;
- role-aware desktop and mobile navigation;
- server-side route authorization;
- relationship-aware household and student policies;
- event-scoped volunteer policies;
- parent access to published events;
- role-escalation denial;
- anonymous-access denial;
- audit read oversight and immutability;
- private authorization helper boundaries;
- PII-minimized student display names; and
- regression checks for the Milestone 3 database foundation.

No production ministry or participant data was used.

---

## Automated Verification

| Check | Result |
|---|---|
| Clean Milestone 3 migration execution | Passed |
| Clean Milestone 3 + 4 migration execution | Passed |
| All 19 expected RLS policies | Passed |
| Seven private definer authorization helpers | Passed |
| All five permanent roles | Passed |
| Active and suspended lifecycle boundaries | Passed |
| Related parent student and household access | Passed |
| Cross-household access denial | Passed |
| Assigned and unassigned volunteer event access | Passed |
| Volunteer student-data denial | Passed |
| Role-escalation denial | Passed |
| Anonymous protected-table denial | Passed |
| Audit read boundary and tamper denial | Passed |
| Product Owner SQL acceptance-query contract | Passed |
| Student first-name and last-initial formatting | Passed |
| Repository whitespace check | Passed |
| Documentation link validation | Passed |
| Credential-pattern scan | Passed |
| ESLint | Passed |
| TypeScript through production build | Passed |
| Next.js production build | Passed |

---

## Product Owner Acceptance

The Product Owner:

- applied the Milestone 4 migration to the connected development Supabase
  project;
- ran the read-only acceptance query and confirmed all 12 checks returned
  `true`;
- confirmed an unprivileged account received a Not Found response for
  `/settings`;
- explicitly promoted the designated administrative account instead of
  relying on registration metadata;
- confirmed the active role loaded as Platform Administrator;
- confirmed role-aware navigation and Settings access;
- confirmed sign-out and post-sign-out route protection; and
- reported that the application operated as intended.

The administrative email address is intentionally excluded from this report.

---

## PII Requirement Added During Acceptance

The Product Owner required stronger account, household, and child PII
minimization.

The milestone now requires general student labels to use the preferred or
first name plus only the first letter of the last name, such as `Jordan S.`.
Full legal names require an explicitly authorized safety, legal,
identity-verification, or administrative need.

The shared formatter and its automated tests passed.

---

## Test-Discovered Corrections

Verification identified and corrected:

1. Parameterized multi-statement seed commands unsupported by the local
   PostgreSQL harness.
2. Unused prepared-statement parameters in synthetic test setup.
3. A test-harness variable name reserved by the Next.js ESLint rules.

Every correction was followed by the relevant focused test and final
regression checks.

---

## Deferred Testing

The following require later approved feature or production-readiness
milestones:

- storage bucket and object policy testing;
- authenticated audit-event ingestion;
- administrative user-management workflows;
- attendance and check-in minimum-necessary projections;
- permission-form and communication security;
- report and export security;
- production monitoring, alerting, and provider configuration;
- backup restoration exercises; and
- production incident contact and retention procedures.

All absent capabilities remain denied.

---

## Conclusion

Milestone 4 satisfies its detailed security design, application
authorization, database enforcement, PII minimization, automated verification,
and Product Owner acceptance requirements.
