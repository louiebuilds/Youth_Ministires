import type { Metadata } from "next";

import { requireCapability } from "@/features/auth/services/authorization-service";
import { PrayerRequestForm } from "@/features/prayer-care/components/prayer-request-form";
import { PrayerLifecycleForms } from "@/features/prayer-care/components/prayer-lifecycle-forms";
import { ArchiveCareNoteForm, CareNoteForm } from "@/features/prayer-care/components/care-note-form";
import { CareFollowUpForm, CareFollowUpLifecycle } from "@/features/prayer-care/components/care-follow-up-forms";
import { listCareFollowUps, listCareNotes, listPrayerCareAssignees, listPrayerCareCategories, listPrayerCarePeople, listPublicPrayerSummaries, listVisiblePrayerRequests } from "@/features/prayer-care/services/prayer-care-service";
import type { PublicPrayerSummary, VisiblePrayerRequest } from "@/features/prayer-care/types/prayer-care";

export const metadata: Metadata = { title: "Prayer & Care" };

function isVisiblePrayerRequest(
  request: PublicPrayerSummary | VisiblePrayerRequest,
): request is VisiblePrayerRequest {
  return "personName" in request;
}

export default async function PrayerCarePage() {
  const account = await requireCapability("prayer_care.view");
  const leadership = ["platform_administrator", "youth_pastor", "staff_member"].includes(account.role);
  const canCreate = ["platform_administrator", "youth_pastor"].includes(account.role);
  const [requests, people, categories, careNotes, assignees, followUps] = await Promise.all([
    leadership ? listVisiblePrayerRequests() : listPublicPrayerSummaries(),
    canCreate ? listPrayerCarePeople() : Promise.resolve([]),
    canCreate ? listPrayerCareCategories() : Promise.resolve([]),
    canCreate ? listCareNotes() : Promise.resolve([]),
    canCreate ? listPrayerCareAssignees() : Promise.resolve([]),
    canCreate ? listCareFollowUps() : Promise.resolve([]),
  ]);
  const activeFollowUps = followUps.filter((item) => item.status === "pending" || item.status === "in_progress");
  const followUpHistory = followUps.filter((item) => item.status === "completed" || item.status === "cancelled");

  return <div className="space-y-8">
    <header>
      <p className="text-sm font-semibold text-sky-700">Prayer & Care</p>
      <h1 className="mt-1 text-3xl font-bold text-slate-950">{leadership ? "Prayer Center" : "Prayer List"}</h1>
      <p className="mt-2 text-slate-600">{leadership
        ? "Authorized ministry prayer requests. Confidential care notes are not shown in this read-only view."
        : "Public prayer summaries shared with the signed-in ministry community."}</p>
    </header>
    {!leadership ? <aside className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
      Personal identities, request details, assignments, and confidential care notes are intentionally hidden.
    </aside> : null}
    {canCreate ? <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-4 text-xl font-bold">Create prayer request</h2>
      <PrayerRequestForm people={people} categories={categories} />
    </section> : null}
    {canCreate ? <section className="space-y-4 rounded-xl border border-red-200 bg-white p-5">
      <h2 className="text-xl font-bold">Confidential care notes & hospital visits</h2>
      <CareNoteForm people={people} categories={categories} />
      <div className="space-y-3 border-t border-slate-200 pt-5">
        {careNotes.map((note) => <article className="rounded-lg border border-red-100 bg-red-50 p-4" key={note.careNoteId}>
          <h3 className="font-bold">{note.title}</h3><p className="text-sm font-semibold text-red-900">{note.personName} · {note.categoryName ?? "Uncategorized"}</p>
          <p className="mt-3 whitespace-pre-wrap text-slate-800">{note.noteContent}</p>
          <p className="mt-2 text-xs text-slate-600">Occurred {new Date(note.occurredAt).toLocaleString()} · recorded by {note.createdByName}</p>
          <ArchiveCareNoteForm careNoteId={note.careNoteId} />
        </article>)}
        {!careNotes.length ? <p className="text-slate-600">No active confidential care notes.</p> : null}
      </div>
    </section> : null}
    {canCreate ? <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-xl font-bold">Care follow-ups</h2>
      <CareFollowUpForm people={people} assignees={assignees} />
      <div className="space-y-3 border-t border-slate-200 pt-5">{activeFollowUps.map((followUp) => <article className="rounded-lg border border-slate-200 p-4" key={followUp.careFollowUpId}>
        <div className="flex justify-between gap-3"><div><h3 className="font-bold">{followUp.title}</h3><p className="text-sm text-slate-600">{followUp.personName} · assigned to {followUp.assignedToName}</p></div><span className="text-sm font-semibold text-sky-700">{followUp.priority} · {followUp.status}</span></div>
        {followUp.instructions ? <p className="mt-3 text-slate-700">{followUp.instructions}</p> : null}
        {followUp.dueAt ? <p className="mt-2 text-sm text-slate-600">Due {new Date(followUp.dueAt).toLocaleString()}</p> : null}
        <CareFollowUpLifecycle followUp={followUp} />
      </article>)}{!activeFollowUps.length ? <p className="text-slate-600">No active care follow-ups.</p> : null}</div>
      {followUpHistory.length ? <div className="space-y-3 border-t border-slate-200 pt-5"><h3 className="font-bold">Follow-up history</h3>{followUpHistory.map((item) => <article className="rounded-lg bg-slate-50 p-4" key={item.careFollowUpId}><p className="font-semibold">{item.title} · {item.status}</p><p className="text-sm text-slate-600">{item.personName} · {item.assignedToName}</p>{item.completionNotes ? <p className="mt-2 text-sm">Completion: {item.completionNotes}</p> : null}{item.cancellationReason ? <p className="mt-2 text-sm">Cancellation: {item.cancellationReason}</p> : null}</article>)}</div> : null}
    </section> : null}
    <section className="space-y-4">
      {requests.map((request) => <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" key={request.prayerRequestId}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-xl font-bold">{request.title}</h2>
            <p className="mt-1 text-sm font-semibold text-sky-700">{request.categoryName ?? "General"} · {request.status}</p></div>
          <time className="text-sm text-slate-500" dateTime={request.createdAt}>{new Date(request.createdAt).toLocaleDateString()}</time>
        </div>
        {isVisiblePrayerRequest(request) ? <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
          <p className="text-sm font-semibold text-slate-700">{request.personName} · {request.visibility}</p>
          <p className="whitespace-pre-wrap text-slate-700">{request.requestDetails}</p>
          {request.answerSummary ? <p className="rounded-lg bg-emerald-50 p-3 text-emerald-950"><span className="font-semibold">Answer:</span> {request.answerSummary}</p> : null}
        </div> : null}
        {canCreate && isVisiblePrayerRequest(request) ? <PrayerLifecycleForms prayerRequestId={request.prayerRequestId} status={request.status} /> : null}
      </article>)}
      {!requests.length ? <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">No prayer requests are currently visible to this account.</p> : null}
    </section>
  </div>;
}
