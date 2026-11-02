# Communications audiences and ministry delivery — LOCAL release verification

November 2, 2026. Current local branch: `release/communications-recipients-2026-11-02`.
Worktree: `C:/Project/Youth-Ministries-Platform/output/communications/release-worktree`.
Status: ready for HOSTED deployment approval, subject to fresh release guards and the explicit activation steps below. No hosted changes, GitHub writes, Vercel changes, or live emails occurred. Changes remain uncommitted and unpushed.

This continues the previously verified enhancement. Its original 17-file candidate was preserved and copied into the requested local release branch from the actual deployed base `2a023572c30067b37f1301db57b7e9f5c7756ef3`. Existing unrelated changes in the primary working tree were left untouched. The first two migrations are byte-identical to their previously verified versions. These instructions supersede the earlier restricted-only rollout and the requirement to supply a beta-recipient list for normal ministry delivery.

## Audiences

- **Parents:** eligible active parent accounts and qualifying household/student legal guardians with valid email and existing email authorization.
- **Volunteers:** active volunteer records, including parent volunteers and volunteer-only adults. Parent status alone never implies volunteer status.
- **Ministries:** the union of Parents and Volunteers. Addresses are trimmed/lowercased and deduplicated, with exactly one eligible queued destination per unique address.

Inactive accounts/people/volunteers, missing or invalid addresses, student accounts, opted-out parents, and unrelated administrator/staff accounts are excluded by the existing shared database resolver. Parent volunteers cannot bypass parent email preferences. Matching, available, excluded and duplicate counts and masked exclusion reasons remain in the existing preview UI. The actual send selects recipients server-side in a single statement snapshot and checks the confirmed count again. Claim time rechecks eligibility and delivery policy.

The Ministries option and all three audience pages were verified through authenticated LOCAL HTTP requests against the built release. Displayed ministry-mode counts matched the policy-aware database RPC exactly. Selection only requests a preview. Communication, delivery and captured-operation counts were unchanged after all audience page requests. Sending still requires Review email, the final checkbox/confirmed count, and an explicit submission. No automatic send was added.

## Two delivery policies, separate from transport

`COMMUNICATIONS_EMAIL_MODE` remains the existing `synthetic`/`live` transport control. Setting it to live does not authorize ministry delivery.

The new server-only `COMMUNICATIONS_EMAIL_DELIVERY_POLICY` accepts:

- `restricted` (default): existing server environment allowlist AND the protected database test allowlist must authorize a recipient. Missing/empty lists fail closed. This preserves a restricted real-email testing mode; synthetic mode remains available without provider submission.
- `ministry`: no recipient allowlist is required or maintained. The server permits all eligible recipients, but the database must independently approve ministry delivery. Empty or old testing lists do not exclude eligible ministry recipients in this mode.

Invalid server policy disables live sending. Missing credentials/sender also disables it. Browser form/query parameters cannot set deployment policy. The provider boundary defaults to restricted, rejects unknown policy, and rechecks the current server policy before each submission. Ministry mode uses the existing Resend provider, one address per message, and existing provider/idempotency/error handling.

The independent database setting is the singleton row in `private.communication_email_delivery_policy`, created as `restricted`. Only a trusted database operator can change it; public, anonymous, authenticated, and service-role table privileges are revoked, and forced RLS has no client policy. A browser user with an administrator application role cannot toggle it. Missing database policy fails closed.

`private.communication_email_delivery_operations` captures the policy used to queue each operation. It is also private and inaccessible to browser/service roles. Legacy callers and legacy queued operations stay restricted. Changing the global setting to ministry never upgrades an existing restricted queue. Revoking database ministry approval suppresses unattempted ministry claims. Existing idempotency keys cannot change their captured policy. Audit creation records the policy; existing communication history remains intact.

The policy-aware RPC overloads preserve existing signatures as restricted wrappers. They retain the active-leadership authorization checks, masked preview and shared audience/eligibility logic. Caller-supplied allowlists cannot authorize ministry delivery while the trusted database setting is restricted. No raw browser recipient list is accepted for sending.

## Migrations and data preservation

Apply these in order after approval:

