"use client";

import Link from "next/link";
import {
  useActionState,
  useMemo,
  useState,
} from "react";

import {
  archiveCustomAssignmentAction,
  archiveCustomSubmissionAction,
  archiveCustomTemplateAction,
  createCustomAssignmentAction,
  createCustomTemplateAction,
  createCustomVersionAction,
  publishCustomVersionAction,
  retireCustomVersionAction,
  saveCustomFieldAction,
} from "@/features/forms/actions/custom-form-actions";

import type {
  CustomFormActionState,
  CustomFormAssignmentSummary,
  CustomFormAssignmentTargets,
  CustomFormAssignmentType,
  CustomFormSubmissionSummary,
  CustomFormTemplateRow,
  MyCustomForm,
} from "@/features/forms/types/custom-forms";

const initial: CustomFormActionState = {
  success: false,
};

const input =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3";

type ManagerView =
  | "forms"
  | "assignments"
  | "responses"
  | "my-forms";

type FormTool =
  | "none"
  | "template"
  | "version"
  | "field"
  | "assignment";

function Message({
  state,
}: {
  state: CustomFormActionState;
}) {
  if (!state.message) {
    return null;
  }

  return (
    <p
      className={
        state.success
          ? "text-sm text-emerald-700"
          : "text-sm text-rose-700"
      }
    >
      {state.message}
    </p>
  );
}

function WorkspaceButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={
        active
          ? "inline-flex min-h-11 items-center rounded-lg bg-slate-900 px-4 font-semibold text-white"
          : "inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 font-semibold text-slate-700"
      }
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function ToolButton({
  active,
  children,
  primary = false,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  primary?: boolean;
  onClick: () => void;
}) {
  let className =
    "inline-flex min-h-11 items-center rounded-lg border px-4 font-semibold";

  if (active) {
    className +=
      " border-slate-900 bg-slate-900 text-white";
  } else if (primary) {
    className +=
      " border-sky-700 bg-sky-700 text-white";
  } else {
    className +=
      " border-slate-300 bg-white text-slate-700";
  }

  return (
    <button
      className={className}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function AssignmentForm({
  versions,
  targets,
}: {
  versions: CustomFormTemplateRow[];
  targets: CustomFormAssignmentTargets;
}) {
  const [state, action, pending] =
    useActionState(
      createCustomAssignmentAction,
      initial,
    );

  const [
    assignmentType,
    setAssignmentType,
  ] =
    useState<CustomFormAssignmentType>(
      "student",
    );

  const options =
    assignmentType === "event"
      ? targets.events
      : assignmentType === "student"
        ? targets.students
        : assignmentType === "household"
          ? targets.households
          : assignmentType === "volunteer"
            ? targets.volunteers
            : [];

  const targetLabel =
    assignmentType === "event"
      ? "Event"
      : assignmentType === "student"
        ? "Student"
        : assignmentType === "household"
          ? "Household"
          : "Volunteer";

  return (
    <form
      action={action}
      className="space-y-4"
    >
      <div>
        <h2 className="text-xl font-bold text-slate-950">
          Assign form
        </h2>

        <p className="mt-1 text-sm text-slate-600">
          Choose a published form and who
          should complete it.
        </p>
      </div>

      <label className="block text-sm font-semibold">
        Published version

        <select
          className={input}
          name="versionId"
          required
        >
          <option value="">
            Select a form
          </option>

          {versions
            .filter(
              (version) =>
                version.versionStatus ===
                "published",
            )
            .map((version) => (
              <option
                key={version.versionId!}
                value={version.versionId!}
              >
                {version.name} · v
                {version.versionNumber}
              </option>
            ))}
        </select>
      </label>

      <label className="block text-sm font-semibold">
        Assignment type

        <select
          className={input}
          name="assignmentType"
          onChange={(event) =>
            setAssignmentType(
              event.target
                .value as CustomFormAssignmentType,
            )
          }
          value={assignmentType}
        >
          <option value="student">
            Student
          </option>
          <option value="household">
            Household
          </option>
          <option value="volunteer">
            Volunteer
          </option>
          <option value="event">
            Event
          </option>
          <option value="general_ministry">
            General ministry
          </option>
        </select>
      </label>

      {assignmentType ===
      "general_ministry" ? (
        <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          General ministry assignments apply
          without a specific target.
        </p>
      ) : (
        <label className="block text-sm font-semibold">
          {targetLabel}

          <select
            className={input}
            key={assignmentType}
            name="targetId"
            required
          >
            <option value="">
              Select{" "}
              {targetLabel.toLowerCase()}
            </option>

            {options.map((option) => (
              <option
                key={option.id}
                value={option.id}
              >
                {option.label}
              </option>
            ))}
          </select>

          {!options.length ? (
            <span className="mt-1 block font-normal text-amber-700">
              No eligible{" "}
              {targetLabel.toLowerCase()}{" "}
              targets are available.
            </span>
          ) : null}
        </label>
      )}

      <Message state={state} />

      <button
        className="min-h-11 rounded-lg bg-sky-700 px-4 font-semibold text-white disabled:opacity-60"
        disabled={pending}
      >
        Create assignment
      </button>
    </form>
  );
}

function CreateTemplateForm() {
  const [state, action, pending] =
    useActionState(
      createCustomTemplateAction,
      initial,
    );

  return (
    <form
      action={action}
      className="space-y-4"
    >
      <div>
        <h2 className="text-xl font-bold text-slate-950">
          New form
        </h2>

        <p className="mt-1 text-sm text-slate-600">
          Create the basic form before adding
          versions and questions.
        </p>
      </div>

      <label className="block text-sm font-semibold">
        Name

        <input
          className={input}
          maxLength={200}
          name="name"
          required
        />
      </label>

      <label className="block text-sm font-semibold">
        Description

        <textarea
          className={`${input} py-2`}
          maxLength={2000}
          name="description"
        />
      </label>

      <Message state={state} />

      <button
        className="min-h-11 rounded-lg bg-sky-700 px-4 font-semibold text-white disabled:opacity-60"
        disabled={pending}
      >
        Create form
      </button>
    </form>
  );
}

function CreateVersionForm({
  templates,
}: {
  templates: CustomFormTemplateRow[];
}) {
  const [state, action, pending] =
    useActionState(
      createCustomVersionAction,
      initial,
    );

  const uniqueTemplates = templates
    .filter(
      (template) =>
        template.templateStatus !==
        "archived",
    )
    .filter(
      (template, index, all) =>
        all.findIndex(
          (item) =>
            item.templateId ===
            template.templateId,
        ) === index,
    );

  return (
    <form
      action={action}
      className="space-y-4"
    >
      <div>
        <h2 className="text-xl font-bold text-slate-950">
          New version
        </h2>

        <p className="mt-1 text-sm text-slate-600">
          Create a new draft version of an
          existing form.
        </p>
      </div>

      <label className="block text-sm font-semibold">
        Form

        <select
          className={input}
          name="templateId"
          required
        >
          <option value="">
            Select a form
          </option>

          {uniqueTemplates.map(
            (template) => (
              <option
                key={template.templateId}
                value={
                  template.templateId
                }
              >
                {template.name}
              </option>
            ),
          )}
        </select>
      </label>

      <label className="block text-sm font-semibold">
        Version title

        <input
          className={input}
          name="title"
          required
        />
      </label>

      <label className="block text-sm font-semibold">
        Instructions

        <textarea
          className={`${input} py-2`}
          name="instructions"
        />
      </label>

      <Message state={state} />

      <button
        className="min-h-11 rounded-lg bg-sky-700 px-4 font-semibold text-white disabled:opacity-60"
        disabled={pending}
      >
        Create draft
      </button>
    </form>
  );
}

function AddFieldForm({
  versions,
}: {
  versions: CustomFormTemplateRow[];
}) {
  const [state, action, pending] =
    useActionState(
      saveCustomFieldAction,
      initial,
    );

  return (
    <form
      action={action}
      className="space-y-4"
    >
      <div>
        <h2 className="text-xl font-bold text-slate-950">
          Add question
        </h2>

        <p className="mt-1 text-sm text-slate-600">
          Add a question or response field to
          a draft form.
        </p>
      </div>

      <label className="block text-sm font-semibold">
        Draft version

        <select
          className={input}
          name="versionId"
          required
        >
          <option value="">
            Select a draft
          </option>

          {versions
            .filter(
              (version) =>
                version.versionStatus ===
                "draft",
            )
            .map((version) => (
              <option
                key={version.versionId!}
                value={version.versionId!}
              >
                {version.name} · v
                {version.versionNumber}
              </option>
            ))}
        </select>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          Field key

          <input
            className={input}
            name="fieldKey"
            pattern="[a-z][a-z0-9_]*"
            required
          />
        </label>

        <label className="block text-sm font-semibold">
          Type

          <select
            className={input}
            name="fieldType"
          >
            <option value="short_text">
              Short text
            </option>
            <option value="long_text">
              Long text
            </option>
            <option value="yes_no">
              Yes / No
            </option>
            <option value="single_choice">
              Single choice
            </option>
            <option value="multiple_choice">
              Multiple choice
            </option>
            <option value="date">
              Date
            </option>
            <option value="acknowledgment">
              Acknowledgment
            </option>
          </select>
        </label>
      </div>

      <label className="block text-sm font-semibold">
        Question label

        <input
          className={input}
          name="label"
          required
        />
      </label>

      <label className="block text-sm font-semibold">
        Help text

        <input
          className={input}
          name="helpText"
        />
      </label>

      <label className="block text-sm font-semibold">
        Choice options

        <input
          className={input}
          name="choiceOptions"
          placeholder="Option one, Option two, Option three"
        />

        <span className="mt-1 block font-normal text-slate-500">
          Separate choices with commas when
          using a choice field.
        </span>
      </label>

      <div className="flex flex-wrap gap-5">
        <label className="flex items-center gap-2">
          <input
            name="isRequired"
            type="checkbox"
          />
          Required
        </label>

        <label className="flex items-center gap-2">
          Order

          <input
            className="w-20 rounded-lg border border-slate-300 px-2 py-1"
            defaultValue="0"
            min="0"
            name="displayOrder"
            type="number"
          />
        </label>
      </div>

      <Message state={state} />

      <button
        className="min-h-11 rounded-lg bg-sky-700 px-4 font-semibold text-white disabled:opacity-60"
        disabled={pending}
      >
        Add question
      </button>
    </form>
  );
}

function FormManagement({
  templates,
  targets,
  initialTool,
  showToolButtons,
}: {
  templates: CustomFormTemplateRow[];
  targets: CustomFormAssignmentTargets;
  initialTool: FormTool;
  showToolButtons: boolean;
}) {
  const [tool, setTool] =
    useState<FormTool>(initialTool);

  const [search, setSearch] =
    useState("");

  const [status, setStatus] =
    useState("all");

  const versions = templates.filter(
    (template) => template.versionId,
  );

  const filteredVersions = useMemo(
    () =>
      versions.filter((version) => {
        const searchValue =
          search.trim().toLowerCase();

        const matchesSearch =
  !searchValue ||
  version.name
    .toLowerCase()
    .includes(searchValue) ||
  (version.versionTitle ?? "")
    .toLowerCase()
    .includes(searchValue);

        const matchesStatus =
          status === "all" ||
          version.versionStatus === status;

        return (
          matchesSearch &&
          matchesStatus
        );
      }),
    [versions, search, status],
  );

  return (
    <section className="space-y-6">
      {showToolButtons ? (
        <div className="flex flex-wrap gap-3">
          <ToolButton
            active={tool === "template"}
            primary
            onClick={() =>
              setTool(
                tool === "template"
                  ? "none"
                  : "template",
              )
            }
          >
            New form
          </ToolButton>

          <ToolButton
            active={tool === "version"}
            onClick={() =>
              setTool(
                tool === "version"
                  ? "none"
                  : "version",
              )
            }
          >
            New version
          </ToolButton>

          <ToolButton
            active={tool === "field"}
            onClick={() =>
              setTool(
                tool === "field"
                  ? "none"
                  : "field",
              )
            }
          >
            Add question
          </ToolButton>

          <ToolButton
            active={
              tool === "assignment"
            }
            onClick={() =>
              setTool(
                tool === "assignment"
                  ? "none"
                  : "assignment",
              )
            }
          >
            Assign form
          </ToolButton>
        </div>
      ) : null}

      {tool !== "none" ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          {tool === "template" ? (
            <CreateTemplateForm />
          ) : null}

          {tool === "version" ? (
            <CreateVersionForm
              templates={templates}
            />
          ) : null}

          {tool === "field" ? (
            <AddFieldForm
              versions={versions}
            />
          ) : null}

          {tool === "assignment" ? (
            <AssignmentForm
              targets={targets}
              versions={versions}
            />
          ) : null}
        </div>
      ) : null}

      <div>
        <h2 className="text-2xl font-bold text-slate-950">
          Forms
        </h2>

        <p className="mt-1 text-slate-600">
          Review forms, publishing status,
          questions, and assignments.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-end gap-4">
          <label className="min-w-64 flex-1 text-sm font-semibold">
            Search forms

            <input
              className={input}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search by form name"
              type="search"
              value={search}
            />
          </label>

          <label className="min-w-44 text-sm font-semibold">
            Status

            <select
              className={input}
              onChange={(event) =>
                setStatus(
                  event.target.value,
                )
              }
              value={status}
            >
              <option value="all">
                All statuses
              </option>
              <option value="draft">
                Draft
              </option>
              <option value="published">
                Published
              </option>
              <option value="retired">
                Retired
              </option>
            </select>
          </label>
        </div>
      </div>

      {filteredVersions.length ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="hidden gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 md:grid md:grid-cols-[minmax(0,2fr)_7rem_7rem_10rem]">
            <span>Form</span>
            <span>Status</span>
            <span>Questions</span>
            <span className="sr-only">
              Actions
            </span>
          </div>

          <div className="divide-y divide-slate-200">
            {filteredVersions.map(
              (version) => (
                <div
                  className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,2fr)_7rem_7rem_10rem] md:items-center md:gap-4"
                  key={
                    version.versionId!
                  }
                >
                  <div>
                    <p className="font-bold text-slate-950">
                      {version.name} · v
                      {
                        version.versionNumber
                      }
                    </p>

                    <p className="mt-1 text-sm text-slate-600">
                      {
                        version.versionTitle
                      }{" "}
                      ·{" "}
                      {
                        version.assignmentCount
                      }{" "}
                      active assignment
                      {version.assignmentCount ===
                      1
                        ? ""
                        : "s"}
                    </p>
                  </div>

                  <span className="text-sm font-semibold capitalize text-sky-800">
                    {
                      version.versionStatus
                    }
                  </span>

                  <span className="text-sm text-slate-600">
                    {version.fieldCount}
                  </span>

                  <div className="flex flex-wrap gap-2 md:justify-end">
                    {version.versionStatus ===
                    "draft" ? (
                      <form
                        action={
                          publishCustomVersionAction
                        }
                      >
                        <input
                          name="versionId"
                          type="hidden"
                          value={
                            version.versionId!
                          }
                        />

                        <button className="rounded-lg border border-sky-700 px-3 py-2 text-sm font-semibold text-sky-800">
                          Publish
                        </button>
                      </form>
                    ) : null}

                    {version.versionStatus ===
                    "published" ? (
                      <form
                        action={
                          retireCustomVersionAction
                        }
                      >
                        <input
                          name="versionId"
                          type="hidden"
                          value={
                            version.versionId!
                          }
                        />

                        <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
                          Retire
                        </button>
                      </form>
                    ) : null}

                    <form
                      action={
                        archiveCustomTemplateAction
                      }
                    >
                      <input
                        name="templateId"
                        type="hidden"
                        value={
                          version.templateId
                        }
                      />

                      <button className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-800">
                        Archive
                      </button>
                    </form>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
          {versions.length
            ? "No forms match the current search."
            : "No forms have been created."}
        </p>
      )}
    </section>
  );
}

function AssignmentsView({
  assignments,
}: {
  assignments: CustomFormAssignmentSummary[];
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-950">
          Assignments
        </h2>

        <p className="mt-1 text-slate-600">
          Review forms currently assigned to
          students, households, volunteers,
          events, or the ministry.
        </p>
      </div>

      {assignments.length ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="hidden gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 md:grid md:grid-cols-[minmax(0,2fr)_10rem_12rem_8rem]">
            <span>Form</span>
            <span>Type</span>
            <span>Target</span>
            <span className="sr-only">
              Action
            </span>
          </div>

          <div className="divide-y divide-slate-200">
            {assignments.map(
              (assignment) => (
                <div
                  className="grid gap-2 px-5 py-4 md:grid-cols-[minmax(0,2fr)_10rem_12rem_8rem] md:items-center md:gap-4"
                  key={
                    assignment.assignmentId
                  }
                >
                  <span className="font-bold text-slate-950">
                    {assignment.title} · v
                    {
                      assignment.versionNumber
                    }
                  </span>

                  <span className="text-sm capitalize text-slate-600">
                    {assignment.assignmentType.replaceAll(
                      "_",
                      " ",
                    )}
                  </span>

                  <span className="text-sm text-slate-600">
                    {assignment.targetId ??
                      "General ministry"}
                  </span>

                  <form
                    action={
                      archiveCustomAssignmentAction
                    }
                    className="md:text-right"
                  >
                    <input
                      name="assignmentId"
                      type="hidden"
                      value={
                        assignment.assignmentId
                      }
                    />

                    <button className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-800">
                      Archive
                    </button>
                  </form>
                </div>
              ),
            )}
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
          No active form assignments.
        </p>
      )}
    </section>
  );
}

