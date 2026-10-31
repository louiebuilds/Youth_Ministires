"use client";

import { useActionState } from "react";
import { completeEventAction, reopenEventAction, reopenLegacyEventAction } from "@/features/events/actions/event-management-actions";
import type { EventActionState } from "@/features/events/types/event-management";

const initialState: EventActionState = { success: false };

export function EventLifecycleForm({ eventId, mode }: Readonly<{ eventId: string; mode: "complete" | "reopen" | "legacy-reopen" }>) {
  const [state, action, pending] = useActionState(mode === "complete" ? completeEventAction : mode === "legacy-reopen" ? reopenLegacyEventAction : reopenEventAction, initialState);
  const completing = mode === "complete";
  return (
    <form action={action} className="space-y-3" onSubmit={(event) => {
      if (!window.confirm(completing
        ? "Complete this event? Ordinary editing will be locked until it is reopened."
        : mode === "legacy-reopen" ? "Reopen this legacy event with your selected status? The previous status is unknown." : "Reopen this event? Its prior publication state will be restored.")) event.preventDefault();
    }}>
      <input name="eventId" type="hidden" value={eventId} />
      {mode === "legacy-reopen" ? <div className="space-y-2">
        <p className="text-sm text-amber-900">Legacy Completed record: its previous status and completion details are unknown. Review access before selecting Published or Active, which makes this event visible to parents.</p>
        <label className="block text-sm font-semibold" htmlFor="legacy-target-status">Reopen with status</label>
        <select id="legacy-target-status" name="targetStatus" required defaultValue="" className="min-h-11 rounded-lg border bg-white px-3" disabled={pending}>
          <option value="" disabled>Select a status</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="active">Active</option>
        </select>
      </div> : null}
      {state.message ? <p className={`text-sm font-semibold ${state.success ? "text-emerald-800" : "text-red-700"}`} role="status">{state.message}</p> : null}
      <button className={completing
        ? "min-h-11 rounded-lg bg-emerald-700 px-4 font-semibold text-white disabled:opacity-60"
        : "min-h-11 rounded-lg border border-amber-400 bg-white px-4 font-semibold text-amber-900 disabled:opacity-60"} disabled={pending}>
        {pending ? "Saving…" : completing ? "Complete event" : "Reopen event"}
      </button>
    </form>
  );
}
