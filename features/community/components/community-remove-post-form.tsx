"use client";

import { useState } from "react";

import { removeCommunityPostAction } from "@/features/community/actions/community-actions";

type CommunityRemovePostFormProps = Readonly<{
  postId: string;
}>;

export function CommunityRemovePostForm({
  postId,
}: CommunityRemovePostFormProps) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 shadow-sm hover:bg-red-50"
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
        Remove this discussion?
      </p>

      <p className="mt-1 text-sm text-red-800">
        It will no longer appear in the Community feed.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <form action={removeCommunityPostAction}>
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