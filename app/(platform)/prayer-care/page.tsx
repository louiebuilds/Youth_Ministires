import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";

import { requireCapability } from "@/features/auth/services/authorization-service";
import {
  CareFollowUpForm,
  CareFollowUpLifecycle,
  EditCareFollowUpForm,
} from "@/features/prayer-care/components/care-follow-up-forms";
import {
  ArchiveCareNoteForm,
  CareNoteForm,
  EditCareNoteForm,
} from "@/features/prayer-care/components/care-note-form";
import { PrayerLifecycleForms } from "@/features/prayer-care/components/prayer-lifecycle-forms";
import { PrayerRequestForm } from "@/features/prayer-care/components/prayer-request-form";
import { prayerVisibilityLabel } from "@/features/prayer-care/components/prayer-visibility.mjs";
import {
  listCareFollowUps,
  listCareNotes,
  listPrayerCareAssignees,
  listPrayerCareCategories,
  listPrayerCarePeople,
  listPublicPrayerSummaries,
  listVisiblePrayerRequests,
} from "@/features/prayer-care/services/prayer-care-service";
import type {
  CareFollowUp,
  CareNote,
  PrayerCareListResult,
  PublicPrayerSummary,
  VisiblePrayerRequest,
} from "@/features/prayer-care/types/prayer-care";

export const metadata: Metadata = { title: "Prayer & Care" };

const sectionSchema = z.enum(["overview", "prayers", "care", "follow-ups", "archived"]);

type Section = z.infer<typeof sectionSchema>;

type Option = {
  id: string;
  name: string;
};

const sections: ReadonlyArray<{ id: Section; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "prayers", label: "Prayer Requests" },
  { id: "care", label: "Care & Visits" },
  { id: "follow-ups", label: "Follow-ups" },
  { id: "archived", label: "Archived" },
];

