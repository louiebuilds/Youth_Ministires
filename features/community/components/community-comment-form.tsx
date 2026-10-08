"use client";

import { useActionState } from "react";

import {
  createCommunityCommentAction,
  type CommunityActionState,
} from "@/features/community/actions/community-actions";

const initialState: CommunityActionState = { success: false };

export function CommunityCommentForm({
  postId,
}: Readonly<{ postId: string }>) {
  const [state, action, pending] = useActionState(
    createCommunityCommentAction,
    initialState,
  );

  return (
    <form action={action} className="space-y-4">
      <input name="postId" type="hidden" value={postId} />
      <label className="block text-sm font-semibold text-slate-800">
        Your reply
        <textarea
          className="mt-1 min-h-32 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 shadow-sm outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
          disabled={pending}
          maxLength={3000}
          name="body"
          placeholder="Add to the conversation…"
          required
          rows={5}
        />
        <span className="mt-1 block text-xs font-normal text-slate-500">
          Up to 3,000 characters
        </span>
      </label>

      {state.message ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800" role="status">
          {state.message}
        </p>
      ) : null}

      <button
        className="min-h-11 w-full rounded-lg bg-sky-700 px-5 py-2.5 font-semibold text-white shadow-sm transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-auto"
        disabled={pending}
        type="submit"
      >
        {pending ? "Posting reply…" : "Post reply"}
      </button>
    </form>
  );
}
