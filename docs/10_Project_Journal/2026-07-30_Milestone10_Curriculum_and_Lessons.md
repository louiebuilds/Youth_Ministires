# Milestone 10 — Curriculum & Lessons

**Date:** 2026-07-30
**Release:** v0.11.0
**Status:** Complete

## Outcome

Milestone 10 adds a ministry-only Curriculum workspace. Ministry managers can
create, edit, publish, search, and archive lessons; record scripture,
objectives, teaching notes, discussion guides, and preparation notes; create
curriculum plans; and maintain ordered lesson sequences.

Teaching resources support HTTPS video/link records and validated private PDF,
DOCX, PPTX, TXT, and MP4 uploads. Authorized downloads use short-lived signed
links and create audit events. Volunteers receive read-only published content.
Family accounts cannot discover curriculum routes, records, or files.

## Verification

Focused synthetic verification covers clean migration execution, role
boundaries, lesson and plan workflows, ordered lessons, external resources,
private-file metadata, storage authorization, protected downloads, auditing,
and archive denial. All earlier regressions, ESLint, TypeScript, and the
production build passed.

The Product Owner verified the lesson library, search, create/edit/archive
lifecycle, discussion guides, curriculum plans, lesson resequencing, external
resource links, private upload/download, and family denial.

Milestone 11 — Communication Center was not started.
