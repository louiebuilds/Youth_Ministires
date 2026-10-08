"use client";

import { useActionState } from "react";

import {
  updateCommunityCommentAction,
  type CommunityActionState,
} from "@/features/community/actions/community-actions";

type CommunityEditCommentFormProps = Readonly<{
  commentId: string;
  postId: string;
  body: string;
  onCancelHref: string;
}>;

const initialState: CommunityActionState = {
  success: false,
};

export function CommunityEditCommentForm({
  commentId,
  postId,
  body,
  onCancelHref,
}: CommunityEditCommentFormProps) {
  const [state, action, pending] = useActionState(
    updateCommunityCommentAction,
    initialState,
  );

  return (
    <form action={action} className="space-y-4">
      <input name="commentId" type="hidden" value={commentId} />
      <input name="postId" type="hidden" value={postId} />

      <div>
        <label
          className="block text-sm font-semibold text-slate-900"
          htmlFor={`edit-comment-${commentId}`}
        >
          Edit reply
        </label>

        <textarea
          className="mt-2 min-h-28 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
          defaultValue={body}
          id={`edit-comment-${commentId}`}
          maxLength={3000}
          minLength={1}
          name="body"
          required
          rows={5}
        />

        <p className="mt-1 text-xs text-slate-500">
          Maximum 3,000 characters.
        </p>
      </div>

      {state.message ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800"
          role="alert"
        >
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? "Saving..." : "Save Reply"}
        </button>

        <a
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          href={onCancelHref}
        >
          Cancel
        </a>
      </div>
    </form>
  );
}