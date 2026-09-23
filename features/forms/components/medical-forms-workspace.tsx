"use client";

import { useActionState } from "react";
import { setSchoolYearMedicalRequirementAction } from "@/features/forms/actions/medical-permission-actions";
import type { MedicalFormStatus } from "@/features/forms/types/medical-permission";
import type { DocumentTemplateVersionSummary } from "@/features/forms/types/document-templates";

export function MedicalFormsWorkspace({ statuses, versions }: { statuses: MedicalFormStatus[]; versions: Array<DocumentTemplateVersionSummary & { templateName: string }> }) {
  const [state, action, pending] = useActionState(setSchoolYearMedicalRequirementAction, { success: false });
  const year = new Date().getMonth() >= 7 ? new Date().getFullYear() : new Date().getFullYear() - 1;
  return <section className="space-y-5 rounded-xl border border-amber-200 bg-amber-50/40 p-5">
    <div><p className="text-sm font-semibold text-amber-800">Protected medical records</p><h2 className="text-xl font-bold">Current school-year Medical Forms</h2><p className="text-sm text-slate-600">Status and completed documents are restricted to the Platform Administrator and Youth Pastor. Medical details do not appear here.</p></div>
    <form action={action} className="grid gap-3 md:grid-cols-[12rem_1fr_auto]">
      <input className="min-h-11 rounded-lg border px-3" name="schoolYearStart" type="date" defaultValue={`${year}-08-01`} required />
      <select className="min-h-11 rounded-lg border px-3" name="templateVersionId" required defaultValue=""><option value="" disabled>Select published Medical Release</option>{versions.filter((v) => v.status === "published").map((v) => <option key={v.versionId} value={v.versionId}>{v.templateName} v{v.versionNumber}</option>)}</select>
      <button className="min-h-11 rounded-lg bg-amber-800 px-4 font-semibold text-white" disabled={pending}>{pending ? "Saving…" : "Set current form"}</button>
      {state.message ? <p className="md:col-span-3 text-sm">{state.message}</p> : null}
    </form>
    <div className="grid gap-3 md:grid-cols-2">{statuses.map((item) => <article className="rounded-lg border bg-white p-4" key={item.studentId}><div className="flex justify-between gap-3"><strong>{item.studentName}</strong><span className={item.ready ? "font-semibold text-emerald-700" : "font-semibold text-amber-800"}>{item.ready ? "CURRENT" : "ACTION NEEDED"}</span></div><p className="mt-1 text-sm text-slate-600">{item.schoolYearStart} through {item.schoolYearEnd}</p>{item.submissionId ? <a className="mt-2 inline-block font-semibold text-sky-800" href={`/api/forms/submissions/${item.submissionId}/download`}>View or print completed form</a> : null}</article>)}</div>
  </section>;
}
