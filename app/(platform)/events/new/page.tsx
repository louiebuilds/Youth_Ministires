import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireCapability } from "@/features/auth/services/authorization-service";
import { EventManagementForm } from "@/features/events/components/event-management-form";

export const metadata: Metadata = { title: "Create Event" };

export default async function CreateEventPage() {
  const account = await requireCapability("events.view");
  if (!["platform_administrator", "youth_pastor", "staff_member"]
    .includes(account.role)) notFound();
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header>
        <p className="text-sm font-semibold text-sky-700">Events</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">Create event</h1>
        <p className="mt-2 text-slate-600">
          New events begin in the lifecycle state you select. Archive instead
          of deleting historical events.
        </p>
      </header>
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <EventManagementForm />
      </section>
    </div>
  );
}