function Navigation({
  active,
  management,
}: Readonly<{
  active: Section;
  management: boolean;
}>) {
  const visible = management
    ? sections
    : sections.filter(({ id }) => id === "overview" || id === "prayers");

  return (
    <nav
      aria-label="Prayer and Care workspace sections"
      className="overflow-x-auto border-b border-slate-200"
    >
      <div className="flex min-w-max gap-1">
        {visible.map(({ id, label }) => (
          <Link
            aria-current={active === id ? "page" : undefined}
            className={`min-h-11 border-b-2 px-4 py-3 text-sm font-semibold ${
              active === id
                ? "border-sky-700 text-sky-800"
                : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-950"
            }`}
            href={id === "overview" ? "/prayer-care" : `/prayer-care?section=${id}`}
            key={id}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

function LoadError({
  result,
}: Readonly<{
  result: PrayerCareListResult<unknown[]>;
}>) {
  return result.success ? null : (
    <p
      role="alert"
      className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950"
    >
      {result.message}
    </p>
  );
}

function CancelPanel({
  section,
}: Readonly<{
  section: "prayers" | "care" | "follow-ups";
}>) {
  return (
    <Link
      className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 font-semibold text-slate-700"
      href={`/prayer-care?section=${section}`}
    >
      Cancel
    </Link>
  );
}

export default async function PrayerCarePage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{
    section?: string | string[];
    action?: string | string[];
    careNoteId?: string | string[];
    careFollowUpId?: string | string[];
  }>;
}>) {
  const account = await requireCapability("prayer_care.view");

  const management =
    account.role === "platform_administrator" ||
    account.role === "youth_pastor";

  const leadership = management || account.role === "staff_member";

  const query = await searchParams;
  const parsed = sectionSchema.safeParse(query.section);

  const requested =
    leadership && parsed.success
      ? parsed.data
      : leadership
        ? "overview"
        : "prayers";

  const active: Section =
    !management && !["overview", "prayers"].includes(requested)
      ? "overview"
      : requested;

  const action =
    management &&
    (query.action === "new" ||
      query.action === "edit" ||
      query.action === "new-follow-up")
      ? query.action
      : null;

  const careNoteId =
    management && typeof query.careNoteId === "string"
      ? query.careNoteId
      : null;

  const careFollowUpId =
    management &&
    active === "follow-ups" &&
    action === "edit" &&
    typeof query.careFollowUpId === "string"
      ? query.careFollowUpId
      : null;

  if (!leadership) {
    const summaries = await listPublicPrayerSummaries();

    return (
      <div className="space-y-6">
        <header>
          <p className="text-sm font-semibold text-sky-700">Prayer & Care</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">
            Prayer List
          </h1>
          <p className="mt-2 text-slate-600">
            Public prayer summaries shared with the signed-in ministry
            community.
          </p>
        </header>

        <aside className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
          Personal identities, request details, assignments, and confidential
          care notes are intentionally hidden.
        </aside>

        <LoadError result={summaries} />

        {summaries.success ? (
          <PrayerCards requests={summaries.data} canManage={false} />
        ) : null}
      </div>
    );
  }

  const includeArchived = active === "archived";

  const needsCareNotes =
    management &&
    ((["overview", "care", "archived"] as Section[]).includes(active) ||
      (active === "follow-ups" &&
        action === "new-follow-up" &&
        Boolean(careNoteId)));

  const [requests, careNotes, followUps] = await Promise.all([
    listVisiblePrayerRequests(includeArchived),

    needsCareNotes
      ? listCareNotes(includeArchived)
      : Promise.resolve({
          success: true as const,
          data: [] as CareNote[],
        }),

    management &&
    (["overview", "follow-ups", "archived"] as Section[]).includes(active)
      ? listCareFollowUps(includeArchived)
      : Promise.resolve({
          success: true as const,
          data: [] as CareFollowUp[],
        }),
  ]);

  const loadFailed = [requests, careNotes, followUps].find(
    (result) => !result.success,
  );

  const needsPrayerPickers = management && active === "prayers";

  const needsCareEditPickers =
    management &&
    active === "care" &&
    (action === "new" || action === "edit");

  const needsFollowUpPickers =
    management &&
    active === "follow-ups" &&
    (action === "new" ||
      action === "edit" ||
      action === "new-follow-up");

  const needsPeople =
    needsPrayerPickers ||
    needsCareEditPickers ||
    needsFollowUpPickers;

  const needsCategories =
    needsPrayerPickers || needsCareEditPickers;

  const needsAssignees = needsFollowUpPickers;

  const [people, categories, assignees] = await Promise.all([
    needsPeople
      ? listPrayerCarePeople()
      : Promise.resolve({
          success: true as const,
          data: [] as Option[],
        }),

    needsCategories
      ? listPrayerCareCategories()
      : Promise.resolve({
          success: true as const,
          data: [] as Option[],
        }),

    needsAssignees
      ? listPrayerCareAssignees()
      : Promise.resolve({
          success: true as const,
          data: [] as Array<Option & { role?: string }>,
        }),
  ]);

  const pickerFailure = [people, categories, assignees].find(
    (result) => !result.success,
  );

  const selectedCareNote =
    careNoteId && careNotes.success
      ? careNotes.data.find(
          (note) =>
            note.careNoteId === careNoteId &&
            !note.archivedAt,
        ) ?? null
      : null;

  const selectedFollowUp =
    careFollowUpId && followUps.success
      ? followUps.data.find(
          (followUp) =>
            followUp.careFollowUpId === careFollowUpId &&
            !followUp.archivedAt &&
            (followUp.status === "pending" ||
              followUp.status === "in_progress"),
        ) ?? null
      : null;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-sky-700">Prayer & Care</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">
            Ministry care workspace
          </h1>
          <p className="mt-2 max-w-3xl text-slate-600">
            Review what needs attention while keeping prayer requests and
            confidential pastoral care appropriately separated.
          </p>
        </div>

        {management ? (
          <div className="flex flex-wrap gap-2">
            <Link
              className="min-h-11 rounded-lg bg-sky-700 px-4 py-3 text-sm font-semibold text-white"
              href="/prayer-care?section=prayers&action=new"
            >
              New prayer request
            </Link>

            <Link
              className="min-h-11 rounded-lg border border-red-300 bg-white px-4 py-3 text-sm font-semibold text-red-800"
              href="/prayer-care?section=care&action=new"
            >
              New care note
            </Link>

            <Link
              className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800"
              href="/prayer-care?section=follow-ups&action=new"
            >
              New follow-up
            </Link>
          </div>
        ) : null}
      </header>

      <Navigation active={active} management={management} />

      {loadFailed ? (
        <p
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950"
        >
          {loadFailed.message}
        </p>
      ) : null}

      {!loadFailed && active === "overview" ? (
        <Overview
          accountId={account.id}
          requests={requests.data}
          careNotes={careNotes.data}
          followUps={followUps.data}
        />
      ) : null}

      {!loadFailed && pickerFailure ? (
        <p
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950"
        >
          {pickerFailure.message}
        </p>
      ) : null}

      {!loadFailed && !pickerFailure && active === "prayers" ? (
        <section className="space-y-5">
          {action === "new" && management ? (
            <CreationPanel title="New prayer request">
              <PrayerRequestForm
                people={people.data}
                categories={categories.data}
              />
              <CancelPanel section="prayers" />
            </CreationPanel>
          ) : null}

          <PrayerCards
            requests={requests.data.filter(
              (item) => item.status !== "archived",
            )}
            canManage={management}
            people={people.data}
            categories={categories.data}
          />
        </section>
      ) : null}

      {!loadFailed &&
      !pickerFailure &&
      active === "care" &&
      management ? (
        <CareSection
          action={action}
          selectedCareNote={selectedCareNote}
          careNotes={careNotes.data.filter((item) => !item.archivedAt)}
          categories={categories.data}
          people={people.data}
        />
      ) : null}

      {!loadFailed &&
      !pickerFailure &&
      active === "follow-ups" &&
      management ? (
        <FollowUpsSection
          action={action}
          selectedCareNote={selectedCareNote}
          selectedFollowUp={selectedFollowUp}
          assignees={assignees.data}
          followUps={followUps.data.filter((item) => !item.archivedAt)}
          people={people.data}
        />
      ) : null}

      {!loadFailed && active === "archived" && management ? (
        <ArchivedSection
          requests={requests.data}
          careNotes={careNotes.data}
          followUps={followUps.data}
        />
      ) : null}

      {!loadFailed &&
      !management &&
      active !== "overview" &&
      active !== "prayers" ? (
        <p className="rounded-xl border bg-white p-5 text-slate-600">
          This section is not available to this account.
        </p>
      ) : null}
    </div>
  );
}

function CreationPanel({
  children,
  title,
}: Readonly<{
  children: React.ReactNode;
  title: string;
}>) {
  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Overview({
  accountId,
  requests,
  careNotes,
  followUps,
}: Readonly<{
  accountId: string;
  requests: VisiblePrayerRequest[];
  careNotes: CareNote[];
  followUps: CareFollowUp[];
}>) {
  const now = new Date();

  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
  }).format(now);

  const open = followUps.filter(
    (item) =>
      item.status === "pending" ||
      item.status === "in_progress",
  );

  const localDay = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Chicago",
        }).format(new Date(value))
      : null;

  const cards = [
    [
      "Active prayer requests",
      requests.filter((item) => item.status === "active").length,
    ],
    [
      "Answered awaiting archive",
      requests.filter((item) => item.status === "answered").length,
    ],
    [
      "Due today",
      open.filter((item) => localDay(item.dueAt) === day).length,
    ],
    [
      "Overdue",
      open.filter(
        (item) =>
          item.dueAt &&
          new Date(item.dueAt) < now &&
          localDay(item.dueAt) !== day,
      ).length,
    ],
    [
      "Urgent / high priority",
      open.filter(
        (item) =>
          item.priority === "urgent" ||
          item.priority === "high",
      ).length,
    ],
    [
      "Assigned to you",
      open.filter(
        (item) => item.assignedToProfileId === accountId,
      ).length,
    ],
  ] as const;

  const latestCare = careNotes
    .toSorted((a, b) =>
      b.occurredAt.localeCompare(a.occurredAt),
    )[0];

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-xl font-bold">
          What needs my attention?
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map(([label, value]) => (
            <article
              className="rounded-xl border bg-white p-5 shadow-sm"
              key={label}
            >
              <p className="text-sm text-slate-600">{label}</p>
              <p className="mt-2 text-3xl font-bold">{value}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-red-200 bg-red-50/50 p-5">
        <h2 className="font-bold text-red-950">
          Confidential care activity
        </h2>
        <p className="mt-2 text-sm text-red-900">
          {careNotes.length} active care record
          {careNotes.length === 1 ? "" : "s"}.{" "}
          {latestCare
            ? `Most recent activity: ${new Date(
                latestCare.occurredAt,
              ).toLocaleDateString()}.`
            : "No active care activity."}
        </p>
        <p className="mt-2 text-xs text-red-800">
          Confidential note contents are intentionally excluded
          from this overview.
        </p>
      </section>
    </div>
  );
}

