# Youth Ministries Platform — Project Status

> Shared project checkpoint for Louie, ChatGPT, and Codex.
> This file is the primary handoff reference for determining where development currently stands.

---

## Project

**Name:** Youth Ministries Platform  
**Organization:** Coppell FUMC Youth  
**Product Owner / System Administrator:** Louie  
**Primary Stakeholder:** Youth Pastor

---

## Development Roles

### Louie — Product Owner + Operator

Responsibilities:

- Defines product needs and priorities.
- Makes final product decisions.
- Approves milestone plans.
- Performs reasonable hands-on project work.
- Runs guided Supabase/database operations when appropriate.
- Tests implemented features.
- Reports verification results to ChatGPT.

### ChatGPT — Technical Lead / Solution Architect

Responsibilities:

- Defines requirements.
- Designs architecture and technical solutions.
- Plans milestones.
- Reviews existing implementation before changes.
- Prepares focused Codex implementation assignments.
- Troubleshoots problems with Louie.
- Reviews completed implementation.
- Maintains milestone documentation.
- Determines when Codex is actually necessary.

### Codex — Implementation Engineer

Responsibilities:

- Implements approved coding work.
- Creates or modifies application files.
- Performs substantial refactoring.
- Implements database/application integration.
- Creates or updates tests.
- Runs appropriate technical verification.
- Reports files changed and verification results.

Codex should not independently determine product scope or begin future
milestone work.

---

## Standard Development Workflow

1. **Plan** — Louie + ChatGPT
2. **Approve** — Louie
3. **Implement** — Codex or Louie
4. **Test** — Louie
5. **Review** — ChatGPT
6. **Document** — Update project documentation
7. **Close Milestone**
8. **Begin next approved milestone**

Codex should only be used when there is a clearly defined implementation task.

---

## Source of Truth

The project repository and its documentation are the source of truth.

This file provides the concise current project checkpoint.

When conversation history and project files disagree, inspect the current
project files before making implementation decisions.

---

## Technology Stack

- Next.js
- React
- TypeScript
- Supabase
  - PostgreSQL
  - Authentication
  - Row Level Security
  - Private Storage
- Application database types:
  - `lib/supabase/database.types.ts`

---

## Current Version

**v0.14.0**

---

## Last Completed Milestone

**Milestone:** Milestone 13 — Resource Library  
**Version:** v0.14.0  
**Completed:** August 9, 2026  
**Status:** Complete and Product Owner approved

Milestone 13 delivered the secure general ministry Resource Library.

Completed capabilities include:

- Resource categories
- Category creation, renaming, and archival
- Resource creation
- Draft, Published, and Archived lifecycle
- Resource search and filtering
- Audience-aware resource visibility
- Private Supabase Storage
- Validated file uploads
- Generated storage object paths
- Initial file uploads
- Replacement file uploads
- Immutable file versions
- Current-version tracking
- Version notes
- Manager-only version history
- Protected current-file downloads
- Protected historical-version downloads
- Short-lived signed download URLs
- Resource Library navigation
- Parent/family Resource Library access
- Volunteer authorization
- Anonymous-access denial

---

## Milestone 13 Verification

### Automated Verification

`npm run resource-library:test`

**Result:** Passed

Verified:

- Migration execution
- Private storage
- Immutable version history
- Manager authorization
- Family authorization
- Volunteer authorization
- Direct-access restrictions
- Category workflows
- Resource workflows
- Search
- Publication
- Audience restrictions
- Archival
- Upload validation
- File replacement
- Version history
- Protected download authorization

### Application Verification

`npm run lint`

**Result:** Passed

`npm run build`

**Result:** Passed

The project does not currently define a separate `typecheck` npm script.

### Product Owner Acceptance

**Administrator UI:** Passed  
**Parent/Family UI:** Passed  
**Anonymous denial:** Passed

A dedicated volunteer UI test account was not available during acceptance.
Volunteer authorization and audience restrictions passed automated
verification.

This limitation did not block Milestone 13 acceptance.

---

## Milestone 13 Documentation

Milestone closure documentation includes:

- `docs/09_Testing/2026-08-09_Milestone13_Resource_Library_Test_Report.md`
- `docs/10_Project_Journal/2026-08-09_Milestone13_Resource_Library.md`
- `docs/11_Release_Notes/v0.14.0_Milestone13_Resource_Library.md`

---

## Security and Privacy

The Resource Library maintains the following protections:

- Private storage
- Anonymous-access denial
- Direct table-access restrictions
- Direct storage-access restrictions
- Server-authorized uploads
- Server-authorized downloads
- Short-lived signed download URLs
- Audience-aware visibility
- Manager-only historical versions
- Immutable version metadata
- Generated storage object paths

Identifiable photographs or videos of minors remain prohibited.

Resource files must not contain prohibited confidential participant,
medical, identity, background-check, prayer/care, credential, or other
sensitive information.

---

## Milestone 13 Boundary

Milestone 13 did not introduce:

- Volunteer scheduling
- Permission slips or medical releases
- Custom forms
- Reporting or download analytics
- AI document search or analysis
- Public galleries
- Mobile/offline Resource Library functionality

Curriculum-specific resources remain owned by the Curriculum feature.

---

## Current Milestone

**None active.**

Milestone 13 is complete.

The next milestone must enter the Planning phase before implementation begins.

---

## Codex Assignment

**None.**

No additional Codex implementation was required to close Milestone 13.

Do not begin implementation of the next milestone until Louie and ChatGPT
complete planning and Louie approves the milestone.

---

## Next Step

Determine and plan the next approved Youth Ministries Platform milestone.

The next workflow is:

1. Review the approved requirements for the next milestone.
2. Review relevant existing repository implementation.
3. Define milestone scope and boundaries.
4. Define architecture and security requirements.
5. Define acceptance criteria.
6. Louie approves the milestone plan.
7. Determine whether implementation belongs to Louie or Codex.
8. Begin implementation only after approval.

---

## Future Proposal

A moderated parent/youth ministry community remains a future proposal.

It requires separate planning and approval covering:

- Student-account scope
- Parental consent
- Safeguarding
- Moderation
- Reporting
- Retention
- Emergency escalation

It must not be introduced automatically as part of another milestone.

---

## Workflow Rule

**Plan → Approve → Implement → Test → Review → Document → Close**

The repository and this checkpoint, rather than conversation history alone,
determine where development resumes.

---

_Last updated: August 9, 2026_