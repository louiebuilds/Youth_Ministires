# Step 31AR — HOSTED Event Completion Deployment Preflight

Date: October 31, 2026 (America/Chicago). Target: `txjwwxzlsltbwixrscfp`.
Phase: Event Completion — Deployment Preparation. Result: **NO-GO / BLOCKED**.
This is a preflight report and conditional runbook, not deployment approval or milestone closure.

## 1. Decision and stop-condition report

A usable HOSTED recovery approach has **not been established**. Plan, latest backup timestamp, retention, PITR window, operator restore rights, and actual restoration readiness are **UNVERIFIED**. No connected Supabase management tool is available in this session and no authenticated dashboard backup evidence was supplied. The repository's linked project reference matches the intended target, but that is not proof of backup availability or a live database connection. No HOSTED SQL, Management API, restore, schema change, data change, migration repair, or deployment was executed.

The required stop condition is met: operational preflight stops here. The remaining sections preserve repository findings, manual read-only verification instructions, and a conditional runbook. They do not certify HOSTED compatibility. Current HOSTED schema compatibility, current migration history, and exact selective CLI behavior remain release gates. No new implementation is authorized by this report.

Other unresolved gates:

- LOCAL migration history could not be freshly queried: `docker ps` returned permission denied for the Docker Desktop Linux engine pipe. No database reset, privilege workaround, or test fixture execution was attempted.
- Historical migration absence does not prove missing schema. The early foundation migrations cannot be classified as fully applied from object names alone.
- The selective release has a precise candidate manifest, but isolated staged-tree validation and Product Owner UI acceptance are pending.
- The application's workspace schema now requires `isLegacyCompleted`; application rollout must follow successful installation of all three database migrations.

## 2. Recovery verification and exact manual evidence needed

Louie should open the target project's Database > Backups page, without selecting Restore or enabling paid services. Record the project reference, organization/current plan, backup type, completed backup ID and timestamp (including timezone), latest successful recovery point, retention/expiry, PITR earliest/latest time if enabled, and any failed/pending backup status. Record the current operator's access to restore and any displayed restrictions. Do not share passwords, tokens, connection strings, Auth rows, or storage contents.

Confirm with the documented workflow or Supabase support whether this actual backup supports in-place recovery, a new-project restore, or a logical restore. Record the chosen approach, downtime estimate/RTO, acceptable data-loss window/RPO, responsible operator, and Product Owner approval. A dashboard entry alone is not evidence of a usable restore. A restore rehearsal into a separately approved isolated project is stronger evidence; it is not authorized in Step 31AR. If no rehearsal is available, explicitly document the untested assumptions and obtain approval of the recovery risk before changing NO-GO.

| Recovery component | Current result | Required evidence |
|---|---|---|
| Accessible HOSTED backup / latest point | UNVERIFIED | Completed backup identifier, date/time, retention and access |
| Plan and restore entitlement | UNVERIFIED | Actual plan and supported recovery path, not generic pricing assumptions |
| In-place vs separate-project requirement | UNVERIFIED | Selected workflow verified for this project; separate resource/cost approval if needed |
| Public/private schemas, data, indexes, sequences | UNVERIFIED | Coverage and restored integrity checks |
| Roles, ACLs, policies, lifecycle owner | UNVERIFIED | Coverage for selected backup type and post-restore ownership/membership checks |
| `supabase_migrations.schema_migrations` | UNVERIFIED | Explicit coverage/export and restored history consistency |
| Auth database data | UNVERIFIED | Auth schema/data coverage and successful authorized login after recovery |
| Auth configuration / API keys / redirect URLs | UNVERIFIED | Separate configuration inventory and reconfiguration plan |
| Storage files / settings | UNVERIFIED | Separate protected file backup and configuration inventory |

Supabase documents daily backups for paid plans and recommends exports for Free projects; database backups exclude Storage file bytes and custom role passwords. These are general capabilities, not verification of this project's entitlement or artifacts. [Database Backups](https://supabase.com/docs/guides/platform/backups).

