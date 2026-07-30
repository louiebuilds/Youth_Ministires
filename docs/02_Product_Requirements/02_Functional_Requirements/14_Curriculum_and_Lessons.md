# Curriculum and Lessons

**Document ID:** FR-CURRICULUM
**Version:** 1.0
**Status:** Implemented
**Milestone:** 10 — Curriculum & Lessons
**Date:** 2026-07-30

## Scope

Milestone 10 provides a ministry-only curriculum and lesson workspace with a
searchable lesson library, curriculum plans, teaching-resource records, private
file uploads, videos, PDFs, and discussion guides.

## Access Model

- Platform Administrators, Youth Pastors, and Staff Members can create, edit,
  publish, archive, and organize curriculum and lessons.
- Active Volunteer accounts receive read-only access to published curriculum,
  lessons, discussion guides, and approved resources.
- Parent or Guardian accounts cannot access curriculum routes, records, files,
  metadata, or search results.
- Draft and archived content is visible only to ministry managers.

## Curriculum Plans

A curriculum plan includes a title, summary, intended age or grade range,
status, optional start and end dates, and an ordered sequence of lessons.
Statuses are Draft, Published, Completed, and Archived. Plans and lessons are
retained through archive-based lifecycle controls.

## Lessons

A lesson includes a title, summary, teaching objective, scripture references,
lesson body or teaching notes, discussion guide, optional preparation notes,
intended age or grade range, lifecycle status, and teaching resources.
Managers can search all lessons; volunteers can search published lessons only.

## Teaching Resources

A teaching resource belongs to a lesson and includes a title, resource type,
optional description, and either one external HTTPS URL or one private uploaded
file. Resource types are Document, PDF, Video, Link, and Other.

## Private File Storage

- Curriculum files use a private Supabase Storage bucket.
- Downloads use short-lived authorized links from a server-side storage
  service; UI components do not construct privileged storage URLs.
- Object paths use generated identifiers rather than participant names.
- Allowed initial uploads are PDF, DOCX, PPTX, TXT, and MP4.
- PDFs are limited to 25 MB, documents to 15 MB, and videos to 250 MB.
- Executables, scripts, archives, and mismatched extensions or content types
  are rejected.
- Files must not contain production data, identifiable photos of minors,
  identity documents, or unrelated sensitive information.

## Video Boundary

Video resources may use an approved HTTPS link or a private MP4 upload.
Embedding or downloading third-party content, public galleries, livestreaming,
transcoding, caption generation, and identifiable videos of minors are outside
Milestone 10.

## Security and Audit

- Active-account and role checks are enforced by services and database
  functions.
- Database and storage resources remain private by default.
- Create, update, publish, archive, ordering, resource, upload-metadata, and
  protected-download actions are auditable.
- Family access is denied by route, service, database, and storage policy.

## Milestone Boundaries

- General resource categories, version history, and download management remain
  Milestone 13.
- Announcements, email, SMS, and push delivery remain Milestone 11.
- AI lesson suggestions and AI search remain Milestone 18.
- Classroom assignments and recurring rotations remain Milestone 14.
- Advanced analytics remain Milestone 16.

## Acceptance Criteria

| ID | Requirement |
|---|---|
| AC-CUR-001 | Managers can create, edit, publish, complete, and archive curriculum plans. |
| AC-CUR-002 | Managers can create, edit, publish, search, and archive lessons. |
| AC-CUR-003 | Curriculum plans maintain an explicit ordered lesson sequence. |
| AC-CUR-004 | Lessons support teaching notes, scripture references, and discussion guides. |
| AC-CUR-005 | Managers can attach approved private files and HTTPS video links. |
| AC-CUR-006 | Volunteers can read published curriculum and resources but cannot mutate them. |
| AC-CUR-007 | Family accounts cannot discover curriculum records or storage objects. |
| AC-CUR-008 | Curriculum mutations and protected resource access are audited. |
| AC-CUR-009 | Archived records are retained and cannot be edited. |
| AC-CUR-010 | Automated and acceptance tests use synthetic data only. |
