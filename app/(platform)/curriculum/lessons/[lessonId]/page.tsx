import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { requireCapability } from "@/features/auth/services/authorization-service";
import {
  ArchiveLessonForm,
  LessonForm,
} from "@/features/curriculum/components/lesson-form";
import { getLessonWorkspace } from "@/features/curriculum/services/curriculum-service";
import { listLessonTeachingResources } from "@/features/curriculum/services/curriculum-service";
import { TeachingResources } from "@/features/curriculum/components/teaching-resources";

export const metadata: Metadata = { title: "Lesson Workspace" };

export default async function LessonWorkspacePage({
  params,
}: Readonly<{ params: Promise<{ lessonId: string }> }>) {
  await requireCapability("curriculum.view");
  const lessonId = z.string().uuid().safeParse((await params).lessonId);
  if (!lessonId.success) notFound();
  const [lesson, resources] = await Promise.all([
    getLessonWorkspace(lessonId.data),
    listLessonTeachingResources(lessonId.data),
  ]);
  if (!lesson) notFound();
  return (
    <div className="space-y-8">
      <header>
        <Link className="text-sm font-semibold text-sky-700" href="/curriculum">
          ← Back to curriculum
        </Link>
        <div className="mt-3 flex flex-wrap justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-sky-700">
              {lesson.audience || "Ministry lesson"}
            </p>
            <h1 className="mt-1 text-3xl font-bold">{lesson.title}</h1>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold">
            {lesson.status}
          </span>
        </div>
      </header>
      <TeachingResources canManage={lesson.canManage}
        lessonId={lesson.lessonId} resources={resources} />
      {!lesson.canManage ? (
        <div className="space-y-5">
          {[
            ["Summary", lesson.summary],
            ["Teaching objective", lesson.teachingObjective],
            ["Scripture references", lesson.scriptureReferences],
            ["Lesson body / teaching notes", lesson.lessonBody],
            ["Discussion guide", lesson.discussionGuide],
            ["Preparation notes", lesson.preparationNotes],
          ].map(([label, value]) => (
            <section className="rounded-xl border border-slate-200 bg-white p-5"
              key={label}>
              <h2 className="text-lg font-bold">{label}</h2>
              <p className="mt-2 whitespace-pre-wrap text-slate-700">
                {value || "Not recorded."}
              </p>
            </section>
          ))}
        </div>
      ) : null}
      {lesson.canManage && lesson.status !== "archived" ? (
        <section className="space-y-6 rounded-xl border border-sky-200 bg-sky-50/50 p-5">
          <h2 className="text-xl font-bold">Edit lesson</h2>
          <LessonForm lesson={lesson} />
          <div className="border-t border-sky-200 pt-5">
            <ArchiveLessonForm lessonId={lesson.lessonId} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
