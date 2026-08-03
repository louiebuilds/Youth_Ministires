import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { PGlite } from "@electric-sql/pglite";

const migrations = [
  "supabase/migrations/202607230001_core_database_foundation.sql",
  "supabase/migrations/202607230002_security_authorization.sql",
  "supabase/migrations/202607300014_communication_center_foundation.sql",
  "supabase/migrations/202607300015_announcement_workflows.sql",
  "supabase/migrations/202607300016_communication_template_workflows.sql",
  "supabase/migrations/202607300017_synthetic_communication_delivery.sql",
  "supabase/migrations/202607300018_in_app_notification_lifecycle.sql",
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
  await asAuthenticated(ids.admin, () =>
    db.query("select public.publish_announcement($1)", [announcementId]),
  );

  const parentAnnouncements = await asAuthenticated(ids.parent, () =>
    db.query("select * from public.list_announcements(null, false)"),
  );
  assert.equal(parentAnnouncements.rows[0].announcement_id, announcementId);
  assert.equal(parentAnnouncements.rows[0].can_manage, false);

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

  let parentTemplateDenied = false;
  try {
    await asAuthenticated(ids.parent, () =>
      db.query("select * from public.list_communication_templates(null, false)"),
    );
  } catch {
    parentTemplateDenied = true;
  }
  assert.equal(parentTemplateDenied, true);

  await asAuthenticated(ids.admin, () =>
    db.query("select public.archive_communication_template($1)", [templateId]),
  );
  const activeTemplates = await asAuthenticated(ids.admin, () =>
    db.query("select * from public.list_communication_templates(null, false)"),
  );
  assert.equal(activeTemplates.rows.length, 0);

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
