"use client";

import { useState } from "react";

import { moderatorRemoveCommunityCommentAction } from "@/features/community/actions/community-actions";

type CommunityModeratorRemoveCommentFormProps = Readonly<{
  commentId: string;
  postId: string;
}>;

export function CommunityModeratorRemoveCommentForm({
  commentId,
  postId,
}: CommunityModeratorRemoveCommentFormProps) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        className="text-sm font-semibold text-red-700 hover:underline"
        onClick={() => setConfirming(true)}
        type="button"
      >
        Remove Reply
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-semibold text-red-900">
        Remove this reply as a moderator?
      </p>

      <p className="mt-1 text-sm text-red-800">
        Parents and guardians will no longer be able to see this reply. Use
        Hide Reply instead if you only want to temporarily remove it from the
        discussion.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <form action={moderatorRemoveCommunityCommentAction}>
          <input
            name="commentId"
            type="hidden"
            value={commentId}
          />

          <input
            name="postId"
            type="hidden"
            value={postId}
          />

          <button
            className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-800"
            type="submit"
          >
            Yes, Remove Reply
          </button>
        </form>

        <button
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          onClick={() => setConfirming(false)}
          type="button"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}