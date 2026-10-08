"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";

import {
  createParticipationOverrideAction,
  manageEventRegistrationAction,
  promoteWaitlistedRegistrationAction,
} from "@/features/events/actions/event-management-actions";
import {
  describeReadinessRequirement,
  getParticipationOverrideState,
} from "@/features/events/components/event-registration-readiness.mjs";
import { recordPaperEventWaiverAction } from "@/features/forms/actions/paper-waiver-actions";

import type {
  DocumentRequirementReadiness,
  EventActionState,
  EventRegistrationReadiness,
  ManagedEventRegistration,
} from "@/features/events/types/event-management";

const initialState: EventActionState = {
  success: false,
};

type RosterFilter =
  | "all"
  | "not_ready"
  | "ready"
  | "waitlisted";

const activeRegistrationStatuses = new Set([
  "registered",
  "waitlisted",
  "confirmed",
]);

function isActiveRegistration(
  registration: ManagedEventRegistration,
) {
  return activeRegistrationStatuses.has(
    registration.registrationStatus,
  );
}

function isRegisteredRegistration(
  registration: ManagedEventRegistration,
) {
  return ["registered", "confirmed"].includes(
    registration.registrationStatus,
  );
}

function PaperWaiverForm({
  eventId,
  studentId,
  requirement,
}: Readonly<{
  eventId: string;
  studentId: string;
  requirement: DocumentRequirementReadiness;
}>) {
  const [state, action, pending] = useActionState(
    recordPaperEventWaiverAction,
    initialState,
  );

  if (
    requirement.documentKind !==
      "permission_slip" ||
    requirement.ready ||
    !requirement.requirementId
  ) {
    return null;
  }

  return (
    <form
      action={action}
      className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3"
    >
      <input
        name="eventId"
        type="hidden"
        value={eventId}
      />

      <input
        name="studentId"
        type="hidden"
        value={studentId}
      />

      <input
        name="requirementId"
        type="hidden"
        value={requirement.requirementId}
      />

      <p className="text-sm font-semibold text-slate-800">
        Record physical waiver
      </p>

      <p className="text-xs text-slate-600">
        Use this when the completed waiver was
        turned in on paper instead of uploaded.
      </p>

      <input
        className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
        maxLength={1000}
        minLength={5}
        name="reason"
        placeholder="Optional receipt note"
      />

      <button
        className="min-h-10 rounded-lg border border-sky-700 bg-white px-3 text-sm font-semibold text-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={pending}
      >
        {pending
          ? "Recording…"
          : "Record paper waiver received"}
      </button>

      {state.message ? (
        <p
          className={`text-xs ${
            state.success
              ? "text-emerald-700"
              : "text-red-700"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function OverrideForm({
  eventId,
  readiness,
}: Readonly<{
  eventId: string;
  readiness: EventRegistrationReadiness;
}>) {
  const [state, action, pending] = useActionState(
    createParticipationOverrideAction,
    initialState,
  );

  const overrideState =
    getParticipationOverrideState(
      readiness.requirements,
    );

  if (!overrideState.eligible) {
    return null;
  }

  return (
    <form
      action={action}
      className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3"
    >
      <p className="text-sm font-semibold text-amber-900">
        Participation override
      </p>

      <input
        name="eventId"
        type="hidden"
        value={eventId}
      />

      <input
        name="registrationId"
        type="hidden"
        value={readiness.registrationId}
      />

      {overrideState.requirementIds.map(
        (requirementId) => (
          <input
            key={requirementId}
            name="requirementId"
            type="hidden"
            value={requirementId}
          />
        ),
      )}

      <input
        className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
        name="reason"
        placeholder="Explicit override reason"
        required
      />

      <button
        className="min-h-10 rounded-lg bg-sky-700 px-3 text-sm font-semibold text-white disabled:opacity-60"
        disabled={pending}
      >
        {pending
          ? "Approving…"
          : "Approve participation"}
      </button>

      {state.message ? (
        <p
          className={`text-xs ${
            state.success
              ? "text-emerald-700"
              : "text-red-700"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function RegistrationActions({
  eventId,
  registration,
  readiness,
}: Readonly<{
  eventId: string;
  registration: ManagedEventRegistration;
  readiness?: EventRegistrationReadiness;
}>) {
  const [
    promoteState,
    promoteAction,
    promotePending,
  ] = useActionState(
    promoteWaitlistedRegistrationAction,
    initialState,
  );

  const [
    cancelState,
    cancelAction,
    cancelPending,
  ] = useActionState(
    manageEventRegistrationAction,
    initialState,
  );

  const unmetWaivers =
    isActiveRegistration(registration)
      ? readiness?.requirements.filter(
          (item) =>
            item.documentKind ===
              "permission_slip" &&
            !item.ready &&
            Boolean(item.requirementId),
        ) ?? []
      : [];

  const currentCancelMessage =
    cancelState.message &&
    (!cancelState.success ||
      cancelState.registrationStatus ===
        registration.registrationStatus)
      ? cancelState.message
      : null;

  return (
    <details className="min-w-48">
      <summary className="cursor-pointer text-sm font-semibold text-sky-700">
        Actions
      </summary>

      <div className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <Link
          className="block text-sm font-semibold text-sky-700"
          href="/permission-forms?view=medical#completed-documents"
        >
          Open Medical &amp; Waivers
        </Link>

        {unmetWaivers.map(
          (requirement) => (
            <PaperWaiverForm
              eventId={eventId}
              key={
                requirement.requirementId ??
                requirement.templateName
              }
              requirement={requirement}
              studentId={
                registration.studentId
              }
            />
          ),
        )}

        {isActiveRegistration(registration) &&
        readiness &&
        !readiness.documentationReady &&
        !readiness.participationOverrideId ? (
          <OverrideForm
            eventId={eventId}
            readiness={readiness}
          />
        ) : null}

        {registration.registrationStatus ===
        "waitlisted" ? (
          <form
            action={promoteAction}
            className="space-y-2"
          >
            <input
              name="eventId"
              type="hidden"
              value={eventId}
            />

            <input
              name="registrationId"
              type="hidden"
              value={
                registration.registrationId
              }
            />

            <button
              className="min-h-10 w-full rounded-lg bg-sky-700 px-3 text-sm font-semibold text-white disabled:opacity-60"
              disabled={promotePending}
            >
              {promotePending
                ? "Promoting…"
                : "Promote from waitlist"}
            </button>

            {promoteState.message ? (
              <p
                className={`text-xs ${
                  promoteState.success
                    ? "text-emerald-700"
                    : "text-red-700"
                }`}
              >
                {promoteState.message}
              </p>
            ) : null}
          </form>
        ) : null}

        {["registered", "waitlisted", "confirmed"].includes(
          registration.registrationStatus,
        ) ? (
          <form
            action={cancelAction}
            className="space-y-2 border-t border-slate-200 pt-3"
          >
            <input
              name="intent"
              type="hidden"
              value="cancel"
            />

            <input
              name="eventId"
              type="hidden"
              value={eventId}
            />

            <input
              name="registrationId"
              type="hidden"
              value={
                registration.registrationId
              }
            />

            <button
              className="min-h-10 w-full rounded-lg border border-red-300 bg-white px-3 text-sm font-semibold text-red-800 disabled:opacity-60"
              disabled={cancelPending}
            >
              {cancelPending
                ? "Cancelling…"
                : "Cancel registration"}
            </button>
          </form>
        ) : null}

        {currentCancelMessage ? (
          <p
            className={`text-xs ${
              cancelState.success
                ? "text-emerald-700"
                : "text-red-700"
            }`}
            role="status"
          >
            {currentCancelMessage}
          </p>
        ) : null}
      </div>
    </details>
  );
}

function RegistrationRow({
  eventId,
  registration,
  readiness,
}: Readonly<{
  eventId: string;
  registration: ManagedEventRegistration;
  readiness?: EventRegistrationReadiness;
}>) {
  return (
    <tr className="border-t border-slate-200 align-top">
      <td className="px-3 py-3">
        <span className="font-semibold text-slate-950">
          {registration.studentName}
        </span>

        <span className="block text-sm text-slate-500">
          {registration.householdName}
        </span>
      </td>

      <td className="px-3 py-3">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">
          {registration.registrationStatus}

          {registration.waitlistPosition
            ? ` #${registration.waitlistPosition}`
            : ""}
        </span>
      </td>

      <td className="px-3 py-3">
        {registration.registrationStatus ===
        "cancelled" ? (
          <span className="text-sm font-semibold text-slate-500">
            Not applicable
          </span>
        ) : readiness ? (
          <div className="space-y-1">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                readiness.documentationReady
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-900"
              }`}
            >
              {readiness.documentationReady
                ? "READY"
                : "NOT READY"}
            </span>

            {readiness.participationOverrideId ? (
              <p className="text-xs font-semibold text-sky-700">
                Override approved
              </p>
            ) : null}

            {!readiness.documentationReady ? (
              <div className="max-w-xl text-xs text-slate-600">
                {readiness.requirements
                  .filter(
                    (item) => !item.ready,
                  )
                  .map((item) => (
                    <p
                      key={
                        item.requirementId ??
                        `${item.documentKind}-${item.schoolYearStart ?? item.templateName}`
                      }
                    >
                      {describeReadinessRequirement(
                        item,
                      )}
                    </p>
                  ))}
              </div>
            ) : null}
          </div>
        ) : (
          <span className="text-sm text-slate-500">
            Unavailable
          </span>
        )}
      </td>

      <td className="px-3 py-3 text-right">
        <RegistrationActions
          eventId={eventId}
          readiness={readiness}
          registration={registration}
        />
      </td>
    </tr>
  );
}

export function EventRegistrationRoster({
  eventId,
  registrations,
  readiness,
}: Readonly<{
  eventId: string;
  registrations: ManagedEventRegistration[];
  readiness: EventRegistrationReadiness[];
}>) {
  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState<RosterFilter>("all");

  const readinessByRegistration =
    useMemo(
      () =>
        new Map(
          readiness.map((item) => [
            item.registrationId,
            item,
          ]),
        ),
      [readiness],
    );

  const filteredRegistrations =
    useMemo(() => {
      const normalizedSearch =
        search.trim().toLowerCase();

      return [...registrations]
        .filter((registration) => {
          const registrationReadiness =
            readinessByRegistration.get(
              registration.registrationId,
            );

          if (
            normalizedSearch &&
            !`${registration.studentName} ${registration.householdName}`
              .toLowerCase()
              .includes(normalizedSearch)
          ) {
            return false;
          }

          if (filter === "ready") {
            return Boolean(
              isActiveRegistration(registration) &&
              registrationReadiness?.documentationReady,
            );
          }

          if (filter === "not_ready") {
            return (
              isActiveRegistration(registration) &&
              registrationReadiness != null &&
              !registrationReadiness.documentationReady
            );
          }

          if (filter === "waitlisted") {
            return (
              registration.registrationStatus ===
              "waitlisted"
            );
          }

          return true;
        })
        .sort((left, right) => {
          const leftReady =
            readinessByRegistration.get(
              left.registrationId,
            )?.documentationReady ?? true;

          const rightReady =
            readinessByRegistration.get(
              right.registrationId,
            )?.documentationReady ?? true;

          if (leftReady !== rightReady) {
            return leftReady ? 1 : -1;
          }

          return left.studentName.localeCompare(
            right.studentName,
          );
        });
    }, [
      filter,
      readinessByRegistration,
      registrations,
      search,
    ]);

  const notReadyCount =
    registrations.filter(
      (registration) =>
        isActiveRegistration(registration) &&
        !readinessByRegistration.get(
          registration.registrationId,
        )?.documentationReady,
    ).length;

  const registeredCount =
    registrations.filter(
      isRegisteredRegistration,
    ).length;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-sky-700">
            Registration
          </p>

          <h2 className="mt-1 text-xl font-bold text-slate-950">
            Registration roster
          </h2>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
            {registeredCount} registered
          </span>

          {notReadyCount ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900">
              {notReadyCount} need attention
            </span>
          ) : null}
        </div>
      </div>

      {registrations.length ? (
        <>
          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_12rem]">
            <label>
              <span className="mb-1 block text-sm font-semibold text-slate-700">
                Search students
              </span>

              <input
                className="min-h-11 w-full rounded-lg border border-slate-300 px-3"
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Search by student or household"
                type="search"
                value={search}
              />
            </label>

            <label>
              <span className="mb-1 block text-sm font-semibold text-slate-700">
                Status
              </span>

              <select
                className="min-h-11 w-full rounded-lg border border-slate-300 px-3"
                onChange={(event) =>
                  setFilter(
                    event.target
                      .value as RosterFilter,
                  )
                }
                value={filter}
              >
                <option value="all">
                  All students
                </option>

                <option value="not_ready">
                  Needs attention
                </option>

                <option value="ready">
                  Ready
                </option>

                <option value="waitlisted">
                  Waitlisted
                </option>
              </select>
            </label>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-y border-slate-200 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-3">
                    Student
                  </th>

                  <th className="px-3 py-3">
                    Registration
                  </th>

                  <th className="px-3 py-3">
                    Readiness
                  </th>

                  <th className="px-3 py-3 text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredRegistrations.map(
                  (registration) => (
                    <RegistrationRow
                      eventId={eventId}
                      key={
                        registration.registrationId
                      }
                      registration={
                        registration
                      }
                      readiness={readinessByRegistration.get(
                        registration.registrationId,
                      )}
                    />
                  ),
                )}
              </tbody>
            </table>

            {!filteredRegistrations.length ? (
              <p className="p-5 text-center text-sm text-slate-600">
                No registrations match the
                current search or filter.
              </p>
            ) : null}
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-slate-600">
          No registrations have been submitted.
        </p>
      )}
    </section>
  );
}
