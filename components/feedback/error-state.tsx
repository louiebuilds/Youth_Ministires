"use client";

import { CircleAlert } from "lucide-react";

type ErrorStateProps = Readonly<{
  onRetry: () => void;
}>;

export function ErrorState({ onRetry }: ErrorStateProps) {
  return (
    <section
      aria-labelledby="error-state-heading"
      className="rounded-xl border border-red-200 bg-white p-6 shadow-sm"
    >
      <span className="grid size-11 place-items-center rounded-full bg-red-100 text-red-700">
        <CircleAlert aria-hidden="true" className="size-6" />
      </span>
      <h1
        className="mt-4 text-xl font-semibold text-slate-950"
        id="error-state-heading"
      >
        We couldn’t load this page
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
        The problem may be temporary. Try loading the page again. If it
        continues, contact your platform administrator.
      </p>
      <button
        className="mt-5 min-h-11 rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
        onClick={onRetry}
        type="button"
      >
        Try again
      </button>
    </section>
  );
}
