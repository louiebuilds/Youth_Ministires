"use client";

import { useActionState } from "react";

import {
  addLessonToCurriculumPlanAction,
  archiveCurriculumPlanAction,
  createCurriculumPlanAction,
  removeLessonFromCurriculumPlanAction,
  updateCurriculumPlanAction,
} from "@/features/curriculum/actions/curriculum-actions";

import type {
  CurriculumActionState,
  CurriculumPlanLesson,
  CurriculumPlanWorkspace,
  LessonLibraryEntry,
} from "@/features/curriculum/types/curriculum";

const initialState: CurriculumActionState = { success: false };
const inputClass =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";

function Message({ state }: Readonly<{ state: CurriculumActionState }>) {
  return state.message ? (
    <p className={`text-sm font-semibold ${
      state.success ? "text-emerald-700" : "text-red-700"
    }`}>{state.message}</p>
  ) : null;
}

export function CurriculumPlanForm({
  plan,
}: Readonly<{ plan?: CurriculumPlanWorkspace }>) {
  const [state, action, pending] = useActionState(
    plan ? updateCurriculumPlanAction : createCurriculumPlanAction,
    initialState,
  );
  return (
    <form action={action} className="space-y-5">
      {plan ? <input name="curriculumPlanId" type="hidden"
        value={plan.curriculumPlanId} /> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold">Plan title
          <input className={inputClass} defaultValue={plan?.title ?? ""}
            maxLength={200} name="title" required />
        </label>
        <label className="text-sm font-semibold">Status
          <select className={inputClass} defaultValue={plan?.status ?? "draft"}
            name="status">
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="completed">Completed</option>
          </select>
        </label>
        <label className="text-sm font-semibold">Audience
          <input className={inputClass} defaultValue={plan?.audience ?? ""}
            maxLength={150} name="audience" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-semibold">Starts
            <input className={inputClass} defaultValue={plan?.startsOn ?? ""}
              name="startsOn" type="date" />
          </label>
          <label className="text-sm font-semibold">Ends
            <input className={inputClass} defaultValue={plan?.endsOn ?? ""}
              name="endsOn" type="date" />
          </label>
        </div>
      </div>
      <label className="block text-sm font-semibold">Summary
        <textarea className={inputClass} defaultValue={plan?.summary ?? ""}
          maxLength={4000} name="summary" rows={4} />
      </label>
      <Message state={state} />
      <button className="min-h-11 rounded-lg bg-sky-700 px-5 font-semibold text-white"
        disabled={pending}>
        {pending ? "Saving…" : plan ? "Save plan" : "Create plan"}
      </button>
    </form>
  );
}

function PlanLessonRow({
  curriculumPlanId,
  lesson,
}: Readonly<{
  curriculumPlanId: string;
  lesson: CurriculumPlanLesson;
}>) {
  const [state, action, pending] = useActionState(
    removeLessonFromCurriculumPlanAction,
    initialState,
  );
  return (
    <li className="rounded-lg border border-slate-200 p-4">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-sky-700">
            Lesson {lesson.sequenceNumber}
          </p>
          <h3 className="font-bold">{lesson.lessonTitle}</h3>
          <p className="text-sm text-slate-600">
            {[lesson.scriptureReferences, lesson.audience].filter(Boolean).join(" · ")}
          </p>
        </div>
        <form action={action}>
          <input name="curriculumPlanId" type="hidden"
            value={curriculumPlanId} />
          <input name="planLessonId" type="hidden" value={lesson.planLessonId} />
          <button className="min-h-11 rounded-lg border border-red-300 px-3 font-semibold text-red-800"
            disabled={pending}>Remove</button>
        </form>
      </div>
      <Message state={state} />
    </li>
  );
}

export function CurriculumPlanLessons({
  availableLessons,
  curriculumPlanId,
  planLessons,
}: Readonly<{
  availableLessons: LessonLibraryEntry[];
  curriculumPlanId: string;
  planLessons: CurriculumPlanLesson[];
}>) {
  const [state, action, pending] = useActionState(
    addLessonToCurriculumPlanAction,
    initialState,
  );
  return (
    <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-xl font-bold">Ordered lessons</h2>
      <form action={action} className="flex flex-wrap items-end gap-3">
        <input name="curriculumPlanId" type="hidden" value={curriculumPlanId} />
        <label className="min-w-72 flex-1 text-sm font-semibold">Add lesson
          <select className={inputClass} name="lessonId" required>
            <option value="">Select a lesson</option>
            {availableLessons.map((lesson) => (
              <option key={lesson.lessonId} value={lesson.lessonId}>
                {lesson.title} · {lesson.lessonStatus}
              </option>
            ))}
          </select>
        </label>
        <button className="min-h-11 rounded-lg bg-slate-900 px-4 font-semibold text-white"
          disabled={pending || !availableLessons.length}>Add lesson</button>
      </form>
      <Message state={state} />
      <ol className="space-y-3">
        {planLessons.map((lesson) => (
          <PlanLessonRow curriculumPlanId={curriculumPlanId}
            key={lesson.planLessonId} lesson={lesson} />
        ))}
      </ol>
      {!planLessons.length ? (
        <p className="text-sm text-slate-600">No lessons added yet.</p>
      ) : null}
    </section>
  );
}

export function ArchiveCurriculumPlanForm({
  curriculumPlanId,
}: Readonly<{ curriculumPlanId: string }>) {
  const [state, action, pending] = useActionState(
    archiveCurriculumPlanAction,
    initialState,
  );
  return (
    <form action={action} className="space-y-3">
      <input name="curriculumPlanId" type="hidden" value={curriculumPlanId} />
      <Message state={state} />
      <button className="min-h-11 rounded-lg border border-red-300 px-4 font-semibold text-red-800"
        disabled={pending}>Archive curriculum plan</button>
    </form>
  );
}
