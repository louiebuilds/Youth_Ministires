# Project Journal

**Date:** 2026-07-23
**Milestone:** 4 — Security
**Release:** v0.5.0
**Status:** Complete

---

## Summary

Milestone 4 converted the approved defense-in-depth architecture and the
Milestone 3 deny-by-default baseline into a detailed, tested authorization
boundary.

The completed security foundation includes:

- final five-role definitions and typed application capabilities;
- active-account lifecycle enforcement;
- server-side active-profile loading;
- role-aware desktop and mobile navigation;
- server-side capability checks on every platform route;
- private fixed-search-path database authorization helpers;
- 19 role, relationship, assignment, and oversight RLS policies;
- parent household and explicitly authorized student access;
- event-scoped volunteer access without general student disclosure;
- published-event access for parent accounts;
- audit read oversight without mutation privileges;
- threat, incident-response, retention, export, rate-limit, session, MFA,
  administrative-review, and security-test decisions;
- account, household, and student PII minimization; and
- a shared first-name and last-initial student display formatter.

---

## Security Outcome

A valid Supabase Auth session is no longer sufficient for platform access. The
application also requires an active database profile and an allowed
capability. PostgreSQL independently evaluates the active role, household or
student relationship, event assignment, and requested resource.

Registration continues to create only a least-privilege parent profile.
Administrative promotion is explicit and cannot be supplied through
registration metadata.

Missing future capabilities remain denied.

---

## Product Owner Decision

During acceptance, the Product Owner required child names to be minimized by
default. General student labels now use the preferred or first name and only
the first letter of the last name. Full legal names are reserved for explicitly
authorized operational needs.

The same privacy-by-default principle was documented for account and household
contact information.

---

## Verification

Verification included:

- both database migration suites;
- all 19 policy and seven helper contracts;
- all five permanent roles;
- active and suspended profiles;
- related and unrelated parent data;
- assigned and unassigned event access;
- privilege escalation and audit tampering denial;
- anonymous-access denial;
- student PII display formatting;
- TypeScript, ESLint, and production build checks;
- connected Supabase acceptance with all 12 checks returning `true`; and
- Product Owner role-aware browser and sign-out testing.

The complete evidence is recorded in:

- `docs/09_Testing/2026-07-23_Milestone4_Security_Test_Report.md`

---

## Outcome

Milestone 4 Security is approved and complete.

No Milestone 5 work was started.
