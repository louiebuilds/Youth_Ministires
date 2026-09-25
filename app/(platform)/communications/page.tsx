import type { Metadata } from "next";
import Link from "next/link";

import { requireCapability } from "@/features/auth/services/authorization-service";
import {
  type Announcement,
} from "@/features/communications/types/communications";
import { NotificationList } from "@/features/communications/components/notification-list";
import {
  getMyUnreadNotificationCount,
  listAnnouncements,
  listMyInAppNotifications,
} from "@/features/communications/services/communication-service";

export const metadata: Metadata = { title: "Communications" };

const audienceLabel = (audience: Announcement["audienceType"]) => ({
  ministry: "Entire ministry",
  parents: "Parents and guardians",
  volunteers: "Volunteers",
  household: "Household",
  event: "Event",
  individual: "Individual",
})[audience];

function statusLabel(announcement: Announcement) {
  if (announcement.archivedAt) return "Archived";
  if (announcement.publishedAt && announcement.expiresAt &&
    new Date(announcement.expiresAt) <= new Date()) return "Expired";
  return announcement.publishedAt ? "Published" : "Draft";
}

const displayDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
    new Date(value),
  );

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
  const [announcementResult, notifications, unreadCount] = await Promise.all([
    listAnnouncements(search, canManage && includeArchived),
    listMyInAppNotifications(),
    getMyUnreadNotificationCount(),
  ]);
  const announcements = announcementResult.success
    ? announcementResult.announcements
    : [];

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold text-sky-700">Communication Center</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">Announcements</h1>
        <p className="mt-2 text-slate-600">
          {canManage
            ? "Create and manage ministry announcements."
            : "Published ministry updates for parents, volunteers, and staff."}
        </p>
        <nav className="mt-4 flex flex-wrap gap-3" aria-label="Communications workspaces">
          <span className="inline-flex min-h-11 items-center rounded-lg bg-slate-900 px-4 font-semibold text-white">
            Announcements
          </span>
          <Link
            className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 font-semibold text-slate-700"
            href="/communications/chat"
          >
            Group chat
          </Link>
        </nav>
        {canManage ? (
          <div className="mt-4 flex flex-wrap gap-3">
            <Link className="inline-flex min-h-11 items-center rounded-lg bg-sky-700 px-4 font-semibold text-white"
              href="/communications/new">New announcement</Link>
            <Link className="inline-flex min-h-11 items-center rounded-lg border border-sky-700 px-4 font-semibold text-sky-800"
              href="/communications/templates">Manage templates</Link>
            <Link className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 font-semibold text-slate-700"
              href="/communications/compose">Compose test message</Link>
          </div>
        ) : null}
      </header>
      <NotificationList notifications={notifications}
        unreadCount={unreadCount} />
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
        {canManage && announcements.length ? (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="hidden gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 md:grid md:grid-cols-[minmax(0,2fr)_minmax(10rem,1fr)_8rem_10rem_4rem]">
              <span>Title</span><span>Audience</span><span>Status</span>
              <span>Last updated</span><span className="sr-only">Open</span>
            </div>
            <div className="divide-y divide-slate-200">
              {announcements.map((announcement) => (
                <Link
                  className="grid gap-2 px-5 py-4 transition hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-sky-700 md:grid-cols-[minmax(0,2fr)_minmax(10rem,1fr)_8rem_10rem_4rem] md:items-center md:gap-4"
                  href={`/communications/${announcement.announcementId}`}
                  key={announcement.announcementId}
                >
                  <span className="font-bold text-slate-950">{announcement.title}</span>
                  <span className="text-sm text-slate-600">{audienceLabel(announcement.audienceType)}</span>
                  <span className="text-sm font-semibold text-sky-800">{statusLabel(announcement)}</span>
                  <time className="text-sm text-slate-600" dateTime={announcement.updatedAt}>
                    {displayDate(announcement.updatedAt)}
                  </time>
                  <span className="text-sm font-semibold text-sky-800 md:text-right">Open</span>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
        {!canManage ? announcements.map((announcement) => (
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            key={announcement.announcementId}>
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">{announcement.title}</h2>
                <p className="text-sm font-semibold text-sky-700">
                  {audienceLabel(announcement.audienceType)} · {statusLabel(announcement)}
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
          </article>
        )) : null}
        {announcementResult.success && !announcements.length ? (
          <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
            No visible announcements match this search.
          </p>
        ) : null}
        {!announcementResult.success ? (
          <p className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800"
            role="alert">
            We couldn&apos;t load announcements. Please try again.
          </p>
        ) : null}
      </section>
    </div>
  );
}
