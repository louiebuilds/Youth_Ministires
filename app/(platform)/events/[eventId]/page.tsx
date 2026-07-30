import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { FamilyEventRegistration } from "@/features/events/components/family-event-registration";
import { requireCapability } from "@/features/auth/services/authorization-service";
import {
  ArchiveEventForm,
  EventManagementForm,
} from "@/features/events/components/event-management-form";
import { EventRegistrationSettingsForm } from "@/features/events/components/event-registration-settings-form";
import { EventRegistrationRoster } from "@/features/events/components/event-registration-roster";
import { EventVolunteerAssignments } from "@/features/events/components/event-volunteer-assignments";
import { EventPlanningTools } from "@/features/events/components/event-planning-tools";
import {
  getEventRegistrationSettings,
  listEventChecklistItems,
  listEventReminders,
  listEventRegistrations,
  listEventVolunteerAssignments,
  listEventVolunteerCandidates,
  listMyEventRegistrationOptions,
  getEventWorkspace,
} from "@/features/events/services/event-management-service";

export const metadata: Metadata = { title: "Event Workspace" };

export default async function EventWorkspacePage({
  params,
}: Readonly<{ params: Promise<{ eventId: string }> }>) {
  await requireCapability("events.view");
  const eventId = z.string().uuid().safeParse((await params).eventId);
  if (!eventId.success) notFound();
  const [
    event,
    registrationSettings,
    registrationOptions,
    registrations,
    volunteerAssignments,
    volunteerCandidates,
    reminders,
    checklistItems,
  ] =
    await Promise.all([
      getEventWorkspace(eventId.data),
      getEventRegistrationSettings(eventId.data),
      listMyEventRegistrationOptions(eventId.data),
      listEventRegistrations(eventId.data),
      listEventVolunteerAssignments(eventId.data),
      listEventVolunteerCandidates(eventId.data),
      listEventReminders(eventId.data),
      listEventChecklistItems(eventId.data),
    ]);
  if (!event) notFound();

  return (
    <div className="space-y-8">
      <header>
        <Link className="text-sm font-semibold text-sky-700" href="/events">
          ← Back to events
        </Link>
        <div className="mt-3 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-sky-700">{event.eventType}</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-950">{event.name}</h1>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold">
            {event.status}
          </span>
        </div>
      </header>

      <section className="grid gap-5 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-bold text-slate-950">Overview</h2>
          <p className="mt-3 whitespace-pre-wrap text-slate-700">
            {event.description || "No description recorded."}
          </p>
          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-500">Starts</dt><dd className="font-semibold">
              {new Intl.DateTimeFormat("en-US", {
                dateStyle: "full", timeStyle: "short", timeZone: event.timezone,
              }).format(new Date(event.startsAt))}
            </dd></div>
            <div><dt className="text-slate-500">Ends</dt><dd className="font-semibold">
              {new Intl.DateTimeFormat("en-US", {
                dateStyle: "full", timeStyle: "short", timeZone: event.timezone,
              }).format(new Date(event.endsAt))}
            </dd></div>
            <div><dt className="text-slate-500">Location</dt><dd className="font-semibold">
              {[event.campus, event.building, event.room].filter(Boolean).join(" · ")
                || "Not set"}
            </dd></div>
            <div><dt className="text-slate-500">Capacity</dt><dd className="font-semibold">
              {event.capacity ?? "Not limited"}
            </dd></div>
          </dl>
          {event.address ? <p className="mt-4 text-sm">{event.address}</p> : null}
          {event.meetingInstructions ? (
            <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm">
              <strong>Meeting instructions</strong>
              <p className="mt-1 whitespace-pre-wrap">{event.meetingInstructions}</p>
            </div>
          ) : null}
        </div>
        <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-slate-950">Workspace</h2>
          {registrationSettings ? (
            <dl className="mt-3 space-y-3 text-sm">
              <div><dt className="text-slate-500">Registered</dt>
                <dd className="font-semibold">{registrationSettings.registeredCount}</dd></div>
              <div><dt className="text-slate-500">Waitlisted</dt>
                <dd className="font-semibold">{registrationSettings.waitlistedCount}</dd></div>
              <div><dt className="text-slate-500">Waitlist limit</dt>
                <dd className="font-semibold">
                  {registrationSettings.waitlistCapacity ?? "Not enabled"}
                </dd></div>
            </dl>
          ) : null}
        </aside>
      </section>
      {!event.canManage ? (
        <FamilyEventRegistration
          eventId={event.eventId}
          options={registrationOptions}
        />
      ) : null}
      {event.canManage && event.status !== "archived" ? (
        <div className="space-y-6">
        <EventRegistrationRoster
          eventId={event.eventId}
          registrations={registrations}
        />
        <EventVolunteerAssignments
          assignments={volunteerAssignments}
          candidates={volunteerCandidates}
          eventId={event.eventId}
        />
        <EventPlanningTools
          checklistItems={checklistItems}
          eventId={event.eventId}
          reminders={reminders}
        />
        {registrationSettings ? (
          <section className="space-y-5 rounded-xl border border-sky-200 bg-sky-50/50 p-5">
            <div>
              <p className="text-sm font-semibold text-sky-700">Registration</p>
              <h2 className="mt-1 text-xl font-bold text-slate-950">
                Capacity and registration window
              </h2>
            </div>
            <EventRegistrationSettingsForm
              settings={registrationSettings}
              timezone={event.timezone}
            />
          </section>
        ) : null}
        <section className="space-y-6 rounded-xl border border-sky-200 bg-sky-50/50 p-5">
          <div>
            <p className="text-sm font-semibold text-sky-700">Ministry management</p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">Edit event</h2>
          </div>
          <EventManagementForm event={event} />
          <div className="border-t border-sky-200 pt-5">
            <ArchiveEventForm eventId={event.eventId} />
          </div>
        </section>
        </div>
      ) : null}
    </div>
  );
}
