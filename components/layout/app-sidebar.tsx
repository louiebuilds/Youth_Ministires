import Image from "next/image";

import { NavigationItem } from "@/components/navigation/navigation-item";
import type { NavigationItem as NavigationItemConfig } from "@/config/navigation-config";

type AppSidebarProps = Readonly<{
  navigation: readonly NavigationItemConfig[];
}>;

export function AppSidebar({ navigation }: AppSidebarProps) {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-800 bg-slate-950 text-white lg:flex lg:flex-col">
      <div className="border-b border-slate-800 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">
          Ministry operations
        </p>
        <Image
          alt="First Coppell Students"
          className="mt-3 h-auto w-full"
          height={314}
          priority
          src="/images/youth-ministries-logo.png"
          width={1220}
        />
      </div>

      <nav aria-label="Primary navigation" className="flex-1 px-3 py-5">
        <ul className="space-y-1">
          {navigation.map((item) => (
            <NavigationItem item={item} key={item.href} />
          ))}
        </ul>
      </nav>
    </aside>
  );
}
