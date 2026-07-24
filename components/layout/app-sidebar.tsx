import { NavigationItem } from "@/components/navigation/navigation-item";
import { primaryNavigation } from "@/config/navigation-config";

export function AppSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-800 bg-slate-950 text-white lg:flex lg:flex-col">
      <div className="border-b border-slate-800 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">
          Ministry operations
        </p>
        <p className="mt-2 text-lg font-semibold">Youth Ministries</p>
      </div>

      <nav aria-label="Primary navigation" className="flex-1 px-3 py-5">
        <ul className="space-y-1">
          {primaryNavigation.map((item) => (
            <NavigationItem item={item} key={item.href} />
          ))}
        </ul>
      </nav>
    </aside>
  );
}
