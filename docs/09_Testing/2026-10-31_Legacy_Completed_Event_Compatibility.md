# Step 31AM — Legacy Completed Event Compatibility

Implemented October 31, 2026, against LOCAL Supabase only. Product Owner acceptance, Technical Lead review, and deployment approval remain pending. This does not close the milestone.

## Finding and correction

The normal Reopen RPC restores `completed_from_status`. Pre-workflow Completed rows have no such history, so it correctly rejects them. Parent calendar and workspace queries likewise require established Published/Active history or an eligible event assignment.

New forward migration `202610310001_legacy_completed_event_compatibility.sql` adds `reopen_legacy_event(uuid,event_status)`. It accepts only active Platform Administrators and Youth Pastors, locks the exact all-null legacy Completed row, requires an explicit Draft/Published/Active target, and atomically records `event.legacy_reopened` with actor, selected target, unknown-history indicator, and reopening timestamp. No completion identity, timestamp, or prior status is fabricated. Partial metadata is excluded. The normal Complete/Reopen RPCs and invoker guard are unchanged.

The new RPC uses SECURITY DEFINER, empty search path, RLS on, and the existing restricted `event_lifecycle_owner`. It adds no table privilege, client bypass setting, or role membership. Anonymous and service-role EXECUTE are revoked. Temporary trusted migration membership/schema CREATE is removed and asserted closed, following the existing PostgreSQL 17 convention.

The protected workspace returns a server-derived `isLegacyCompleted` flag using all three original completion fields. Only the existing authorized lifecycle panel displays the legacy warning and required target selector. A blank selection cannot submit successfully, and the server action validates the target again. Normal events retain their existing one-click Reopen behavior. Publishing/activating warns that parents gain access.

## Parent visibility decision

Keep the existing restrictive calendar and workspace predicates unchanged. Historical RLS and pre-workflow event RPCs allowed parents Published/Active events and eligible assignments; they did not establish blanket access to Completed events. Registration and attendance prove participation, not publication. Historical event create/update audit payloads may assist an authorized review but do not prove complete publication history across unknown legacy writes. No broad legacy access or inferred/backfilled publication state is added. Existing assigned/confirmed/completed assignment access remains consistent in calendar and workspace.

Fall Costume Party (`1a75d927-1674-4d37-a7a7-8da9be7fcddf`) remains a HOSTED reference fact only. Its publication history is unresolved. An authorized reviewer must examine reliable evidence before choosing Published/Active; Draft is available for restricted review. No HOSTED connection was made.

## Files

- New migration: `supabase/migrations/202610310001_legacy_completed_event_compatibility.sql`.
- Event detail page, lifecycle form, server actions, validation schemas, service, workspace type, and database RPC types.
- Extended `scripts/verify-attendance-foundation.mjs` and new `scripts/verify-local-legacy-completed-events.mjs`.
- This report and the concise project-status handoff.
- Local data-preservation evidence: `output/step31am/local-migration-verification.json`.

Existing unrelated working-tree changes were retained. No edits were made to synced project reference files or unrelated modules.

## Verification

The migration was applied individually using the trusted local migration administrator in `supabase_db_Youth-Ministries-Platform`, then recorded once in LOCAL migration history. Exact ordered row-content hashes and row counts matched before/after across all 78 public tables plus `auth.users`. This includes events, lifecycle metadata, attendance, registrations, volunteer assignments, audit history, and existing accounts. Post-test hashes also match this baseline across all 79 tables, confirming fixture cleanup. No data reset or conversion occurred. Test fixtures are isolated and cleaned up; SQL security fixtures roll back.

- Expanded in-memory attendance/event suite: PASS. Seeds real pre-workflow Completed rows before the original workflow migration, runs all three migrations in sequence, verifies all-null metadata and status, partial-metadata exclusions, explicit targets, both leaders, denied roles/inactive leaders, spoofed flag/direct write denials, parent restrictions and assignment access in both projections, audit actor/target, and exact dependent-row preservation.
- Security authorization suite: PASS; 19 authorization policies plus five-role, lifecycle, relationship, event scope, privilege escalation and audit-tampering checks.
- Core database migration suite: PASS; nine core tables, RLS, profile trigger, constraints.
- Existing LOCAL lifecycle REST suite: PASS; all five roles, inactive leadership, direct writes, and exactly four successful lifecycle audits.
- Existing LOCAL PostgreSQL rollback security suite: PASS; client flag, role assumption, forgery/direct-write denial, no authority leakage, and exact dependent-table preservation.
- New LOCAL legacy authenticated REST suite: PASS; 44 checks, exactly two successful audits, no denied-call success audits.
- TypeScript `npx tsc --noEmit`: PASS.
- ESLint: PASS.
- Production build: PASS; 54 generated pages.
- `git diff --check`: PASS.

The first new REST attempt encountered a temporary local Auth 504; the next revealed that local `postgres` cannot assume the restricted owner. Trusted fixture setup was corrected to use local `supabase_admin`; application tests continue to use actual authenticated REST accounts. No application privilege was broadened.

Historical migration SHA-256 values remain unchanged:

- `202610290001`: `c01b91358bc89743203348ebd0d257e5de8ad6aa48682ec1e7da432c24f5ecbe`
- `202610300001`: `c5de13cfe78f7ca607fea272226cbc172a3691f57dad5c7b4dc3bdc2dff5afa1`

## Later HOSTED compatibility review and deployment blockers

Based only on supplied HOSTED facts (PostgreSQL 17.6, lifecycle role absent, workflow/security migrations unapplied), apply the three named migrations in order only after separate approval. The first adds nullable columns without rewriting historical lifecycle values; the second establishes restricted ownership and the secure guard; the third adds explicit legacy recovery without changing historical rows. Do not leave the obsolete first-migration flag guard exposed between rollout steps.

A later authorized read-only HOSTED check must confirm role absence, trusted migration operator CREATE ROLE/ownership-transfer authority, schema ACLs/default grants, helper signatures/owners, trigger state, event enum and relationship compatibility, current migration/schema state, and the exact legacy/partial-metadata inventory. Confirm migration `202610300001` ownership assertions work under the actual hosted operator; its PostgreSQL 17 ADMIN-only membership behavior was verified locally. The workspace replacement preserves the current owner/grants rather than introducing a new definer identity. None of this depends on Live SMS.

Remaining: Product Owner desktop/mobile acceptance, Technical Lead review, explicit deployment approval, later hosted read-only preflight, and authorized sequential migration/application rollout. No commit, push, hosted change, migration reconciliation, Vercel deployment, account recreation, historical migration edit, or milestone closure occurred.
