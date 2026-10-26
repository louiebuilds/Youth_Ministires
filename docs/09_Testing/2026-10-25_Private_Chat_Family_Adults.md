# Private group adult and family selection — October 25, 2026

Stage: Pre-Beta Development and Validation. Local implementation only; acceptance pending.

## Behavior and authorization

Existing room membership, message history, single-adult removal, ownership, audit,
and official room authorization are retained. The private group picker combines
selections without duplicates and reviews the exact adult profile IDs submitted.
Existing members are marked in family listings and excluded from new selections.
Only household memberships marked `is_responsible_adult` derive family adults.
A linked active platform profile is required. Linked inactive people and any
student-linked profile (including archived student records) are excluded.
Existing role and Parent invitation discovery restrictions also apply.

Family names/identifiers are returned only when `private.can_view_household`
already authorizes access. Other Parents opting in does not authorize discovery
of their families. This intentionally limits a Parent to existing family access.
Visible families with no eligible registered adults show an explicit empty state.
Unregistered adults, student records, contacts, emails, and student information
are not returned. A family RPC failure leaves individual selection available.

The protected batch RPC rechecks management, active room, adult eligibility,
and visibility of every submitted family before inserting. Existing add-member
RPC supplies its existing authorization and audit behavior. The batch is atomic,
locks the room for concurrent batches, skips retained members, and bounds each
request to 100 adults. A private-group guard in the old single-member RPC also
prevents crafted student additions. No direct table grants or RLS changes.
Family selection has no automatic effect on future family or chat relationships.

## Files changed

- app/(platform)/communications/chat/[roomId]/page.tsx
- features/communications/chat/actions/chat-room-actions.ts
- features/communications/chat/components/chat-room-management.tsx
- features/communications/chat/components/private-chat-adult-picker.tsx (new)
- features/communications/chat/schemas/chat-room-schema.ts
- features/communications/chat/services/chat-room-service.ts
- features/communications/chat/types/chat.ts
- supabase/migrations/202610250001_private_chat_family_adults.sql (new)
- supabase/migrations/202610250002_exclude_student_chat_membership.sql (new security correction)
- scripts/verify-native-group-chat.mjs
- docs/PROJECT_STATUS.md (appended checkpoint; prior local edits preserved)
- docs/09_Testing/2026-10-25_Private_Chat_Family_Adults.md (new)

## Local verification

- `npm run lint`: passed.
- `npx tsc --noEmit`: passed.
- `npm run chat:test`: passed using isolated PGlite; no hosted database access.
  Includes new student discovery and both endpoint rejection checks, responsible
  adult derivation, empty family, multiple visible families, hidden family,
  unauthorized family request, nonowner rejection, duplicate/idempotent batch,
  and official room rejection. Existing message preservation, individual removal,
  ownership, inactive accounts, opt-out, archival, and moderation tests also pass.
- `git diff --check`: passed.
- `npm run build`: passed on network-enabled retry, including TypeScript and all
  54 generated pages. The initial restricted run could not download Google fonts.
- Browser interaction, responsive appearance, and live RLS acceptance: pending.

## Manual acceptance in development

1. Review and apply the two October 25 migrations in numeric order to an
   approved development database: `202610250001`, then `202610250002`.
   Do not run a blanket database push; existing migration-history drift remains.
2. Prepare synthetic active Parent accounts A/B/C linked to responsible adults
   in a family A can already view. Opt B/C in to Parent invitations. Include an
   opted-out account, an inactive profile, an unregistered adult, and student
   records. Add a second visible family and a visible family without eligible
   adults. Use a manager with existing wider family access if needed; never
   broaden Parent family permissions to manufacture the test.
3. Sign in as A; create a private group and open Room settings. Search using
   Add Individual Adults, select B, review, confirm, and verify one membership.
4. In a fresh group select Add Family Adults, select the family, verify the
   eligible names, confirm, and verify each selected adult was added separately.
5. Repeat in a fresh group, uncheck C in Review, confirm; verify C was not added.
6. Select both visible families. Verify combined review, deduplication for shared
   adults, and one retained membership per selected account after confirmation.
