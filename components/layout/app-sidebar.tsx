import Image from "next/image";

import { NavigationItem } from "@/components/navigation/navigation-item";
import type { NavigationItem as NavigationItemConfig } from "@/config/navigation-config";

type AppSidebarProps = Readonly<{
  navigation: readonly NavigationItemConfig[];
}>;

export function AppSidebar({ navigation }: AppSidebarProps) {
  return (
    <aside className="hidden w-72 shrink-0 border-r border-white/10 bg-[#0b1739] text-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
      <div className="border-b border-white/10 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">
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

      <nav aria-label="Primary navigation" className="flex-1 overflow-y-auto px-3 py-5">
        <ul className="space-y-1">
          {navigation.map((item) => (
            <NavigationItem item={item} key={item.href} />
          ))}
        </ul>
      </nav>
    </aside>
  );
}
