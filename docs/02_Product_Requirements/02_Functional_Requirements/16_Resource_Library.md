# Resource Library

**Document ID:** FR-RESOURCE-LIBRARY
**Version:** 1.0
**Status:** Approved for Milestone 13 implementation
**Milestone:** 13 — Resource Library
**Approved:** 2026-08-05

## Purpose

Milestone 13 provides a secure, searchable library for general ministry
documents, images, and videos. Resources use private storage, audience-aware
publication, retained file versions, and protected downloads.

## Approved Access Model

- Platform Administrators and Youth Pastors may manage all resources,
  categories, publication, lifecycle state, and file versions.
- Staff Members may create and manage Resource Library content.
- Volunteers may view and download published resources whose audience includes
  volunteers.
- Parents or Guardians may view and download published resources whose
  audience includes families.
- Anonymous users receive no Resource Library access during Milestone 13.
- Draft and archived resources and complete version history remain visible
  only to authorized ministry managers.

## Resources

A resource includes a title, optional description, category, resource type,
audience, lifecycle status, and current file version. Supported resource types
are Document, Image, Video, and Other approved files.

Resources support Draft, Published, and Archived states. Archived resources
are retained and excluded from ordinary active lists.

## Categories and Search

- Ministry managers may create, rename, and archive categories.
- Category names are unique among active categories.
- Search supports resource title, description, category, type, audience, and
  lifecycle filters as authorized for the signed-in account.
- Search results must never reveal unauthorized metadata or file names.

## Private Files and Version History

- Files use a private Supabase Storage bucket.
- Storage object paths use generated identifiers rather than participant names.
- Uploads require an approved extension, content type, and size.
- Replacing a file creates a new immutable version; it does not overwrite or
  delete the prior version.
- Only one version is current at a time.
- Historical versions remain manager-only and are retained for audit and
  recovery.
- UI components do not construct privileged storage URLs.

## Downloads

- Downloads use short-lived authorized links created by a server-side service.
- The database rechecks active-account, publication, audience, lifecycle, and
  manager authorization before a download is issued.
- Every protected download records an audit event without copying file content
  or confidential metadata.

## Privacy and Safety

- Development and acceptance use synthetic metadata and files only.
- Identifiable photographs or videos of minors are prohibited in Version 1.
- Resource files must not contain production participant data, medical data,
  identity documents, background-check reports, confidential prayer/care
  information, credentials, or executable content.
- Storage remains private by default and direct object access is denied.

## Milestone Boundary

- Curriculum-specific resources remain owned by Milestone 10; Milestone 13
  provides the general ministry library.
- Volunteer scheduling remains Milestone 14.
- Permission slips, medical releases, and custom forms remain Milestone 15.
- Reporting and download analytics remain Milestone 16.
- AI document search and analysis remain Milestone 18.
- Public galleries and mobile/offline features are not included.
- Milestone 14 must not begin during this work.

## Acceptance Criteria

- Authorized managers can create categories and draft resources.
- Managers can upload approved documents, images, and videos.
- Managers can publish and archive resources.
- Replacing a file preserves earlier immutable versions.
- Search and category/type/audience filters return only authorized resources.
- Volunteers and families see only published resources for their audience.
- Anonymous and unauthorized accounts cannot discover metadata or files.
- Protected downloads are short-lived and audited.
- Direct table and storage access is denied.
- Automated tests and separate administrator/family acceptance use synthetic
  data and pass.
