# Project Journal

## Milestone 11 – Communication Center

**Date:** July 30, 2026

**Version:** v0.12.0

---

# Objective

Implement a secure Communication Center that enables ministry leaders to communicate with parents and volunteers while ensuring that no real communication providers are contacted during development.

---

# Features Completed

## Announcement Management

Implemented a complete announcement lifecycle including:

- Drafts
- Editing
- Publishing
- Searching
- Archiving
- Historical records

---

## Communication Templates

Created reusable templates supporting:

- In-App Notifications
- Email
- SMS

Template management includes:

- Create
- Edit
- Search
- Archive

---

## Synthetic Communication

Implemented provider-safe communication testing.

Supports:

- Synthetic Email
- Synthetic SMS
- Synthetic In-App Notifications

No external providers are contacted.

---

## Parent Messaging

Parents can:

- View published announcements
- Receive in-app notifications
- Review communication history

Parents cannot:

- Create announcements
- Edit announcements
- Access template management

---

## Volunteer Messaging

Volunteer communication support was implemented using synthetic verification.

---

## Notification Lifecycle

Implemented:

- Unread notification count
- Mark one notification as read
- Mark all notifications as read
- Notification history retention

---

# Security

Implemented:

- Authorization enforcement
- Audience isolation
- Recipient preference enforcement
- Audit history
- Communication logging

---

# Testing

Automated and completed acceptance coverage includes:

- Announcement testing
- Template testing
- Parent messaging
- Family authorization
- Communication history
- Notification lifecycle
- Automated read/unread verification
- Automated mark-all-as-read verification

Product Owner acceptance passed for announcements, templates, authorization,
parent in-app delivery, history, and synthetic email/SMS. The final family
account check for marking one and all notifications read remains pending.

---

# Lessons Learned

- Synthetic delivery allows full workflow testing without contacting real providers.
- Maintaining a strict service-layer architecture continues to simplify feature development.
- Completed acceptance testing identified no blocking communication defects.

---

# Technical Debt

None identified that blocks Milestone 12.

Future enhancements such as scheduled communications and event-triggered messaging remain intentionally deferred.

---

# Milestone Status

**Milestone 11 implementation and automated verification are complete. Final
Product Owner notification read-state acceptance, documentation finalization,
and the milestone commit remain pending.**

---

## Full Platform Acceptance Draft-Retrieval Correction — September 15, 2026

Full Platform Acceptance found that a newly created Parent announcement draft was visible immediately but appeared missing after navigation and exact-title search. Read-only development inspection confirmed that the row remained durable, unpublished, unexpired, and unarchived, with its sanitized creation audit intact. The defect was application error handling: `listAnnouncements()` converted every protected `list_announcements` RPC error into an empty array, making operational failure indistinguishable from a successful zero-row result.

The service now returns an explicit success result containing announcement rows, including a legitimate empty array, or a distinct failure result. The Communications page preserves “No visible announcements match this search” only for successful empty queries and displays a generic retry message for retrieval failures. Server diagnostics are limited to the fixed operation name, a sanitized error code, and a sanitized category; announcement content, searches, identifiers, raw arguments, and raw database diagnostics are excluded.

The existing protected RPC remains authoritative. Manager draft visibility, Parent and Volunteer audience filtering, publication, expiration, archival, RLS, and direct-table denial did not change. Automated verification passed, but live Product Owner retesting of the retained acceptance draft remains pending and Communications is not marked finally accepted.

---

## Full Platform Acceptance Manager Inbox UX — September 15, 2026

The Product Owner requested a scan-friendly manager experience after observing that full message bodies and expandable edit forms made the Announcements landing page increasingly long. The manager view is now a responsive inbox-style list showing title, human-readable audience, lifecycle status, authoritative last-updated date, and an obvious Open affordance. Search and the corrected empty-versus-failure states remain prominent. Focused routes now handle new announcement creation and individual announcement review, editing, publication, and archival.

Parents and Volunteers continue using the simpler protected audience-scoped reader; the manager create and detail routes fail closed for those roles. Existing server actions, validation, audit history, lifecycle behavior, audience rules, RLS, and direct-table denial remain authoritative.

The existing `list_announcements` return contract did not expose `created_at` or `updated_at`. Local, unapplied migration `202609150002_communication_announcement_projection.sql` replaces only that exact function signature in one transaction, adds those two authoritative fields, and restores authenticated-only execution without changing filtering or authorization logic. Generated database types remain unchanged until approved application. Future Groups/Channels, chat, direct messaging, and external integrations were deliberately not implemented. Automated verification passed; Product Owner live acceptance is still required.

---

## Full Platform Acceptance Session-Isolation Correction — September 20, 2026

The Administrator → Parent → Volunteer → Administrator acceptance sequence exposed a platform-wide session transition defect. The final header showed the Administrator identity, but the Communications child route restored the Volunteer-rendered Router Cache payload: manager controls and the parent-audience announcement were absent while the ministry announcement remained. Read-only verification confirmed the Administrator profile, role, capabilities, announcements, and protected database authorization were unchanged and correct.