function isDetailed(
  request: PublicPrayerSummary | VisiblePrayerRequest,
): request is VisiblePrayerRequest {
  return "personName" in request;
}

function PrayerCards({
  requests,
  canManage,
  people = [],
  categories = [],
}: Readonly<{
  requests: Array<
    PublicPrayerSummary | VisiblePrayerRequest
  >;
  canManage: boolean;
  people?: Option[];
  categories?: Option[];
}>) {
  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <article
          className="rounded-xl border bg-white p-5 shadow-sm"
          key={request.prayerRequestId}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">
                {request.title}
              </h2>
              <p className="mt-1 text-sm font-semibold text-sky-700">
                {request.categoryName ?? "General"} ·{" "}
                {request.status}
              </p>
            </div>

            <time
              className="text-sm text-slate-500"
              dateTime={request.createdAt}
            >
              {new Date(
                request.createdAt,
              ).toLocaleDateString()}
            </time>
          </div>

          {isDetailed(request) ? (
            <div className="mt-4 space-y-3 border-t pt-4">
              <p className="text-sm font-semibold">
                {request.personName}
              </p>
              <p className="text-sm text-slate-600">
                Visibility:{" "}
                {prayerVisibilityLabel(
                  request.visibility,
                )}
              </p>
              <p className="whitespace-pre-wrap text-slate-700">
                {request.requestDetails}
              </p>

              {request.answerSummary ? (
                <p className="rounded-lg bg-emerald-50 p-3 text-emerald-950">
                  <span className="font-semibold">
                    Answer:
                  </span>{" "}
                  {request.answerSummary}
                </p>
              ) : null}
            </div>
          ) : null}

          {canManage && isDetailed(request) ? (
            <PrayerLifecycleForms
              request={request}
              people={people}
              categories={categories}
            />
          ) : null}
        </article>
      ))}

      {!requests.length ? (
        <p className="rounded-xl border bg-white p-6 text-slate-600">
          No prayer requests are currently visible to this
          account.
        </p>
      ) : null}
    </div>
  );
}

