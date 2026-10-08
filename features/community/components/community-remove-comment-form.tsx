"use client";

import { useState } from "react";

import { removeCommunityCommentAction } from "@/features/community/actions/community-actions";

type CommunityRemoveCommentFormProps = Readonly<{
  commentId: string;
  postId: string;
}>;

export function CommunityRemoveCommentForm({
  commentId,
  postId,
}: CommunityRemoveCommentFormProps) {
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
        Remove this reply?
      </p>

      <p className="mt-1 text-sm text-red-800">
        It will no longer appear in this discussion.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <form action={removeCommunityCommentAction}>
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