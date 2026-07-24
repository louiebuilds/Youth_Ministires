import { Construction } from "lucide-react";

type FoundationPlaceholderProps = Readonly<{
  description: string;
  title: string;
}>;

export function FoundationPlaceholder({
  description,
  title,
}: FoundationPlaceholderProps) {
  return (
    <section
      aria-labelledby="foundation-placeholder-heading"
      className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <span className="grid size-12 place-items-center rounded-full bg-sky-100 text-sky-800">
        <Construction aria-hidden="true" className="size-6" />
      </span>
      <p className="mt-5 text-sm font-semibold text-sky-700">
        Foundation placeholder
      </p>
      <h1
        className="mt-1 text-2xl font-bold tracking-tight text-slate-950"
        id="foundation-placeholder-heading"
      >
        {title}
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
        {description}
      </p>
      <p className="mt-4 text-sm text-slate-500">
        This page contains no live ministry data yet.
      </p>
    </section>
  );
}
