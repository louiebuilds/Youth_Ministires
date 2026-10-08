"use client";

import {
  useActionState,
  useState,
} from "react";
import { setEventPermissionSlipRequirementAction } from "@/features/forms/actions/medical-permission-actions";
import type { EventPermissionSlipRequirement } from "@/features/forms/types/medical-permission";

function RequirementControls({
  requirement,
  versions,
}: {
  requirement: EventPermissionSlipRequirement;
  versions: Array<{
    versionId: string;
    label: string;
  }>;
}) {
  const [requiredValue, setRequiredValue] =
    useState(
      requirement.required ? "yes" : "no",
    );

  const [templateVersionId, setTemplateVersionId] =
    useState(
      requirement.templateVersionId ?? "",
    );

  return (
    <>
      <select
        className="min-h-11 rounded-lg border px-3"
        name="required"
        onChange={(event) => {
          const nextValue = event.target.value;
          setRequiredValue(nextValue);
          if (nextValue === "no") {
            setTemplateVersionId("");
          }
        }}
        value={requiredValue}
      >
        <option value="no">No waiver required</option>
        <option value="yes">
          Waiver / Permission Form required
        </option>
      </select>

      <select
        className="min-h-11 rounded-lg border px-3"
        name="templateVersionId"
        onChange={(event) =>
          setTemplateVersionId(event.target.value)
        }
        value={templateVersionId}
      >
        <option value="">
          Select published Waiver / Permission Form
        </option>

        {versions.map((version) => (
          <option
            key={version.versionId}
            value={version.versionId}
          >
            {version.label}
          </option>
        ))}
      </select>
    </>
  );
}

export function EventPermissionSlipForm({
  eventId,
  requirement,
  versions,
}: {
  eventId: string;
  requirement: EventPermissionSlipRequirement;
  versions: Array<{
    versionId: string;
    label: string;
  }>;
}) {
  const [state, action, pending] = useActionState(
    setEventPermissionSlipRequirementAction,
    { success: false },
  );

  return (
    <section className="space-y-4 rounded-xl border border-sky-200 bg-sky-50/50 p-5">
      <div>
        <p className="text-sm font-semibold text-sky-700">
          Event documentation
        </p>

        <h2 className="text-xl font-bold">
          Waiver / Permission Form
        </h2>

        <p className="text-sm text-slate-600">
          Use this only when an event, activity, or venue requires
          an additional waiver or permission form. The selected
          published version is pinned to this Event. Changing or
          removing it archives the prior requirement and retains
          history.
        </p>
      </div>

      <form
        action={action}
        className="grid gap-3 md:grid-cols-[12rem_1fr_auto]"
      >
        <input
          name="eventId"
          type="hidden"
          value={eventId}
        />

        <RequirementControls
          key={`${requirement.required}:${requirement.templateVersionId ?? "none"}`}
          requirement={requirement}
          versions={versions}
        />

        <button
          className="min-h-11 rounded-lg bg-sky-700 px-4 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending}
        >
          {pending ? "Saving…" : "Save requirement"}
        </button>

        {state.message ? (
          <p className="text-sm md:col-span-3">
            {state.message}
          </p>
        ) : null}
      </form>

      {requirement.required &&
      requirement.templateVersionId ? (
        <a
          className="font-semibold text-sky-800"
          href={`/api/forms/templates/${requirement.templateVersionId}/download`}
        >
          View, download, or print assigned blank waiver /
          permission form
        </a>
      ) : null}
    </section>
  );
}
