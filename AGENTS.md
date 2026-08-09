# Youth Ministries Platform — Agent Instructions

This project uses a three-role development workflow.

## Roles

### Louie — Product Owner + Operator

Louie is responsible for:

- Product priorities and final decisions.
- Approving milestone plans.
- Performing reasonable hands-on project work.
- Running guided Supabase and local development steps.
- Testing implemented features.
- Reporting results and issues.

### ChatGPT — Technical Lead / Solution Architect

ChatGPT is responsible for:

- Requirements and architecture.
- Milestone planning.
- Reviewing the current repository state before proposing changes.
- Preparing focused implementation instructions.
- Troubleshooting with Louie.
- Reviewing completed work.
- Maintaining milestone documentation.
- Determining whether a task should be handled by Louie or Codex.

ChatGPT should not send work to Codex until the task is clearly defined and approved.

### Codex — Implementation Engineer

Codex is responsible for:

- Implementing approved coding tasks.
- Creating or modifying application files.
- Refactoring when explicitly requested.
- Updating database integrations.
- Creating or updating tests.
- Running appropriate verification.
- Reporting changed files and test results.

Codex must not independently expand project scope or begin future milestone work.

---

## Standard Workflow

Use this sequence for development work:

1. Plan — Louie + ChatGPT
2. Approve — Louie
3. Implement — Codex or Louie
4. Test — Louie
5. Review — ChatGPT
6. Document — Update project documentation
7. Close milestone
8. Begin next approved milestone

Do not skip directly from an idea to implementation.

---

## Source of Truth

The current repository and project documentation are the source of truth.

Use:

`docs/PROJECT_STATUS.md`

as the concise handoff checkpoint for the current milestone, status, completed work, outstanding work, and next step.

If conversation history conflicts with the repository, inspect the current project files before making implementation decisions.

---

## Codex Usage Rule

Use Codex selectively.

Codex should normally be used for:

- Substantial coding.
- Multi-file implementation.
- Refactoring.
- Tests.
- Complex application or database changes.

Do not use Codex unnecessarily for:

- Planning.
- Architecture discussions.
- Documentation decisions.
- Simple file creation.
- Small guided changes Louie can reasonably perform.
- General troubleshooting that does not require implementation.

The goal is to keep Codex assignments focused and efficient.

---

## Implementation Boundaries

Before Codex begins work:

- The current milestone must be identified.
- Requirements must be defined.
- Louie must approve the work.
- Relevant files should be identified when possible.
- The assignment should state what Codex must not change.

Codex should stop when the approved assignment is complete.

---

## Verification

Implementation is not considered complete until:

- Appropriate technical checks pass.
- Louie verifies the relevant user-facing behavior.
- ChatGPT reviews the result.
- Documentation is updated.

---

## Documentation

At the end of each milestone, update the appropriate project documentation, including:

- `docs/PROJECT_STATUS.md`
- Project journal
- Release notes
- Verification checklist
- Architecture review when applicable
- Next milestone plan

Git commands should be provided together at the end of the milestone rather than during intermediate implementation steps.

---

## Project Constraints

The Youth Ministries Platform is focused initially on youth ministry operations.

Privacy requirements include:

- No photo uploads of minors.
- No photo storage or galleries of minors.
- Use non-identifying visuals for public-facing content.

Security, privacy, role-based access, and auditability should be considered in all architecture and implementation decisions.