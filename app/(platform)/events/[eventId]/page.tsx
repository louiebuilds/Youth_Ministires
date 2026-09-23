import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { requireCapability } from "@/features/auth/services/authorization-service";
import { ArchiveEventForm, EventManagementForm } from "@/features/events/components/event-management-form";
import { EventPlanningTools } from "@/features/events/components/event-planning-tools";
import { EventPublishForm } from "@/features/events/components/event-publish-form";
import { EventRegistrationRoster } from "@/features/events/components/event-registration-roster";
import { EventRegistrationSettingsForm } from "@/features/events/components/event-registration-settings-form";
import { EventVolunteerAssignments } from "@/features/events/components/event-volunteer-assignments";
import { FamilyEventRegistration } from "@/features/events/components/family-event-registration";
import {
  getEventRegistrationSettings,
  getEventWorkspace,
  listEventChecklistItems,
  listEventRegistrationReadiness,
  listEventRegistrations,
  listEventReminders,
  listEventVolunteerAssignments,
  listEventVolunteerCandidates,
  listMyEventRegistrationOptions,
} from "@/features/events/services/event-management-service";
import { EventPermissionSlipForm } from "@/features/forms/components/event-permission-slip-form";
import { getEventPermissionSlipRequirement } from "@/features/forms/services/medical-permission-service";
import { listDocumentTemplates, listDocumentTemplateVersions } from "@/features/forms/services/document-template-service";

import type { EventWorkspace } from "@/features/events/types/event-management";

export const metadata: Metadata = { title: "Event Workspace" };

const sectionSchema = z.enum(["overview", "registration", "volunteers", "forms", "planning", "settings"]);
type EventSection = z.infer<typeof sectionSchema>;
const sections: ReadonlyArray<{ id: EventSection; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "registration", label: "Registration" },
  { id: "volunteers", label: "Volunteers" },
  { id: "forms", label: "Forms" },
  { id: "planning", label: "Planning" },
  { id: "settings", label: "Settings" },
];