1. `202611020001_communication_email_recipients.sql` — unchanged; SHA-256 `201c6783e562a817097333dfce98698db78e227376d7a8823013ecaed1104a91`.
2. `202611020002_communication_email_recipient_snapshot.sql` — unchanged; SHA-256 `795812f31a869569728d480be9095a3e0d6a3fcccd9799ac2e78d37125293aa0`.
3. `202611020003_communication_email_delivery_policy.sql` — new; SHA-256 `bc2d5b2e329c0ad18bf7cea377ff4e1df01cd2f3db11ea1026a9328ae6394467`.

The third migration adds two private tables, a protected policy helper, policy-aware RPC overloads/restricted compatibility wrappers, and policy-aware claims. It makes no existing-table column changes and rewrites/deletes no existing rows. New objects adopt the existing trusted definer owner; owner compatibility is asserted. No broad client privilege, reset, account deletion, historical migration edit, or SMTP/API-key change is introduced. The new policy is seeded restricted; the migration never enables ministry delivery.

The third migration was rehearsed with the combined SQL fixtures in an actual LOCAL Supabase rollback transaction, then applied and recorded individually on `supabase_db_Youth-Ministries-Platform`. Transactional assertions confirmed exact row-count/content fingerprints across all 79 existing public/Auth-user tables before committing. Final comparison after Auth/HTTP tests also matched all 79. Test fixtures were cleaned up; the saved local policy is restricted, captured-operation count is zero, and the existing restricted allowlist was preserved. Earlier migration hashes still match their original evidence.

No hosted database, GitHub, or Vercel operation was performed in this iteration. Earlier hosted identity/schema/owner/RLS and deployment/branch preflight evidence was reused. All three pending versions and the actual production deployment must be guarded again immediately before an approved rollout; a new hosted preflight was not run during this local-only change.

## Verification results

Passed for the updated release:

- `node scripts/verify-communication-recipients.mjs`: original audience/consent/deduplication/security cases plus the new delivery-policy fixtures in PGlite.
- `node scripts/verify-communication-recipients.mjs --local`: the same cases against actual LOCAL PostgreSQL, both in migration rehearsal and after application; fixture changes rolled back.
- New cases verify ministry Parents/Volunteers/Ministries with empty request and database lists; correct unique total queue count; role/anonymous denial; protected configuration/operation tables; browser attempts to enable ministry while DB restricted; legacy/explicit restricted-mode behavior under DB ministry approval; policy captured per operation; idempotency-policy mismatch denial; eligibility and approval revocation at claim time; missing/invalid configuration.
- `node scripts/verify-live-email-foundation.mjs`: updated migration chain, existing queue/provider/role/idempotency cases, mocked ministry delivery with no list, rejection of invalid/missing restricted policy/lists without provider calls, and configuration cases for missing credentials/sender, synthetic transport, default restricted and explicit ministry.
- `node scripts/verify-local-communication-recipient-rest.mjs --compose --ministry` with an explicit local environment file: actual temporary confirmed local Auth account, policy-aware REST previews, trusted DB approval/revocation, unauthorized-role denial, and authenticated Parents/Volunteers/Ministries pages. Exact visible counts matched the RPC. Selecting audiences created no messages, deliveries or operation-policy rows. Policy and fixture state were restored in `finally`.
- `npx tsc --noEmit`, `npm run lint`, focused final test-file lint, and `git diff --check`.
- Production build: compiled successfully, TypeScript passed, 54 static pages generated. The nested worktree generated a multiple-lockfile/root-inference warning; the isolated release artifact has a single production-baseline lockfile and no copied node_modules.

The page test initially asserted raw `Review email` HTML text and was corrected to account for React text-node comments; rendered text/count assertions then passed. The local SQL count test was also scoped correctly to fixture identities while confirming the true full eligible total, so existing LOCAL users are not assumed absent. Neither correction required a product eligibility workaround.

Previously passed unrelated core database, 19-policy authorization, SMS and other foundation evidence is reused rather than unnecessarily repeated. No live provider, mailbox-deliverability, hosted acceptance, or browser-responsive visual test was run. The local test server used a fake Resend key, made only preview requests, and was stopped. Supabase Auth SMTP/invitations and Communications Resend templates/provider files remain unchanged.

## Exact scoped release files

