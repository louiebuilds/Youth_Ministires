"use client";

import { useActionState } from "react";

import {
  recordPaperMedicalReleaseAction,
  setSchoolYearMedicalRequirementAction,
} from "@/features/forms/actions/medical-permission-actions";
import type { DocumentTemplateVersionSummary } from "@/features/forms/types/document-templates";
import type { MedicalFormStatus } from "@/features/forms/types/medical-permission";
import type { DocumentSubmissionActionState } from "@/features/forms/types/document-submissions";

const initialState: DocumentSubmissionActionState = {
  success: false,
};

function RecordPaperMedicalRelease({
  studentId,
  templateVersionId,
}: {
  studentId: string;
  templateVersionId: string;
}) {
  const [state, action, pending] = useActionState(
    recordPaperMedicalReleaseAction,
    initialState,
  );

  return (
    <form action={action} className="mt-4 space-y-2">
      <input
        name="studentId"
        type="hidden"
        value={studentId}
      />

      <input
        name="templateVersionId"
        type="hidden"
        value={templateVersionId}
      />

      <label className="block">
        <span className="text-sm font-medium text-slate-700">
          Paper receipt note
        </span>

        <input
          className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3"
          maxLength={1000}
          minLength={5}
          name="reason"
          placeholder="Optional note about receiving the paper form"
        />
      </label>

      <button
        className="min-h-11 rounded-lg border border-amber-700 px-4 font-semibold text-amber-900 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending
          ? "Recording…"
          : "Record paper form received"}
      </button>

      {state.message ? (
        <p
          className={`text-sm ${
            state.success
              ? "text-emerald-700"
              : "text-rose-700"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

export function MedicalFormsWorkspace({
  manager,
  statuses,
  versions,
}: {
  manager: boolean;
  statuses: MedicalFormStatus[];
  versions: Array<
    DocumentTemplateVersionSummary & {
      templateName: string;
    }
  >;
}) {
  const [state, action, pending] = useActionState(
    setSchoolYearMedicalRequirementAction,
    initialState,
  );

  const now = new Date();

  const year =
    now.getMonth() >= 7
      ? now.getFullYear()
      : now.getFullYear() - 1;

  return (
    <section className="space-y-5 rounded-xl border border-amber-200 bg-amber-50/40 p-5">
      <div>
        <p className="text-sm font-semibold text-amber-800">
          Protected medical records
        </p>

        <h2 className="text-xl font-bold">
          Current school-year Medical Forms
        </h2>

        <p className="text-sm text-slate-600">
          Families may complete the Medical Release
          digitally or turn in a physical paper copy.
          Final Medical Release authorization is still
          required. Medical details do not appear here.
        </p>
      </div>

      {manager ? (
        <form
          action={action}
          className="grid gap-3 md:grid-cols-[12rem_1fr_auto]"
        >
          <input
            className="min-h-11 rounded-lg border px-3"
            defaultValue={`${year}-08-01`}
            name="schoolYearStart"
            required
            type="date"
          />

          <select
            className="min-h-11 rounded-lg border px-3"
            defaultValue=""
            name="templateVersionId"
            required
          >
            <option disabled value="">
              Select published Medical Release
            </option>

            {versions
              .filter(
                (version) =>
                  version.status === "published",
              )
              .map((version) => (
                <option
                  key={version.versionId}
                  value={version.versionId}
                >
                  {version.templateName} v
                  {version.versionNumber}
                </option>
              ))}
          </select>

          <button
            className="min-h-11 rounded-lg bg-amber-800 px-4 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={pending}
          >
            {pending
              ? "Saving…"
              : "Set current form"}
          </button>

          {state.message ? (
            <p className="text-sm md:col-span-3">
              {state.message}
            </p>
          ) : null}
        </form>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {statuses.map((item) => {
          const paperCopyOnFile = Boolean(
            item.state?.paperCopyOnFile,
          );

          const medicalAuthorized = Boolean(
            item.state?.medicalVerified,
          );

          const completionPath =
            typeof item.state?.completionPath === "string"
              ? item.state.completionPath
              : "none";

          return (
            <article
              className="rounded-lg border bg-white p-4"
              key={item.studentId}
            >
              <div className="flex justify-between gap-3">
                <strong>{item.studentName}</strong>

                <span
                  className={
                    item.ready
                      ? "font-semibold text-emerald-700"
                      : "font-semibold text-amber-800"
                  }
                >
                  {item.ready
                    ? "CURRENT"
                    : "ACTION NEEDED"}
                </span>
              </div>

              <p className="mt-1 text-sm text-slate-600">
                {item.schoolYearStart} through{" "}
                {item.schoolYearEnd}
              </p>

              {item.submissionId ? (
                <div className="mt-2 space-y-1 text-sm text-slate-600">
                  <p>
                    Completion path:{" "}
                    <span className="font-semibold">
                      {completionPath ===
                      "digital_and_paper"
                        ? "Digital and paper"
                        : completionPath === "digital"
                          ? "Digital"
                          : completionPath === "paper"
                            ? "Paper"
                            : "Incomplete"}
                    </span>
                  </p>

                  <p>
                    Paper copy:{" "}
                    <span className="font-semibold">
                      {paperCopyOnFile
                        ? "on file"
                        : "not confirmed"}
                    </span>
                  </p>

                  <p>
                    Final authorization:{" "}
                    <span className="font-semibold">
                      {medicalAuthorized
                        ? "authorized"
                        : "needed"}
                    </span>
                  </p>
                </div>
              ) : null}

              {item.submissionId &&
item.state?.digitalStatus !== "missing" ? (
  <a
    className="mt-2 inline-block font-semibold text-sky-800"
    href={`/api/forms/submissions/${item.submissionId}/download`}
  >
    View or print completed form
  </a>
) : null}

              {manager && !item.ready && !paperCopyOnFile ? (
                <RecordPaperMedicalRelease
                  studentId={item.studentId}
                  templateVersionId={
                    item.templateVersionId
                  }
                />
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}