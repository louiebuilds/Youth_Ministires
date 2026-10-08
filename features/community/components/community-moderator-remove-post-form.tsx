"use client";

import { useState } from "react";

import { moderatorRemoveCommunityPostAction } from "@/features/community/actions/community-actions";

type CommunityModeratorRemovePostFormProps = Readonly<{
  postId: string;
}>;

export function CommunityModeratorRemovePostForm({
  postId,
}: CommunityModeratorRemovePostFormProps) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 shadow-sm hover:bg-red-100"
        onClick={() => setConfirming(true)}
        type="button"
      >
        Remove Discussion
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-semibold text-red-900">
        Remove this discussion as a moderator?
      </p>

      <p className="mt-1 text-sm text-red-800">
        Parents and guardians will no longer be able to see this discussion.
        Use Hide Discussion instead if you only want to temporarily remove it
        from Community.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <form action={moderatorRemoveCommunityPostAction}>
          <input
            name="postId"
            type="hidden"
            value={postId}
          />

          <button
            className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-800"
            type="submit"
          >
            Yes, Remove Discussion
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