function CareSection({
  action,
  selectedCareNote,
  careNotes,
  categories,
  people,
}: Readonly<{
  action: string | null;
  selectedCareNote: CareNote | null;
  careNotes: CareNote[];
  categories: Option[];
  people: Option[];
}>) {
  return (
    <div className="space-y-5">
      <aside className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-950">
        <strong>
          Highly confidential pastoral-care information.
        </strong>{" "}
        Do not copy care-note content into messages, general
        ministry views, or audit metadata.
      </aside>

      {action === "new" ? (
        <CreationPanel title="New confidential care note">
          <CareNoteForm
            people={people}
            categories={categories}
          />
          <CancelPanel section="care" />
        </CreationPanel>
      ) : null}

      {action === "edit" && selectedCareNote ? (
        <CreationPanel title="Edit care record">
          <EditCareNoteForm
            careNote={selectedCareNote}
            people={people}
            categories={categories}
          />
          <CancelPanel section="care" />
        </CreationPanel>
      ) : null}

      {action === "edit" && !selectedCareNote ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
          <h2 className="font-bold">
            Care record unavailable
          </h2>
          <p className="mt-2 text-sm">
            The requested active care record could not be
            found.
          </p>
          <div className="mt-4">
            <CancelPanel section="care" />
          </div>
        </section>
      ) : null}

      <div className="space-y-3">
        {careNotes.map((note) => (
          <article
            className="rounded-xl border border-red-200 bg-white p-5"
            key={note.careNoteId}
          >
            <h2 className="font-bold">{note.title}</h2>

            <p className="mt-1 text-sm font-semibold text-red-900">
              {note.personName} ·{" "}
              {note.categoryName ?? "Uncategorized"}
            </p>

            <p className="mt-2 text-xs text-slate-600">
              Occurred{" "}
              {new Date(
                note.occurredAt,
              ).toLocaleString()}{" "}
              · recorded by {note.createdByName}
            </p>

            <details className="mt-4 rounded-lg bg-red-50 p-4">
              <summary className="cursor-pointer font-semibold text-red-950">
                View confidential note
              </summary>
              <p className="mt-3 whitespace-pre-wrap">
                {note.noteContent}
              </p>
            </details>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 font-semibold text-slate-800"
                href={`/prayer-care?section=care&action=edit&careNoteId=${note.careNoteId}`}
              >
                Edit care record
              </Link>

              <Link
                className="inline-flex min-h-11 items-center rounded-lg border border-sky-300 px-4 font-semibold text-sky-800"
                href={`/prayer-care?section=follow-ups&action=new-follow-up&careNoteId=${note.careNoteId}`}
              >
                Create follow-up
              </Link>
            </div>

            <ArchiveCareNoteForm
              careNoteId={note.careNoteId}
            />
          </article>
        ))}

        {!careNotes.length ? (
          <p className="rounded-xl border bg-white p-5 text-slate-600">
            No active confidential care records.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function compareFollowUps(
  a: CareFollowUp,
  b: CareFollowUp,
) {
  const now = new Date();

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
  }).format(now);

  const localDay = (value: string) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Chicago",
    }).format(new Date(value));

  const rank = (item: CareFollowUp) =>
    item.dueAt &&
    new Date(item.dueAt) < now &&
    localDay(item.dueAt) !== today
      ? 0
      : item.dueAt &&
          localDay(item.dueAt) === today
        ? 1
        : item.priority === "urgent" ||
            item.priority === "high"
          ? 2
          : 3;

  return (
    rank(a) -
      rank(b) ||
    (a.dueAt ?? "9999").localeCompare(
      b.dueAt ?? "9999",
    )
  );
}

