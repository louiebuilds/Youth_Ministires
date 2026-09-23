"use client";

import { useActionState, useMemo, useState } from "react";

import { linkParentAccountAction } from "@/features/members/actions/family-management-actions";
import type { ParentAccountLinkCandidate } from "@/features/members/types/family-management";
import type { FamilyAdult } from "@/features/members/types/family-workspace";

const initialState = { success: false } as const;

export function ParentAccountLinkForm({ adult, householdId, candidates }: Readonly<{
  adult: FamilyAdult;
  householdId: string;
  candidates: ParentAccountLinkCandidate[];
}>) {
  const linked = candidates.filter((candidate) => candidate.linkedPersonId === adult.id);
  const [selectedId, setSelectedId] = useState(linked[0]?.profileId ?? "");
  const selected = useMemo(
    () => candidates.find((candidate) => candidate.profileId === selectedId),
    [candidates, selectedId],
  );
  const requiresRelink = Boolean(selected?.linkedPersonId && selected.linkedPersonId !== adult.id);
  const [state, action, pending] = useActionState(linkParentAccountAction, initialState);

  return (
    <section className="space-y-3 rounded-lg border border-violet-200 bg-violet-50/60 p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
          Parent account access
        </p>
        <p className="mt-1 font-semibold text-slate-950">
          {linked.length === 1
            ? "Parent account linked"
            : linked.length > 1
              ? "Account link requires review"
              : "No parent account linked"}
        </p>
        {linked.map((candidate) => (
          <p className="mt-1 break-all text-sm text-slate-700" key={candidate.profileId}>
            {candidate.accountEmail}
          </p>
        ))}
      </div>

      <details>
        <summary className="cursor-pointer text-sm font-semibold text-violet-800">
          {linked.length ? "Review account link" : "Link parent account"}
        </summary>
        <form action={action} className="mt-4 space-y-4">
          <input name="householdId" type="hidden" value={householdId} />
          <input name="personId" type="hidden" value={adult.id} />
          <label className="block text-sm font-medium text-slate-800">
            Parent account
            <select
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
              name="profileId"
              onChange={(event) => setSelectedId(event.target.value)}
              required
              value={selectedId}
            >
              <option value="">Select an account</option>
              {candidates.map((candidate) => (
                <option key={candidate.profileId} value={candidate.profileId}>
                  {candidate.accountEmail} · {candidate.displayName} · {candidate.accountStatus}
                </option>
              ))}
            </select>
          </label>

          {selected ? (
            <div className="space-y-1 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
              <p>Email comparison: {selected.emailMatches ? "matches contact" : "does not match contact"}</p>
              <p>Active People using this email: {selected.matchingActivePeopleCount}</p>
              <p>Current Person: {selected.linkedPersonName ?? "Not linked"}</p>
              <p>Current families: {selected.linkedHouseholds.join(", ") || "None"}</p>
              {!selected.emailMatches ? (
                <p className="font-semibold text-amber-800">
                  Email is advisory only. Verify identity before linking.
                </p>
              ) : null}
              {selected.matchingActivePeopleCount > 1 ? (
                <p className="font-semibold text-amber-800">
                  Multiple active People use this email. Confirm the intended identity carefully.
                </p>
              ) : null}
            </div>
          ) : null}

          {requiresRelink ? (
            <label className="flex items-start gap-2 text-sm font-medium text-red-800">
              <input className="mt-1" name="confirmRelink" required type="checkbox" />
              I confirm this account should be moved from its current Person to this responsible adult.
            </label>
          ) : null}

          <label className="block text-sm font-medium text-slate-800">
            Reason for link or relink
            <textarea className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" maxLength={1000} name="reason" required />
          </label>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input className="mt-1" required type="checkbox" />
            I verified the account holder and selected Person. Email alone is not identity proof.
          </label>
          {state.message ? (
            <p className={state.success ? "text-sm text-emerald-800" : "text-sm text-red-800"}>
              {state.message}
            </p>
          ) : null}
          <button
            className="min-h-11 rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400"
            disabled={pending || !selected || selected.linkedPersonId === adult.id}
          >
            {pending ? "Updating…" : requiresRelink ? "Confirm relink" : "Link account"}
          </button>
        </form>
      </details>
    </section>
  );
}
