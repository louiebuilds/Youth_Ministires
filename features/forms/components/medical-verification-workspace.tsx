"use client";

import { useActionState } from "react";

import { documentSubmissionWorkflowAction } from "@/features/forms/actions/document-submission-actions";
import type {
  DocumentSubmissionActionState,
  DocumentSubmissionSummary,
} from "@/features/forms/types/document-submissions";

const initialState: DocumentSubmissionActionState = {
  success: false,
};

type AccountRole =
  | "platform_administrator"
  | "youth_pastor"
  | "staff_member"
  | "volunteer"
  | "parent";

function VerificationAction({
  helpText,
  label,
  reasonLabel,
  reasonPlaceholder,
  reasonRequired = false,
  submissionId,
  workflow,
}: {
  helpText?: string;
  label: string;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  reasonRequired?: boolean;
  submissionId: string;
  workflow: "medical_revoke" | "medical_verify";
}) {
  const [state, action, pending] = useActionState(
    documentSubmissionWorkflowAction,
    initialState,
  );

  return (
    <form action={action} className="space-y-2">
      <input name="submissionId" type="hidden" value={submissionId} />
      <input name="workflow" type="hidden" value={workflow} />

      {helpText ? (
        <p className="text-sm text-slate-600">{helpText}</p>
      ) : null}

      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-64 flex-1">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            {reasonLabel ?? (reasonRequired ? "Reason" : "Note")}
          </span>
          <input
            className="min-h-11 w-full rounded-lg border border-slate-300 px-3"
            maxLength={1000}
            minLength={reasonRequired ? 5 : undefined}
            name="reason"
            placeholder={
              reasonPlaceholder ??
              (reasonRequired ? "Reason (required)" : "Optional note")
            }
            required={reasonRequired}
          />
        </label>

        <button
          className="min-h-11 rounded-lg border border-slate-300 px-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? "Working..." : label}
        </button>
      </div>

      {state.message ? (
        <p
          className={`text-sm ${
            state.success ? "text-emerald-700" : "text-rose-700"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

export function MedicalVerificationWorkspace({
  actorRole,
  submissions,
}: {
  actorRole: AccountRole;
  submissions: DocumentSubmissionSummary[];
}) {
  const medicalSubmissions = submissions.filter(
    (submission) => submission.documentKind === "medical_release",
  );

  if (!medicalSubmissions.length) {
    return null;
  }

  const canFinalAuthorize =
    actorRole === "youth_pastor" ||
    actorRole === "platform_administrator";

  if (!canFinalAuthorize) {
    return null;
  }

  const isPlatformAdministrator =
    actorRole === "platform_administrator";

  return (
    <section className="mt-5 space-y-4 border-t border-slate-200 pt-5">
      <div>
        <h3 className="font-bold text-slate-950">
          Medical Release authorization
        </h3>

        <p className="mt-1 text-sm text-slate-600">
          {isPlatformAdministrator
            ? "Platform Administrator authorization is a backup action. Confirm that the Youth Director or Youth Pastor approved this Medical Release before authorizing it."
            : "Youth Pastor authorization is the final ministry approval for the Medical Release."}
        </p>
      </div>

      {medicalSubmissions.map((submission) => (
        <div
          className="space-y-4 rounded-lg border border-slate-200 p-4"
          key={submission.submissionId}
        >
          <p className="font-semibold text-slate-950">
            {submission.studentName} · {submission.templateName} v
            {submission.versionNumber}
          </p>

          <VerificationAction
            helpText={
              isPlatformAdministrator
                ? "Enter a note confirming that Youth Director or Youth Pastor approval was obtained."
                : "Authorize this Medical Release after completing the ministry review."
            }
            label={
              isPlatformAdministrator
                ? "Authorize as backup"
                : "Authorize Medical Release"
            }
            reasonLabel={
              isPlatformAdministrator
                ? "Youth Director approval confirmation"
                : "Authorization note"
            }
            reasonPlaceholder={
              isPlatformAdministrator
                ? "Example: Youth Pastor approved this Medical Release on 9/29/2026."
                : "Optional authorization note"
            }
            reasonRequired={isPlatformAdministrator}
            submissionId={submission.submissionId}
            workflow="medical_verify"
          />

          <VerificationAction
            helpText="Revoking authorization requires a reason and is retained in the Medical Release history."
            label="Revoke Medical Release authorization"
            reasonLabel="Revocation reason"
            reasonPlaceholder="Explain why authorization is being revoked."
            reasonRequired
            submissionId={submission.submissionId}
            workflow="medical_revoke"
          />
        </div>
      ))}
    </section>
  );
}