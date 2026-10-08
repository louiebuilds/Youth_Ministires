import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import {
  setCommunityCommentHiddenAction,
  setCommunityPostHiddenAction,
  setCommunityPostLockedAction,
  setCommunityPostPinnedAction,
} from "@/features/community/actions/community-actions";
import { requireCapability } from "@/features/auth/services/authorization-service";
import { hasCapability } from "@/features/auth/types/authorization";
import { CommunityCommentForm } from "@/features/community/components/community-comment-form";
import { CommunityEditCommentForm } from "@/features/community/components/community-edit-comment-form";
import { CommunityEditPostForm } from "@/features/community/components/community-edit-post-form";
import { CommunityModeratorRemoveCommentForm } from "@/features/community/components/community-moderator-remove-comment-form";
import { CommunityModeratorRemovePostForm } from "@/features/community/components/community-moderator-remove-post-form";
import { CommunityRemoveCommentForm } from "@/features/community/components/community-remove-comment-form";
import { CommunityRemovePostForm } from "@/features/community/components/community-remove-post-form";
import {
  getCommunityPost,
  listCommunityCategories,
  listCommunityComments,
} from "@/features/community/services/community-service";

export const metadata: Metadata = {
  title: "Community Discussion",
};

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value : null;
}

export default async function CommunityPostPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ postId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const account = await requireCapability("community.view");

  const parsedPostId = z.string().uuid().safeParse((await params).postId);

  if (!parsedPostId.success) {
    notFound();
  }

  const [post, comments, categories, query] = await Promise.all([
    getCommunityPost(parsedPostId.data),
    listCommunityComments(parsedPostId.data),
    listCommunityCategories(),
    searchParams,
  ]);

  if (!post) {
    notFound();
  }

  const canParticipate = hasCapability(
    account.role,
    "community.participate",
  );

  const canModerate = hasCapability(
    account.role,
    "community.moderate",
  );

  if (
    post.lifecycleStatus !== "published" &&
    !canModerate
  ) {
    notFound();
  }

  const isAuthor =
    account.id === post.authorProfileId;

  const showEditForm =
    isAuthor &&
    canParticipate &&
    post.lifecycleStatus === "published" &&
    one(query.edit) === "1";

  const postUpdated =
    one(query.updated) === "1";

  const removeError =
    one(query.removeError) === "1";

  const editingCommentId =
    one(query.editComment);

  const updatedCommentId =
    one(query.commentUpdated);

  const commentCreated =
    one(query.comment) === "1";

  const commentRemoved =
    one(query.commentRemoved) === "1";

  const commentRemoveError =
    one(query.commentRemoveError) === "1";

  const moderatorCommentRemoved =
    one(query.moderatorCommentRemoved) === "1";

  const commentHiddenId =
    one(query.commentHidden);

  const commentRestoredId =
    one(query.commentRestored);

  const pinned =
    one(query.pinned) === "1";

  const unpinned =
    one(query.unpinned) === "1";

  const locked =
    one(query.locked) === "1";

  const unlocked =
    one(query.unlocked) === "1";

  const hidden =
    one(query.hidden) === "1";

  const restored =
    one(query.restored) === "1";

  const moderationError =
    one(query.moderationError) === "1";

  const visibleComments = comments.filter((comment) => {
    if (canModerate) {
      return (
        comment.lifecycleStatus === "published" ||
        comment.lifecycleStatus === "hidden"
      );
    }

    return comment.lifecycleStatus === "published";
  });

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header>
        <Link
          className="text-sm font-semibold text-sky-700 hover:underline"
          href="/community"
        >
          ← Back to Community
        </Link>

        <div className="mt-5 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide">
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

          {canModerate ? (
            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-800">
              {post.lifecycleStatus}
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              {post.title}
            </h1>

            <div className="mt-3 flex flex-col gap-1 text-sm text-slate-500 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2">
              <span className="font-medium text-slate-700">
                {post.authorDisplayName}
              </span>

              <span
                aria-hidden="true"
                className="hidden sm:inline"
              >
                ·
              </span>

              <span>
                Created{" "}
                <time dateTime={post.createdAt}>
                  {dateTimeFormatter.format(
                    new Date(post.createdAt),
                  )}
                </time>
              </span>

              <span
                aria-hidden="true"
                className="hidden sm:inline"
              >
                ·
              </span>

              <span>
                Updated{" "}
                <time dateTime={post.updatedAt}>
                  {dateTimeFormatter.format(
                    new Date(post.updatedAt),
                  )}
                </time>
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2">
            {isAuthor &&
            canParticipate &&
            post.lifecycleStatus === "published" &&
            !showEditForm ? (
              <div className="flex flex-wrap gap-2">
                <Link
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                  href={`/community/${post.postId}?edit=1`}
                >
                  Edit Discussion
                </Link>

                <CommunityRemovePostForm
                  postId={post.postId}
                />
              </div>
            ) : null}

            {canModerate ? (
              <div className="flex flex-wrap gap-2">
                {post.lifecycleStatus === "published" ? (
                  <>
                    <form action={setCommunityPostPinnedAction}>
                      <input
                        name="postId"
                        type="hidden"
                        value={post.postId}
                      />

                      <input
                        name="isPinned"
                        type="hidden"
                        value={post.isPinned ? "false" : "true"}
                      />

                      <button
                        className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 shadow-sm hover:bg-amber-100"
                        type="submit"
                      >
                        {post.isPinned
                          ? "Unpin Discussion"
                          : "Pin Discussion"}
                      </button>
                    </form>

                    <form action={setCommunityPostLockedAction}>
                      <input
                        name="postId"
                        type="hidden"
                        value={post.postId}
                      />

                      <input
                        name="isLocked"
                        type="hidden"
                        value={post.isLocked ? "false" : "true"}
                      />

                      <button
                        className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-200"
                        type="submit"
                      >
                        {post.isLocked
                          ? "Unlock Discussion"
                          : "Lock Discussion"}
                      </button>
                    </form>
                  </>
                ) : null}

                {post.lifecycleStatus === "published" ||
                post.lifecycleStatus === "hidden" ? (
                  <form action={setCommunityPostHiddenAction}>
                    <input
                      name="postId"
                      type="hidden"
                      value={post.postId}
                    />

                    <input
                      name="isHidden"
                      type="hidden"
                      value={
                        post.lifecycleStatus === "hidden"
                          ? "false"
                          : "true"
                      }
                    />

                    <button
                      className={
                        post.lifecycleStatus === "hidden"
                          ? "rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900 shadow-sm hover:bg-emerald-100"
                          : "rounded-lg border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-900 shadow-sm hover:bg-orange-100"
                      }
                      type="submit"
                    >
                      {post.lifecycleStatus === "hidden"
                        ? "Restore Discussion"
                        : "Hide Discussion"}
                    </button>
                  </form>
                ) : null}

                {!isAuthor &&
                (post.lifecycleStatus === "published" ||
                  post.lifecycleStatus === "hidden") ? (
                  <CommunityModeratorRemovePostForm
                    postId={post.postId}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {postUpdated ? (
        <p
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
          role="status"
        >
          Your discussion was updated successfully.
        </p>
      ) : null}

      {removeError ? (
        <p
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
          role="alert"
        >
          The discussion could not be removed. Please try again.
        </p>
      ) : null}

      {pinned ? (
        <p
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
          role="status"
        >
          The discussion was pinned successfully.
        </p>
      ) : null}

      {unpinned ? (
        <p
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
          role="status"
        >
          The discussion was unpinned successfully.
        </p>
      ) : null}

      {locked ? (
        <p
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
          role="status"
        >
          The discussion was locked successfully.
        </p>
      ) : null}

      {unlocked ? (
        <p
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
          role="status"
        >
          The discussion was unlocked successfully.
        </p>
      ) : null}

      {hidden ? (
        <p
          className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-900"
          role="status"
        >
          The discussion was hidden successfully. Parents can no longer see it.
        </p>
      ) : null}

      {restored ? (
        <p
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
          role="status"
        >
          The discussion was restored successfully.
        </p>
      ) : null}

      {moderationError ? (
        <p
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
          role="alert"
        >
          The moderation action could not be completed. Please try again.
        </p>
      ) : null}

      {post.lifecycleStatus === "hidden" ? (
        <aside className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
          <p className="font-semibold">
            This discussion is hidden.
          </p>

          <p className="mt-1">
            It is visible to Community moderators but hidden from parents and
            guardians.
          </p>
        </aside>
      ) : null}

      {showEditForm ? (
        <section
          aria-labelledby="edit-discussion-heading"
          className="rounded-xl border border-sky-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <h2
            className="text-xl font-bold text-slate-950"
            id="edit-discussion-heading"
          >
            Edit Discussion
          </h2>

          <p className="mt-1 text-sm text-slate-600">
            Update the category, title, or discussion text.
          </p>

          <div className="mt-5">
            <CommunityEditPostForm
              body={post.body}
              categories={categories.map((category) => ({
                categoryId: category.categoryId,
                name: category.name,
              }))}
              categoryId={post.category.categoryId}
              postId={post.postId}
              title={post.title}
            />
          </div>
        </section>
      ) : (
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <p className="whitespace-pre-wrap break-words leading-7 text-slate-800">
            {post.body}
          </p>
        </article>
      )}

      {commentCreated ? (
        <p
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
          role="status"
        >
          Your reply was posted successfully.
        </p>
      ) : null}

      {commentRemoved ? (
        <p
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
          role="status"
        >
          Your reply was removed successfully.
        </p>
      ) : null}

      {moderatorCommentRemoved ? (
        <p
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
          role="status"
        >
          The reply was removed successfully.
        </p>
      ) : null}

      {commentRemoveError ? (
        <p
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
          role="alert"
        >
          The reply could not be removed. Please try again.
        </p>
      ) : null}

      <section
        aria-labelledby="comments-heading"
        className="space-y-5"
      >
        <div>
          <h2
            className="text-2xl font-bold text-slate-950"
            id="comments-heading"
          >
            Replies
          </h2>

          <p className="mt-1 text-sm text-slate-600">
            {visibleComments.length}{" "}
            {visibleComments.length === 1
              ? "reply"
              : "replies"}
          </p>
        </div>

        {visibleComments.length ? (
          <div className="space-y-4">
            {visibleComments.map((comment) => {
              const isCommentAuthor =
                account.id === comment.authorProfileId;

              const isEditingComment =
                editingCommentId === comment.commentId &&
                isCommentAuthor &&
                canParticipate &&
                !post.isLocked &&
                post.lifecycleStatus === "published" &&
                comment.lifecycleStatus === "published";

              const commentWasUpdated =
                updatedCommentId === comment.commentId;

              const commentWasHidden =
                commentHiddenId === comment.commentId;

              const commentWasRestored =
                commentRestoredId === comment.commentId;

              return (
                <article
                  className={
                    comment.lifecycleStatus === "hidden"
                      ? "rounded-xl border border-orange-200 bg-orange-50/40 p-5 shadow-sm"
                      : "rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                  }
                  key={comment.commentId}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <h3 className="font-semibold text-slate-900">
                          {comment.authorDisplayName}
                        </h3>

                        <span
                          aria-hidden="true"
                          className="text-slate-400"
                        >
                          ·
                        </span>

                        <time
                          className="text-slate-500"
                          dateTime={comment.createdAt}
                        >
                          {dateTimeFormatter.format(
                            new Date(comment.createdAt),
                          )}
                        </time>

                        {canModerate &&
                        comment.lifecycleStatus === "hidden" ? (
                          <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-orange-900">
                            Hidden
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {isCommentAuthor &&
                      canParticipate &&
                      !post.isLocked &&
                      post.lifecycleStatus === "published" &&
                      comment.lifecycleStatus === "published" &&
                      !isEditingComment ? (
                        <>
                          <Link
                            className="text-sm font-semibold text-sky-700 hover:underline"
                            href={`/community/${post.postId}?editComment=${comment.commentId}`}
                          >
                            Edit Reply
                          </Link>

                          <CommunityRemoveCommentForm
                            commentId={comment.commentId}
                            postId={post.postId}
                          />
                        </>
                      ) : null}

                      {canModerate &&
                      (comment.lifecycleStatus === "published" ||
                        comment.lifecycleStatus === "hidden") ? (
                        <form action={setCommunityCommentHiddenAction}>
                          <input
                            name="commentId"
                            type="hidden"
                            value={comment.commentId}
                          />

                          <input
                            name="postId"
                            type="hidden"
                            value={post.postId}
                          />

                          <input
                            name="isHidden"
                            type="hidden"
                            value={
                              comment.lifecycleStatus === "hidden"
                                ? "false"
                                : "true"
                            }
                          />

                          <button
                            className={
                              comment.lifecycleStatus === "hidden"
                                ? "text-sm font-semibold text-emerald-700 hover:underline"
                                : "text-sm font-semibold text-orange-700 hover:underline"
                            }
                            type="submit"
                          >
                            {comment.lifecycleStatus === "hidden"
                              ? "Restore Reply"
                              : "Hide Reply"}
                          </button>
                        </form>
                      ) : null}

                      {canModerate &&
                      !isCommentAuthor &&
                      (comment.lifecycleStatus === "published" ||
                        comment.lifecycleStatus === "hidden") ? (
                        <CommunityModeratorRemoveCommentForm
                          commentId={comment.commentId}
                          postId={post.postId}
                        />
                      ) : null}
                    </div>
                  </div>

                  {commentWasUpdated ? (
                    <p
                      className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800"
                      role="status"
                    >
                      Your reply was updated successfully.
                    </p>
                  ) : null}

                  {commentWasHidden ? (
                    <p
                      className="mt-4 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-medium text-orange-900"
                      role="status"
                    >
                      The reply was hidden successfully.
                    </p>
                  ) : null}

                  {commentWasRestored ? (
                    <p
                      className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800"
                      role="status"
                    >
                      The reply was restored successfully.
                    </p>
                  ) : null}

                  {comment.lifecycleStatus === "hidden" &&
                  canModerate ? (
                    <p className="mt-3 text-xs font-medium text-orange-800">
                      This reply is hidden from parents and guardians.
                    </p>
                  ) : null}

                  {isEditingComment ? (
                    <div className="mt-4">
                      <CommunityEditCommentForm
                        body={comment.body}
                        commentId={comment.commentId}
                        onCancelHref={`/community/${post.postId}`}
                        postId={post.postId}
                      />
                    </div>
                  ) : (
                    <p className="mt-3 whitespace-pre-wrap break-words leading-7 text-slate-700">
                      {comment.body}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-9 text-center">
            <h3 className="font-bold text-slate-950">
              No replies yet
            </h3>

            <p className="mt-2 text-sm text-slate-600">
              {post.isLocked
                ? "This discussion is locked and is available to read only."
                : "Be the first to add a helpful reply to this discussion."}
            </p>
          </div>
        )}
      </section>

      {post.lifecycleStatus === "published" ? (
        post.isLocked ? (
          <aside className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">
              This discussion is locked.
            </p>

            <p className="mt-1">
              Existing replies remain available, but new replies cannot be
              posted.
            </p>
          </aside>
        ) : canParticipate ? (
          <section
            aria-labelledby="reply-heading"
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
          >
            <h2
              className="text-xl font-bold text-slate-950"
              id="reply-heading"
            >
              Add a reply
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              Keep replies helpful, respectful, and relevant to the discussion.
            </p>

            <div className="mt-5">
              <CommunityCommentForm
                postId={post.postId}
              />
            </div>
          </section>
        ) : null
      ) : null}
    </div>
  );
}