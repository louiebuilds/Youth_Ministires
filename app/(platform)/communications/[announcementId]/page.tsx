import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireCapability } from "@/features/auth/services/authorization-service";
import {
  AnnouncementForm,
  AnnouncementLifecycleForms,
} from "@/features/communications/components/announcement-forms";
import { announcementIdSchema } from "@/features/communications/schemas/announcement-schema";
import { listAnnouncements } from "@/features/communications/services/communication-service";

export const metadata: Metadata = { title: "Manage announcement" };

const audienceLabels = {
  ministry: "Entire ministry",
  parents: "Parents and guardians",
  volunteers: "Volunteers",
  household: "Household",
  event: "Event",
  individual: "Individual",
} as const;

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export default async function AnnouncementDetailPage({
  params,
}: Readonly<{ params: Promise<{ announcementId: string }> }>) {
  const account = await requireCapability("communications.view");
  if (!["platform_administrator", "youth_pastor", "staff_member"].includes(
    account.role,
  )) notFound();

  const parsed = announcementIdSchema.safeParse(await params);
  if (!parsed.success) notFound();
  const result = await listAnnouncements(null, true);
  if (!result.success) {
    return (
      <div className="space-y-5">
        <h1 className="text-3xl font-bold text-slate-950">Manage announcement</h1>
        <p className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800"
          role="alert">We couldn&apos;t load this announcement. Please try again.</p>
        <Link className="font-semibold text-sky-800" href="/communications">
          Back to announcements
        </Link>
      </div>
    );
  }
  const announcement = result.announcements.find(
    (item) => item.announcementId === parsed.data.announcementId,
  );
  if (!announcement) notFound();
  const status = announcement.archivedAt ? "Archived" :
    announcement.publishedAt && announcement.expiresAt &&
      new Date(announcement.expiresAt) <= new Date() ? "Expired" :
      announcement.publishedAt ? "Published" : "Draft";

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-sky-700">Communication Center</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">{announcement.title}</h1>
        <p className="mt-2 font-semibold text-sky-800">
          {audienceLabels[announcement.audienceType]} · {status}
        </p>
      </header>
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="font-semibold text-slate-500">Status</dt><dd className="mt-1 text-slate-900">{status}</dd></div>
          <div><dt className="font-semibold text-slate-500">Audience</dt><dd className="mt-1 text-slate-900">{audienceLabels[announcement.audienceType]}</dd></div>
          <div><dt className="font-semibold text-slate-500">Last updated</dt><dd className="mt-1 text-slate-900">{formatDateTime(announcement.updatedAt)}</dd></div>
          <div><dt className="font-semibold text-slate-500">Published</dt><dd className="mt-1 text-slate-900">{announcement.publishedAt ? formatDateTime(announcement.publishedAt) : "Not published"}</dd></div>
          {announcement.expiresAt ? (
            <div><dt className="font-semibold text-slate-500">Expires</dt><dd className="mt-1 text-slate-900">{formatDateTime(announcement.expiresAt)}</dd></div>
          ) : null}
        </dl>
        <div className="mt-6 border-t border-slate-200 pt-5">
          <h2 className="text-lg font-bold">Message</h2>
          <p className="mt-3 whitespace-pre-wrap text-slate-700">{announcement.messageBody}</p>
        </div>
      </section>
      {!announcement.archivedAt ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold">Edit announcement</h2>
          <div className="mt-4"><AnnouncementForm announcement={announcement} /></div>
          <div className="mt-5 border-t border-slate-200 pt-5">
            <AnnouncementLifecycleForms announcement={announcement} />
          </div>
        </section>
      ) : null}
      <Link className="inline-flex min-h-11 items-center font-semibold text-sky-800"
        href="/communications">Back to announcements</Link>
    </div>
  );
}
