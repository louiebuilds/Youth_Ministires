# Step 31AT — Event Completion Production Deployment

## Authorization checkpoint — October 31, 2026

Status: DEPLOYED. Focused functional acceptance passed; desktop/mobile visual acceptance and Technical Lead review remain pending.
Product Owner explicitly authorized the atomic HOSTED migration, scoped GitHub/Vercel release and focused synthetic smoke test/fixture cleanup.

- Verified HOSTED target: `txjwwxzlsltbwixrscfp`, PostgreSQL 17.6, Free plan (Product Owner supplied).
- Protected logical backup: `C:\Users\vande\YouthMinistriesPrivateBackups\event-completion-txjwwxzlsltbwixrscfp-20261031T130227Z`.
- Supabase-generated schema/data/role exports, explicit migration-history exports, and a consistent custom archive covering public/private/Auth/Storage database schemas were created using native PostgreSQL 17.11 clients. Nonzero sizes, SHA-256 checks, TOC listing and full archive decoding passed. No restore rehearsal was performed.
- Recovery limits: Storage file bytes, API keys, full Auth/project/Vercel configuration and custom role passwords are outside the database backup. No environment credential file was copied. Recovery notes are in the protected backup directory.
- Docker capacity inspection was denied; no elevated Docker retry, cleanup, stack, restart or storage change occurred. Windows free space at inspection: approximately 19 GiB. DSCC was not modified. Existing accepted LOCAL evidence was reused.
- HOSTED has two Published events and one Completed event. Fall Costume Party remains Completed. All three new migration versions are absent; lifecycle role/guard are absent. Live SMS remains partially applied and excluded.
- Required table/column/enum/function contracts and operator permissions were inspected read-only. Six prerequisite function bodies match repository baseline. The operator owns events/audit/required sequence and can insert migration history.
- Pre-release Vercel production `dpl_BAMayNzn6VZS5z43wtAwgNZvey1a` is READY at Git SHA `2a5f230644a28550c8b36f95beb27a40ef1082fa`; this matches local HEAD and the remote checkpoint branch. Repository: `louiebuilds/Youth_Ministires`; Vercel project: `youth-ministries`.
- Stored Supabase URL is Sensitive for Production/Preview, confirmed by API metadata and Product Owner screenshot; its old value cannot be read back. Planned deployment explicitly pins only the public URL to `https://txjwwxzlsltbwixrscfp.supabase.co` for build/runtime, leaving stored project configuration intact.
- Isolated release uses verified deployed HEAD plus only the preflight allowlist, scoped status sections and this record. Unrelated current Forms, notification, ignore-file and other feature changes are excluded. No staged changes were present.
- Isolated ESLint, TypeScript and production build passed (54 pages). Initial font download failure was resolved with authorized network access; no app/font changes were made.

## Reviewed execution method

The derived runner `output/step31at/event-completion-atomic.sql` executes the unchanged bodies of `202610290001`, `202610300001`, `202610310001` in order, replacing only their outer transaction envelopes with one transaction. The original migration files remain byte-for-byte unchanged. Each executed body is recorded with its actual version/name/statements in migration history inside that same transaction. No history repair or unrelated migration is used.

An exclusive events lock and public-table preservation locks remain held until the single final COMMIT. Intermediate function/guard changes are uncommitted and never become visible to clients or scheduled writers. Lock/statement timeouts fail closed. The runner compares all preexisting public row counts/content fingerprints and legacy metadata before COMMIT. A failure rolls back all three migrations, role/grant changes and history rows.

The new focused PGlite rehearsal injected failures before migration 2, before migration 3 and after all history inserts; each rolled back roles, columns, event contents and history. Successful atomic execution recorded exactly three history entries, established restricted owners/RLS and an ALWAYS invoker guard, and preserved the synthetic legacy record. This tests the new orchestration; it does not claim a HOSTED write rehearsal. PostgreSQL transaction isolation/atomicity provides the client containment guarantee:
https://www.postgresql.org/docs/17/tutorial-transactions.html
https://www.postgresql.org/docs/17/sql-lock.html

