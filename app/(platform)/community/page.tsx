import type { Metadata } from "next";
import Link from "next/link";

import { requireCapability } from "@/features/auth/services/authorization-service";
import { hasCapability } from "@/features/auth/types/authorization";
import { CommunityCreatePostForm } from "@/features/community/components/community-create-post-form";
import {
  listCommunityCategories,
  listCommunityPosts,
} from "@/features/community/services/community-service";

export const metadata: Metadata = {
  title: "Parent Community",
};

type CommunitySearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

type ModeratorStatusFilter =
  | "published"
  | "hidden"
  | "all";

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value : null;
}

function bodyPreview(body: string) {
  const compact = body.replaceAll(/\s+/g, " ").trim();

  return compact.length > 240
    ? `${compact.slice(0, 237)}…`
    : compact;
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
});

export default async function CommunityPage({
  searchParams,
}: Readonly<{ searchParams: CommunitySearchParams }>) {
  const account = await requireCapability("community.view");

  const canParticipate = hasCapability(
    account.role,
    "community.participate",
  );

  const canModerate = hasCapability(
    account.role,
    "community.moderate",
  );

  const [categories, posts, params] = await Promise.all([
    listCommunityCategories(),
    listCommunityPosts(),
    searchParams,
  ]);

  const requestedCategory = one(params.category);

  const selectedCategory = categories.some(
    (category) =>
      category.categoryId === requestedCategory,
  )
    ? requestedCategory
    : null;

  const requestedStatus = one(params.status);

  const selectedStatus: ModeratorStatusFilter =
    canModerate &&
    (requestedStatus === "hidden" ||
      requestedStatus === "all")
      ? requestedStatus
      : "published";

  const searchText =
    one(params.q)?.trim() ?? "";

  const normalizedSearch =
    searchText.toLocaleLowerCase();

  const visiblePosts = posts.filter((post) => {
    const matchesCategory =
      !selectedCategory ||
      post.category.categoryId === selectedCategory;

    if (!matchesCategory) {
      return false;
    }

    const matchesSearch =
      normalizedSearch.length === 0 ||
      post.title
        .toLocaleLowerCase()
        .includes(normalizedSearch) ||
      post.body
        .toLocaleLowerCase()
        .includes(normalizedSearch);

    if (!matchesSearch) {
      return false;
    }

    if (!canModerate) {
      return post.lifecycleStatus === "published";
    }

    if (selectedStatus === "all") {
      return (
        post.lifecycleStatus === "published" ||
        post.lifecycleStatus === "hidden"
      );
    }

    return post.lifecycleStatus === selectedStatus;
  });

  const created =
    one(params.created) === "1";

  const removed =
    one(params.removed) === "1";

  const moderatorRemoved =
    one(params.moderatorRemoved) === "1";

  const hasActiveFilter =
    Boolean(selectedCategory) ||
    Boolean(searchText) ||
    (canModerate &&
      selectedStatus !== "published");

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-sky-700">
            Parent Community
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Conversations for parents and guardians
          </h1>

          <p className="mt-2 text-base leading-7 text-slate-600">
            Ask questions, share helpful information, and connect with other
            youth ministry families through organized discussions.
          </p>
        </div>

        {canParticipate ? (
          <Link
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-sky-700 px-5 py-2.5 font-semibold text-white shadow-sm transition hover:bg-sky-800"
            href="#start-discussion"
          >
            New Post
          </Link>
        ) : null}
      </header>

      {created ? (
        <p
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
          role="status"
        >
          Your discussion was posted successfully.
        </p>
      ) : null}

      {removed ? (
        <p
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
          role="status"
        >
          Your discussion was removed successfully.
        </p>
      ) : null}

      {moderatorRemoved ? (
        <p
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
          role="status"
        >
          The discussion was removed successfully.
        </p>
      ) : null}

      <section
        aria-labelledby="community-feed-heading"
        className="space-y-5"
      >
        <div>
          <h2
            className="text-2xl font-bold text-slate-950"
            id="community-feed-heading"
          >
            Community feed
          </h2>

          <p className="mt-1 text-sm text-slate-600">
            Pinned discussions appear first, followed by the newest posts.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <form
            className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto_auto]"
            method="get"
          >
            <label className="text-sm font-semibold text-slate-800">
              Search discussions
              <input
                className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                defaultValue={searchText}
                name="q"
                placeholder="Search titles and discussion text"
                type="search"
              />
            </label>

            <label className="text-sm font-semibold text-slate-800">
              Filter by category
              <select
                className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                defaultValue={selectedCategory ?? ""}
                name="category"
              >
                <option value="">
                  All categories
                </option>

                {categories.map((category) => (
                  <option
                    key={category.categoryId}
                    value={category.categoryId}
                  >
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            {canModerate ? (
              <label className="text-sm font-semibold text-slate-800">
                Discussion status
                <select
                  className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                  defaultValue={selectedStatus}
                  name="status"
                >
                  <option value="published">
                    Published
                  </option>

                  <option value="hidden">
                    Hidden
                  </option>

                  <option value="all">
                    All
                  </option>
                </select>
              </label>
            ) : null}

            <div className="flex items-end gap-3">
              <button
                className="min-h-11 rounded-lg bg-slate-900 px-5 py-2 font-semibold text-white"
                type="submit"
              >
                Apply
              </button>

              {hasActiveFilter ? (
                <Link
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700"
                  href="/community"
                >
                  Clear
                </Link>
              ) : null}
            </div>
          </form>
        </div>

        {canModerate &&
        selectedStatus === "hidden" ? (
          <aside className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900">
            <span className="font-semibold">
              Moderator view:
            </span>{" "}
            These discussions are hidden from parents and guardians. Open a
            discussion to restore or remove it.
          </aside>
        ) : null}

        {searchText ? (
          <p className="text-sm text-slate-600">
            Showing results for{" "}
            <span className="font-semibold text-slate-900">
              “{searchText}”
            </span>
            .
          </p>
        ) : null}

        {visiblePosts.length ? (
          <div className="space-y-4">
            {visiblePosts.map((post) => (
              <article
                className={
                  post.lifecycleStatus === "hidden"
                    ? "rounded-xl border border-orange-200 bg-orange-50/30 p-5 shadow-sm sm:p-6"
                    : post.isPinned
                      ? "rounded-xl border border-sky-200 bg-white p-5 shadow-sm ring-1 ring-sky-100 sm:p-6"
                      : "rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                }
                key={post.postId}
              >
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                  <span className="rounded-full bg-sky-50 px-2.5 py-1 text-sky-800">
                    {post.category.name}
                  </span>

                  {post.isPinned ? (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800">
                      Pinned
                    </span>
                  ) : null}

                  {post.isLocked ? (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                      Locked
                    </span>
                  ) : null}

                  {canModerate &&
                  post.lifecycleStatus === "hidden" ? (
                    <span className="rounded-full bg-orange-100 px-2.5 py-1 text-orange-900">
                      Hidden
                    </span>
                  ) : null}
                </div>

                <h3 className="mt-3 text-xl font-bold leading-7 text-slate-950">
                  <Link
                    className="transition hover:text-sky-800 hover:underline"
                    href={`/community/${post.postId}`}
                  >
                    {post.title}
                  </Link>
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {bodyPreview(post.body)}
                </p>

                <div className="mt-4 flex flex-col gap-1 border-t border-slate-100 pt-4 text-sm text-slate-500 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2">
                  <span className="font-medium text-slate-700">
                    {post.authorDisplayName}
                  </span>

                  <span
                    aria-hidden="true"
                    className="hidden sm:inline"
                  >
                    ·
                  </span>

                  <time dateTime={post.createdAt}>
                    {dateFormatter.format(
                      new Date(post.createdAt),
                    )}
                  </time>

                  <span
                    aria-hidden="true"
                    className="hidden sm:inline"
                  >
                    ·
                  </span>

                  <span>
                    {post.commentCount}{" "}
                    {post.commentCount === 1
                      ? "comment"
                      : "comments"}
                  </span>
                </div>

                <Link
                  className="mt-4 inline-flex min-h-11 items-center font-semibold text-sky-800 hover:underline"
                  href={`/community/${post.postId}`}
                >
                  Open discussion →
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center shadow-sm">
            <h3 className="text-lg font-bold text-slate-950">
              {searchText
                ? "No matching discussions"
                : canModerate &&
                    selectedStatus === "hidden"
                  ? "No hidden discussions"
                  : selectedCategory
                    ? "No discussions in this category yet"
                    : "No Community discussions yet"}
            </h3>

            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
              {searchText
                ? "Try a different search term or clear the current filters."
                : canModerate &&
                    selectedStatus === "hidden"
                  ? "Discussions hidden by Community moderators will appear here."
                  : canParticipate
                    ? "Start a welcoming conversation for other parents and guardians."
                    : "New discussions will appear here when Community members post them."}
            </p>
          </div>
        )}
      </section>

      {canParticipate ? (
        <section
          aria-labelledby="start-discussion-heading"
          className="scroll-mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
          id="start-discussion"
        >
          <div className="mb-5">
            <h2
              className="text-2xl font-bold text-slate-950"
              id="start-discussion-heading"
            >
              Start a discussion
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-600">
              Choose the closest category and share a clear title and message.
            </p>
          </div>

          <CommunityCreatePostForm
            categories={categories}
          />
        </section>
      ) : null}
    </div>
  );
}