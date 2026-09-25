# Native Group Chat Phase 1B Test Report

**Date:** September 25, 2026
**Scope:** Room management, messaging, and Phase 1D refresh/unread presentation

Verification covers protected room listing, safe unauthorized deep links,
manager-only create/rename/archive and membership controls, room-type candidate
filtering, retained membership removal, archived read-only presentation, and
the absence of message, Realtime, and unread UI.

The existing Communications and platform security suites are also run to
protect Announcements separation and authorization boundaries. Results are
recorded in the implementation handoff after all commands complete.

Phase 1C live acceptance passed two-way Administrator/Volunteer messaging,
own/other message alignment, replies, moderation, removed-message placeholder,
archived read-only behavior, compact Room settings, and Chat navigation active
state. Realtime and unread badge/presentation remain intentionally
deferred from that earlier checkpoint.

Phase 1D Realtime delivery and fallback refresh behavior passed live
acceptance. Unread badges use the authoritative `unread_count`, show exact
values from 1–99, display `99+` above 99, and remain absent for archived rooms.
Unread presentation is technically verified but awaits live acceptance.
