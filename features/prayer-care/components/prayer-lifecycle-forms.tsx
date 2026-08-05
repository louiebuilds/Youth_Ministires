"use client";

import { useActionState } from "react";
import { answerPrayerRequestAction, archivePrayerRequestAction, type PrayerCareActionState } from "@/features/prayer-care/actions/prayer-care-actions";

const initialState: PrayerCareActionState = { success: false };

export function PrayerLifecycleForms({ prayerRequestId, status }: Readonly<{ prayerRequestId: string; status: "active" | "answered" | "archived" }>) {
  const [answerState, answerAction, answering] = useActionState(answerPrayerRequestAction, initialState);
  const [archiveState, archiveAction, archiving] = useActionState(archivePrayerRequestAction, initialState);
  return <div className="mt-5 space-y-4 border-t border-slate-200 pt-4">
    {status === "active" ? <form action={answerAction} className="space-y-3">
      <input name="prayerRequestId" type="hidden" value={prayerRequestId} />
      <label className="block text-sm font-semibold">Answered-prayer summary
        <textarea className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2" maxLength={5000} name="answerSummary" required />
      </label>
      <button className="min-h-11 rounded-lg bg-emerald-700 px-4 font-semibold text-white" disabled={answering}>{answering ? "Saving…" : "Mark answered"}</button>
    </form> : null}
    {status === "answered" ? <form action={archiveAction}>
      <input name="prayerRequestId" type="hidden" value={prayerRequestId} />
      <button className="min-h-11 rounded-lg border border-slate-400 px-4 font-semibold text-slate-800" disabled={archiving}>{archiving ? "Archiving…" : "Archive answered request"}</button>
    </form> : null}
    {[answerState.message, archiveState.message].filter(Boolean).map((message) => <p className="text-sm" key={message}>{message}</p>)}
  </div>;
}
