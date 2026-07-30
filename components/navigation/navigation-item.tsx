"use client";

import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  FileCheck2,
  House,
  LayoutDashboard,
  MessageSquare,
  ScanLine,
  Settings,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { NavigationItem as NavigationItemConfig } from "@/config/navigation-config";
import type { LucideIcon } from "lucide-react";

const navigationIcons: Record<NavigationItemConfig["icon"], LucideIcon> = {
  attendance: ClipboardCheck,
  "check-in": ScanLine,
  communications: MessageSquare,
  curriculum: BookOpen,
  dashboard: LayoutDashboard,
  events: CalendarDays,
  families: House,
  "permission-forms": FileCheck2,
  reports: BarChart3,
  settings: Settings,
  students: UsersRound,
  volunteers: UserRoundCheck,
};

type NavigationItemProps = Readonly<{
  item: NavigationItemConfig;
}>;

export function NavigationItem({ item }: NavigationItemProps) {
  const pathname = usePathname();
  const isActive =
    pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = navigationIcons[item.icon];

  return (
    <li>
      <Link
        aria-current={isActive ? "page" : undefined}
        className={[
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
          isActive
            ? "bg-white text-slate-950 shadow-sm"
            : "text-slate-300 hover:bg-slate-800 hover:text-white",
        ].join(" ")}
        href={item.href}
      >
        <Icon aria-hidden="true" className="size-5 shrink-0" />
        <span>{item.label}</span>
      </Link>
    </li>
  );
}