function SectionNavigation({ active, eventId, visible }: Readonly<{
  active: EventSection;
  eventId: string;
  visible: ReadonlySet<EventSection>;
}>) {
  return (
    <nav aria-label="Event workspace sections" className="overflow-x-auto border-b border-slate-200">
      <div className="flex min-w-max gap-1">
        {sections.filter(({ id }) => visible.has(id)).map(({ id, label }) => (
          <Link
            aria-current={active === id ? "page" : undefined}
            className={`min-h-11 border-b-2 px-4 py-3 text-sm font-semibold ${active === id ? "border-sky-700 text-sky-800" : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-950"}`}
            href={id === "overview" ? `/events/${eventId}` : `/events/${eventId}?section=${id}`}
            key={id}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export default async function EventWorkspacePage({ params, searchParams }: Readonly<{
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ section?: string | string[] }>;
}>) {
  const account = await requireCapability("events.view");
  const eventId = z.string().uuid().safeParse((await params).eventId);
  if (!eventId.success) notFound();
  const event = await getEventWorkspace(eventId.data);
  if (!event) notFound();

  const requested = sectionSchema.safeParse((await searchParams).section);
  const permissionManager = account.role === "platform_administrator" || account.role === "youth_pastor";
  const isVolunteer = account.role === "volunteer";
  const managementAvailable = !isVolunteer && event.canManage && event.status !== "archived";
  const visible = new Set<EventSection>(["overview"]);
  if (!isVolunteer) visible.add("registration");
  if (permissionManager || account.role === "parent") visible.add("forms");
  if (managementAvailable) {
    visible.add("volunteers");
    visible.add("planning");
    visible.add("settings");
  }
  const active = requested.success && visible.has(requested.data) ? requested.data : "overview";
  const registrationSettings = active === "overview" || active === "registration"
    ? await getEventRegistrationSettings(event.eventId)
    : null;

  return (
    <div className="space-y-6">
      <header>
        <Link className="text-sm font-semibold text-sky-700" href="/events">← Back to events</Link>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-sky-700">{event.eventType}</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-950">{event.name}</h1>
            <span className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold capitalize">{event.status}</span>
          </div>
          {managementAvailable && event.status === "draft" ? <EventPublishForm event={event} /> : null}
        </div>
      </header>

      <SectionNavigation active={active} eventId={event.eventId} visible={visible} />

      {active === "overview" ? <Overview event={event} registrationSettings={registrationSettings} /> : null}
      {active === "registration" ? (
        <RegistrationSection accountRole={account.role} event={event} registrationSettings={registrationSettings} />
      ) : null}
      {active === "volunteers" && managementAvailable ? <VolunteersSection eventId={event.eventId} /> : null}
      {active === "forms" ? <FormsSection accountRole={account.role} event={event} permissionManager={permissionManager} /> : null}
      {active === "planning" && managementAvailable ? <PlanningSection eventId={event.eventId} /> : null}
      {active === "settings" && managementAvailable ? (
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-sky-700">Event settings</p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">Edit event</h2>
            <div className="mt-5"><EventManagementForm event={event} /></div>
          </section>
          <section className="rounded-xl border border-red-200 bg-red-50/50 p-5">
            <p className="text-sm font-semibold text-red-700">Destructive action</p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">Archive event</h2>
            <div className="mt-4"><ArchiveEventForm eventId={event.eventId} /></div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function Overview({ event, registrationSettings }: Readonly<{
  event: EventWorkspace;
  registrationSettings: Awaited<ReturnType<typeof getEventRegistrationSettings>>;
}>) {
  const formatDate = (value: string) => new Intl.DateTimeFormat("en-US", {
    dateStyle: "full", timeStyle: "short", timeZone: event.timezone,
  }).format(new Date(value));
  return (
    <section className="grid gap-5 lg:grid-cols-3">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
        <h2 className="text-lg font-bold text-slate-950">Event overview</h2>
        <p className="mt-3 whitespace-pre-wrap text-slate-700">{event.description || "No description recorded."}</p>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
          <div><dt className="text-slate-500">Starts</dt><dd className="font-semibold">{formatDate(event.startsAt)}</dd></div>
          <div><dt className="text-slate-500">Ends</dt><dd className="font-semibold">{formatDate(event.endsAt)}</dd></div>
          <div><dt className="text-slate-500">Location</dt><dd className="font-semibold">{[event.campus, event.building, event.room].filter(Boolean).join(" · ") || "Not set"}</dd></div>
          <div><dt className="text-slate-500">Capacity</dt><dd className="font-semibold">{event.capacity ?? "Not limited"}</dd></div>
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
        <h2 className="font-bold text-slate-950">Registration summary</h2>
        {registrationSettings ? (
          <dl className="mt-3 space-y-3 text-sm">
            <div><dt className="text-slate-500">Registered</dt><dd className="font-semibold">{registrationSettings.registeredCount}</dd></div>
            <div><dt className="text-slate-500">Waitlisted</dt><dd className="font-semibold">{registrationSettings.waitlistedCount}</dd></div>
            <div><dt className="text-slate-500">Waitlist limit</dt><dd className="font-semibold">{registrationSettings.waitlistCapacity ?? "Not enabled"}</dd></div>
          </dl>
        ) : <p className="mt-3 text-sm text-slate-600">Registration is not configured.</p>}
      </aside>
    </section>
  );
}

async function RegistrationSection({ accountRole, event, registrationSettings }: Readonly<{
  accountRole: string;
  event: EventWorkspace;
  registrationSettings: Awaited<ReturnType<typeof getEventRegistrationSettings>>;
}>) {
  const managerWorkspace = event.canManage && event.status !== "archived";
  const [options, registrations, readiness] = await Promise.all([
    listMyEventRegistrationOptions(event.eventId),
    managerWorkspace ? listEventRegistrations(event.eventId) : Promise.resolve([]),
    managerWorkspace ? listEventRegistrationReadiness(event.eventId) : Promise.resolve([]),
  ]);
  return (
    <div className="space-y-6">
      {!event.canManage || accountRole === "platform_administrator" ? (
        <FamilyEventRegistration eventId={event.eventId} managerMode={accountRole === "platform_administrator"} options={options} />
      ) : null}
      {managerWorkspace ? (
        <>
          <EventRegistrationRoster eventId={event.eventId} registrations={registrations} readiness={readiness} />
          {registrationSettings ? (
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-sky-700">Registration settings</p>
              <h2 className="mt-1 text-xl font-bold text-slate-950">Capacity and registration window</h2>
              <div className="mt-5"><EventRegistrationSettingsForm settings={registrationSettings} timezone={event.timezone} /></div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

async function VolunteersSection({ eventId }: Readonly<{ eventId: string }>) {
  const [assignments, candidates] = await Promise.all([
    listEventVolunteerAssignments(eventId), listEventVolunteerCandidates(eventId),
  ]);
  return <EventVolunteerAssignments assignments={assignments} candidates={candidates} eventId={eventId} />;
}

async function FormsSection({ accountRole, event, permissionManager }: Readonly<{
  accountRole: string;
  event: EventWorkspace;
  permissionManager: boolean;
}>) {
  const options = accountRole === "parent" ? await listMyEventRegistrationOptions(event.eventId) : [];
  const mayView = permissionManager || options.some((option) => Boolean(option.registrationId) && option.registrationStatus !== "cancelled");
  const requirement = mayView ? await getEventPermissionSlipRequirement(event.eventId) : null;
  const versions = permissionManager
    ? (await Promise.all((await listDocumentTemplates())
      .filter((template) => template.documentKind === "permission_slip")
      .map(async (template) => (await listDocumentTemplateVersions(template.templateId))
        .filter((version) => version.status === "published")
        .map((version) => ({ versionId: version.versionId, label: `${template.name} v${version.versionNumber}` }))))).flat()
    : [];
  if (permissionManager && requirement && event.canManage && event.status !== "archived") {
    return <EventPermissionSlipForm eventId={event.eventId} requirement={requirement} versions={versions} />;
  }
  if (!permissionManager && requirement?.required && requirement.templateVersionId) {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="text-xl font-bold">Permission slip required</h2>
        <p className="mt-1 text-sm text-slate-700">Each eligible registered child must submit the completed form pinned to this Event.</p>
        <a className="mt-3 inline-block font-semibold text-sky-800" href={`/api/forms/templates/${requirement.templateVersionId}/download`}>Download or print the blank Event permission slip</a>
        <p className="mt-2 text-sm"><Link className="font-semibold text-sky-800" href="/permission-forms">Upload the completed permission slip</Link></p>
      </section>
    );
  }
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold text-slate-950">Event forms</h2>
      <p className="mt-2 text-sm text-slate-600">No Event permission-slip action is available for this account.</p>
    </section>
  );
}

async function PlanningSection({ eventId }: Readonly<{ eventId: string }>) {
  const [reminders, checklistItems] = await Promise.all([listEventReminders(eventId), listEventChecklistItems(eventId)]);
  return <EventPlanningTools checklistItems={checklistItems} eventId={eventId} reminders={reminders} />;
}
