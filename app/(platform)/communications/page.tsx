import type { Metadata } from "next";
import Link from "next/link";

import { requireCapability } from "@/features/auth/services/authorization-service";
import {
  AnnouncementForm,
  AnnouncementLifecycleForms,
} from "@/features/communications/components/announcement-forms";
import { NotificationList } from "@/features/communications/components/notification-list";
import {
  getMyUnreadNotificationCount,
  listAnnouncements,
  listMyInAppNotifications,
} from "@/features/communications/services/communication-service";

export const metadata: Metadata = { title: "Communications" };

export default async function CommunicationsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const account = await requireCapability("communications.view");
  const params = await searchParams;
  const search = typeof params.q === "string" && params.q.trim().length <= 100
    ? params.q.trim() || null : null;
  const includeArchived = params.archived === "true";
  const canManage = [
    "platform_administrator", "youth_pastor", "staff_member",
  ].includes(account.role);
  const [announcements, notifications, unreadCount] = await Promise.all([
    listAnnouncements(search, canManage && includeArchived),
    listMyInAppNotifications(),
    getMyUnreadNotificationCount(),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold text-sky-700">Communication Center</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">Announcements</h1>
        <p className="mt-2 text-slate-600">
          Published ministry updates for parents, volunteers, and staff.
        </p>
        {canManage ? (
          <div className="mt-4 flex flex-wrap gap-3">
            <Link className="inline-flex min-h-11 items-center rounded-lg bg-sky-700 px-4 font-semibold text-white"
              href="/communications/compose">Compose test message</Link>
            <Link className="inline-flex min-h-11 items-center rounded-lg border border-sky-700 px-4 font-semibold text-sky-800"
              href="/communications/templates">Manage templates</Link>
          </div>
        ) : null}
      </header>
      <NotificationList notifications={notifications}
        unreadCount={unreadCount} />
      {canManage ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-xl font-bold">Create announcement</h2>
          <AnnouncementForm />
        </section>
      ) : null}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <form className="flex flex-wrap items-end gap-4" method="get">
          <label className="min-w-64 flex-1 text-sm font-semibold">Search
            <input className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3"
              defaultValue={search ?? ""} maxLength={100} name="q" />
          </label>
          {canManage ? (
            <label className="flex min-h-11 items-center gap-2">
              <input defaultChecked={includeArchived} name="archived"
                type="checkbox" value="true" /> Include archived
            </label>
          ) : null}
          <button className="min-h-11 rounded-lg bg-slate-900 px-5 font-semibold text-white">
            Search
          </button>
        </form>
      </section>
      <section className="space-y-4">
        {announcements.map((announcement) => (
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            key={announcement.announcementId}>
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">{announcement.title}</h2>
                <p className="text-sm font-semibold text-sky-700">
                  {announcement.audienceType}
                  {announcement.archivedAt ? " · archived" :
                    announcement.publishedAt ? " · published" : " · draft"}
                </p>
              </div>
              {announcement.expiresAt ? (
                <p className="text-sm text-slate-500">
                  Expires {new Date(announcement.expiresAt).toLocaleString()}
                </p>
              ) : null}
            </div>
            <p className="mt-4 whitespace-pre-wrap text-slate-700">
              {announcement.messageBody}
            </p>
            {canManage && !announcement.archivedAt ? (
              <details className="mt-5 border-t border-slate-200 pt-4">
                <summary className="cursor-pointer font-semibold">
                  Edit announcement
                </summary>
                <div className="mt-4"><AnnouncementForm announcement={announcement} /></div>
                <div className="mt-4">
                  <AnnouncementLifecycleForms announcement={announcement} />
                </div>
              </details>
            ) : null}
          </article>
        ))}
        {!announcements.length ? (
          <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
            No visible announcements match this search.
          </p>
        ) : null}
      </section>
    </div>
  );
}