- `.env.example`
- `app/(platform)/communications/compose/page.tsx`
- `config/communications-email-environment.mjs`
- `config/env.ts`
- `docs/09_Testing/2026-11-02_Communications_Recipient_Management.md`
- `docs/PROJECT_STATUS.md`
- `eslint.config.mjs`
- `features/communications/components/communication-composer.tsx`
- `features/communications/schemas/announcement-schema.ts`
- `features/communications/services/communication-service.ts`
- `features/communications/services/outbound-email-service.d.mts`
- `features/communications/services/outbound-email-service.mjs`
- `lib/supabase/database.types.ts`
- `package.json`
- `scripts/communication-delivery-policy-fixtures.sql`
- `scripts/communication-recipient-fixtures.sql`
- `scripts/verify-communication-recipients.mjs`
- `scripts/verify-live-email-foundation.mjs`
- `scripts/verify-local-communication-recipient-rest.mjs`
- `supabase/migrations/202611020001_communication_email_recipients.sql`
- `supabase/migrations/202611020002_communication_email_recipient_snapshot.sql`
- `supabase/migrations/202611020003_communication_email_delivery_policy.sql`
- `tsconfig.json`

These 23 files are the full diff against the deployed base. The updated release manifest verifies every other production-baseline file is byte-identical. No unrelated Forms, Notifications, backup, `.gitignore`, local environment, generated build, or scratch file is included. The status note is composed only from the deployed document plus this assignment's note. The local release branch exists; no commit or push has occurred.

## Exact safe HOSTED activation steps — approval required

1. Obtain explicit approval for the 23-file release, all three migrations, the release-branch push and production deployment, and activation of ministry delivery. No beta-recipient list is needed for ministry mode. A test list is needed only if restricted real-email testing is desired.
2. Perform fresh narrow release guards: confirm correct Youth Ministries Supabase/project/team/domain, reviewed file hashes and source base, all three versions unapplied, expected owner/schema prerequisites, and unchanged production deployment. Back up hosted schema/data/history through the protected established process. Stop on any discrepancy; do not reset or repair unrelated history.
3. Apply migrations `202611020001`, then `202611020002`, then `202611020003`, recording each once and verifying data preservation/security. All three leave ministry delivery disabled. Do not change Authentication SMTP or any API key.
4. Commit/push only the manifested release on `release/communications-recipients-2026-11-02` and deploy the isolated source explicitly to `fumc-coppell-youth/youth-ministries`. Preserve the current Vercel Git production-branch setting (`master`); actual production is the checkpoint source, so do not deploy the old master tree or the dirty main working tree. Keep the server delivery policy restricted/default until the rollout is verified.
5. With the trusted database operator, deliberately authorize ministry mode:

```sql
begin;
do $enable_ministry$
begin
  update private.communication_email_delivery_policy
  set delivery_policy = 'ministry'
  where singleton = true;
  if not found then
    raise exception 'Delivery policy row is missing; ministry activation aborted';
  end if;
end
$enable_ministry$;
commit;
```

Changing this setting alone does not send mail. Old/restricted calls still require testing approval, and the server remains restricted until the next step.

6. Set only the new Production deployment variable `COMMUNICATIONS_EMAIL_DELIVERY_POLICY=ministry` on the existing Vercel project and redeploy the approved release. Retain `COMMUNICATIONS_EMAIL_MODE=live` and the existing valid sender/Resend settings. Do not rotate or reveal keys or modify Auth SMTP. Existing legacy allowlist settings may remain untouched; ministry mode does not depend on their contents. Both server and database controls must be ministry for normal delivery.
7. Verify authenticated hosted previews for Parents, Volunteers and Ministries, eligible/excluded/duplicate totals, opt-outs, unauthorized access, templates/history, runtime project binding, mode label and final confirmation. Preview only: do not send an email merely because an audience is selected. A real controlled delivery requires separate explicit recipient approval; no mass email is part of acceptance.

Rollback/disable: set the database policy back to `restricted` immediately, and set the server variable back to `restricted` then redeploy. Pending ministry operations are not promoted/resumed by restricted mode; unattempted claims are suppressed after database revocation. Restricted testing again requires both test lists. Leaving either control unapproved, invalid, or absent cannot silently enable ministry-wide sending. Do not remove security checks to restore delivery.

## Readiness conclusion

LOCAL verification is complete and the release is ready for the HOSTED deployment approval gate. The old requirement to manually maintain a recipient allowlist for normal ministry communications is removed. Restricted testing remains available. Hosting/deployment and ministry activation have not been authorized or performed; hosted acceptance must pass before the feature is marked complete. Current saved LOCAL and HOSTED controls were not switched into normal delivery by this task.
