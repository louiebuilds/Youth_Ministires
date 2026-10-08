import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";

import { requireCapability } from "@/features/auth/services/authorization-service";
import {
  CategoryCreateForm,
  CategoryLifecycleForm,
  ResourceCreateForm,
  ResourceLifecycleForms,
} from "@/features/resource-library/components/resource-management-forms";
import { ResourceFileControls } from "@/features/resource-library/components/resource-file-controls";
import {
  listLibraryResources,
  listLibraryResourceVersions,
  listResourceCategories,
} from "@/features/resource-library/services/resource-library-service";
import type {
  LibraryResourceAudience,
  LibraryResourceStatus,
  LibraryResourceType,
} from "@/features/resource-library/types/resource-library";

export const metadata: Metadata = {
  title: "Resource Library",
};

const types: LibraryResourceType[] = [
  "document",
  "image",
  "video",
  "other",
];

const audiences: LibraryResourceAudience[] = [
  "ministry",
  "volunteer",
  "family",
  "all_authenticated",
];

const statuses: LibraryResourceStatus[] = [
  "draft",
  "published",
  "archived",
];

type ResourceView =
  | "library"
  | "new"
  | "categories";

function one(
  value: string | string[] | undefined,
) {
  return typeof value === "string"
    ? value
    : null;
}

function getView(
  value: string | string[] | undefined,
  canManage: boolean,
): ResourceView {
  if (!canManage) {
    return "library";
  }

  if (value === "new") {
    return "new";
  }

  if (value === "categories") {
    return "categories";
  }

  return "library";
}

function WorkspaceLink({
  active,
  href,
  children,
}: {
  active: boolean;
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      className={
        active
          ? "inline-flex min-h-12 items-center border-b-2 border-sky-700 px-4 font-semibold text-sky-800"
          : "inline-flex min-h-12 items-center border-b-2 border-transparent px-4 font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
      }
      href={href}
    >
      {children}
    </Link>
  );
}

