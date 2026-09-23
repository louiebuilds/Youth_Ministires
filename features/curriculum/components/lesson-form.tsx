"use client";

import { useActionState } from "react";

import {
  archiveLessonAction,
  createLessonAction,
  updateLessonAction,
} from "@/features/curriculum/actions/curriculum-actions";

import type {
  CurriculumActionState,
  LessonWorkspace,
} from "@/features/curriculum/types/curriculum";

const initialState: CurriculumActionState = { success: false };
const inputClass =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950";

export function LessonForm({
  lesson,
}: Readonly<{ lesson?: LessonWorkspace }>) {
  const [state, action, pending] = useActionState(
    lesson ? updateLessonAction : createLessonAction,
    initialState,
  );
  return (
    <form action={action} className="space-y-5">
      {lesson ? <input name="lessonId" type="hidden" value={lesson.lessonId} /> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold">Lesson title
          <input className={inputClass} defaultValue={lesson?.title ?? ""}
            maxLength={200} name="title" required />
        </label>
        <label className="text-sm font-semibold">Status
          <select className={inputClass} defaultValue={lesson?.status ?? "draft"}
            name="status">
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </label>
        <label className="text-sm font-semibold">Audience
          <input className={inputClass} defaultValue={lesson?.audience ?? ""}
            maxLength={150} name="audience" placeholder="Grades 6–8" />
        </label>
        <label className="text-sm font-semibold">Scripture references
          <input className={inputClass}
            defaultValue={lesson?.scriptureReferences ?? ""}
            maxLength={1000} name="scriptureReferences" />
        </label>
      </div>
      <label className="block text-sm font-semibold">Summary
        <textarea className={inputClass} defaultValue={lesson?.summary ?? ""}
          maxLength={4000} name="summary" rows={3} />
      </label>
      <label className="block text-sm font-semibold">Teaching objective
        <textarea className={inputClass}
          defaultValue={lesson?.teachingObjective ?? ""}
          maxLength={2000} name="teachingObjective" rows={3} />
      </label>
      <label className="block text-sm font-semibold">Lesson body / teaching notes
        <textarea className={inputClass} defaultValue={lesson?.lessonBody ?? ""}
          maxLength={50000} name="lessonBody" rows={10} />
      </label>
      <label className="block text-sm font-semibold">Discussion guide
        <textarea className={inputClass}
          defaultValue={lesson?.discussionGuide ?? ""}
          maxLength={20000} name="discussionGuide" rows={7} />
      </label>
      <label className="block text-sm font-semibold">Preparation notes
        <textarea className={inputClass}
          defaultValue={lesson?.preparationNotes ?? ""}
          maxLength={10000} name="preparationNotes" rows={4} />
      </label>
      {state.message ? (
        <p className={`rounded-lg border p-3 text-sm font-semibold ${
          state.success
            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
            : "border-red-200 bg-red-50 text-red-800"
        }`}>{state.message}</p>
      ) : null}
      <button className="min-h-11 rounded-lg bg-sky-700 px-5 font-semibold text-white disabled:opacity-60"
        disabled={pending}>
        {pending ? "Saving…" : lesson ? "Save lesson" : "Create lesson"}
      </button>
    </form>
  );
}

export function PublishLessonForm({
  lesson,
}: Readonly<{ lesson: LessonWorkspace }>) {
  const [state, action, pending] = useActionState(
    updateLessonAction,
    initialState,
  );
  return (
    <form action={action} className="space-y-2">
      <input name="lessonId" type="hidden" value={lesson.lessonId} />
      <input name="title" type="hidden" value={lesson.title} />
      <input name="summary" type="hidden" value={lesson.summary ?? ""} />
      <input name="teachingObjective" type="hidden"
        value={lesson.teachingObjective ?? ""} />
      <input name="scriptureReferences" type="hidden"
        value={lesson.scriptureReferences ?? ""} />
      <input name="lessonBody" type="hidden" value={lesson.lessonBody ?? ""} />
      <input name="discussionGuide" type="hidden"
        value={lesson.discussionGuide ?? ""} />
      <input name="preparationNotes" type="hidden"
        value={lesson.preparationNotes ?? ""} />
      <input name="audience" type="hidden" value={lesson.audience ?? ""} />
      <input name="status" type="hidden" value="published" />
      <button className="min-h-11 rounded-lg bg-sky-700 px-4 font-semibold text-white disabled:opacity-60"
        disabled={pending}>
        {pending ? "Publishing…" : "Publish lesson"}
      </button>
      {state.message ? <p className={`max-w-60 text-sm font-semibold ${
        state.success ? "text-emerald-700" : "text-red-700"
      }`}>{state.message}</p> : null}
    </form>
  );
}

export function ArchiveLessonForm({
  lessonId,
}: Readonly<{ lessonId: string }>) {
  const [state, action, pending] = useActionState(
    archiveLessonAction,
    initialState,
  );
  return (
    <form action={action} className="space-y-3">
      <input name="lessonId" type="hidden" value={lessonId} />
      <p className="text-sm text-slate-600">
        Archived lessons remain in ministry history and cannot be edited.
      </p>
      {state.message ? <p className="text-sm font-semibold text-red-700">
        {state.message}
      </p> : null}
      <button className="min-h-11 rounded-lg border border-red-300 bg-white px-4 font-semibold text-red-800"
        disabled={pending}>
        {pending ? "Archiving…" : "Archive lesson"}
      </button>
    </form>
  );
}
