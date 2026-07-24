"use client";

import { useActionState } from "react";

import {
  createTagAction,
  setChildTagsAction,
} from "@/features/members/actions/child-management-actions";

import type { MemberTag } from "@/features/members/types/member-directory";

const initialState = { success: false } as const;

function Status({ state }: Readonly<{ state: { success: boolean; message?: string } }>) {
  return state.message ? <p className={`rounded-lg border p-3 text-sm ${state.success ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-800"}`}>{state.message}</p> : null;
}

export function ChildTagForms({ studentId, allTags, assignedTagIds }: Readonly<{ studentId: string; allTags: MemberTag[]; assignedTagIds: string[] }>) {
  const [assignmentState, assignmentAction, assignmentPending] = useActionState(setChildTagsAction, initialState);
  const [tagState, tagAction, tagPending] = useActionState(createTagAction, initialState);
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <form action={assignmentAction} className="space-y-4 rounded-lg border border-slate-200 p-4">
        <input name="studentId" type="hidden" value={studentId} />
        <h3 className="font-semibold text-slate-950">Assign tags</h3>
        <div className="space-y-2">
          {allTags.length ? allTags.map((tag) => <label className="flex items-center gap-2 text-sm text-slate-700" key={tag.id}><input defaultChecked={assignedTagIds.includes(tag.id)} name="tagIds" type="checkbox" value={tag.id} /><span className="h-3 w-3 rounded-full" style={{ backgroundColor: tag.color }} />{tag.name}</label>) : <p className="text-sm text-slate-600">No tags have been created.</p>}
        </div>
        <Status state={assignmentState} />
        <button className="min-h-11 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400" disabled={assignmentPending}>{assignmentPending ? "Saving…" : "Save tags"}</button>
      </form>
      <form action={tagAction} className="space-y-4 rounded-lg border border-slate-200 p-4">
        <input name="studentId" type="hidden" value={studentId} />
        <h3 className="font-semibold text-slate-950">Create tag</h3>
        <label className="block text-sm font-medium text-slate-800">Tag name<input className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2" name="name" required /></label>
        <label className="block text-sm font-medium text-slate-800">Color<input className="mt-1 h-11 w-full rounded-lg border border-slate-300 p-1" defaultValue="#475569" name="color" type="color" /></label>
        <Status state={tagState} />
        <button className="min-h-11 rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400" disabled={tagPending}>{tagPending ? "Creating…" : "Create tag"}</button>
      </form>
    </div>
  );
}
