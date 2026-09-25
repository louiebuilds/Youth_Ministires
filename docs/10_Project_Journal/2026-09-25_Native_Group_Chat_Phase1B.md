# Native Group Chat Phases 1A–1C — Foundation, Rooms, and Messaging

**Date:** September 25, 2026
**Status:** Implemented, applied to development, and live-accepted

Phase 1B adds the room-management workspace at `/communications/chat` on top
of the protected Phase 1A RPC foundation. Group Chat is visibly separate from
official Announcements. Authorized users see only rooms returned by
`list_chat_rooms`; unauthorized room URLs fail closed through `get_chat_room`.

Only active Platform Administrators and Youth Pastors receive room creation,
rename, archive, and membership controls. Candidate options come from the
protected room-type-aware projection. Staff, Parents, and Volunteers receive a
read-only room workspace only when authorized. Archived rooms remain visible
but expose no mutation controls.

Phase 1C subsequently added the protected message conversation experience on
the same Phase 1A RPC contract. Product Owner live acceptance passed for
Administrator/Volunteer two-way messages, own-message right alignment,
other-message left alignment, replies, manager moderation, the removed-message
placeholder, archived-room read-only behavior, compact Room settings, and Chat
navigation active state. Message bodies continue to come only from protected
RPC projections; removed originals remain protected in the database and are
not copied to generic audit metadata.

Migration `202609250001_native_group_chat_phase1.sql` is applied to the
development project and remains immutable. Realtime and unread badge/UI work,
along with dynamic Event/Schedule linking UI, remain unimplemented Phase 1D
work.
