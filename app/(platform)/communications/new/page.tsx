import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireCapability } from "@/features/auth/services/authorization-service";
import { AnnouncementForm } from "@/features/communications/components/announcement-forms";

export const metadata: Metadata = { title: "New announcement" };

export default async function NewAnnouncementPage() {
  const account = await requireCapability("communications.view");
  if (!["platform_administrator", "youth_pastor", "staff_member"].includes(
    account.role,
  )) notFound();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-sky-700">Communication Center</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">New announcement</h1>
        <p className="mt-2 text-slate-600">
          Create a durable draft, then review and publish it when ready.
        </p>
      </header>
      <section className="max-w-3xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <AnnouncementForm />
      </section>
      <Link className="inline-flex min-h-11 items-center font-semibold text-sky-800"
        href="/communications">Back to announcements</Link>
    </div>
  );
}