7. Reopen the picker. Existing members are marked and never added twice. Repeat
   the same protected batch request to verify it remains idempotent.
8. Select/search the empty family: verify the no-eligible-adults explanation.
   Verify students, inactive profiles, unregistered and opted-out adults cannot
   be selected. Change discovery/status after loading; submission must fail.
9. As A verify an unrelated family's name and relationships never appear even
   if its adults opted in. Send a crafted hidden family/profile ID through the
   action/RPC: reject the entire request without adding any selected adults.
10. Send messages before adding members; verify their bodies, authors and order
    after additions. Remove B only; verify C and existing messages remain.
11. Change a household relationship and add a new family adult; verify no chat
    membership automatically changes. Re-adding requires explicit selection.
12. As a member other than owner try family discovery/additions; reject. As a
    Parent try these RPCs against an official ministry room; reject. Verify a
    ministry manager can still use the existing official-room member form.
13. Repeat selection, review, deselection, confirmation and removal at desktop
    and 375px mobile widths. Check keyboard labels, touch targets, pending state,
    scrollable candidates, readable long names, no horizontal overflow, and
    error/status announcements. Check closed groups remain read-only.

## Release steps — only after Product Owner approval

1. Complete development manual acceptance and Technical Lead review; review the
   exact pending migration and compare remote prerequisites read-only.
2. Follow docs/12_Ministry_Operations/01_Staging_and_Production_Release_Runbook.md.
   Back up production, confirm prior chat migrations are installed, and apply
   `202610250001_private_chat_family_adults.sql`, then
   `202610250002_exclude_student_chat_membership.sql`, using the reviewed controlled
   migration procedure. Record its version; do not repair historical drift.
3. Deploy the reviewed application revision through the existing Vercel Production
   workflow. No dependencies or environment variables are added. Do not deploy
   the new UI before its RPC migration is installed.
4. Run authenticated role, private-group, official-room and responsive smoke tests.
   If application rollback is needed, revert to the prior deployment; retain the
   additive migration and existing records pending a reviewed database decision.

No database was modified remotely. No commit, push or deployment was performed.
Do not mark acceptance or milestone closure until Louie tests and ChatGPT reviews.


## P1 review correction — student membership paths

Technical review found that private-room owner insertion and official-room
membership addition still accepted student-linked profiles. Forward migration
`202610250002_exclude_student_chat_membership.sql` closes both paths; neither
prior migration was edited. It depends on `202610250001` and its existing chat
prerequisites and must be applied after it, before releasing the enhancement.

The create-room RPC now checks a private-group creator's profile/person link
against all student records before any room, owner membership, or audit insertion.
The shared add-member RPC rejects a student-linked target for any room, before
inserting membership or its success audit event. Archived student records are
included in both checks. Existing role checks, invitation consent, household
visibility, RLS, audit behavior, and eligible adult memberships remain intact.
No existing student/account records or retained memberships are altered.

Regression tests verify rejected creation leaves room/membership counts unchanged,
Administrator and Pastor official additions are denied, no official membership
is left, archived student records cannot bypass either check, legitimate adult
official membership succeeds, and automatic adult owner membership is preserved.
The full existing chat suite also passes. This detects student identity through
`profiles.person_id = students.person_id`, as in the family enhancement; it does
not introduce a new age-verification or account-provisioning workflow.

Manual development retest: use synthetic student-linked Parent credentials;
private group creation must fail without leaving a room/member. As Administrator
and Youth Pastor, attempt adding that profile to an official room through the
protected RPC: both must fail without membership or success audit records. Repeat
with the student's record archived. Repeat both workflows with an eligible adult;
verify successful creation, owner membership, and official membership. Retest
private family selections and prior message history. Never create real student
accounts for acceptance testing; use isolated synthetic fixtures.

Local validation for the correction passed: `npm run chat:test`, `npm run lint`,
`npx tsc --noEmit`, `npm run build` (54 generated pages), and
`git diff --check`. Manual development acceptance and Technical Lead re-review
remain pending.
No migration application, commit, push, or deployment is authorized by this work.
