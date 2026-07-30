import type { Metadata } from "next";
import Link from "next/link";

import { requireCapability } from "@/features/auth/services/authorization-service";
import {
  listCurriculumPlans,
  listLessonLibrary,
} from "@/features/curriculum/services/curriculum-service";

import type { LessonStatus } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Curriculum" };
const statuses: LessonStatus[] = ["draft", "published", "archived"];

export default async function CurriculumPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const account = await requireCapability("curriculum.view");
  const params = await searchParams;
  const search = typeof params.q === "string" && params.q.trim().length <= 100
    ? params.q.trim() || null : null;
  const status = typeof params.status === "string" &&
    statuses.includes(params.status as LessonStatus)
    ? params.status as LessonStatus : null;
  const [lessons, plans] = await Promise.all([
    listLessonLibrary({ search, status }),
    listCurriculumPlans({ search, status: null }),
  ]);
  const canManage = [
    "platform_administrator", "youth_pastor", "staff_member",
  ].includes(account.role);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-sky-700">Teaching ministry</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">
            Curriculum & Lessons
          </h1>
          <p className="mt-2 text-slate-600">
            Ministry-only lessons, discussion guides, and teaching resources.
          </p>
        </div>
        {canManage ? <div className="flex flex-wrap gap-3">
          <Link className="inline-flex min-h-11 items-center rounded-lg border border-sky-700 px-5 font-semibold text-sky-800"
            href="/curriculum/plans/new">Create plan</Link>
          <Link className="inline-flex min-h-11 items-center rounded-lg bg-sky-700 px-5 font-semibold text-white"
            href="/curriculum/lessons/new">Create lesson</Link>
        </div> : null}
      </header>
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <form className="grid gap-4 md:grid-cols-3" method="get">
          <label className="text-sm font-semibold">Search
            <input className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3"
              defaultValue={search ?? ""} maxLength={100} name="q"
              placeholder="Title, scripture, audience" />
          </label>
          <label className="text-sm font-semibold">Status
            <select className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3"
              defaultValue={status ?? ""} name="status">
              <option value="">All visible</option>
              {statuses.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <button className="min-h-11 self-end rounded-lg bg-slate-900 px-4 font-semibold text-white">
            Search lessons
          </button>
        </form>
      </section>
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Curriculum plans</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((plan) => (
            <Link className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-sky-300"
              href={`/curriculum/plans/${plan.curriculumPlanId}`}
              key={plan.curriculumPlanId}>
              <div className="flex justify-between gap-3">
                <h3 className="text-xl font-bold">{plan.title}</h3>
                <span className="text-sm font-semibold">
                  {plan.curriculumStatus}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                {plan.summary || "No summary recorded."}
              </p>
              <p className="mt-3 text-sm text-slate-500">
                {plan.lessonCount} lessons
                {plan.audience ? ` · ${plan.audience}` : ""}
              </p>
            </Link>
          ))}
          {!plans.length ? <p className="text-sm text-slate-600">
            No visible curriculum plans.
          </p> : null}
        </div>
      </section>
      <h2 className="text-2xl font-bold">Lesson library</h2>
      <section className="grid gap-4 md:grid-cols-2">
        {lessons.map((lesson) => (
          <Link className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-sky-300"
            href={`/curriculum/lessons/${lesson.lessonId}`} key={lesson.lessonId}>
            <div className="flex justify-between gap-3">
              <h2 className="text-xl font-bold">{lesson.title}</h2>
              <span className="text-sm font-semibold">{lesson.lessonStatus}</span>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {lesson.summary || "No summary recorded."}
            </p>
            <p className="mt-3 text-sm text-slate-500">
              {[lesson.scriptureReferences, lesson.audience].filter(Boolean).join(" · ")
                || "No scripture or audience recorded"}
            </p>
          </Link>
        ))}
        {!lessons.length ? (
          <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-500">
            No visible lessons match this search.
          </p>
        ) : null}
      </section>
    </div>
  );
}