function ResponsesView({
  submissions,
}: {
  submissions: CustomFormSubmissionSummary[];
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-950">
          Responses
        </h2>

        <p className="mt-1 text-slate-600">
          Review responses submitted through
          operational forms.
        </p>
      </div>

      {submissions.length ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="hidden gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 md:grid md:grid-cols-[minmax(0,2fr)_10rem_10rem_8rem]">
            <span>Form</span>
            <span>Assignment</span>
            <span>Status</span>
            <span className="sr-only">
              Action
            </span>
          </div>

          <div className="divide-y divide-slate-200">
            {submissions.map(
              (submission) => (
                <div
                  className="grid gap-2 px-5 py-4 md:grid-cols-[minmax(0,2fr)_10rem_10rem_8rem] md:items-center md:gap-4"
                  key={
                    submission.submissionId
                  }
                >
                  <div>
                    <p className="font-bold text-slate-950">
                      {submission.title} · v
                      {
                        submission.versionNumber
                      }
                    </p>

                    {submission.submittedAt ? (
                      <p className="mt-1 text-sm text-slate-500">
                        Submitted{" "}
                        {new Date(
                          submission.submittedAt,
                        ).toLocaleString()}
                      </p>
                    ) : null}
                  </div>

                  <span className="text-sm capitalize text-slate-600">
                    {submission.assignmentType.replaceAll(
                      "_",
                      " ",
                    )}
                  </span>

                  <span className="text-sm font-semibold capitalize text-sky-800">
                    {
                      submission.submissionStatus
                    }
                  </span>

                  <div className="flex flex-wrap gap-2 md:justify-end">
                    <Link
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                      href={`/permission-forms/submissions/${submission.submissionId}`}
                    >
                      Open
                    </Link>

                    {submission.submissionStatus ===
                    "submitted" ? (
                      <form
                        action={
                          archiveCustomSubmissionAction
                        }
                      >
                        <input
                          name="submissionId"
                          type="hidden"
                          value={
                            submission.submissionId
                          }
                        />

                        <button className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-800">
                          Archive
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
          No operational form responses yet.
        </p>
      )}
    </section>
  );
}

function MyFormsView({
  myForms,
}: {
  myForms: MyCustomForm[];
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-950">
          My forms
        </h2>

        <p className="mt-1 text-slate-600">
          Open a form, save your answers, and
          submit when every required response
          is complete.
        </p>
      </div>

      {myForms.length ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="hidden gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 md:grid md:grid-cols-[minmax(0,2fr)_10rem_10rem_5rem]">
            <span>Form</span>
            <span>Assignment</span>
            <span>Status</span>
            <span className="sr-only">
              Open
            </span>
          </div>

          <div className="divide-y divide-slate-200">
            {myForms.map((form) => (
              <Link
                className="grid gap-2 px-5 py-4 transition hover:bg-sky-50 md:grid-cols-[minmax(0,2fr)_10rem_10rem_5rem] md:items-center md:gap-4"
                href={`/permission-forms/my/${form.assignmentId}${
                  form.subjectStudentId
                    ? `?student=${form.subjectStudentId}`
                    : ""
                }`}
                key={`${form.assignmentId}-${form.subjectStudentId ?? "self"}`}
              >
                <span className="font-bold text-slate-950">
                  {form.title} · v
                  {form.versionNumber}
                </span>

                <span className="text-sm capitalize text-slate-600">
                  {form.assignmentType.replaceAll(
                    "_",
                    " ",
                  )}
                </span>

                <span className="text-sm font-semibold capitalize text-sky-800">
                  {form.submissionStatus ??
                    "Not started"}
                </span>

                <span className="text-sm font-semibold text-sky-800 md:text-right">
                  Open
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
          No operational forms are assigned
          to you.
        </p>
      )}
    </section>
  );
}

function ManagerForms({
  templates,
  assignments,
  submissions,
  targets,
  myForms,
  initialView,
  initialTool,
  showNavigation,
  showToolButtons,
}: {
  templates: CustomFormTemplateRow[];
  assignments: CustomFormAssignmentSummary[];
  submissions: CustomFormSubmissionSummary[];
  targets: CustomFormAssignmentTargets;
  myForms: MyCustomForm[];
  initialView: ManagerView;
  initialTool: FormTool;
  showNavigation: boolean;
  showToolButtons: boolean;
}) {
  const [view, setView] =
    useState<ManagerView>(initialView);

  return (
    <section className="space-y-6">
      {showNavigation ? (
        <nav
          aria-label="Forms management"
          className="flex flex-wrap gap-3"
        >
          <WorkspaceButton
            active={view === "forms"}
            onClick={() =>
              setView("forms")
            }
          >
            Forms
          </WorkspaceButton>

          <WorkspaceButton
            active={
              view === "assignments"
            }
            onClick={() =>
              setView("assignments")
            }
          >
            Assignments
          </WorkspaceButton>

          <WorkspaceButton
            active={
              view === "responses"
            }
            onClick={() =>
              setView("responses")
            }
          >
            Responses
          </WorkspaceButton>

          <WorkspaceButton
            active={
              view === "my-forms"
            }
            onClick={() =>
              setView("my-forms")
            }
          >
            My forms
          </WorkspaceButton>
        </nav>
      ) : null}

      {view === "forms" ? (
        <FormManagement
          initialTool={initialTool}
          showToolButtons={
            showToolButtons
          }
          targets={targets}
          templates={templates}
        />
      ) : null}

      {view === "assignments" ? (
        <AssignmentsView
          assignments={assignments}
        />
      ) : null}

      {view === "responses" ? (
        <ResponsesView
          submissions={submissions}
        />
      ) : null}

      {view === "my-forms" ? (
        <MyFormsView
          myForms={myForms}
        />
      ) : null}
    </section>
  );
}

export function CustomFormsWorkspace({
  manager,
  templates,
  assignments,
  myForms,
  submissions,
  assignmentTargets,
  initialView = "forms",
  initialTool = "none",
  showNavigation = true,
  showToolButtons = true,
}: {
  manager: boolean;
  templates: CustomFormTemplateRow[];
  assignments: CustomFormAssignmentSummary[];
  myForms: MyCustomForm[];
  submissions: CustomFormSubmissionSummary[];
  assignmentTargets: CustomFormAssignmentTargets;
  initialView?:
    | "forms"
    | "assignments"
    | "responses"
    | "my-forms";
  initialTool?:
    | "none"
    | "template"
    | "version"
    | "field"
    | "assignment";
  showNavigation?: boolean;
  showToolButtons?: boolean;
}) {
  if (!manager) {
    return (
      <MyFormsView myForms={myForms} />
    );
  }

  return (
    <ManagerForms
      assignments={assignments}
      initialTool={initialTool}
      initialView={initialView}
      myForms={myForms}
      showNavigation={showNavigation}
      showToolButtons={showToolButtons}
      submissions={submissions}
      targets={assignmentTargets}
      templates={templates}
    />
  );
}