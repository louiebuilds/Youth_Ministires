type LoadingStateProps = Readonly<{
  message?: string;
}>;

export function LoadingState({
  message = "Loading your ministry workspace…",
}: LoadingStateProps) {
  return (
    <div
      aria-live="polite"
      className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      role="status"
    >
      <div className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="size-5 animate-spin rounded-full border-2 border-slate-200 border-t-sky-700"
        />
        <p className="text-sm font-medium text-slate-700">{message}</p>
      </div>
    </div>
  );
}
