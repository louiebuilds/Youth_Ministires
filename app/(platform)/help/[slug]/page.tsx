import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireCapability } from "@/features/auth/services/authorization-service";
import {
  findHelpGuide,
  helpGuides,
} from "@/features/help/data/help-guides";

type GuidePageProps = Readonly<{
  params: Promise<{ slug: string }>;
}>;

export function generateStaticParams() {
  return helpGuides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({
  params,
}: GuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = findHelpGuide(slug);

  return {
    title: guide?.title ?? "Guide not found",
  };
}

export default async function GuidePage({ params }: GuidePageProps) {
  await requireCapability("help.view");

  const { slug } = await params;
  const guide = findHelpGuide(slug);

  if (!guide) {
    notFound();
  }

  return (
    <article className="mx-auto max-w-4xl space-y-8">
      <header>
        <Link
          className="inline-flex min-h-11 items-center font-semibold text-sky-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
          href="/help"
        >
          ← Back to Help & Guide
        </Link>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-sky-50 px-2.5 py-1 text-sky-800">
            {guide.category}
          </span>
          <span className="rounded-full bg-slate-200 px-2.5 py-1 text-slate-700">
            Audience: {guide.audience.join(", ")}
          </span>
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          {guide.title}
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-600 sm:text-lg">
          {guide.summary}
        </p>
      </header>

      <div className="space-y-5">
        {guide.sections.map((section, index) => (
          <section
            aria-labelledby={`guide-section-${index + 1}`}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            key={section.title}
          >
            <h2
              className="text-xl font-bold text-slate-950"
              id={`guide-section-${index + 1}`}
            >
              {index + 1}. {section.title}
            </h2>
            {section.note ? (
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {section.note}
              </p>
            ) : null}
            <ul className="mt-4 list-disc space-y-2 pl-5 leading-7 text-slate-700 marker:text-sky-700">
              {section.steps.map((step) => (
                <li className="pl-1" key={step}>
                  {step}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </article>
  );
}
