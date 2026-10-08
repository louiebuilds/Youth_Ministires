# User Guide Source

This folder is the documentation source of truth for user-facing Help & Guide content in the Youth Ministries Platform.

Guides in this folder must:

- Be task-based and written in clear, practical language.
- Match the platform's actual, currently available behavior.
- Be updated whenever a workflow materially changes.
- Accurately reflect authorization, privacy, confidentiality, pickup/release, and other sensitive ministry rules.
- Avoid promising planned features as though they already exist.

## Phase 1 maintenance

Phase 1 intentionally keeps in-platform guide data in `features/help/data/help-guides.ts` and repository documentation in Markdown. This small amount of duplication keeps the application simple and the documentation directly readable without introducing a generator or content-management system.

When a guide changes, update its typed application entry and matching Markdown document in the same change. The guide title, summary, audience, category, section order, instructions, and safety guidance should remain aligned.

## Available guides

- [Youth Director Quick Start Guide](./youth-director-quick-start.md)
