# Living Blueprint

# Chapter 6 – Decision Log

**Document Version:** 1.0  
**Status:** Approved  
**Milestone:** 0 – Foundation

---

# Purpose

The Decision Log provides a permanent record of significant architectural, technical, product, and governance decisions made during the development of the Youth Ministries Platform.

The goal is to preserve the reasoning behind important decisions so future contributors understand not only **what** was decided, but **why** it was decided.

This document should grow throughout the life of the project.

---

# Decision Categories

Major decisions generally fall into one of the following categories:

- Product Direction
- Architecture
- Database
- Security
- User Experience
- Development Standards
- Infrastructure
- Third-Party Services
- Performance
- Release Management

Each significant decision should be recorded when it has a lasting impact on the platform.

---

# Decision Record Template

Every decision should include the following information:

## Decision ID

A unique identifier.

Example:

```
ADR-001
```

---

## Date

The approval date.

---

## Title

A concise description of the decision.

---

## Status

Possible values include:

- Proposed
- Approved
- Superseded
- Deprecated

---

## Context

Describe the problem or situation that required a decision.

---

## Decision

Describe the approved solution.

---

## Rationale

Explain why this solution was selected over other alternatives.

---

## Consequences

Describe expected benefits, trade-offs, risks, or future considerations.

---

# Initial Architectural Decisions

The following decisions are approved as part of Milestone 0.

---

## ADR-001

**Title**

Milestone-Based Development

**Status**

Approved

**Decision**

Development proceeds one milestone at a time.

Future enhancements are not introduced during an active milestone unless explicitly approved by the Product Owner.

**Rationale**

This approach improves focus, verification quality, documentation accuracy, and project stability.

---

## ADR-002

**Title**

Documentation as a First-Class Deliverable

**Status**

Approved

**Decision**

Documentation is considered part of the product rather than an optional activity.

Every completed milestone includes the required documentation updates.

**Rationale**

Accurate documentation improves maintainability, onboarding, and long-term project success.

---

## ADR-003

**Title**

Living Blueprint Organization

**Status**

Approved

**Decision**

The Living Blueprint is organized as multiple focused Markdown chapters rather than one large document.

Each chapter covers a specific topic and is stored within the `01_Living_Blueprint` documentation folder.

**Rationale**

This structure improves readability, simplifies maintenance, and avoids oversized documentation files.

---

## ADR-004

**Title**

Version 1 Scope

**Status**

Approved

**Decision**

Version 1 is dedicated exclusively to youth ministry.

The architecture may support future ministry areas, but implementation remains limited to the approved Version 1 scope.

**Rationale**

Maintaining a focused scope reduces complexity and improves delivery quality.

---

## ADR-005

**Title**

Documentation Structure

**Status**

Approved

**Decision**

Every major documentation section contains:

- README.md
- CHANGE_LOG.md
- archive/

Large topics are divided into logical chapter files.

**Rationale**

A consistent documentation structure improves discoverability, version control, and long-term maintenance.

---

## ADR-006

**Date**

2026-07-23

**Title**

Single Permanent Role and Event-Scoped Volunteer Assignments

**Status**

Approved

**Context**

A person may participate in the ministry in more than one context. For
example, the same person may need personal family access and separate
administrative access. A family participant may also volunteer for a specific
event without becoming a permanent volunteer account.

**Decision**

Each account has exactly one permanent primary role.

A person who needs personal and administrative access uses separate accounts
for those contexts.

A family or personal account may receive a temporary volunteer assignment
scoped to a specific event. That assignment does not change the account's
permanent primary role.

**Rationale**

Separate account contexts and temporary assignments preserve least privilege,
make administrative activity easier to audit, and avoid granting lasting
volunteer permissions for occasional participation.

**Consequences**

- The future database model must distinguish permanent roles from scoped
  assignments.
- Row-Level Security must evaluate both the permanent role and an assignment's
  event scope.
- Administrative and personal actions remain attributable to separate account
  identities.
- Registration must never allow self-assignment of privileged roles.

---

# Decision Maintenance

Existing decisions should never be deleted.

If a decision changes, a new decision record should reference the previous one and explain why the change occurred.

Historical context is valuable and should be preserved.

---

# Relationship to ADRs

The `docs/14_ADRs` directory contains detailed Architecture Decision Records for significant technical decisions.

This Decision Log serves as the high-level index and summary of those records.

Each ADR should reference the applicable entry in this log when appropriate.

---

# Governance

The Product Owner approves product and scope decisions.

Technical leadership approves implementation details consistent with the approved architecture.

All major decisions should be documented before they affect production systems.

---

# Decision Log Statement

Thoughtful decisions are one of the project's most valuable assets.

By documenting important choices and the reasoning behind them, the Youth Ministries Platform preserves institutional knowledge, improves transparency, and enables confident future development.
