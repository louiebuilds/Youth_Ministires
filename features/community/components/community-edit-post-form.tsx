"use client";

import { useActionState } from "react";

import {
  updateCommunityPostAction,
  type CommunityActionState,
} from "@/features/community/actions/community-actions";

type CommunityEditPostFormProps = Readonly<{
  postId: string;
  categoryId: string;
  title: string;
  body: string;
  categories: ReadonlyArray<{
    categoryId: string;
    name: string;
  }>;
}>;

const initialState: CommunityActionState = {
  success: false,
};

export function CommunityEditPostForm({
  postId,
  categoryId,
  title,
  body,
  categories,
}: CommunityEditPostFormProps) {
  const [state, action, pending] = useActionState(
    updateCommunityPostAction,
    initialState,
  );

  return (
    <form action={action} className="space-y-5">
      <input name="postId" type="hidden" value={postId} />

      <div>
        <label
          className="block text-sm font-semibold text-slate-900"
          htmlFor="edit-community-category"
        >
          Category
        </label>

        <select
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
          defaultValue={categoryId}
          id="edit-community-category"
          name="categoryId"
          required
        >
          {categories.map((category) => (
            <option key={category.categoryId} value={category.categoryId}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          className="block text-sm font-semibold text-slate-900"
          htmlFor="edit-community-title"
        >
          Title
        </label>

        <input
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
          defaultValue={title}
          id="edit-community-title"
          maxLength={160}
          minLength={1}
          name="title"
          required
          type="text"
        />

        <p className="mt-1 text-xs text-slate-500">
          Maximum 160 characters.
        </p>
      </div>

      <div>
        <label
          className="block text-sm font-semibold text-slate-900"
          htmlFor="edit-community-body"
        >
          Discussion
        </label>

        <textarea
          className="mt-2 min-h-40 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
          defaultValue={body}
          id="edit-community-body"
          maxLength={5000}
          minLength={1}
          name="body"
          required
          rows={8}
        />

        <p className="mt-1 text-xs text-slate-500">
          Maximum 5,000 characters.
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
          {pending ? "Saving..." : "Save Changes"}
        </button>

        <a
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          href={`/community/${postId}`}
        >
          Cancel
        </a>
      </div>
    </form>
  );
}