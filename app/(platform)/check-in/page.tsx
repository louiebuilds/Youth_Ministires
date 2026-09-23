import type { Metadata } from "next";
import Link from "next/link";

import {
  checkInStudentAction,
  checkInVisitorAction,
  checkOutStudentAction,
  checkOutVisitorAction,
  correctStudentCheckInAction,
} from "@/features/check-in/actions/check-in-actions";
import { ResolveFamilyPassForm } from "@/features/check-in/components/resolve-family-pass-form";
import {
  getCheckInHousehold,
  listCheckedInVisitors,
  listCheckInEvents,
  listEmergencyRoster,
  searchCheckInHouseholds,
} from "@/features/check-in/services/check-in-service";
import { requireCapability } from "@/features/auth/services/authorization-service";
import { listEventRegistrationReadiness } from "@/features/events/services/event-management-service";

export const metadata: Metadata = { title: "Check-In" };

const inputClass =
  "min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-sky-600 focus:ring-3 focus:ring-sky-100";

export default async function CheckInPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  await requireCapability("check_in.manage");
  const params = await searchParams;
  const events = await listCheckInEvents();
  const eventId = typeof params.event === "string" ? params.event : "";
  const search = typeof params.q === "string" ? params.q.trim() : "";
  const householdId =
    typeof params.household === "string" ? params.household : "";
  const selectedEvent = events.find((event) => event.eventId === eventId);
  const [households, household, roster, visitors, readiness] = selectedEvent
    ? await Promise.all([
        search.length > 0 && search.length <= 100
          ? searchCheckInHouseholds(eventId, search) : [],
        householdId ? getCheckInHousehold(eventId, householdId) : null,
        listEmergencyRoster(eventId),
        listCheckedInVisitors(eventId),
        listEventRegistrationReadiness(eventId),
      ])
    : [[], null, [], [], []];

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold text-sky-700">Attendance</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">Check-In</h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          Select an event, confirm care alerts, and record custody changes.
          A family QR pass identifies a household; staff still confirm each action.
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">1. Select event</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {events.map((event) => (
            <Link
              className={`rounded-lg px-4 py-3 text-sm font-semibold ${
                event.eventId === eventId
                  ? "bg-sky-700 text-white" : "border border-slate-300 text-slate-700"
              }`}
              href={`/check-in?event=${event.eventId}`}
              key={event.eventId}
            >
              {event.eventName}
            </Link>
          ))}
          {events.length === 0 ? (
            <p className="text-sm text-slate-600">No assigned active events.</p>
          ) : null}
        </div>
      </section>

      {selectedEvent ? (
        <>
          {params.pass === "opened" ? (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 font-semibold text-emerald-900">
              Family pass accepted. Review the family below and confirm each action.
            </div>
          ) : null}
          <section className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">2. Find family</h2>
              <form className="mt-3 flex gap-2" method="get">
                <input name="event" type="hidden" value={eventId} />
                <input className={`${inputClass} min-w-0 flex-1`} maxLength={100}
                  name="q" placeholder="Family or student name" required />
                <button className="rounded-lg bg-sky-700 px-4 font-semibold text-white">
                  Search
                </button>
              </form>
              <div className="mt-3 space-y-2">
                {households.map((result) => (
                  <Link className="block rounded-lg border border-slate-200 p-3 hover:bg-slate-50"
                    href={`/check-in?event=${eventId}&household=${result.householdId}`}
                    key={result.householdId}>
                    <span className="font-semibold text-slate-950">{result.householdName}</span>
                    <span className="ml-2 text-sm text-slate-500">
                      {result.studentCount} student(s)
                    </span>
                  </Link>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Use family QR pass</h2>
              <ResolveFamilyPassForm eventId={eventId} />
              <p className="mt-3 text-sm text-slate-500">
                Camera scanning belongs to the mobile milestone. A USB scanner,
                keyboard, or pasted value works here.
              </p>
            </div>
          </section>

          {household ? (
            <section className="scroll-mt-6 rounded-xl border border-sky-200 bg-sky-50 p-5"
              id="selected-family">
              <h2 className="text-xl font-bold text-slate-950">{household.householdName}</h2>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {household.students.map((student) => {
                  const documentation = readiness.find((item) =>
                    item.studentId === student.studentId);
                  const pickups = household.pickups.filter(
                    (pickup) => pickup.studentId === student.studentId,
                  );
                  return (
                    <article className="rounded-lg bg-white p-4 shadow-sm" key={student.studentId}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-slate-950">{student.displayName}</h3>
                          <p className="text-sm text-slate-500">Grade {student.grade}</p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
                          {student.checkInStatus ?? "Not checked in"}
                        </span>
                      </div>
                      {documentation ? <div className={`mt-3 rounded-lg border p-3 text-sm ${documentation.documentationReady ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-300 bg-amber-50 text-amber-950"}`}>
                        <p className="font-bold">Documentation: {documentation.documentationReady ? "READY" : "NOT READY"}</p>
                        {documentation.participationOverrideId ? <p className="font-semibold text-sky-800">Participation Override: APPROVED</p> : null}
                        {!documentation.documentationReady ? <ul className="mt-1 list-disc pl-5">{documentation.requirements.filter((item) => !item.ready).map((item) => <li key={item.requirementId}>{item.templateName} — {item.missing.join(", ").replaceAll("_", " ")}</li>)}</ul> : null}
                      </div> : null}
                      {(student.medicalSummary || student.allergySummary ||
                        student.dietarySummary) ? (
                        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
                          <p className="font-bold text-amber-950">Care alert — review before action</p>
                          {student.medicalSummary ? <p>Medical: {student.medicalSummary}</p> : null}
                          {student.allergySummary ? <p>Allergy: {student.allergySummary}</p> : null}
                          {student.dietarySummary ? <p>Dietary: {student.dietarySummary}</p> : null}
                        </div>
                      ) : null}
                      {student.checkInStatus === "checked_in" ? (
                        <div className="mt-4 space-y-4">
                        <form action={checkOutStudentAction} className="space-y-2">
                          <input name="eventId" type="hidden" value={eventId} />
                          <input name="studentId" type="hidden" value={student.studentId} />
                          <select className={`${inputClass} w-full`} name="pickupPersonId">
                            <option value="">Select authorized pickup</option>
                            {pickups.map((pickup) => (
                              <option key={pickup.personId} value={pickup.personId}>
                                {pickup.displayName} — {pickup.relationshipType}
                              </option>
                            ))}
                          </select>
                          <input className={`${inputClass} w-full`} maxLength={1000}
                            name="overrideReason" placeholder="Manager override reason, if needed" />
                          <button className="min-h-11 rounded-lg bg-slate-900 px-4 font-semibold text-white">
                            Confirm check-out
                          </button>
                        </form>
                        <form action={correctStudentCheckInAction}
                          className="space-y-2 border-t border-slate-200 pt-4">
                          <input name="eventId" type="hidden" value={eventId} />
                          <input name="studentId" type="hidden" value={student.studentId} />
                          <label className="block text-sm font-semibold text-slate-700">
                            Accidental check-in correction
                          </label>
                          <input className={`${inputClass} w-full`} maxLength={1000}
                            minLength={3} name="reason"
                            placeholder="Required correction reason" required />
                          <button className="min-h-11 rounded-lg border border-red-300 bg-white px-4 font-semibold text-red-800">
                            Correct accidental check-in
                          </button>
                        </form>
                        </div>
                      ) : student.checkInStatus === null ||
                        student.checkInStatus === "expected" ||
                        student.checkInStatus === "exception" ? (
                        <div className="mt-4">
                        {student.checkInStatus === "exception" ? (
                          <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                            The prior check-in was corrected. A new confirmed check-in is allowed.
                          </p>
                        ) : null}
                        <form action={checkInStudentAction} className="mt-4">
                          <input name="eventId" type="hidden" value={eventId} />
                          <input name="studentId" type="hidden" value={student.studentId} />
                          <button className="min-h-11 rounded-lg bg-emerald-700 px-4 font-semibold text-white">
                            Confirm check-in
                          </button>
                        </form>
                        </div>
                      ) : (
                        <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-700">
                          Check-in and check-out completed for this event.
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Temporary visitor</h2>
              <form action={checkInVisitorAction} className="mt-3 grid gap-3 sm:grid-cols-2">
                <input name="eventId" type="hidden" value={eventId} />
                <input className={inputClass} name="firstName" placeholder="Student first name" required />
                <input className={inputClass} name="lastName" placeholder="Student last name" required />
                <input className={inputClass} name="grade" placeholder="Grade (optional)" />
                <input className={inputClass} name="guardianName" placeholder="Guardian name" required />
                <input className={`${inputClass} sm:col-span-2`} name="guardianContact"
                  placeholder="Guardian phone or email" required />
                <button className="min-h-11 rounded-lg bg-emerald-700 px-4 font-semibold text-white sm:col-span-2">
                  Check in temporary visitor
                </button>
              </form>
              <p className="mt-2 text-xs text-slate-500">
                This does not create a permanent family or student record.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Visitors currently in</h2>
              <div className="mt-3 space-y-2">
                {visitors.map((visitor) => (
                  <form action={checkOutVisitorAction}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3"
                    key={visitor.visitorId}>
                    <input name="visitorId" type="hidden" value={visitor.visitorId} />
                    <span>
                      <strong>{visitor.displayName}</strong>
                      <span className="block text-sm text-slate-500">
                        Guardian: {visitor.guardianName} · {visitor.guardianContact}
                      </span>
                    </span>
                    <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">
                      Check out
                    </button>
                  </form>
                ))}
                {visitors.length === 0 ? <p className="text-sm text-slate-500">None.</p> : null}
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-red-200 bg-red-50 p-5">
            <h2 className="text-lg font-bold text-red-950">Emergency roster</h2>
            <p className="mt-1 text-sm text-red-800">Currently checked-in students only.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {roster.map((entry) => (
                <div className="rounded-lg bg-white p-3" key={entry.checkInId}>
                  <strong>{entry.displayName}</strong> · {entry.householdName}
                  <p className="text-sm">Emergency: {entry.emergencyContact ?? "Not listed"}</p>
                  {entry.hasCareAlert ? (
                    <p className="text-sm font-bold text-amber-800">Care alert on file</p>
                  ) : null}
                </div>
              ))}
              {roster.length === 0 ? <p className="text-sm text-red-800">Roster is empty.</p> : null}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