## Approved scope

1. Apply only the three migration bodies/history entries atomically to the verified HOSTED project, then verify security and preservation independently.
2. Commit/push the allowlisted Event Completion release on `checkpoint/2026-10-08-church-beta`; deploy that exact release to the existing Vercel project with the intended public Supabase URL pinned at build/runtime. Verify READY, production alias, commit and deployment ID.
3. Run one focused production smoke test using isolated synthetic accounts/event records and their exact audit rows; remove only specifically created fixtures. Never modify/reopen Fall Costume Party or existing church records for testing.
4. If migration execution fails, stop after rollback and inspect. If application deployment fails after secure database success, retain the secure database state and use the known prior application where compatible. Database restoration or destructive correction requires separate authorization.

Expected impact: a brief write/read pause on event/public tables during the atomic transaction, then normal deployment propagation. Backup restoration is not needed for a clean transaction failure. Unexpected data/security differences stop rollout; post-backup write loss and restoration remain explicit recovery risks.

## Final outcome

| Item | Actual result |
|---|---|
| HOSTED logical backup | Verified readable archive/checksums; restoration untested; acknowledged exclusions retained |
| Migrations | `202610290001`, `202610300001`, `202610310001` committed atomically |
| Migration history | Exactly three real entries added; earlier records unchanged |
| Security | Restricted lifecycle owner, authenticated RPC grants, no client membership/schema CREATE, ALWAYS invoker guard verified |
| GitHub release | `2a023572c30067b37f1301db57b7e9f5c7756ef3`, pushed to `checkpoint/2026-10-08-church-beta` |
| Vercel | `dpl_B9crnkne6FufTmGrPSeMB4NTuk24`, independently verified READY and promoted to `https://youth-ministries.vercel.app` |
| Focused production checks | 20 passed using authenticated REST and production page responses |
| Product Owner acceptance | Louie confirmed live Platform Administrator completion and undo/reopening |
| Synthetic cleanup | Three temporary accounts, two named events and their scoped audit rows removed; temporary test-password file removed |
| Existing data | All 79 fingerprints matched immediately after migration; later differences reconciled to confirmed Product Owner activity |
| Protected projects | DSCC and UPS unchanged; no Docker mutations |

The 20 checks cover Administrator/Youth Director/Parent authentication, leadership Event Management pages, Past classification without auto-completion, future completion denial, authorized completion/reopening, Completed UI and controls, Parent visibility, direct lifecycle-write denial, legacy RPC state validation, exactly two synthetic lifecycle audits, and real legacy preservation. These are focused production checks, not a repeated full regression cycle.

After smoke cleanup, 76 table fingerprints still matched exactly. Events, Audit Events and Auth users differed because an existing Platform Administrator signed in, completed a real Published event at 8:41 a.m. Central, and reopened it at 8:43 a.m. Louie explicitly confirmed these were his live acceptance actions. They were not performed by the agent's synthetic fixtures and were preserved. All 233 original audit rows independently match the pre-release fingerprint; two real acceptance audit rows remain. Account/event counts returned to their original values. Attendance, registration, volunteers and all other recorded public tables match. Fall Costume Party remains Completed with NULL original lifecycle metadata and no reopening metadata.

Browser automation stopped because its safety control could not determine the current browser URL confidently. No browser-input workaround was attempted. Desktop/mobile visual navigation remains UNVERIFIED; server-rendered role pages and lifecycle controls passed authenticated HTTP checks. Technical Lead final review is pending. No milestone closure or future milestone work is claimed.

An initial integrity check differed only because Windows wrote CRLF while the approved runner hash used normalized LF text; the normalized hash matched exactly before execution. Original migration hashes were unchanged. Two verification steps involving credential copying/bulk environment access during preparation were rejected by automatic review and omitted; an additional full Auth-row comparison was rejected and not performed. Only narrowly scoped public URL checks, audit metadata and approved backup validation were used.

Recovery was not invoked. Any future database restore or destructive correction still requires separate authorization. Next: Product Owner desktop/mobile visual acceptance and Technical Lead review, then milestone closure if approved.