function lifecycleText(
  followUp: CareFollowUp,
) {
  if (
    followUp.status === "completed" &&
    followUp.completedAt
  ) {
    return `Completed ${new Date(
      followUp.completedAt,
    ).toLocaleString()}${
      followUp.completedByName
        ? ` by ${followUp.completedByName}`
        : ""
    }`;
  }

  if (
    followUp.status === "cancelled" &&
    followUp.cancelledAt
  ) {
    return `Cancelled ${new Date(
      followUp.cancelledAt,
    ).toLocaleString()}${
      followUp.cancelledByName
        ? ` by ${followUp.cancelledByName}`
        : ""
    }`;
  }

  return null;
}

function FollowUpCard({
  followUp,
}: Readonly<{
  followUp: CareFollowUp;
}>) {
  const lifecycle = lifecycleText(followUp);

  return (
    <article className="rounded-xl border bg-white p-5">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h3 className="font-bold">
            {followUp.title}
          </h3>
          <p className="text-sm text-slate-600">
            {followUp.personName} · assigned to{" "}
            {followUp.assignedToName}
          </p>
        </div>

        <span className="text-sm font-semibold text-sky-700">
          {followUp.priority} ·{" "}
          {followUp.status}
        </span>
      </div>

      {followUp.dueAt ? (
        <p className="mt-2 text-sm text-slate-600">
          Due{" "}
          {new Date(
            followUp.dueAt,
          ).toLocaleString()}
        </p>
      ) : null}

      {followUp.careNoteId ? (
        <p className="mt-2 text-sm text-slate-600">
          Source: Care record ·{" "}
          <span className="font-semibold">
            {followUp.careNoteTitle ??
              "Care record"}
          </span>
        </p>
      ) : null}

      {followUp.prayerRequestId ? (
        <p className="mt-2 text-sm text-slate-600">
          Source: Prayer request ·{" "}
          <span className="font-semibold">
            {followUp.prayerRequestTitle ??
              "Prayer request"}
          </span>
        </p>
      ) : null}

      {lifecycle ? (
        <p className="mt-2 text-sm font-medium text-slate-700">
          {lifecycle}
        </p>
      ) : null}

      {followUp.instructions ? (
        <details className="mt-3 rounded-lg bg-slate-50 p-3">
          <summary className="cursor-pointer font-semibold">
            View confidential instructions
          </summary>
          <p className="mt-2 whitespace-pre-wrap">
            {followUp.instructions}
          </p>
        </details>
      ) : null}

      {followUp.completionNotes ||
      followUp.cancellationReason ? (
        <details className="mt-3 rounded-lg bg-slate-50 p-3">
          <summary className="cursor-pointer font-semibold">
            View retained outcome
          </summary>

          {followUp.completionNotes ? (
            <p className="mt-2 whitespace-pre-wrap">
              Completion:{" "}
              {followUp.completionNotes}
            </p>
          ) : null}

          {followUp.cancellationReason ? (
            <p className="mt-2 whitespace-pre-wrap">
              Cancellation:{" "}
              {followUp.cancellationReason}
            </p>
          ) : null}
        </details>
      ) : null}

      {followUp.status === "pending" ||
      followUp.status === "in_progress" ? (
        <>
          <div className="mt-4">
            <Link
              className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 font-semibold text-slate-800"
              href={`/prayer-care?section=follow-ups&action=edit&careFollowUpId=${followUp.careFollowUpId}`}
            >
              Edit follow-up
            </Link>
          </div>

          <CareFollowUpLifecycle
            followUp={followUp}
          />
        </>
      ) : null}
    </article>
  );
}

