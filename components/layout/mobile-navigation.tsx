"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { NavigationItem } from "@/components/navigation/navigation-item";
import type { NavigationItem as NavigationItemConfig } from "@/config/navigation-config";

type MobileNavigationProps = Readonly<{
  navigation: readonly NavigationItemConfig[];
}>;

export function MobileNavigation({ navigation }: MobileNavigationProps) {
  const pathname = usePathname();
  const menuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (menuRef.current) {
      menuRef.current.open = false;
    }
  }, [pathname]);

  return (
    <details className="relative lg:hidden" ref={menuRef}>
      <summary className="grid size-11 cursor-pointer list-none place-items-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 [&::-webkit-details-marker]:hidden">
        <Menu aria-hidden="true" className="size-5" />
        <span className="sr-only">Navigation menu</span>
      </summary>

      <div className="fixed inset-x-4 top-18 z-40 max-h-[calc(100vh-5.5rem)] overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 p-3 shadow-2xl sm:left-6 sm:right-auto sm:w-80">
        <p className="px-3 pb-3 pt-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">
          Ministry navigation
        </p>
        <nav aria-label="Mobile navigation">
          <ul className="space-y-1">
            {navigation.map((item) => (
              <NavigationItem item={item} key={item.href} />
            ))}
          </ul>
        </nav>
      </div>
    </details>
  );
}
