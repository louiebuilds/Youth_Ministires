# Curriculum and Lessons Database

**Version:** v0.11.0
**Milestone:** 10 — Curriculum & Lessons
**Status:** Implemented

## Data Model

- `curriculum_plans` retains plan metadata and lifecycle state.
- `lessons` retains teaching content, scripture references, objectives,
  discussion guides, preparation notes, audience, and lifecycle state.
- `curriculum_plan_lessons` maintains a unique ordered lesson sequence.
- `teaching_resources` retains external-link or private-file metadata.

Core curriculum records are archived rather than permanently deleted.

## Access

Platform Administrators, Youth Pastors, and Staff Members manage curriculum.
Volunteers read published plans, lessons, and resources. Parent or Guardian
accounts are denied. Forced RLS, revoked direct table grants, fixed-search-path
security-definer functions, and application capabilities enforce the boundary.

## Storage

The private `curriculum-files` bucket permits PDF, DOCX, PPTX, TXT, and MP4
content with approved size limits. Generated object paths contain lesson and
resource identifiers rather than participant names. File metadata is finalized
only after the uploaded object is verified. Authorized downloads use
short-lived signed URLs and create audit events.

## Integrity

Database constraints enforce lifecycle/archive consistency, date ordering,
unique plan sequence positions, one resource source, HTTPS external links,
allowed metadata combinations, file sizes, content types, and extensions.
Material curriculum, plan-order, resource, and download-authorization actions
are audited.
