import type { Metadata } from "next";
import Link from "next/link";

import { requireCapability } from "@/features/auth/services/authorization-service";
import { helpGuides } from "@/features/help/data/help-guides";
import { helpGuideCategories } from "@/features/help/types/help-guide";

export const metadata: Metadata = {
  title: "Help & Guide",
};

type HelpSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value : null;
}

export default async function HelpPage({
  searchParams,
}: Readonly<{ searchParams: HelpSearchParams }>) {
  await requireCapability("help.view");

  const params = await searchParams;
  const searchText = (one(params.q) ?? "").trim().slice(0, 100);
  const normalizedSearch = searchText.toLocaleLowerCase();
  const categoryValue = one(params.category);
  const selectedCategory = helpGuideCategories.includes(
    categoryValue as (typeof helpGuideCategories)[number],
  )
    ? categoryValue
    : null;

  const visibleGuides = helpGuides.filter((guide) => {
    const matchesCategory =
      !selectedCategory || guide.category === selectedCategory;
    const searchableText = [
      guide.title,
      guide.summary,
      ...guide.keywords,
    ]
      .join(" ")
      .toLocaleLowerCase();

    return (
      matchesCategory &&
      (!normalizedSearch || searchableText.includes(normalizedSearch))
    );
  });

  const hasActiveFilter = Boolean(searchText || selectedCategory);

  return (
    <div className="space-y-8">
      <header className="max-w-3xl">
        <p className="text-sm font-semibold text-sky-700">
          Platform guidance
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
          Help & Guide
        </h1>
        <p className="mt-2 text-base leading-7 text-slate-600">
          Find step-by-step instructions for common ministry tasks. Guides are
          written for specific roles and reflect the platform&apos;s current
          workflows.
        </p>
      </header>

      <section
        aria-labelledby="find-guides-heading"
        className="space-y-5"
      >
        <div>
          <h2
            className="text-2xl font-bold text-slate-950"
            id="find-guides-heading"
          >
            Find a guide
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Search available guides or narrow the list by category.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <form
            className="grid gap-4 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto]"
            method="get"
          >
            <label className="text-sm font-semibold text-slate-800">
              Search guides
              <input
                className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
                defaultValue={searchText}
                maxLength={100}
                name="q"
                placeholder="Search by task or topic"
                type="search"
              />
            </label>

            <label className="text-sm font-semibold text-slate-800">
              Category
              <select
                className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
                defaultValue={selectedCategory ?? ""}
                name="category"
              >
                <option value="">All categories</option>
                {helpGuideCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-wrap items-end gap-3">
              <button
                className="min-h-11 rounded-lg bg-slate-900 px-5 py-2 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
                type="submit"
              >
                Apply
              </button>
              {hasActiveFilter ? (
                <Link
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
                  href="/help"
                >
                  Clear
                </Link>
              ) : null}
            </div>
          </form>
        </div>

        {visibleGuides.length ? (
          <div className="grid min-w-0 gap-4 md:grid-cols-2">
            {visibleGuides.map((guide) => (
              <article
                className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                key={guide.slug}
              >
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-sky-50 px-2.5 py-1 text-sky-800">
                    {guide.category}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                    {guide.audience.join(", ")}
                  </span>
                </div>
                <h3 className="mt-4 text-xl font-bold text-slate-950">
                  {guide.title}
                </h3>
                <p className="mt-2 leading-7 text-slate-600">
                  {guide.summary}
                </p>
                <Link
                  className="mt-4 inline-flex min-h-11 items-center font-semibold text-sky-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
                  href={`/help/${guide.slug}`}
                >
                  Open guide →
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center shadow-sm">
            <h3 className="text-lg font-bold text-slate-950">
              No matching guides
            </h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Try a different search term or clear the current filters. More
              task-based guides will be added in future phases.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
