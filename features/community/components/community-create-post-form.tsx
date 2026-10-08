"use client";

import { useActionState } from "react";

import {
  createCommunityPostAction,
  type CommunityActionState,
} from "@/features/community/actions/community-actions";

import type { CommunityCategory } from "@/features/community/services/community-service";

const initialState: CommunityActionState = { success: false };
const fieldClass =
  "mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 shadow-sm outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-100";

export function CommunityCreatePostForm({
  categories,
}: Readonly<{ categories: CommunityCategory[] }>) {
  const [state, action, pending] = useActionState(
    createCommunityPostAction,
    initialState,
  );

  return (
    <form action={action} className="space-y-5">
      <label className="block text-sm font-semibold text-slate-800">
        Category
        <select
          className={fieldClass}
          defaultValue=""
          disabled={pending || categories.length === 0}
          name="categoryId"
          required
        >
          <option disabled value="">Choose a category</option>
          {categories.map((category) => (
            <option key={category.categoryId} value={category.categoryId}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-semibold text-slate-800">
        Title
        <input
          className={fieldClass}
          disabled={pending}
          maxLength={160}
          name="title"
          placeholder="What would you like to discuss?"
          required
        />
        <span className="mt-1 block text-xs font-normal text-slate-500">
          Up to 160 characters
        </span>
      </label>

      <label className="block text-sm font-semibold text-slate-800">
        Discussion
        <textarea
          className={`${fieldClass} min-h-40 resize-y`}
          disabled={pending}
          maxLength={5000}
          name="body"
          placeholder="Share the details parents and guardians need to join the conversation."
          required
          rows={7}
        />
        <span className="mt-1 block text-xs font-normal text-slate-500">
          Up to 5,000 characters
        </span>
      </label>

      {state.message ? (
        <p
          className={state.success
            ? "rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
            : "rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800"}
          role="status"
        >
          {state.message}
        </p>
      ) : null}

      <button
        className="min-h-11 w-full rounded-lg bg-sky-700 px-5 py-2.5 font-semibold text-white shadow-sm transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-auto"
        disabled={pending || categories.length === 0}
        type="submit"
      >
        {pending ? "Starting discussion…" : "Start discussion"}
      </button>

      {!categories.length ? (
        <p className="text-sm text-slate-600">
          A Community category is required before a discussion can be started.
        </p>
      ) : null}
    </form>
  );
}
