# Project Journal

## Milestone 12 — Prayer & Care

**Date:** August 4, 2026

**Version:** v0.13.0

## Objective

Deliver secure prayer-request coordination and tightly restricted pastoral-care
workflows without exposing confidential information to families, volunteers,
or unauthorized staff.

## Features Completed

- Sanitized public prayer summaries
- Leadership and private prayer-request visibility
- Prayer creation, answered state, archival, and retained answer history
- Confidential care notes and hospital-visit records
- Caregiver assignment and scoped staff access
- Follow-up creation, completion, cancellation, and read-only history
- Confidential-note archival
- Proper first-and-last-name display for linked volunteer accounts
- FUMC Youth Ministries login branding

## Security and Privacy

Direct table access remains blocked. Fixed-search-path protected functions
enforce active-account, role, submitter, and assignment rules. Confidential
content is excluded from public summaries, general notifications, and audit
metadata. Development and acceptance used synthetic data only.

## Verification

All database and authorization verification scripts through Milestone 12
passed. ESLint, TypeScript, and the production build passed. The Product Owner
completed administrator and family-account acceptance and approved the
milestone on 2026-08-04.

## Future Proposal

A moderated ministry community for parents and youth was requested for future
planning. It was not implemented. Before approval it requires decisions for
student-account scope, parental consent, safeguarding, moderation, reporting,
retention, and emergency escalation.

## Milestone Status

**Complete. Milestone 13 has not started.**
