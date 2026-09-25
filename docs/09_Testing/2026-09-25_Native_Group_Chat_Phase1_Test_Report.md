# Native Group Chat Phase 1 Test Report

**Date:** September 25, 2026
**Status:** Phases 1A–1D technically verified and live-accepted

Coverage includes protected RPCs; Admin/Youth Pastor management and moderation; Staff, Volunteer, Parent, anonymous, inactive, and unrelated-account boundaries; room-type membership eligibility; same-room and cross-room replies; removals; monotonic read state; archives; forced RLS/direct-table denial; and audit privacy.

Commands: `npm run chat:test`, `npm run security:test`, ESLint, TypeScript, `npm run build`, and `git diff --check`. Final results are recorded in the implementation handoff.

Phase 1B verification additionally covers authorized room listing, manager-only
room lifecycle and membership controls, room-type candidate filtering,
unauthorized deep-link denial, and archived read-only presentation. Phase 1C
verification covers protected message projection, sends, same-room replies,
cross-room reply rejection, manager-only moderation, removed placeholders,
message alignment, and archived send denial.

Product Owner live acceptance passed Administrator/Volunteer two-way messaging,
reply and moderation workflows, retained removed-message privacy, archived
read-only behavior, compact Room settings, and Chat navigation active state.

Migration `202609250001_native_group_chat_phase1.sql` is applied to development
and immutable.

Phase 1D verification covers private receive-only room topics, body-free change
signals, active-room subscription cleanup, debounced RPC refresh, manual and
visible-tab polling fallbacks, hidden-tab return refresh, mark-through-latest
visible read state, exact unread counts, the `99+` visual cap, accessible unread
labels, and archived badge suppression. Existing direct-table denial and
protected content retrieval remain unchanged.

Live acceptance passed Administrator/Volunteer Realtime delivery in both
directions, moderation/removal refresh, hidden-tab return refresh, manual
Refresh, unread badge presentation, read-state clearing after opening a room,
and archived-room unread suppression.

Migration `202609250002_native_group_chat_realtime.sql` is applied to
development and recorded in migration history.