function FollowUpsSection({
  action,
  selectedCareNote,
  selectedFollowUp,
  assignees,
  followUps,
  people,
}: Readonly<{
  action: string | null;
  selectedCareNote: CareNote | null;
  selectedFollowUp: CareFollowUp | null;
  assignees: Option[];
  followUps: CareFollowUp[];
  people: Option[];
}>) {
  const active = followUps
    .filter(
      (item) =>
        item.status === "pending" ||
        item.status === "in_progress",
    )
    .toSorted(compareFollowUps);

  const history = followUps.filter(
    (item) =>
      item.status === "completed" ||
      item.status === "cancelled",
  );

  return (
    <div className="space-y-6">
      {action === "new" ? (
        <CreationPanel title="New follow-up">
          <CareFollowUpForm
            people={people}
            assignees={assignees}
          />
          <CancelPanel section="follow-ups" />
        </CreationPanel>
      ) : null}

      {action === "new-follow-up" &&
      selectedCareNote ? (
        <CreationPanel title="New follow-up from care record">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-950">
            <p className="font-semibold">
              Source: {selectedCareNote.title}
            </p>
            <p className="mt-1">
              This follow-up will remain linked to
              the care record. Confidential care-note
              content is not copied into the follow-up.
            </p>
          </div>

          <CareFollowUpForm
            people={people}
            assignees={assignees}
            careNoteId={selectedCareNote.careNoteId}
            lockedPerson={{
              id: selectedCareNote.personId,
              name: selectedCareNote.personName,
            }}
          />

          <CancelPanel section="follow-ups" />
        </CreationPanel>
      ) : null}

      {action === "new-follow-up" &&
      !selectedCareNote ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
          <h2 className="font-bold">
            Care record unavailable
          </h2>
          <p className="mt-2 text-sm">
            The requested active care record could not
            be found, so a linked follow-up cannot be
            created.
          </p>
          <div className="mt-4">
            <CancelPanel section="follow-ups" />
          </div>
        </section>
      ) : null}

      {action === "edit" &&
      selectedFollowUp ? (
        <CreationPanel title="Edit follow-up">
          <EditCareFollowUpForm
            followUp={selectedFollowUp}
            people={people}
            assignees={assignees}
          />
          <CancelPanel section="follow-ups" />
        </CreationPanel>
      ) : null}

      {action === "edit" &&
      !selectedFollowUp ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
          <h2 className="font-bold">
            Follow-up unavailable
          </h2>
          <p className="mt-2 text-sm">
            The requested open follow-up could not be
            found. Completed and cancelled follow-ups
            remain read-only.
          </p>
          <div className="mt-4">
            <CancelPanel section="follow-ups" />
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-xl font-bold">
          Active follow-ups
        </h2>

        {active.map((item) => (
          <FollowUpCard
            followUp={item}
            key={item.careFollowUpId}
          />
        ))}

        {!active.length ? (
          <p className="rounded-xl border bg-white p-5 text-slate-600">
            No active care follow-ups.
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">
          Completed and cancelled
        </h2>

        {history.map((item) => (
          <FollowUpCard
            followUp={item}
            key={item.careFollowUpId}
          />
        ))}

        {!history.length ? (
          <p className="rounded-xl border bg-white p-5 text-slate-600">
            No completed or cancelled follow-ups.
          </p>
        ) : null}
      </section>
    </div>
  );
}

function ArchivedSection({
  requests,
  careNotes,
  followUps,
}: Readonly<{
  requests: VisiblePrayerRequest[];
  careNotes: CareNote[];
  followUps: CareFollowUp[];
}>) {
  const archivedRequests = requests.filter(
    (item) => item.status === "archived",
  );

  const archivedNotes = careNotes.filter(
    (item) => item.archivedAt,
  );

  const archivedFollowUps = followUps.filter(
    (item) => item.archivedAt,
  );

  return (
    <div className="space-y-7">
      <p className="rounded-xl border bg-slate-50 p-4 text-sm">
        Archived records are retained read-only. No
        restore workflow is available.
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">
          Archived prayer requests
        </h2>
        <PrayerCards
          requests={archivedRequests}
          canManage={false}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">
          Archived care records
        </h2>

        {archivedNotes.map((item) => (
          <article
            className="rounded-xl border bg-white p-5"
            key={item.careNoteId}
          >
            <p className="font-bold">
              {item.title}
            </p>
            <p className="text-sm text-slate-600">
              {item.personName} · archived
            </p>

            <details className="mt-3">
              <summary className="cursor-pointer font-semibold text-red-800">
                View retained confidential note
              </summary>
              <p className="mt-2 whitespace-pre-wrap">
                {item.noteContent}
              </p>
            </details>
          </article>
        ))}

        {!archivedNotes.length ? (
          <p className="rounded-xl border bg-white p-5 text-slate-600">
            No archived care records.
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">
          Archived follow-ups
        </h2>

        {archivedFollowUps.map((item) => (
          <FollowUpCard
            followUp={item}
            key={item.careFollowUpId}
          />
        ))}

        {!archivedFollowUps.length ? (
          <p className="rounded-xl border bg-white p-5 text-slate-600">
            No archived follow-ups.
          </p>
        ) : null}
      </section>
    </div>
  );
}