"use client";

import {
  useActionState,
  useMemo,
  useState,
} from "react";

import {
  documentSubmissionWorkflowAction,
  finalizeDocumentSubmissionUploadAction,
  prepareDocumentSubmissionUploadAction,
} from "@/features/forms/actions/document-submission-actions";
import type {
  AvailableDocumentVersion,
  DocumentSubmissionActionState,
  DocumentSubmissionSummary,
} from "@/features/forms/types/document-submissions";
import { createClient } from "@/lib/supabase/client";

const initialState: DocumentSubmissionActionState = {
  success: false,
};

type MedicalAuthorizationRole =
  | "platform_administrator"
  | "youth_pastor"
  | "staff_member"
  | "volunteer"
  | "parent";

type QueueFilter =
  | "all"
  | "needs_review"
  | "needs_authorization"
  | "needs_replacement"
  | "parent_action_required"
  | "ministry_processing"
  | "complete";

function Upload({
  option,
  supersedesSubmissionId = "",
}: {
  option: AvailableDocumentVersion;
  supersedesSubmissionId?: string;
}) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function upload(formData: FormData) {
    const file = formData.get("file");

    if (
      !(file instanceof File) ||
      file.size < 1 ||
      file.size > 20 * 1024 * 1024
    ) {
      setMessage(
        "Choose a PDF, JPEG, or PNG no larger than 20 MB.",
      );
      return;
    }

    const extension =
      file.type === "application/pdf"
        ? "pdf"
        : file.type === "image/jpeg"
          ? "jpg"
          : file.type === "image/png"
            ? "png"
            : null;

    if (!extension) {
      setMessage(
        "Choose a PDF, JPEG, or PNG.",
      );
      return;
    }

    setPending(true);

    try {
      const authorization =
        await prepareDocumentSubmissionUploadAction({
          studentId: option.studentId,
          templateVersionId:
            option.templateVersionId,
          extension,
          supersedesSubmissionId,
        });

      const client = createClient();

      const result = await client.storage
        .from(authorization.bucket)
        .uploadToSignedUrl(
          authorization.objectPath,
          authorization.token,
          file,
          {
            contentType: file.type,
          },
        );

      if (result.error) {
        throw new Error(result.error.message);
      }

      await finalizeDocumentSubmissionUploadAction(
        authorization.submissionId,
        file.name,
      );

      setMessage(
        "Completed document uploaded for review.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Upload failed.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      action={upload}
      className="space-y-2"
    >
      <input
        accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
        className="block w-full text-sm"
        name="file"
        required
        type="file"
      />

      <button
        className="min-h-10 rounded-lg bg-sky-700 px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        disabled={pending}
      >
        {pending
          ? "Uploading…"
          : supersedesSubmissionId
            ? "Upload replacement"
            : "Upload completed copy"}
      </button>

      {message ? (
        <p className="text-sm text-slate-700">
          {message}
        </p>
      ) : null}
    </form>
  );
}

function Workflow({
  submissionId,
  workflow,
  label,
  reasonRequired = false,
  reasonLabel,
  reasonPlaceholder,
  helpText,
}: {
  submissionId: string;
  workflow: string;
  label: string;
  reasonRequired?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  helpText?: string;
}) {
  const [state, action, pending] =
    useActionState(
      documentSubmissionWorkflowAction,
      initialState,
    );

  return (
    <form action={action} className="space-y-2">
      <input
        name="submissionId"
        type="hidden"
        value={submissionId}
      />

      <input
        name="workflow"
        type="hidden"
        value={workflow}
      />

      {helpText ? (
        <p className="text-xs text-slate-600">
          {helpText}
        </p>
      ) : null}

      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-slate-700">
          {reasonLabel ??
            (reasonRequired
              ? "Reason"
              : "Note")}
        </span>

        <input
          className="min-h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
          maxLength={1000}
          minLength={
            reasonRequired ? 5 : undefined
          }
          name="reason"
          placeholder={
            reasonPlaceholder ??
            (reasonRequired
              ? "Reason (required)"
              : "Optional note")
          }
          required={reasonRequired}
        />
      </label>

      <button
        className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
        disabled={pending}
      >
        {pending ? "Working…" : label}
      </button>

      {state.message ? (
        <p
          className={`text-xs ${
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

function formatValue(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

function getQueueState(
  submission: DocumentSubmissionSummary,
  manager: boolean,
) {
  if (!manager) {
    return {
      complete:
        submission.operationalStatus ===
        "complete",
      ministryProcessing:
        submission.operationalStatus ===
        "ministry_processing",
      needsAuthorization: false,
      needsReplacement:
        submission.operationalStatus ===
          "parent_action_required" &&
        (submission.digitalStatus ===
          "needs_replacement" ||
          submission.lifecycleStatus ===
            "rejected"),
      needsReview: false,
      parentActionRequired:
        submission.operationalStatus ===
        "parent_action_required",
    };
  }

  const needsReplacement =
    submission.digitalStatus ===
      "needs_replacement" ||
    submission.lifecycleStatus ===
      "rejected";

  const needsReview =
    submission.digitalStatus ===
      "uploaded" &&
    submission.reviewState !== "accepted";

  const hasCompletionEvidence =
    submission.digitalStatus ===
      "accepted" ||
    submission.paperCopyOnFile;

  const needsAuthorization =
    submission.documentKind ===
      "medical_release" &&
    hasCompletionEvidence &&
    !submission.medicalVerified;

  const complete =
    submission.documentKind ===
    "medical_release"
      ? hasCompletionEvidence &&
        submission.medicalVerified
      : hasCompletionEvidence;

  return {
    complete,
    ministryProcessing: false,
    needsAuthorization,
    needsReplacement,
    needsReview,
    parentActionRequired: false,
  };
}

function QueueStatus({
  manager,
  submission,
}: {
  manager: boolean;
  submission: DocumentSubmissionSummary;
}) {
  const state = getQueueState(
    submission,
    manager,
  );

  if (state.needsReplacement) {
    return (
      <span className="inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800">
        NEEDS REPLACEMENT
      </span>
    );
  }

  if (state.needsReview) {
    return (
      <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
        NEEDS REVIEW
      </span>
    );
  }

  if (state.parentActionRequired) {
    return (
      <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
        ACTION REQUIRED
      </span>
    );
  }

  if (state.ministryProcessing) {
    return (
      <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
        MINISTRY REVIEW PENDING
      </span>
    );
  }

  if (state.needsAuthorization) {
    return (
      <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
        NEEDS AUTHORIZATION
      </span>
    );
  }

  if (state.complete) {
    return (
      <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
        COMPLETE
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
      INCOMPLETE
    </span>
  );
}

function SubmissionActions({
  submission,
  replacementOption,
  manager,
  canAuthorizeMedicalRelease,
  isPlatformAdministrator,
}: {
  submission: DocumentSubmissionSummary;
  replacementOption:
    | AvailableDocumentVersion
    | undefined;
  manager: boolean;
  canAuthorizeMedicalRelease: boolean;
  isPlatformAdministrator: boolean;
}) {
  return (
    <details className="min-w-40 text-left">
      <summary className="cursor-pointer text-sm font-semibold text-sky-700">
        Actions
      </summary>

      <div className="mt-3 w-[min(32rem,80vw)] space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
        <div>
          <p className="font-semibold text-slate-950">
            {submission.studentName}
          </p>

          <p className="text-sm text-slate-600">
            {submission.templateName} v
            {submission.versionNumber}
          </p>
        </div>

        {submission.originalFileName ? (
          <a
            className="inline-block text-sm font-semibold text-sky-700"
            href={`/api/forms/submissions/${submission.submissionId}/download`}
          >
            Download securely
          </a>
        ) : (
          <p className="text-sm text-slate-500">
            No digital file is stored for this
            submission.
          </p>
        )}

        {!manager &&
        replacementOption &&
        (submission.digitalStatus ===
          "needs_replacement" ||
          submission.lifecycleStatus ===
            "rejected") ? (
          <div className="border-t border-slate-200 pt-4">
            <p className="mb-2 text-sm font-semibold text-slate-900">
              Upload replacement
            </p>

            <Upload
              option={replacementOption}
              supersedesSubmissionId={
                submission.submissionId
              }
            />
          </div>
        ) : null}

        {manager ? (
          <>
            <div className="border-t border-slate-200 pt-4">
              <p className="mb-3 text-sm font-semibold text-slate-900">
                Paper evidence
              </p>

              {!submission.paperCopyOnFile ? (
                <Workflow
                  label="Confirm paper copy"
                  submissionId={
                    submission.submissionId
                  }
                  workflow="paper_confirm"
                />
              ) : (
                <Workflow
                  label="Revoke paper confirmation"
                  reasonRequired
                  submissionId={
                    submission.submissionId
                  }
                  workflow="paper_revoke"
                />
              )}
            </div>

            {submission.digitalStatus !==
            "missing" ? (
              <div className="space-y-4 border-t border-slate-200 pt-4">
                <p className="text-sm font-semibold text-slate-900">
                  Digital review
                </p>

                <Workflow
                  label="Accept document"
                  submissionId={
                    submission.submissionId
                  }
                  workflow="accept"
                />

                <Workflow
                  label="Reject document"
                  reasonRequired
                  submissionId={
                    submission.submissionId
                  }
                  workflow="reject"
                />

                <Workflow
                  label="Request replacement"
                  reasonRequired
                  submissionId={
                    submission.submissionId
                  }
                  workflow="replace_request"
                />
              </div>
            ) : null}

            {submission.documentKind ===
              "medical_release" &&
            canAuthorizeMedicalRelease ? (
              <div className="space-y-3 border-t border-slate-200 pt-4">
                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    Medical Release authorization
                  </p>

                  <p className="mt-1 text-xs text-slate-600">
                    {isPlatformAdministrator
                      ? "Platform Administrator authorization is a backup action. Confirm Youth Pastor approval before authorizing."
                      : "Youth Pastor authorization is the final ministry approval for this Medical Release."}
                  </p>
                </div>

                {!submission.medicalVerified ? (
                  <Workflow
                    helpText={
                      isPlatformAdministrator
                        ? "A confirmation note is required for this backup authorization."
                        : "Authorize after completing the ministry review."
                    }
                    label={
                      isPlatformAdministrator
                        ? "Authorize as backup"
                        : "Authorize Medical Release"
                    }
                    reasonLabel={
                      isPlatformAdministrator
                        ? "Youth Pastor approval confirmation"
                        : "Authorization note"
                    }
                    reasonPlaceholder={
                      isPlatformAdministrator
                        ? "Example: Youth Pastor approved this Medical Release."
                        : "Optional authorization note"
                    }
                    reasonRequired={
                      isPlatformAdministrator
                    }
                    submissionId={
                      submission.submissionId
                    }
                    workflow="medical_verify"
                  />
                ) : (
                  <Workflow
                    helpText="Revocation is retained in the Medical Release history."
                    label="Revoke Medical Release authorization"
                    reasonLabel="Revocation reason"
                    reasonPlaceholder="Explain why authorization is being revoked."
                    reasonRequired
                    submissionId={
                      submission.submissionId
                    }
                    workflow="medical_revoke"
                  />
                )}
              </div>
            ) : null}

            {replacementOption &&
            submission.digitalStatus !==
              "missing" ? (
              <div className="border-t border-slate-200 pt-4">
                <p className="mb-2 text-sm font-semibold text-slate-900">
                  Replacement upload
                </p>

                <Upload
                  option={replacementOption}
                  supersedesSubmissionId={
                    submission.submissionId
                  }
                />
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </details>
  );
}

export function DocumentSubmissionWorkspace({
  options,
  submissions,
  manager,
  medicalAuthorizationRole,
}: {
  options: AvailableDocumentVersion[];
  submissions: DocumentSubmissionSummary[];
  manager: boolean;
  medicalAuthorizationRole: MedicalAuthorizationRole;
}) {
  const optionKey = (
    option: AvailableDocumentVersion,
  ) =>
    `${option.studentId}:${option.templateVersionId}`;

  const [selected, setSelected] =
    useState(
      options[0]
        ? optionKey(options[0])
        : "",
    );

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState<QueueFilter>("all");

  const option = options.find(
    (candidate) =>
      optionKey(candidate) === selected,
  );

  const canAuthorizeMedicalRelease =
    medicalAuthorizationRole ===
      "youth_pastor" ||
    medicalAuthorizationRole ===
      "platform_administrator";

  const isPlatformAdministrator =
    medicalAuthorizationRole ===
    "platform_administrator";

  const filteredSubmissions = useMemo(
    () => {
      const normalized =
        search.trim().toLowerCase();

      return [...submissions]
        .filter((submission) => {
          if (
            normalized &&
            !`${submission.studentName} ${submission.templateName}`
              .toLowerCase()
              .includes(normalized)
          ) {
            return false;
          }

          const state =
            getQueueState(
              submission,
              manager,
            );

          if (
            filter === "needs_review"
          ) {
            return state.needsReview;
          }

          if (
            filter ===
            "needs_authorization"
          ) {
            return state.needsAuthorization;
          }

          if (
            filter ===
            "needs_replacement"
          ) {
            return state.needsReplacement;
          }

          if (
            filter ===
            "parent_action_required"
          ) {
            return state.parentActionRequired;
          }

          if (
            filter ===
            "ministry_processing"
          ) {
            return state.ministryProcessing;
          }

          if (filter === "complete") {
            return state.complete;
          }

          return true;
        })
        .sort((left, right) => {
          const leftState =
            getQueueState(left, manager);
          const rightState =
            getQueueState(right, manager);

          const rank = (
            state: ReturnType<
              typeof getQueueState
            >,
          ) => {
            if (state.needsReplacement) {
              return 0;
            }

            if (state.needsReview) {
              return 1;
            }

            if (
              state.needsAuthorization
            ) {
              return 2;
            }

            if (!state.complete) {
              return 3;
            }

            return 4;
          };

          const difference =
            rank(leftState) -
            rank(rightState);

          if (difference !== 0) {
            return difference;
          }

          return left.studentName.localeCompare(
            right.studentName,
          );
        });
    },
    [filter, manager, search, submissions],
  );

  const needsAttentionCount =
    submissions.filter((submission) => {
      const state =
        getQueueState(
          submission,
          manager,
        );

      return manager
        ? state.needsReplacement ||
            state.needsReview ||
            state.needsAuthorization ||
            !state.complete
        : state.parentActionRequired;
    }).length;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white">
        <details>
          <summary className="cursor-pointer list-none px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-slate-950">
                  Upload a completed document
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  Upload a digital completed copy
                  for review.
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {options.length} available
              </span>
            </div>
          </summary>

          <div className="border-t border-slate-200 p-5">
            <p className="mb-4 text-sm text-slate-600">
              Uploading a digital copy does not
              confirm a paper copy, accept the
              document, or authorize a Medical
              Release.
            </p>

            {options.length ? (
              <div className="space-y-4">
                <select
                  className="min-h-11 w-full rounded-lg border border-slate-300 px-3"
                  onChange={(event) =>
                    setSelected(
                      event.target.value,
                    )
                  }
                  value={selected}
                >
                  {options.map(
                    (availableOption) => (
                      <option
                        key={optionKey(
                          availableOption,
                        )}
                        value={optionKey(
                          availableOption,
                        )}
                      >
                        {
                          availableOption.studentName
                        }{" "}
                        ·{" "}
                        {
                          availableOption.templateName
                        }{" "}
                        v
                        {
                          availableOption.versionNumber
                        }
                      </option>
                    ),
                  )}
                </select>

                {option ? (
                  <div className="space-y-3">
                    <a
                      className="inline-block text-sm font-semibold text-sky-700"
                      href={`/api/forms/templates/${option.templateVersionId}/download`}
                    >
                      Download blank form
                    </a>

                    <Upload
                      option={option}
                    />
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                No published document versions
                are available.
              </p>
            )}
          </div>
        </details>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-sky-700">
              {manager
                ? "Document review"
                : "Family documents"}
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-950">
              {manager
                ? "Completed document queue"
                : "Completed forms and documents"}
            </h2>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
              {submissions.length} total
            </span>

            {needsAttentionCount ? (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900">
                {needsAttentionCount} need attention
              </span>
            ) : null}
          </div>
        </div>

        {submissions.length ? (
          <>
            <div className="mt-5 grid gap-3 md:grid-cols-[1fr_14rem]">
              <label>
                <span className="mb-1 block text-sm font-semibold text-slate-700">
                  Search
                </span>

                <input
                  className="min-h-11 w-full rounded-lg border border-slate-300 px-3"
                  onChange={(event) =>
                    setSearch(
                      event.target.value,
                    )
                  }
                  placeholder="Search student or document"
                  type="search"
                  value={search}
                />
              </label>

              <label>
                <span className="mb-1 block text-sm font-semibold text-slate-700">
                  Queue
                </span>

                <select
                  className="min-h-11 w-full rounded-lg border border-slate-300 px-3"
                  onChange={(event) =>
                    setFilter(
                      event.target
                        .value as QueueFilter,
                    )
                  }
                  value={filter}
                >
                  <option value="all">
                    All documents
                  </option>

                  {manager ? (
                    <>
                      <option value="needs_review">
                        Needs review
                      </option>

                      <option value="needs_authorization">
                        Needs authorization
                      </option>

                      <option value="needs_replacement">
                        Needs replacement
                      </option>
                    </>
                  ) : (
                    <>
                      <option value="parent_action_required">
                        Action required
                      </option>

                      <option value="ministry_processing">
                        Ministry review pending
                      </option>
                    </>
                  )}

                  <option value="complete">
                    Complete
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
                      Document
                    </th>

                    <th className="px-3 py-3">
                      Evidence
                    </th>

                    <th className="px-3 py-3">
                      Status
                    </th>

                    <th className="px-3 py-3 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredSubmissions.map(
                    (submission) => {
                      const replacementOption =
                        options.find(
                          (
                            availableOption,
                          ) =>
                            availableOption.studentId ===
                              submission.studentId &&
                            availableOption.templateVersionId ===
                              submission.templateVersionId,
                        );

                      return (
                        <tr
                          className="border-t border-slate-200 align-top"
                          key={
                            submission.submissionId
                          }
                        >
                          <td className="px-3 py-3">
                            <span className="font-semibold text-slate-950">
                              {
                                submission.studentName
                              }
                            </span>
                          </td>

                          <td className="px-3 py-3">
                            <p className="font-medium text-slate-900">
                              {
                                submission.templateName
                              }{" "}
                              v
                              {
                                submission.versionNumber
                              }
                            </p>

                            <p className="text-xs text-slate-500">
                              {submission.documentKind ===
                              "medical_release"
                                ? "Medical Release"
                                : "Waiver / Permission Form"}
                            </p>
                          </td>

                          <td className="px-3 py-3 text-xs text-slate-600">
                            <p>
                              Digital:{" "}
                              <span className="font-semibold text-slate-800">
                                {formatValue(
                                  submission.digitalStatus,
                                )}
                              </span>
                            </p>

                            <p>
                              Paper:{" "}
                              <span className="font-semibold text-slate-800">
                                {submission.paperCopyOnFile
                                  ? "On file"
                                  : "Not confirmed"}
                              </span>
                            </p>

                            {manager &&
                            submission.reviewState ? (
                              <p>
                                Review:{" "}
                                <span className="font-semibold text-slate-800">
                                  {formatValue(
                                    submission.reviewState,
                                  )}
                                </span>
                              </p>
                            ) : null}

                            {manager &&
                            submission.documentKind ===
                              "medical_release" ? (
                              <p>
                                Authorization:{" "}
                                <span className="font-semibold text-slate-800">
                                  {submission.medicalVerified
                                    ? "Authorized"
                                    : "Needed"}
                                </span>
                              </p>
                            ) : null}
                          </td>

                          <td className="px-3 py-3">
                            <QueueStatus
                              manager={manager}
                              submission={
                                submission
                              }
                            />
                          </td>

                          <td className="px-3 py-3 text-right">
                            <SubmissionActions
                              canAuthorizeMedicalRelease={
                                canAuthorizeMedicalRelease
                              }
                              isPlatformAdministrator={
                                isPlatformAdministrator
                              }
                              manager={manager}
                              replacementOption={
                                replacementOption
                              }
                              submission={
                                submission
                              }
                            />
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>

              {!filteredSubmissions.length ? (
                <p className="p-5 text-center text-sm text-slate-600">
                  No documents match the current
                  search or filter.
                </p>
              ) : null}
            </div>
          </>
        ) : (
          <p className="mt-4 text-sm text-slate-600">
            No completed documents have been
            submitted.
          </p>
        )}
      </section>
    </div>
  );
}
