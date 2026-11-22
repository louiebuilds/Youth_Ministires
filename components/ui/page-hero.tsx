import Image from "next/image";
import type { ReactNode } from "react";

type PageHeroProps = Readonly<{
  actions?: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}>;

export function PageHero({ actions, description, eyebrow, title }: PageHeroProps) {
  return (
    <section className="relative isolate overflow-hidden rounded-3xl bg-slate-950 px-5 py-7 text-white shadow-xl shadow-slate-950/10 sm:px-8 sm:py-9 lg:min-h-64 lg:px-10 lg:py-10">
      <Image
        alt="Four young people looking toward a cross on a hillside at sunset"
        className="absolute inset-0 -z-20 size-full object-cover object-[58%_52%]"
        fill
        priority
        sizes="(min-width: 1024px) calc(100vw - 20rem), 100vw"
        src="/images/ministry-sunset-banner.png"
      />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950/95 via-slate-950/78 to-slate-950/20" />
      <div className="flex min-h-44 flex-col justify-end gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-300 sm:text-sm">{eyebrow}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-100 sm:text-base sm:leading-7">{description}</p>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-3">{actions}</div> : null}
      </div>
    </section>
  );
}