The documented new-project restore copies database structures, roles/permissions and Auth user data, while project settings, Auth configuration/API keys, Storage objects/settings and other services require separate attention. It requires a paid plan and physical backups. This is an optional recovery path, not proof that a separate project is required here. [Restore to a new project](https://supabase.com/docs/guides/platform/clone-project).

For a logical recovery, explicitly include role/schema/data artifacts, Auth and Storage customizations, and migration-history schema/data; a default dump must not be assumed to cover everything. Protect exports as church data, outside Git. No export or recovery was performed. [CLI backup/restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).

## 3. Repository and LOCAL verification evidence

Inspected HEAD: `2a5f230644a28550c8b36f95beb27a40ef1082fa`. Existing application files and migrations were not edited. Existing index/working-tree changes were retained.

| Migration | SHA-256 (raw current file bytes) | Prior comparison |
|---|---|---|
| `202610290001_event_completion_workflow.sql` | `c01b91358bc89743203348ebd0d257e5de8ad6aa48682ec1e7da432c24f5ecbe` | Matches Step 31AM report |
| `202610300001_event_completion_security.sql` | `c5de13cfe78f7ca607fea272226cbc172a3691f57dad5c7b4dc3bdc2dff5afa1` | Matches Step 31AM report |
| `202610310001_legacy_completed_event_compatibility.sql` | `ff432e2678f16506564f7384c6ea2de1ff64c0bee8fa367c7dfbfe29bbf2d524` | Matches LOCAL migration evidence JSON |

All three files exist and match recorded evidence. They are untracked in Git, so HEAD cannot independently prove their immutability. Their reported LOCAL history entries are supported by the existing security/legacy reports, not a fresh database query.

Reviewed existing evidence:

- `2026-10-30_Event_Completion_Security.md`: event/security suites, PostgreSQL rollback security checks, five-role authenticated REST authorization, four successful audit entries, and dependent-table preservation reported PASS.
- `2026-10-31_Legacy_Completed_Event_Compatibility.md`: 44 authenticated legacy checks, normal completion/reopen, denied role/inactive/forged-setting checks, unknown-history Parent restrictions, and two successful legacy audits reported PASS.
- `output/step31am/local-migration-verification.json`: baseline, post-migration, and post-test ordered row/count fingerprints match across 78 public tables plus `auth.users`; cleanup flag is true. This is LOCAL evidence, not a HOSTED backup.
- Existing report records TypeScript, ESLint, production build (54 pages), database/security suites, and diff integrity PASS. These were not rerun because this assignment changes documentation only. Reported tests do not establish HOSTED operator compatibility.
- Fresh `git diff --check`: PASS; informational Windows line-ending warnings. No application tests that create accounts, events, audit rows, or SQL fixtures were run.

Current LOCAL history can be manually checked, read-only, after Docker access is restored:

```powershell
docker exec supabase_db_Youth-Ministries-Platform psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 -c "BEGIN READ ONLY; SELECT version,name FROM supabase_migrations.schema_migrations WHERE version IN ('202610290001','202610300001','202610310001') ORDER BY version; ROLLBACK;"
```

## 4. Historical migration reconciliation

The supplied HOSTED baseline starts at `202608220001`. Earlier files remain classified **UNVERIFIED**, even where current objects establish that some foundation work exists. No missing historical entry was marked applied. `202610170004` is the supplied exception: previously functionally verified and repaired; do not replay it. `202610090001` is **PARTIALLY APPLIED**: the five public Live SMS functions exist according to the supplied check, while the live-channel constraint still permits live email only. Its private helpers, full bodies, ACLs and all other effects also need comparison before claiming complete application. Do not activate SMS or repair this entry in this release.

The inventory below lists every repository migration so no potentially outstanding file is silently omitted. Entries after the early gap are not all asserted to be missing: fresh HOSTED history is needed to calculate that set. Historical checkpoint statements may be stale. For every missing version, compare its complete SQL effects (tables/columns/types/defaults/checks/FKs/indexes, function definitions, policies, grants, storage changes and any data transformations) to current evidence, allowing for documented superseding migrations. A matching name or history entry alone is insufficient. Classify as fully verified, partial, not applied, or unverified and retain the evidence before any separately authorized reconciliation.

| Migration file | Classification / evidence |
|---|---|
| `202607230001_core_database_foundation.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202607230002_security_authorization.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202607240001_milestone3_user_management.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202607240002_member_management_foundation.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202607240003_volunteer_management_foundation.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202607240004_volunteer_management_workflows.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202607260001_volunteer_scheduling.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202607260002_attendance_foundation.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202607260003_attendance_workflows.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202607260004_checkin_foundation.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202607260005_checkin_workflows.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202607260006_child_relationship_addition.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202607260007_checkin_correction_repair.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202607260008_checkin_reentry_after_correction.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202607270001_attendance_reports.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202607270002_event_management_foundation.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202607300001_event_registration_foundation.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202607300002_event_registration_settings.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202607300003_family_event_registration_options.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202607300004_family_event_registration.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202607300005_family_event_registration_cancellation.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202607300006_event_registration_management.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202607300007_event_volunteer_workspace.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202607300008_event_planning_tools.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202607300009_curriculum_foundation.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202607300010_lesson_library_workflows.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202607300011_curriculum_plan_workflows.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202607300012_teaching_resource_links.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202607300013_curriculum_private_storage.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202607300014_communication_center_foundation.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202607300015_announcement_workflows.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202607300016_communication_template_workflows.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202607300017_synthetic_communication_delivery.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202607300018_in_app_notification_lifecycle.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202607300019_prayer_and_care_foundation.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202607300020_prayer_and_care_rpc.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202608030001_prayer_and_care_security_repair.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202608030002_prayer_and_care_access_scope.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202608030003_prayer_care_person_picker.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202608030004_volunteer_proper_display_names.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202608030005_preserve_answered_prayer_history.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202608040001_prayer_care_assignee_picker.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202608050001_resource_library_foundation.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202608050002_resource_category_workflows.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202608050003_resource_library_workflows.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202608050004_resource_library_file_workflows.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202608090001_scheduling_foundation.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202608090002_scheduling_workflows.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202608110001_reporting_foundation.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202608110002_reporting_workflows.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202608120001_milestone15_authorization_foundation.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202608120002_document_domain_foundation.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202608120003_custom_forms_foundation.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202608120004_visitor_cards_foundation.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202608120005_form_template_master_storage.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202608120006_document_template_workflows.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202608120007_student_document_storage.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202608120008_completed_document_workflows.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202608120009_document_readiness_participation.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202608160001_custom_forms_workflows.sql` | UNVERIFIED; reported absent from HOSTED history; no replay or repair |
| `202608220001_visitor_card_operational_workflows.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202608230001_medical_permission_readiness_correction.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202608230002_admin_event_registration_management.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202608230003_custom_form_assignment_active_uniqueness.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202608230004_custom_form_submission_respondent_uniqueness.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202609070001_parent_account_person_linking.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202609140001_scheduling_assignment_projection.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202609150001_scheduling_conflict_history.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202609150002_communication_announcement_projection.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202609210001_curriculum_plan_lesson_reordering.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202609220001_edit_prayer_request_workflow.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202609230001_prayer_care_manager_workflow_enhancements.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202609240001_platform_calendar.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202609250001_native_group_chat_phase1.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202609250002_native_group_chat_realtime.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202609270001_fix_managed_account_email_return_type.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202609270002_account_invitations_read_foundation.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202609270003_create_managed_invitation.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202609270004_accept_account_invitation.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202609270005_revoke_managed_invitation.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202609270006_bootstrap_invited_volunteer_profiles.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202609280001_reusable_family_checkin_passes.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202609280002_checkin_documentation_notice_only.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202609280003_persistent_family_pass_storage.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202609280004_account_lifecycle_safeguards.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202609280005_restrict_volunteer_attendance_checkin_management.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202609280006_controlled_capability_management.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202609280007_administration_audit_log_foundation.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202609290001_ministry_settings_foundation.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202609290002_allow_youth_pastor_managed_account_listing.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202609290003_honor_staff_medical_capability_grants.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202609290004_enforce_account_lifecycle_transitions.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202609290005_restrict_final_medical_release_authorization.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202610040001_medical_release_independent_completion_paths.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202610040003_paper_only_event_waiver_intake.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202610040004_live_dashboard_birthdays.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202610060001_parent_document_operational_status.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202610070001_parent_community_foundation.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202610070002_parent_community_actions.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202610070003_parent_community_author_names.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202610080001_parent_private_group_chat.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202610080002_parent_chat_discovery.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202610080003_live_email_foundation.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202610090001_live_sms_foundation.sql` | PARTIALLY APPLIED (supplied HOSTED evidence); live-email-only constraint conflicts with SMS definition |
| `202610090002_parent_volunteer_scheduling_access.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202610090003_parent_volunteer_candidate_picker.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202610090004_parent_volunteer_directory.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202610170001_leadership_calendar_notifications.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202610170002_leadership_calendar_admin_access.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202610170003_notification_center_unread_improvements.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202610170004_header_notification_list_fix.sql` | Fully verified as already applied and history repaired, per supplied prior check; not reverified this session |
| `202610180002_attendance_one_session_per_event.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202610250001_private_chat_family_adults.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202610250002_exclude_student_chat_membership.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202610260001_create_all_parents_chat_room.sql` | UNVERIFIED current HOSTED state; earlier checkpoints may document application; query current history before classifying as outstanding |
| `202610290001_event_completion_workflow.sql` | NOT APPLIED per supplied HOSTED baseline; LOCAL applied per prior reports; fresh history pending |
| `202610300001_event_completion_security.sql` | NOT APPLIED per supplied HOSTED baseline; LOCAL applied per prior reports; fresh history pending |
| `202610310001_legacy_completed_event_compatibility.sql` | NOT APPLIED per supplied HOSTED baseline; LOCAL applied per prior reports; fresh history pending |

The companion SQL supplies history, full function definitions, schema constraints/policies/default ACLs and SMS evidence. For migrations involving one-time data changes, present-day schema cannot prove execution; retain UNVERIFIED until reliable historical evidence exists. No blanket push, history repair, synthetic history placeholders, or older foundation replay is permitted.

## 5. HOSTED compatibility assessment and security concerns

Supplied prior facts only: PostgreSQL 17.6; operator `postgres` has CREATEROLE; the lifecycle role is absent; events, registrations, volunteer assignments, checklist, audit table and listed helper/workspace functions exist; completion guard is absent; there are two Published events and one Completed legacy event. These were not freshly queried in this session.

The three migrations have no SQL dependency on Live SMS or the later private-chat enhancements. Source review supports a selective Event Completion release, conditional on the exact existing database contracts below. Independence is not yet verified against HOSTED.

| Dependency / risk | Required comparison before GO |
|---|---|
| Event and account enums | Exact labels/types used by migrations, including `youth_pastor` (UI Youth Director), `completed`, `archived` |
| Events/profiles | Full event column names/types, profile FK identity, nullability/defaults, existing lifecycle-column absence or exact compatibility |
| Completion summary | `attendance_records(session_id,status)`, `attendance_sessions(id,event_id)`, registrations and volunteer status values, checklist `is_completed`, reminders `status`; table existence alone is insufficient |
| Audit | Required insert columns, constraints, identity sequence `public.audit_events_id_seq`, trigger behavior and insert policies |
| Helper functions | Exact signatures, bodies, owners, execute ACLs and dependency access for active-profile, role checks, event management, assignment and actor identity |
| Calendar/workspace replacement | Input parameter names, return type/output columns, existing owners/grants and all existing visibility behavior; CREATE OR REPLACE can fail on signature/result changes or overwrite hosted-only logic |
| Trusted migration operator | CREATE ROLE, ownership of replaced functions/tables, ability to grant role memberships/schema permissions, transfer function ownership, and revoke temporary authority under PostgreSQL 17; CREATEROLE alone is insufficient |
| Role collision | `event_lifecycle_owner` and `private.event_lifecycle_actor()` must be absent before the security migration; existing lifecycle policy names/RPCs must be investigated, not dropped casually |
| RLS / inherited ACLs | Events and audit RLS, FORCE RLS, policies; default privileges and PUBLIC schema CREATE must not broaden owner authority or helper access |
| Trigger | Correct events trigger/function, invoker security, enabled ALWAYS (`tgenabled='A'`), no conflicting trigger logic |
| RPC authorization | Three transition RPCs owned by restricted NOLOGIN/NOINHERIT/non-BYPASSRLS role, empty search_path, row_security=on; authenticated EXECUTE only among application roles; no client membership |

The migration intentionally allows an existing trusted PostgreSQL 17 creator ADMIN-only membership; inspect `set_option`/`inherit_option` and role graph rather than treating this as client membership. Application roles must never be able to assume the owner.

Additional ACL issue to verify: the private actor helper revokes PUBLIC/anon/authenticated and service_role, but project-specific default grants or custom roles may survive. Inspect effective privileges and all ACL grantees. The summary function also relies on its internal role check; inspect its service_role/default ACL inheritance and owner. No broader helper/grant change is authorized here.

Migration 1 installs the obsolete client-settable flag guard and commits separately. Do not expose this intermediate state. Application maintenance UI alone does not block authenticated REST calls. Before release, establish a tested containment method covering all client database traffic/writers, including scheduled jobs and direct API access, or obtain a reviewed atomic orchestration alternative. **This containment is a deployment blocker**, not permission to alter HOSTED privileges now.

## 6. Legacy event and data preservation

`Fall Costume Party`, `1a75d927-1674-4d37-a7a7-8da9be7fcddf`, must remain Completed throughout deployment. None of the three migration files contains a top-level event data UPDATE/backfill: writes are inside RPCs. New lifecycle columns are nullable. Do not call completion/reopening RPCs on this event for acceptance; never infer original completion actor/time/prior state.

Capture before and after snapshots with the companion SQL under a quiesced writer window. Compare event base columns byte-for-byte as JSON, all prior public table row counts/fingerprints, plus Auth count/fingerprint if authorized. For events, remove only the five newly added columns from the comparison projection, then separately verify that new columns are NULL for every preexisting event. Verify Fall Costume Party remains Completed and new metadata is all NULL. For other tables expect exact content equality; schema/history changes are checked separately. Compare all existing audits and related attendance/check-in/registrations/volunteers, not merely totals.

Fingerprints detect accidental changes; they do not replace backups or prove recovery. Concurrent writes invalidate simple before/after equality: establish an approved freeze or reconcile every difference against authorized write records. Store results securely because even aggregates/definitions may be sensitive. Never paste participant records or Auth contents into the report.

Legacy Parent publication access remains restricted when prior publication is unknown; registration/attendance alone is not proof. Existing eligible assignment access is retained. Only an authorized future explicit legacy-reopen action may choose Draft/Published/Active, with an audit record and deliberate visibility review. Step 31AR executes none.

## 7. Controlled migration strategy — conditional, not executable approval

The documented CLI supports linked migration application and a db-push dry run, but offers no per-file selector in the reviewed reference. A command in the full working repository could select unrelated pending migrations or refuse history drift. **No unfiltered command is approved.** [Supabase CLI reference](https://supabase.com/docs/reference/cli/supabase-migration-up).

Candidate supported approach: a separately reviewed isolated deployment work directory containing the exact repository migration files corresponding to the **actual remote history set**, plus only the three new migrations. Do not use empty stand-ins or fabricated history. Omit missing older foundation files and unrelated pending migrations from this deployment copy only; leave the original repository untouched. Remote-only versions with no recoverable authoritative SQL, statement mismatches, or CLI reconciliation requirements are blockers. Do not hide them with repair.

Required proof before choosing this method:

1. Pin and record an available supported CLI version. Verify its help and migration/history implementation; no CLI was found on PATH during this session. Confirm its handling of files containing their own BEGIN/COMMIT, stopping on errors, and whether history insertion is atomic with SQL execution. CLI behavior remains UNVERIFIED here.
2. Compare complete remote history to the isolated manifest and require that a documented dry run lists **exactly** `202610290001`, `202610300001`, `202610310001`, in order. No seeds, roles.sql, unrelated schema paths, vault modifications or other configuration-driven changes may be selected. A dry run is not compatibility proof.
3. Rehearse the exact operator privileges and CLI version against an approved disposable equivalent database. Do not reset LOCAL or create a hosted project under this task.
4. Establish client/writer containment across all per-file commit boundaries, particularly after migration 1. If this cannot be guaranteed, stop; design/review atomic execution and accurate history recording separately rather than editing the three approved migration files ad hoc.
5. After separate approval, use the supported runner on that verified deployment copy. Inspect successful SQL completion, final object state and real history entry after each migration. Stop on the first failure. Record version/name/statements consistently; never mark unapplied SQL as applied.
6. Complete postflight before restoring traffic. Require all three real history entries, exact intended functions/owners/ACLs, enabled ALWAYS guard, and preserved data.

No selective method has been demonstrated safe with this HOSTED history/operator. Therefore this is a **candidate strategy with explicit blockers**, not a claim that CLI isolation bypasses all reconciliation issues. Direct dashboard SQL plus a later history repair is not selected: it leaves security/history failure windows and has not been rehearsed. Never run `db push --include-all`, bulk-repair, or migration down/reset.

## 8. Exact candidate Git release manifest

Include only the following current file contents, subject to approval and isolated-tree validation. Hashes identify the reviewed raw bytes and must be refreshed if approved edits occur. Existing dependency manifests need no change.

| Include file | SHA-256 |
|---|---|
| `app/(platform)/events/[eventId]/page.tsx` | `c07c8748816519f9e32663813d2d4a5e33a00cbc3fa48f7250b78b925ad4afb4` |
| `app/(platform)/events/page.tsx` | `21fc072f8ac9b5cda2ce221278463927f47de5771070506e14b9d27021512ae9` |
| `features/events/actions/event-management-actions.ts` | `64e598a7ddd22052db2c33dda91c15cd191f2032e49e1115611336d233107b19` |
| `features/events/components/event-management-form.tsx` | `d37cedafd68a8a7f01c126c9b9b3368a80a1720344ca169cbc12ef2867c52ac9` |
| `features/events/components/event-lifecycle-form.tsx` | `20ea0c8325d8af84f31bc0eb45d181c766c55f159f7a8247cffdd26018f4ec02` |
| `features/events/schemas/event-management-schema.ts` | `0daddc089d338944f694cedc8f726be8bf944a45bb8d5c53aab26331d1e8339b` |
| `features/events/schemas/event-workspace-schema.ts` | `2934b8eef385dbe0ba6d6582520ec4f5878d447385a6afe28cc125839e86fb1c` |
| `features/events/services/event-management-service.ts` | `9125f735dd7097e58d5bf6fa0eec5695a7982061633ff3b0f2cfc959ca86a50a` |
| `features/events/types/event-management.ts` | `fabd450a246a095f0eeb7af2bb8b2b3ce9f774e8aac7415722724c7351d01c13` |
| `features/events/utils/event-lifecycle.ts` | `318761fff2d820f0710ae401e45f912d7ab3230fe562932d6cab6d160fecb2ca` |
| `lib/supabase/database.types.ts` | `43f708759ed0f1e23664ad1f94d6f5b68082bf3834daa6b192a0e31b54a38ae2` |
| `scripts/verify-attendance-foundation.mjs` | `556299d7a9e3bc39de37df979332ea6cee813c28567b678f04c6e6ab2dc21a19` |
| `scripts/verify-local-event-completion-security.mjs` | `6c3cb7a88c98bff9fcfb94320335efaa87955a3cea7c2104115be970542340d4` |
| `scripts/verify-local-event-completion-security.sql` | `99e165542989658afe7dd8870615d35546e012d86bc5862384a4cab3dbcb1aec` |
| `scripts/verify-local-legacy-completed-events.mjs` | `217bcbabbd21241b251ec6ba7ccadd58b1724f4b43b8b406ac252a61c2b800a8` |
| `docs/09_Testing/2026-10-30_Event_Completion_Security.md` | `1d2411e53c5dc86c4369696f68b6e49677e9aab0f30ae43cbaa4bc12dca78316` |
| `docs/09_Testing/2026-10-31_Legacy_Completed_Event_Compatibility.md` | `853d8e4a67b04baf7a09ce85180abf6173c7201b94a311d6657e98d9f3b68ce8` |
| `supabase/migrations/202610290001_event_completion_workflow.sql` | `c01b91358bc89743203348ebd0d257e5de8ad6aa48682ec1e7da432c24f5ecbe` |
| `supabase/migrations/202610300001_event_completion_security.sql` | `c5de13cfe78f7ca607fea272226cbc172a3691f57dad5c7b4dc3bdc2dff5afa1` |
| `supabase/migrations/202610310001_legacy_completed_event_compatibility.sql` | `ff432e2678f16506564f7384c6ea2de1ff64c0bee8fa367c7dfbfe29bbf2d524` |

Include this report and its companion read-only SQL. Select only the Event Completion sections of `docs/PROJECT_STATUS.md` (Step 26, Step 31AM, and the new Step 31AR checkpoint). Its existing check-in policy and private-chat sections are unrelated and must not be staged with this release. This is the known mixed-purpose file requiring selective staging.

The inspected diffs of both event pages, Event feature files, generated type additions and attendance test changes are focused on lifecycle behavior. The one-line removal of Completed from the ordinary management form is required. Preserve the generated type compatibility footer; do not regenerate unrelated contracts.

Explicitly exclude these current changes/artifacts:

- `.gitignore` changes; `features/forms/components/custom-forms-workspace.tsx`; `features/notifications/services/header-notification-service.ts`; `scripts/verify-forms-registrations-foundation.mjs`; `docs/09_Testing/2026-10-04_Milestone15_Closure_Gap_Review.md`.
- `local-backups/`, `output/`, `tmp/`, `=`, `foreign-key-inventory.txt`, `foreign-key-inventory-full.txt`, `scripts/verify-native-group-chat.mjs.backup`.
- `scripts/local-auth-attendance.mjs`, `scripts/verify-local-attendance-migration.mjs` (unrelated account/attendance utilities), `supabase/.gitignore`, `supabase/config.toml`, `supabase/inspections/`, `supabase/snippets/`.
- Live SMS development, private-chat work, and every migration other than the three listed. Already committed unrelated code in HEAD is not removed by this manifest; confirm the release base against the actual deployed application before approval.

No staging, commit, push, stash, reset or worktree cleanup was done. File-level isolation appears feasible; a tested staged release has not been produced. Validate the isolated approved tree with appropriate TypeScript/lint/build and focused tests before a later release, because passing tests on the mixed working tree do not prove isolated-release readiness.

## 9. Deployment and recovery runbook

### Phase A — Predeployment (all gates required)

1. Resolve the recovery gate in section 2 and obtain Product Owner approval of the actual recovery point, data-loss window, downtime and any additional resource. Retain backup coverage/configuration evidence securely.
2. Confirm target project `txjwwxzlsltbwixrscfp` in dashboard and the deployment connection context independently. Verify the Vercel target and deployed commit; do not rely on stale local link files.
3. Obtain and review the companion read-only SQL outputs. Resolve exact dependencies/privileges, enumerate actual historical gaps and document their disposition. No SMS or historical foundation changes are bundled.
4. Complete Product Owner desktop/mobile acceptance and Technical Lead review. Approve exact application/migration bytes and release base.
5. Verify the supported isolated CLI approach, error/history behavior and containment/recovery rehearsal. Approve the final execution commands in a later deployment assignment. Do not copy an untested command from this candidate plan into production.
6. Schedule the window, pause authorized writers through the approved method, ensure no conflicting migrations or external jobs, and capture protected before snapshots and pre-change schema/ACL/function definitions. Reconfirm backup freshness immediately before changes.

### Phase B — Database deployment (separate approval only)

1. Apply `202610290001`, verify successful transaction and real history entry while traffic remains contained.
2. Immediately apply `202610300001`, verify restricted role, actor helper, policies/grants and hardened ALWAYS invoker guard. Do not restore client access after only migration 1.
3. Apply `202610310001`, verify legacy RPC owner/ACL and workspace projection. No legacy event RPC is invoked during schema deployment.
4. Require exactly three new history entries, with no older history changes. Compare before/after fingerprints, event statuses, NULL original completion metadata, constraints, function definitions and all lifecycle permissions. Stop on any difference outside the approved schema/history effects.
5. Keep the old application available until database postflight passes. Approved traffic resumption requires the secure final state, not merely a CLI success message.

### Phase C — Application deployment (separate approval only)

1. Stage exact allowlisted files and only approved checkpoint hunks. Review staged diff/name list for exclusions and verify the release against the intended deployment base. Commit/push only after approval; no Git commands were executed here beyond read-only inspection.
2. Run required checks on the isolated release. Build/deploy the approved commit in Vercel and confirm READY status, commit identity and logs before promotion.
3. Verify application environment references the intended HOSTED Supabase project using redacted project/host checks; never print credentials. Confirm preview vs production configuration and promote only with authorization.
4. Verify protected routes, event lists, workspace parsing and deployment identity. Record deployed commit and deployment ID. Do not claim live acceptance from a redirect alone.

### Phase D — HOSTED beta acceptance (authorized fixtures only)

- Platform Administrator and Youth Director (`youth_pastor`): correct lifecycle controls, future-event denial, past classification without automatic completion, standard completion/reopen, correct actor/status audit.
- Use separately approved synthetic past/future/legacy fixtures only. Test explicit legacy target requirement and denied partial metadata on fixtures; never reopen Fall Costume Party as a test.
- Staff, Volunteer, Parent, anonymous and inactive accounts: transitions/direct-write/metadata forgery denied; ordinary authorized event access unchanged. Parent workspace/calendar continue to hide unknown-publication legacy events except existing eligible assignment access.
- Verify completion summary, registration/volunteer/attendance/check-in preservation, audits and normal event navigation. Check desktop/mobile and existing published events.
- Record expected test changes separately, clean fixtures only under specific authorization, then compare protected real-data baselines. No real church records are sacrificed for acceptance.
- Product Owner signs behavior acceptance; Technical Lead reviews results. Only then update journal/release notes/checklist and consider milestone closure. Step 31AR does not close it.

### Phase E — Failure and recovery (explicit authorization required)

| Failure point | Response |
|---|---|
| Any preflight gate fails | No deployment. Retain evidence and resolve the specific blocker. |
| Migration fails before its COMMIT | Stop runner; inspect actual schema/history and transaction outcome. Never assume rollback if the runner disconnected or history recording failed. Earlier files may already be committed. |
| Migration 1 succeeds, security migration fails | Keep all client/writer access contained. Do not run the new app or expose the old flag guard. Inspect failure under actual operator; obtain approval for reviewed forward correction/retry or the approved recovery procedure. |
| SQL succeeds but history insertion is missing/uncertain | Do not rerun non-idempotent SQL (`create role`/policies/functions can collide). Capture definitions/ACLs and execution evidence; resolve individually under a separate approved plan. No automatic repair. |
| Migration 3 fails | Leave traffic contained; inspect migration 2 security, third transaction outcome and workspace contract. Do not deploy the app requiring the new flag. Use reviewed correction or approved recovery. |
| Application build/promotion fails after secure DB success | Keep/restore the prior known Vercel deployment if its compatibility has been verified; retain the secure DB state. Application rollback does not reverse schema, roles, policies, history or data. |
| Postflight data/security mismatch | Contain writes/access; preserve evidence. Stop acceptance. Product Owner chooses reviewed forward repair or approved database recovery with acknowledged loss/downtime. |

Database recovery must use the verified method and exact approved point. Do not drop columns/roles/policies, disable the guard, delete events/audits, reset a database, or run migration-down as an improvised rollback. Recovery to a prior database point can lose newer church writes: reconcile them before reopening service. A new-project recovery additionally requires secure Auth/Storage/settings restoration, API/environment cutover and fresh role/access tests. Re-run history, ownership/ACL, data and user-facing checks after recovery. Trusted operator membership and role privileges must be checked again.

## 10. Actions requiring Product Owner approval / handoff

Deployment remains **NO-GO** until backup/recovery, HOSTED compatibility, selective runner/history behavior, client containment, isolated release checks and acceptance/review gates are resolved.

Required decisions: chosen recovery method and risk acceptance; any backup creation/restore rehearsal/new resource or paid add-on; maintenance/containment method and window; exact release base/manifest; controlled fixture changes for HOSTED acceptance; final migration/app deployment; and any failure recovery or individual history reconciliation. Read-only manual query execution is already within the assignment; its results are missing evidence, not a request to authorize deployment.

Only this report, its query companion and a scoped checkpoint append were created/updated by Step 31AR. No application code, migration SQL, existing working-tree changes, HOSTED data, privileges or deployment state was modified.
