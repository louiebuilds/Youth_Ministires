"use client";

import { useActionState } from "react";

import {
  createAttendanceSessionAction,
  finalizeAttendanceSessionAction,
  saveAttendanceRecordAction,
} from "@/features/attendance/actions/attendance-management-actions";

import type {
  AttendanceEvent,
  AttendanceRosterEntry,
} from "@/features/attendance/types/attendance-management";

const initialState = { success: false } as const;
const inputClass = "mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-sky-600 focus:ring-3 focus:ring-sky-100";

function Message({ state }: Readonly<{ state: { success: boolean; message?: string } }>) {
  return state.message ? <p className={`rounded-lg border px-3 py-2 text-sm ${state.success ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-800"}`}>{state.message}</p> : null;
}

export function CreateAttendanceSessionForm({ events }: Readonly<{ events: AttendanceEvent[] }>) {
  const [state, action, pending] = useActionState(createAttendanceSessionAction, initialState);
  return <form action={action} className="grid gap-4 rounded-xl border border-sky-200 bg-sky-50/50 p-5 md:grid-cols-2">
    <label className="text-sm font-medium text-slate-800">Existing event<select className={inputClass} name="eventId" required><option value="">Select an event</option>{events.map((event) => <option key={event.eventId} value={event.eventId}>{event.eventName} · {new Date(event.startsAt).toLocaleDateString()}</option>)}</select></label>
    <label className="text-sm font-medium text-slate-800">Session date<input className={inputClass} name="sessionDate" required type="date" /></label>
    <label className="text-sm font-medium text-slate-800 md:col-span-2">Class or group<input className={inputClass} maxLength={100} name="className" placeholder="Grade 8 Small Group" required /></label>
    <label className="text-sm font-medium text-slate-800">Starts (optional)<input className={inputClass} name="startsAt" type="datetime-local" /></label>
    <label className="text-sm font-medium text-slate-800">Ends (optional)<input className={inputClass} name="endsAt" type="datetime-local" /></label>
    <div className="space-y-3 md:col-span-2"><p className="text-xs text-slate-500">Attendance uses existing events. Event creation remains Milestone 9.</p><Message state={state} /><button className="min-h-11 rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400" disabled={pending || events.length === 0}>{pending ? "Creating…" : events.length === 0 ? "No authorized events" : "Create attendance session"}</button></div>
  </form>;
}

export function AttendanceRecordForm({ entry, finalized, sessionId }: Readonly<{ entry: AttendanceRosterEntry; finalized: boolean; sessionId: string }>) {
  const [state, action, pending] = useActionState(saveAttendanceRecordAction, initialState);
  return <form action={action} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <input name="sessionId" type="hidden" value={sessionId} /><input name="studentId" type="hidden" value={entry.studentId} />
    <div><h3 className="font-semibold text-slate-950">{entry.displayName}</h3><p className="text-sm text-slate-600">Grade {entry.grade} · {entry.householdName}</p></div>
    <label className="block text-sm font-medium text-slate-800">Status<select className={inputClass} defaultValue={entry.attendanceStatus} disabled={finalized} name="status"><option value="pending">Pending</option><option value="present">Present</option><option value="absent">Absent</option><option value="excused">Excused</option></select></label>
    <label className="block text-sm font-medium text-slate-800">Notes<textarea className={inputClass} defaultValue={entry.notes ?? ""} disabled={finalized} maxLength={1000} name="notes" rows={2} /></label>
    {entry.correctedAt ? <p className="text-xs text-amber-700">Corrected {new Date(entry.correctedAt).toLocaleString()}</p> : null}
    <Message state={state} />{!finalized ? <button className="min-h-11 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400" disabled={pending}>{pending ? "Saving…" : entry.attendanceRecordId ? "Save correction" : "Save attendance"}</button> : null}
  </form>;
}

export function FinalizeAttendanceForm({ sessionId }: Readonly<{ sessionId: string }>) {
  const [state, action, pending] = useActionState(finalizeAttendanceSessionAction, initialState);
  return <form action={action} className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-5"><input name="sessionId" type="hidden" value={sessionId} /><h2 className="text-lg font-semibold text-amber-950">Finalize attendance</h2><p className="text-sm text-amber-900">Finalizing locks this session against additional changes. Corrections after finalization require a future authorized reopening workflow.</p><Message state={state} /><button className="min-h-11 rounded-lg bg-amber-800 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400" disabled={pending}>{pending ? "Finalizing…" : "Finalize session"}</button></form>;
}