export default async function ResourceLibraryPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<
    Record<
      string,
      string | string[] | undefined
    >
  >;
}>) {
  const account =
    await requireCapability(
      "resource_library.view",
    );

  const canManage = [
    "platform_administrator",
    "youth_pastor",
    "staff_member",
  ].includes(account.role);

  const params = await searchParams;

  const view = getView(
    params.view,
    canManage,
  );

  const searchValue = one(params.q);

  const search =
    searchValue &&
    searchValue.trim().length <= 100
      ? searchValue.trim() || null
      : null;

  const categoryValue =
    one(params.category);

  const categoryId =
    categoryValue &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      categoryValue,
    )
      ? categoryValue
      : null;

  const typeValue = one(params.type);

  const resourceType =
    types.includes(
      typeValue as LibraryResourceType,
    )
      ? (typeValue as LibraryResourceType)
      : null;

  const audienceValue =
    one(params.audience);

  const audience =
    audiences.includes(
      audienceValue as LibraryResourceAudience,
    )
      ? (audienceValue as LibraryResourceAudience)
      : null;

  const statusValue =
    one(params.status);

  const status =
    canManage &&
    statuses.includes(
      statusValue as LibraryResourceStatus,
    )
      ? (statusValue as LibraryResourceStatus)
      : null;

  const [categories, resources] =
    await Promise.all([
      listResourceCategories(false),

      view === "library"
        ? listLibraryResources({
            search,
            categoryId,
            resourceType,
            audience,
            status,
            includeArchived:
              canManage &&
              status === "archived",
          })
        : Promise.resolve([]),
    ]);

  const histories =
    canManage && view === "library"
      ? await Promise.all(
          resources.map(
            async (resource) =>
              [
                resource.resourceId,
                await listLibraryResourceVersions(
                  resource.resourceId,
                ),
              ] as const,
          ),
        )
      : [];

  const versionsByResource =
    new Map(histories);

  return (
    <div className="space-y-8">
      <header>
        <div className="max-w-4xl">
          <p className="text-sm font-semibold text-sky-700">
            Shared ministry materials
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-950">
            Resource Library
          </h1>

          <p className="mt-2 text-slate-600">
            Private documents, images, and
            videos shared with the appropriate
            ministry audience.
          </p>
        </div>

        <nav
          aria-label="Resource library workspaces"
          className="mt-8 flex flex-wrap border-b border-slate-200"
        >
          <WorkspaceLink
            active={view === "library"}
            href="/resources?view=library"
          >
            Library
          </WorkspaceLink>

          {canManage ? (
            <WorkspaceLink
              active={view === "new"}
              href="/resources?view=new"
            >
              New Resource
            </WorkspaceLink>
          ) : null}

          {canManage ? (
            <WorkspaceLink
              active={
                view === "categories"
              }
              href="/resources?view=categories"
            >
              Categories
            </WorkspaceLink>
          ) : null}
        </nav>
      </header>

      {view === "library" ? (
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-950">
              Library
            </h2>

            <p className="mt-1 text-slate-600">
              Search and open ministry
              resources shared with your
              audience.
            </p>
          </div>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <form
              className="grid gap-4 md:grid-cols-3"
              method="get"
            >
              <input
                name="view"
                type="hidden"
                value="library"
              />

              <label className="text-sm font-semibold">
                Search

                <input
                  className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3"
                  defaultValue={
                    search ?? ""
                  }
                  maxLength={100}
                  name="q"
                  placeholder="Title, description, category"
                />
              </label>

              <label className="text-sm font-semibold">
                Category

                <select
                  className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3"
                  defaultValue={
                    categoryId ?? ""
                  }
                  name="category"
                >
                  <option value="">
                    All categories
                  </option>

                  {categories.map(
                    (item) => (
                      <option
                        key={
                          item.categoryId
                        }
                        value={
                          item.categoryId
                        }
                      >
                        {item.name}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label className="text-sm font-semibold">
                Type

                <select
                  className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3"
                  defaultValue={
                    resourceType ?? ""
                  }
                  name="type"
                >
                  <option value="">
                    All types
                  </option>

                  {types.map((item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              {canManage ? (
                <label className="text-sm font-semibold">
                  Audience

                  <select
                    className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3"
                    defaultValue={
                      audience ?? ""
                    }
                    name="audience"
                  >
                    <option value="">
                      All audiences
                    </option>

                    {audiences.map(
                      (item) => (
                        <option
                          key={item}
                          value={item}
                        >
                          {item.replaceAll(
                            "_",
                            " ",
                          )}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              ) : null}

              {canManage ? (
                <label className="text-sm font-semibold">
                  Status

                  <select
                    className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3"
                    defaultValue={
                      status ?? ""
                    }
                    name="status"
                  >
                    <option value="">
                      All active
                    </option>

                    {statuses.map(
                      (item) => (
                        <option
                          key={item}
                          value={item}
                        >
                          {item}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              ) : null}

              <button className="min-h-11 self-end rounded-lg bg-slate-900 px-4 font-semibold text-white">
                Search resources
              </button>
            </form>
          </section>

          {resources.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {resources.map(
                (resource) => (
                  <article
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                    key={
                      resource.resourceId
                    }
                  >
                    <div className="flex justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-bold">
                          {
                            resource.title
                          }
                        </h3>

                        <p className="mt-1 text-sm font-semibold text-sky-700">
                          {resource.categoryName ??
                            "Uncategorized"}{" "}
                          ·{" "}
                          {
                            resource.resourceType
                          }
                        </p>
                      </div>

                      <span className="text-sm font-semibold text-slate-600">
                        {resource.status}
                      </span>
                    </div>

                    <p className="mt-3 text-slate-700">
                      {resource.description ??
                        "No description recorded."}
                    </p>

                    <p className="mt-3 text-sm text-slate-500">
                      Audience:{" "}
                      {resource.audience.replaceAll(
                        "_",
                        " ",
                      )}

                      {resource.versionNumber
                        ? ` · Version ${resource.versionNumber}`
                        : " · No file uploaded"}
                    </p>

                    <ResourceFileControls
                      canManage={canManage}
                      resource={resource}
                      versions={
                        versionsByResource.get(
                          resource.resourceId,
                        ) ?? []
                      }
                    />

                    {canManage ? (
                      <ResourceLifecycleForms
                        resource={resource}
                      />
                    ) : null}
                  </article>
                ),
              )}
            </div>
          ) : (
            <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
              No visible resources match this
              search.
            </p>
          )}
        </section>
      ) : null}

      {view === "new" &&
      canManage ? (
        <section className="space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-950">
              New Resource
            </h2>

            <p className="mt-1 text-slate-600">
              Create a draft ministry resource
              before uploading and publishing
              its file.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <ResourceCreateForm
              categories={categories}
            />
          </div>
        </section>
      ) : null}

      {view === "categories" &&
      canManage ? (
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-950">
              Categories
            </h2>

            <p className="mt-1 text-slate-600">
              Organize ministry resources into
              reusable categories.
            </p>
          </div>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-xl font-bold text-slate-950">
              Current categories
            </h3>

            <div className="mt-4 space-y-3">
              {categories.map(
                (category) => (
                  <CategoryLifecycleForm
                    category={category}
                    key={
                      category.categoryId
                    }
                  />
                ),
              )}

              {!categories.length ? (
                <p className="text-slate-600">
                  No active categories.
                </p>
              ) : null}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-xl font-bold text-slate-950">
              Create category
            </h3>

            <CategoryCreateForm />
          </section>
        </section>
      ) : null}
    </div>
  );
}