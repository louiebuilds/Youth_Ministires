import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { requireCapability } from "@/features/auth/services/authorization-service";
import {
  ArchiveCurriculumPlanForm,
  CurriculumPlanForm,
  CurriculumPlanLessons,
} from "@/features/curriculum/components/curriculum-plan-forms";
import {
  getCurriculumPlanWorkspace,
  listCurriculumPlanLessons,
  listLessonLibrary,
} from "@/features/curriculum/services/curriculum-service";

export const metadata: Metadata = { title: "Curriculum Plan" };

export default async function CurriculumPlanPage({
  params,
}: Readonly<{ params: Promise<{ planId: string }> }>) {
  await requireCapability("curriculum.view");
  const planId = z.string().uuid().safeParse((await params).planId);
  if (!planId.success) notFound();
  const [plan, planLessons] = await Promise.all([
    getCurriculumPlanWorkspace(planId.data),
    listCurriculumPlanLessons(planId.data),
  ]);
  if (!plan) notFound();
  const allLessons = plan.canManage
    ? await listLessonLibrary({ search: null, status: null })
    : [];
  const selectedIds = new Set(planLessons.map((lesson) => lesson.lessonId));
  const availableLessons = allLessons.filter(
    (lesson) => lesson.lessonStatus !== "archived" &&
      !selectedIds.has(lesson.lessonId),
  );
  return (
    <div className="space-y-8">
      <header>
        <Link className="text-sm font-semibold text-sky-700" href="/curriculum">
          ← Back to curriculum
        </Link>
        <div className="mt-3 flex flex-wrap justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-sky-700">
              {plan.audience || "Curriculum plan"}
            </p>
            <h1 className="mt-1 text-3xl font-bold">{plan.title}</h1>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold">
            {plan.status}
          </span>
        </div>
        <p className="mt-3 whitespace-pre-wrap text-slate-700">
          {plan.summary || "No summary recorded."}
        </p>
      </header>
      {plan.canManage && plan.status !== "archived" ? (
        <>
          <CurriculumPlanLessons availableLessons={availableLessons}
            curriculumPlanId={plan.curriculumPlanId}
            planLessons={planLessons} />
          <section className="space-y-6 rounded-xl border border-sky-200 bg-sky-50/50 p-5">
            <h2 className="text-xl font-bold">Edit plan</h2>
            <CurriculumPlanForm plan={plan} />
            <div className="border-t border-sky-200 pt-5">
              <ArchiveCurriculumPlanForm
                curriculumPlanId={plan.curriculumPlanId} />
            </div>
          </section>
        </>
      ) : (
        <ol className="space-y-3">
          {planLessons.map((lesson) => (
            <li className="rounded-xl border border-slate-200 bg-white p-5"
              key={lesson.planLessonId}>
              <p className="text-sm font-semibold text-sky-700">
                Lesson {lesson.sequenceNumber}
              </p>
              <Link className="mt-1 block text-xl font-bold"
                href={`/curriculum/lessons/${lesson.lessonId}`}>
                {lesson.lessonTitle}
              </Link>
              <p className="mt-2 text-sm text-slate-600">
                {[lesson.scriptureReferences, lesson.audience]
                  .filter(Boolean).join(" · ")}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
