import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { requireCapability } from "@/features/auth/services/authorization-service";
import { ArchiveLessonForm, LessonForm, PublishLessonForm } from "@/features/curriculum/components/lesson-form";
import { TeachingResources } from "@/features/curriculum/components/teaching-resources";
import { getLessonWorkspace, listLessonTeachingResources } from "@/features/curriculum/services/curriculum-service";

import type { LessonWorkspace } from "@/features/curriculum/types/curriculum";

export const metadata: Metadata = { title: "Lesson Workspace" };

const sectionSchema = z.enum(["overview", "content", "discussion", "resources", "preparation"]);
type LessonSection = z.infer<typeof sectionSchema>;
const sections: ReadonlyArray<{ id: LessonSection; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "content", label: "Lesson Content" },
  { id: "discussion", label: "Discussion" },
  { id: "resources", label: "Resources" },
  { id: "preparation", label: "Preparation" },
];

function SectionNavigation({ active, lessonId }: Readonly<{ active: LessonSection; lessonId: string }>) {
  return (
    <nav aria-label="Lesson workspace sections" className="overflow-x-auto border-b border-slate-200">
      <div className="flex min-w-max gap-1">
        {sections.map(({ id, label }) => (
          <Link aria-current={active === id ? "page" : undefined}
            className={`min-h-11 border-b-2 px-4 py-3 text-sm font-semibold ${active === id ? "border-sky-700 text-sky-800" : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-950"}`}
            href={id === "overview" ? `/curriculum/lessons/${lessonId}` : `/curriculum/lessons/${lessonId}?section=${id}`}
            key={id}>{label}</Link>
        ))}
      </div>
    </nav>
  );
}

function ReadableSection({ title, value }: Readonly<{ title: string; value: string | null }>) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold text-slate-950">{title}</h2>
      <p className="mt-4 whitespace-pre-wrap leading-7 text-slate-700">{value || "Not recorded."}</p>
    </section>
  );
}

function Overview({ lesson, resourceCount }: Readonly<{ lesson: LessonWorkspace; resourceCount: number }>) {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
        <h2 className="text-xl font-bold text-slate-950">Lesson overview</h2>
        <p className="mt-4 whitespace-pre-wrap leading-7 text-slate-700">{lesson.summary || "No lesson summary has been recorded."}</p>
        <dl className="mt-6 grid gap-5 sm:grid-cols-2">
          <div><dt className="text-sm font-semibold text-slate-500">Teaching objective</dt>
            <dd className="mt-1 whitespace-pre-wrap text-slate-800">{lesson.teachingObjective || "Not recorded."}</dd></div>
          <div><dt className="text-sm font-semibold text-slate-500">Scripture references</dt>
            <dd className="mt-1 whitespace-pre-wrap text-slate-800">{lesson.scriptureReferences || "Not recorded."}</dd></div>
        </dl>
      </section>
      <aside className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="font-bold text-slate-950">At a glance</h2>
        <dl className="mt-4 space-y-4 text-sm">
          <div><dt className="text-slate-500">Resources</dt><dd className="font-semibold">{resourceCount}</dd></div>
          <div><dt className="text-slate-500">Preparation notes</dt><dd className="font-semibold">{lesson.preparationNotes ? "Available" : "Not recorded"}</dd></div>
          <div><dt className="text-slate-500">Discussion guide</dt><dd className="font-semibold">{lesson.discussionGuide ? "Available" : "Not recorded"}</dd></div>
        </dl>
      </aside>
    </div>
  );
}

export default async function LessonWorkspacePage({ params, searchParams }: Readonly<{
  params: Promise<{ lessonId: string }>;
  searchParams: Promise<{ section?: string | string[]; mode?: string | string[] }>;
}>) {
  await requireCapability("curriculum.view");
  const lessonId = z.string().uuid().safeParse((await params).lessonId);
  if (!lessonId.success) notFound();
  const [lesson, resources, query] = await Promise.all([
    getLessonWorkspace(lessonId.data),
    listLessonTeachingResources(lessonId.data),
    searchParams,
  ]);
  if (!lesson) notFound();
  const requested = sectionSchema.safeParse(query.section);
  const active = requested.success ? requested.data : "overview";
  const canEdit = lesson.canManage && lesson.status !== "archived";
  const editing = canEdit && query.mode === "edit";

  return (
    <div className="space-y-6">
      <header>
        <Link className="text-sm font-semibold text-sky-700" href="/curriculum">← Back to curriculum</Link>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-sky-700">{lesson.audience || "Ministry lesson"}</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-950">{lesson.title}</h1>
            <span className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold capitalize">{lesson.status}</span>
          </div>
          {canEdit ? <div className="flex flex-wrap gap-3">
            {lesson.status === "draft" ? <PublishLessonForm lesson={lesson} /> : null}
            <Link className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-4 font-semibold text-slate-800"
              href={`/curriculum/lessons/${lesson.lessonId}?mode=edit`}>Edit lesson</Link>
          </div> : null}
        </div>
      </header>

      <SectionNavigation active={active} lessonId={lesson.lessonId} />

      {editing ? <div className="space-y-6">
        <section className="rounded-xl border border-sky-200 bg-sky-50/40 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-sm font-semibold text-sky-700">Lesson settings</p><h2 className="mt-1 text-xl font-bold">Edit lesson</h2></div>
            <Link className="font-semibold text-sky-800" href={`/curriculum/lessons/${lesson.lessonId}`}>Cancel editing</Link>
          </div>
          <div className="mt-6"><LessonForm lesson={lesson} /></div>
        </section>
        <section className="rounded-xl border border-red-200 bg-red-50/50 p-5">
          <p className="text-sm font-semibold text-red-700">Destructive action</p>
          <h2 className="mt-1 text-xl font-bold">Archive lesson</h2>
          <div className="mt-4"><ArchiveLessonForm lessonId={lesson.lessonId} /></div>
        </section>
      </div> : <>
        {active === "overview" ? <Overview lesson={lesson} resourceCount={resources.length} /> : null}
        {active === "content" ? <ReadableSection title="Lesson content" value={lesson.lessonBody} /> : null}
        {active === "discussion" ? <ReadableSection title="Discussion guide" value={lesson.discussionGuide} /> : null}
        {active === "resources" ? <TeachingResources canManage={canEdit} lessonId={lesson.lessonId} resources={resources} /> : null}
        {active === "preparation" ? <ReadableSection title="Preparation notes" value={lesson.preparationNotes} /> : null}
      </>}
    </div>
  );
}
