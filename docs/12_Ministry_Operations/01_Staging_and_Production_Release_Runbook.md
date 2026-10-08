# Staging and Production Release Runbook

## Status

**Draft for Production Readiness — October 4, 2026**

This runbook defines the controlled environment and migration rehearsal needed
before the Youth Ministries Platform can enter production. It does not grant
production approval.

## Environment Model

| Environment | Application | Database and platform services | Purpose |
|---|---|---|---|
| Development | Local Next.js | Existing linked Supabase development project | Ongoing implementation and live development acceptance |
| Staging | Vercel Preview or Staging deployment | Dedicated Supabase staging project | Production-like migration rehearsal and release-candidate acceptance |
| Production | Vercel Production deployment | Dedicated Supabase production project | Live ministry operations |

Development, staging, and production must use separate Supabase projects,
credentials, data, and Vercel environment variables. The unrelated “Central
Monitoring Training” Supabase project is not a Youth Ministries Platform
staging environment and must not be repurposed without a separately approved
decision.

## Docker

Docker Desktop is not installed on or used by the production website. It is an
operator tool used on a trusted workstation or CI runner for local Supabase CLI
verification, schema dumps, and production-equivalent database testing.

Production runtime responsibilities remain:

- Vercel — Next.js application hosting
- Supabase — managed PostgreSQL, Auth, Storage, and Realtime
- Release workstation or CI — verification and controlled deployment commands

## Create the Staging Environment

The Product Owner must approve any new hosted-project cost before creation.

1. Create a dedicated Supabase project named clearly as staging.
2. Prefer the same region and PostgreSQL major version intended for production.
3. Store its database password and API secrets in the approved password/secret
   manager; never commit them.
4. Configure a separate Vercel staging or preview environment with only staging
   Supabase values.
5. Use synthetic acceptance data only. Do not copy ministry production data
   into staging.
6. Confirm email redirect URLs, Auth policies, Storage limits, and Realtime
   settings are staging-specific.

## Migration Rehearsal — Clean Project

A new staging or production project has no Youth Ministries Platform schema.
Its rehearsal must execute the entire version-controlled migration chain in
numeric order, including the four migrations still pending in the current
development history and the already-reconciled dashboard migration.

1. Record the currently linked development project before changing CLI linkage.
2. Link the CLI to the dedicated staging project.
3. Confirm `supabase migration list` shows the expected clean staging state.
4. Run a dry-run or review the planned migration set before applying it.
5. Apply the complete migration chain once through the controlled CLI process.
6. Confirm every local and staging migration version matches afterward.
7. Create only synthetic role accounts and acceptance records.
8. Run database, authorization, privacy, and full application regression gates.
9. Deploy the release-candidate application with staging-only environment
   variables.
10. Execute the smoke and role-boundary checklist below.
11. Preserve logs, migration output, build identifier, and approver evidence.
12. Relink the local CLI to development only when the staging work is complete
   and confirm the project identity before any later database command.

Do not run migration-history repair on a clean staging or production project.
History repair is reserved for an independently proven, exact schema/history
reconciliation such as the documented development-only `202610040004` case.

## Staging Smoke Checklist

- [ ] Application loads through HTTPS.
- [ ] Login and logout work without retaining another account's content.
- [ ] Platform Administrator dashboard and Administration load.
- [ ] Youth Pastor and Staff dashboards expose only authorized operations.
- [ ] Parent dashboard shows only linked-family youth, registrations, forms,
      announcements, and optional active Volunteer summary.
- [ ] Volunteer dashboard shows only the signed-in Volunteer's assignments.
- [ ] Unauthorized direct routes remain denied.
- [ ] Event registration, cancellation, readiness, and check-in gates work.
- [ ] Medical and waiver completion paths retain their authorization boundary.
- [ ] Communications and Chat visibility remain membership-scoped.
- [ ] Private files can be uploaded and downloaded only by authorized roles.
- [ ] Audit events are recorded without sensitive payloads.
- [ ] Dashboard birthday names remain minimized and Prayer & Care remains
      count-only.
- [ ] No unexpected application, database, Auth, Storage, or Realtime errors
      appear in logs.

## Production Promotion Gate

Production deployment remains blocked until:

- Staging migration rehearsal and smoke tests pass.
- Final end-to-end Product Owner acceptance passes against the release
  candidate.
- Production environment variables and redirect URLs are reviewed.
- Backup and restore capability is verified.
- Dependency/security findings are resolved or explicitly accepted.
- Monitoring and alerting are operational.
- Rollback compatibility is documented.
- Release notes, project status, testing evidence, and deployment approval are
  complete.

## Production Migration Principle

For a new clean production Supabase project, apply the complete reviewed
migration chain exactly once. For an existing production database, never assume
development history applies; inspect that project's migration list and schema
independently before planning changes.

Database rollback should normally use a reviewed forward corrective migration.
Application rollback is permitted only when the previous application remains
compatible with the migrated schema.
