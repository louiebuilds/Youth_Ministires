import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { PGlite } from "@electric-sql/pglite";

import { resolveTemplateApplication } from "../features/communications/components/communication-template-application.mjs";

const migrations = [
  "supabase/migrations/202607230001_core_database_foundation.sql",
  "supabase/migrations/202607230002_security_authorization.sql",
  "supabase/migrations/202607300014_communication_center_foundation.sql",
  "supabase/migrations/202607300015_announcement_workflows.sql",
  "supabase/migrations/202607300016_communication_template_workflows.sql",
  "supabase/migrations/202607300017_synthetic_communication_delivery.sql",
  "supabase/migrations/202607300018_in_app_notification_lifecycle.sql",
  "supabase/migrations/202609150002_communication_announcement_projection.sql",
];

const ids = {
  admin: "70000000-0000-4000-8000-000000000001",
  parent: "70000000-0000-4000-8000-000000000002",
  volunteer: "70000000-0000-4000-8000-000000000003",
};

const db = new PGlite();

async function asAuthenticated(userId, operation) {
  await db.exec(`
    set role authenticated;
    select set_config('request.jwt.claim.sub', '${userId}', false);
  `);
  try {
    return await operation();
  } finally {
    await db.exec("reset role");
  }
}

try {
  await db.exec(`
    create schema auth;
    create schema extensions;
    create role anon nologin;
    create role authenticated nologin;
    create table auth.users (
      id uuid primary key,
      email text,
      raw_user_meta_data jsonb not null default '{}'::jsonb
    );
    create or replace function auth.uid()
    returns uuid language sql stable set search_path = ''
    as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
  `);

  for (const path of migrations) {
    const migration = await readFile(path, "utf8");
    await db.exec(
      migration
        .replace(
          "create extension if not exists pgcrypto with schema extensions;",
          "",
        )
        .replaceAll("extensions.gen_random_uuid()", "gen_random_uuid()"),
    );
  }

  await db.query(
    `
      insert into auth.users (id, email, raw_user_meta_data)
      values
        ($1, 'communication-admin@example.test',
          '{"display_name":"Synthetic Communication Admin"}'),
        ($2, 'communication-parent@example.test',
          '{"display_name":"Synthetic Communication Parent"}'),
        ($3, 'communication-volunteer@example.test',
          '{"display_name":"Synthetic Communication Volunteer"}')
    `,
    [ids.admin, ids.parent, ids.volunteer],
  );
  await db.query(
    `
      update public.profiles
      set primary_role = case
        when id = $1 then 'platform_administrator'::public.account_role
        when id = $2 then 'parent'::public.account_role
        else 'volunteer'::public.account_role
      end
      where id in ($1, $2, $3)
    `,
    [ids.admin, ids.parent, ids.volunteer],
  );

  const adminAccess = await asAuthenticated(ids.admin, () =>
    db.query("select private.can_manage_communications() as allowed"),
  );
  assert.equal(adminAccess.rows[0].allowed, true);

  const parentAccess = await asAuthenticated(ids.parent, () =>
    db.query("select private.can_manage_communications() as allowed"),
  );
  assert.equal(parentAccess.rows[0].allowed, false);

  const ownNotificationAccess = await asAuthenticated(ids.parent, () =>
    db.query(
      "select private.can_read_own_notifications($1) as own, " +
        "private.can_read_own_notifications($2) as other",
      [ids.parent, ids.admin],
    ),
  );
  assert.equal(ownNotificationAccess.rows[0].own, true);
  assert.equal(ownNotificationAccess.rows[0].other, false);

  const tables = await db.query(`
    select count(*)::integer as count
    from information_schema.tables
    where table_schema = 'public'
      and table_name in (
        'communication_templates',
        'communications',
        'communication_recipients',
        'communication_deliveries',
        'announcements',
        'in_app_notifications'
      )
  `);
  assert.equal(tables.rows[0].count, 6);

  const announcement = await asAuthenticated(ids.admin, () =>
    db.query(
      `select public.create_announcement(
        'Synthetic Parent Update',
        'Synthetic announcement content.',
        'parents',
        null
      ) as id`,
    ),
  );
  const announcementId = announcement.rows[0].id;

  const managerDrafts = await asAuthenticated(ids.admin, () =>
    db.query("select * from public.list_announcements(null, false)"),
  );
  assert.equal(managerDrafts.rows[0].announcement_id, announcementId);
  assert.equal(managerDrafts.rows[0].published_at, null);
  assert.equal(managerDrafts.rows[0].can_manage, true);
  assert.ok(managerDrafts.rows[0].created_at);
  assert.ok(managerDrafts.rows[0].updated_at);

  const searchedManagerDraft = await asAuthenticated(ids.admin, () =>
    db.query(
      "select * from public.list_announcements('Synthetic Parent Update', false)",
    ),
  );
  assert.equal(searchedManagerDraft.rows[0].announcement_id, announcementId);

  const successfulEmptySearch = await asAuthenticated(ids.admin, () =>
    db.query(
      "select * from public.list_announcements('No matching announcement', false)",
    ),
  );
  assert.equal(successfulEmptySearch.rows.length, 0);

  const parentDrafts = await asAuthenticated(ids.parent, () =>
    db.query("select * from public.list_announcements(null, false)"),
  );
  assert.equal(parentDrafts.rows.length, 0);

  const draftAfterFreshListings = await db.query(
    `select published_at, archived_at, updated_at = created_at as unchanged
     from public.announcements where id = $1`,
    [announcementId],
  );
  assert.equal(draftAfterFreshListings.rows[0].published_at, null);
  assert.equal(draftAfterFreshListings.rows[0].archived_at, null);
  assert.equal(draftAfterFreshListings.rows[0].unchanged, true);
  const draftAudits = await db.query(
    `select count(*)::integer as count from public.audit_events
     where entity_id = $1`,
    [announcementId],
  );
  assert.equal(draftAudits.rows[0].count, 1);

  await asAuthenticated(ids.admin, () =>
    db.query("select public.publish_announcement($1)", [announcementId]),
  );

  const parentAnnouncements = await asAuthenticated(ids.parent, () =>
    db.query("select * from public.list_announcements(null, false)"),
  );
  assert.equal(parentAnnouncements.rows[0].announcement_id, announcementId);
  assert.equal(parentAnnouncements.rows[0].can_manage, false);

  const volunteerAnnouncements = await asAuthenticated(ids.volunteer, () =>
    db.query("select * from public.list_announcements(null, false)"),
  );
  assert.equal(volunteerAnnouncements.rows.length, 0);

  let parentCreateDenied = false;
  try {
    await asAuthenticated(ids.parent, () =>
      db.query(
        `select public.create_announcement(
          'Denied', 'Denied synthetic content.', 'ministry', null
        )`,
      ),
    );
  } catch {
    parentCreateDenied = true;
  }
  assert.equal(parentCreateDenied, true);

  await asAuthenticated(ids.admin, () =>
    db.query("select public.archive_announcement($1)", [announcementId]),
  );
  const afterArchive = await asAuthenticated(ids.parent, () =>
    db.query("select * from public.list_announcements(null, false)"),
  );
  assert.equal(afterArchive.rows.length, 0);

  const audits = await db.query(
    `select count(*)::integer as count from public.audit_events
     where entity_id = $1`,
    [announcementId],
  );
  assert.equal(audits.rows[0].count, 3);

  const announcementService = await readFile(
    "features/communications/services/communication-service.ts",
    "utf8",
  );
  const announcementPage = await readFile(
    "app/(platform)/communications/page.tsx",
    "utf8",
  );
  const newAnnouncementPage = await readFile(
    "app/(platform)/communications/new/page.tsx",
    "utf8",
  );
  const announcementDetailPage = await readFile(
    "app/(platform)/communications/[announcementId]/page.tsx",
    "utf8",
  );
  const announcementActions = await readFile(
    "features/communications/actions/communication-actions.ts",
    "utf8",
  );
  const authorizationSource = await readFile(
    "features/auth/types/authorization.ts",
    "utf8",
  );
  const administratorCapabilities = authorizationSource.slice(
    authorizationSource.indexOf("platform_administrator: ["),
    authorizationSource.indexOf("staff_member: ["),
  );
  const projectionMigration = await readFile(
    "supabase/migrations/202609150002_communication_announcement_projection.sql",
    "utf8",
  );
  const listFunction = announcementService.slice(
    announcementService.indexOf("export async function listAnnouncements"),
    announcementService.indexOf("export async function createAnnouncement"),
  );
  assert.match(listFunction, /Promise<AnnouncementListResult>/);
  assert.match(listFunction, /return \{ success: false \}/);
  assert.match(listFunction, /success: true,[\s\S]*announcements:/);
  assert.doesNotMatch(listFunction, /if \(error\) return \[\]/);
  assert.match(announcementService, /operation: "list_announcements"/);
  assert.match(announcementService, /code,[\s\S]*category,/);
  assert.doesNotMatch(
    announcementService,
    /error\.message|error\.details|error\.hint|p_search.*console|console.*p_search/,
  );
  assert.match(
    announcementPage,
    /announcementResult\.success && !announcements\.length/,
  );
  assert.match(announcementPage, /!announcementResult\.success/);
  assert.match(
    announcementPage,
    /We couldn&apos;t load announcements\. Please try again\./,
  );
  assert.match(
    announcementPage,
    /No visible announcements match this search\./,
  );
  assert.match(projectionMigration, /drop function public\.list_announcements\(text, boolean\)/);
  assert.match(projectionMigration, /created_at timestamp with time zone/);
  assert.match(projectionMigration, /updated_at timestamp with time zone/);
  assert.match(projectionMigration, /stable security definer/);
  assert.match(projectionMigration, /set search_path = '' set row_security = off/);
  assert.match(projectionMigration, /revoke all on function public\.list_announcements\(text, boolean\)[\s\S]*from public, anon, authenticated/);
  assert.match(projectionMigration, /grant execute on function public\.list_announcements\(text, boolean\)[\s\S]*to authenticated/);
  assert.doesNotMatch(projectionMigration, /grant execute[\s\S]*to anon/);
  assert.match(announcementPage, /href="\/communications\/new"/);
  assert.match(announcementPage, /href="\/communications\/templates"/);
  assert.match(announcementPage, /md:grid-cols-/);
  assert.match(announcementPage, /announcement\.updatedAt/);
  assert.match(announcementPage, /Entire ministry/);
  assert.match(announcementPage, /Parents and guardians/);
  assert.match(announcementPage, /\.includes\(account\.role\)/);
  assert.doesNotMatch(announcementPage, /announcements\[0\].*canManage/);
  assert.doesNotMatch(announcementPage, /announcementResult.*canManage/);
  assert.match(administratorCapabilities, /"communications\.view"/);
  assert.match(administratorCapabilities, /"communications\.manage"/);
  assert.doesNotMatch(
    announcementPage.slice(
      announcementPage.indexOf("{canManage && announcements.length"),
      announcementPage.indexOf("{!canManage ? announcements.map"),
    ),
    /messageBody/,
  );
  for (const managerPage of [newAnnouncementPage, announcementDetailPage]) {
    assert.match(managerPage, /requireCapability\("communications\.view"\)/);
    assert.match(managerPage, /platform_administrator/);
    assert.match(managerPage, /youth_pastor/);
    assert.match(managerPage, /staff_member/);
    assert.match(managerPage, /notFound\(\)/);
  }
  assert.match(newAnnouncementPage, /<AnnouncementForm/);
  assert.match(announcementDetailPage, /<AnnouncementForm announcement=/);
  assert.match(announcementDetailPage, /<AnnouncementLifecycleForms/);
  assert.match(announcementDetailPage, /announcement\.messageBody/);
  assert.match(announcementDetailPage, /announcement\.updatedAt/);
  assert.match(announcementActions, /redirect\(`\/communications\/\$\{createdId\}`\)/);
  assert.match(announcementActions, /revalidatePath\(`\/communications\/\$\{announcementId\}`\)/);

  const template = await asAuthenticated(ids.admin, () =>
    db.query(
      `select public.create_communication_template(
        'Synthetic Parent Email',
        'email',
        'Synthetic subject',
        'Synthetic template content.'
      ) as id`,
    ),
  );
  const templateId = template.rows[0].id;
  await asAuthenticated(ids.admin, () =>
    db.query(
      `select public.update_communication_template(
        $1, 'Synthetic Updated Parent Email', 'email',
        'Synthetic updated subject', 'Synthetic updated template content.'
      )`,
      [templateId],
    ),
  );
  const templates = await asAuthenticated(ids.admin, () =>
    db.query("select * from public.list_communication_templates(null, false)"),
  );
  assert.equal(templates.rows[0].template_id, templateId);
  assert.equal(templates.rows[0].name, "Synthetic Updated Parent Email");
  const appliedEmail = resolveTemplateApplication({
    templates: [{
      templateId: templates.rows[0].template_id,
      name: templates.rows[0].name,
      channel: templates.rows[0].channel,
      subject: templates.rows[0].subject,
      messageBody: templates.rows[0].message_body,
      archivedAt: templates.rows[0].archived_at,
      updatedAt: templates.rows[0].updated_at,
    }],
    templateId,
    channel: "email",
    subject: "",
    messageBody: "",
    appliedContent: null,
  });
  assert.equal(appliedEmail.kind, "applied");
  assert.equal(appliedEmail.subject, "Synthetic updated subject");
  assert.equal(
    appliedEmail.messageBody,
    "Synthetic updated template content.",
  );

  let parentTemplateDenied = false;
  try {
    await asAuthenticated(ids.parent, () =>
      db.query("select * from public.list_communication_templates(null, false)"),
    );
  } catch {
    parentTemplateDenied = true;
  }
  assert.equal(parentTemplateDenied, true);

  let volunteerTemplateDenied = false;
  try {
    await asAuthenticated(ids.volunteer, () =>
      db.query("select * from public.list_communication_templates(null, false)"),
    );
  } catch {
    volunteerTemplateDenied = true;
  }
  assert.equal(volunteerTemplateDenied, true);

  const templateListPage = await readFile(
    "app/(platform)/communications/templates/page.tsx",
    "utf8",
  );
  const templateNewPage = await readFile(
    "app/(platform)/communications/templates/new/page.tsx",
    "utf8",
  );
  const templateDetailPage = await readFile(
    "app/(platform)/communications/templates/[templateId]/page.tsx",
    "utf8",
  );
  const templateEditPage = await readFile(
    "app/(platform)/communications/templates/[templateId]/edit/page.tsx",
    "utf8",
  );
  const templateForms = await readFile(
    "features/communications/components/template-forms.tsx",
    "utf8",
  );
  const communicationComposer = await readFile(
    "features/communications/components/communication-composer.tsx",
    "utf8",
  );
  assert.match(templateListPage, /href="\/communications\/templates\/new"/);
  assert.match(templateListPage, /Last updated/);
  assert.match(templateListPage, /md:grid-cols-/);
  assert.match(templateListPage, /No templates match this search\./);
  assert.doesNotMatch(templateListPage, /<CommunicationTemplateForm/);
  for (const managerTemplatePage of [
    templateListPage,
    templateNewPage,
    templateDetailPage,
    templateEditPage,
  ]) {
    assert.match(
      managerTemplatePage,
      /requireCapability\("communications\.manage"\)/,
    );
  }
  assert.match(templateNewPage, /<CommunicationTemplateForm/);
  assert.match(templateDetailPage, /href=\{`\/communications\/templates\/\$\{template\.templateId\}\/edit`\}/);
  assert.match(templateDetailPage, /template\.messageBody/);
  assert.doesNotMatch(templateDetailPage, /<CommunicationTemplateForm/);
  assert.match(templateEditPage, /<CommunicationTemplateForm template=\{template\}/);
  assert.match(templateEditPage, /template\.archivedAt/);
  assert.match(templateForms, /channel === "email"/);
  assert.match(templateForms, /Email subject/);
  assert.match(templateForms, /name="subject" type="hidden" value=""/);
  assert.match(templateForms, /id="template-channel"/);
  assert.match(templateForms, /id="template-subject"/);
  assert.match(templateForms, /id="template-message"/);
  assert.match(announcementActions, /redirect\(`\/communications\/templates\/\$\{createdId\}`\)/);
  assert.match(announcementActions, /redirect\(`\/communications\/templates\/\$\{templateId\}`\)/);
  assert.match(communicationComposer, /resolveTemplateApplication/);
  assert.match(communicationComposer, /setMessageBody\(result\.messageBody\)/);
  assert.match(communicationComposer, /setSubject\(result\.subject\)/);
  assert.match(communicationComposer, /window\.confirm/);
  assert.match(communicationComposer, /addEventListener\("pageshow"/);
  assert.match(communicationComposer, /templateSelect\.current\?\.value/);
  assert.match(communicationComposer, /value=\{messageBody\}/);
  assert.match(communicationComposer, /value=\{subject\}/);

  await asAuthenticated(ids.admin, () =>
    db.query("select public.archive_communication_template($1)", [templateId]),
  );
  const activeTemplates = await asAuthenticated(ids.admin, () =>
    db.query("select * from public.list_communication_templates(null, false)"),
  );
  assert.equal(activeTemplates.rows.length, 0);

  const inAppTemplate = await asAuthenticated(ids.admin, () =>
    db.query(
      `select public.create_communication_template(
        'Synthetic In-app Template', 'in_app', null,
        'Synthetic in-app reusable content.'
      ) as id`,
    ),
  );
  const smsTemplate = await asAuthenticated(ids.admin, () =>
    db.query(
      `select public.create_communication_template(
        'Synthetic SMS Template', 'sms', null,
        'Synthetic SMS reusable content.'
      ) as id`,
    ),
  );
  const channelTemplates = await asAuthenticated(ids.admin, () =>
    db.query("select * from public.list_communication_templates(null, false)"),
  );
  const channelTemplateMap = new Map(
    channelTemplates.rows.map((item) => [item.template_id, item]),
  );
  assert.equal(
    channelTemplateMap.get(inAppTemplate.rows[0].id).message_body,
    "Synthetic in-app reusable content.",
  );
  assert.equal(channelTemplateMap.get(inAppTemplate.rows[0].id).subject, null);
  assert.equal(
    channelTemplateMap.get(smsTemplate.rows[0].id).message_body,
    "Synthetic SMS reusable content.",
  );
  assert.equal(channelTemplateMap.get(smsTemplate.rows[0].id).subject, null);

  const projectedTemplates = channelTemplates.rows.map((item) => ({
    templateId: item.template_id,
    name: item.name,
    channel: item.channel,
    subject: item.subject,
    messageBody: item.message_body,
    archivedAt: item.archived_at,
    updatedAt: item.updated_at,
  }));
  const selectedInAppId = inAppTemplate.rows[0].id;
  const appliedInApp = resolveTemplateApplication({
    templates: projectedTemplates,
    templateId: selectedInAppId,
    channel: "in_app",
    subject: "",
    messageBody: "",
    appliedContent: null,
  });
  assert.equal(appliedInApp.kind, "applied");
  assert.equal(appliedInApp.selectedTemplateId, selectedInAppId);
  assert.equal(
    appliedInApp.messageBody,
    "Synthetic in-app reusable content.",
    "Selecting the projected dropdown UUID must place its real message_body in the controlled textarea state",
  );

  const preservedWithoutTemplate = resolveTemplateApplication({
    templates: projectedTemplates,
    templateId: "",
    channel: "in_app",
    subject: "",
    messageBody: "Manager-edited content",
    appliedContent: appliedInApp.appliedContent,
  });
  assert.equal(preservedWithoutTemplate.messageBody, "Manager-edited content");

  const manualReplacement = resolveTemplateApplication({
    templates: projectedTemplates,
    templateId: smsTemplate.rows[0].id,
    channel: "sms",
    subject: "",
    messageBody: "Manager-edited content",
    appliedContent: null,
  });
  assert.equal(manualReplacement.kind, "confirmation_required");

  const preview = await asAuthenticated(ids.admin, () =>
    db.query(
      "select * from public.preview_communication_recipients('parents', 'in_app')",
    ),
  );
  assert.equal(preview.rows[0].recipient_profile_id, ids.parent);
  assert.equal(preview.rows[0].preference_authorized, true);

  const volunteerPreview = await asAuthenticated(ids.admin, () =>
    db.query(
      "select * from public.preview_communication_recipients('volunteers', 'in_app')",
    ),
  );
  assert.equal(volunteerPreview.rows[0].recipient_profile_id, ids.volunteer);
  assert.equal(volunteerPreview.rows[0].preference_authorized, true);

  const volunteerCommunication = await asAuthenticated(ids.admin, () =>
    db.query(
      `select public.send_synthetic_communication(
        'Synthetic Volunteer Message', null, 'Synthetic volunteer content.',
        'in_app', 'volunteers', null
      ) as id`,
    ),
  );
  const volunteerNotifications = await asAuthenticated(ids.volunteer, () =>
    db.query("select * from public.list_my_in_app_notifications()"),
  );
  assert.equal(
    volunteerNotifications.rows[0].title,
    "Synthetic Volunteer Message",
  );
  assert.ok(volunteerCommunication.rows[0].id);

  const communication = await asAuthenticated(ids.admin, () =>
    db.query(
      `select public.send_synthetic_communication(
        'Synthetic Parent Message', null, 'Synthetic in-app content.',
        'in_app', 'parents', null
      ) as id`,
    ),
  );
  const communicationId = communication.rows[0].id;
  const parentNotifications = await asAuthenticated(ids.parent, () =>
    db.query("select * from public.list_my_in_app_notifications()"),
  );
  assert.equal(parentNotifications.rows[0].title, "Synthetic Parent Message");
  const history = await asAuthenticated(ids.admin, () =>
    db.query("select * from public.list_communication_history(null)"),
  );
  assert.equal(history.rows[0].communication_id, communicationId);
  assert.equal(history.rows[0].delivered_count, 1);
  assert.equal(history.rows[0].synthetic_delivery, true);

  const unreadBefore = await asAuthenticated(ids.parent, () =>
    db.query("select public.get_my_unread_notification_count() as count"),
  );
  assert.equal(unreadBefore.rows[0].count, 1);
  await asAuthenticated(ids.parent, () =>
    db.query("select public.mark_my_notification_read($1)", [
      parentNotifications.rows[0].notification_id,
    ]),
  );
  const unreadAfter = await asAuthenticated(ids.parent, () =>
    db.query("select public.get_my_unread_notification_count() as count"),
  );
  assert.equal(unreadAfter.rows[0].count, 0);

  let crossAccountReadDenied = false;
  try {
    await asAuthenticated(ids.parent, () =>
      db.query("select public.mark_my_notification_read($1)", [
        volunteerNotifications.rows[0].notification_id,
      ]),
    );
  } catch {
    crossAccountReadDenied = true;
  }
  assert.equal(crossAccountReadDenied, true);

  console.log("Communication Center foundation verification passed.");
} finally {
  await db.close();
}