Sign-in and sign-out previously changed Supabase cookies, invalidated the root layout, and completed with a Next.js server-action redirect. The redirect could retain a previously visited child RSC payload across identities. Successful authentication mutations now return a sanitized success state and the shared client boundary performs a full-document replacement to `/` or `/login`. Failed mutations do not navigate and retain their existing sanitized errors. The correction applies to every authenticated workspace rather than adding a Communications-specific workaround. No migration, database, RLS, role, capability, or live-data change was made. Communications and Full Platform Acceptance remain pending Product Owner retest.

---

## Full Platform Acceptance Template Management UX — September 20, 2026

The Product Owner identified that the Communication Templates page felt like a large data-entry screen because creation and inline editing dominated the management list. The application now uses a compact responsive template list with an intentional New Template route, a read-only template detail route, and an explicit Edit route. The shared create/edit form responds to its selected channel and shows Email subject only for Email templates.

This establishes **List → intentional Create** and **View → intentional Edit** as a preferred platform UX direction when management or detail pages become overloaded. It should be applied selectively during acceptance review rather than used as justification for a broad refactor. Existing protected template RPCs, server-side capability checks, validation, audit behavior, RLS, and Communications behavior remain unchanged. Live Product Owner verification remains pending, so Communications is not marked finally accepted.

---

## Full Platform Acceptance Template Application Correction — September 20, 2026

Live Compose testing showed that the channel-filtered template selector stored a template reference but did not apply any reusable content to the message fields. The existing template projection already supplied the channel, Email subject, message body, archive state, and identifier, so no database or contract change was necessary.

The Compose form now copies message content for In-app, Email, and SMS templates and copies the subject supported by Email templates. The copied values remain editable. A compatible template can replace blank or unchanged template-derived fields directly; if the manager has manually changed applicable content, changing templates requires explicit confirmation before replacement. Selecting No template clears only the reference and preserves the current draft content. Existing recipient preview, template filtering, archived-template exclusion, synthetic delivery, history, authorization, audit behavior, RLS, and live data remain unchanged. Communications acceptance remains pending Product Owner retest.

The first live retest failed: Youth Event Reminder appeared selected while Message remained blank. The development runtime showed that a browser-restored select value can survive the Compose GET navigation or an already-open tab without dispatching the React change event that the first correction relied on. A second correction reconciles the actual select element on initial display and `pageshow`, then applies the resolved template through the same manual-edit safeguards. Template-application behavior is now isolated in a runtime helper and exercised against actual protected `list_communication_templates` projection rows, proving that the selected option UUID resolves to the projected template and places its real `message_body` into controlled Compose state. Communications remains unaccepted pending a focused second In-app retest.

---

## Final Full Platform Acceptance — September 20, 2026

The Product Owner completed the live acceptance pass for the current Communications feature set. This checkpoint supersedes the pending-retest status recorded in the chronological correction entries above while retaining those entries as defect history.

Live acceptance passed for durable announcement drafts, reload/navigation persistence, exact-title manager search, editing, publication, audience targeting, retained archival and archived search, and automatic expiration. Entire Ministry announcements were visible to Parent and Volunteer; Parents and Guardians announcements were visible only to Parent; Volunteers announcements were visible only to Volunteer. The `Expiration Acceptance Test` announcement disappeared automatically from the refreshed Parent view after its expiration without manual edit or archival.

The Parent received `Youth Fall Kickoff Test Notification`; unread count, mark-as-read, and retained read state passed. Parent recipient preview and synthetic In-app and SMS delivery passed, history recorded the delivered synthetic communications, and no real Email or SMS was sent.

Template create, edit, archive, and archived-template exclusion passed. In-app and SMS templates populated editable Message content. No template removed the reference without destroying edited content, and reselecting a template after manual edits used the replacement safeguard. SMS correctly omitted Email subject; Email correctly displayed the subject field. No active Email template existed, so actual Email-template subject/message application was not live-tested. Automated coverage exists, but this journal does not claim live Email-template application acceptance.

Parent and Volunteer direct access to `/communications/new` and `/communications/templates` returned 404. Narrow/mobile Volunteer testing passed for collapsed navigation, search usability, text wrapping, and absence of obvious horizontal overflow.

The acceptance pass confirms the earlier corrections: list RPC failures no longer masquerade as successful empty results; the missing manager draft became visible; template selection now applies content; and browser-restored selection is reconciled through the same guarded application logic. Migration `202609150002_communication_announcement_projection.sql` is applied in development, history is aligned, and generated types contain its deployed projection fields with the compatibility overlay retained.

**Current Communications status: functionally accepted by the Product Owner.** Real provider Email/SMS delivery remains outside this synthetic-delivery scope. A familiar email/message-style inbox and reading experience, clearer Inbox/Announcements/Notifications separation, and broader GroupMe-like ministry communication are deferred UX/roadmap work and were not implemented during this checkpoint.
